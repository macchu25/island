import { randomUUID } from 'node:crypto';
import {
  EXPEDITION_SLOTS, ExpeditionCollectResponseSchema, expeditionYield, habitatFor, StackCountSchema,
  type ExpeditionCollectResponse, type ExpeditionsResponse, type ExpeditionStartRequest, type ExpeditionView,
  type Place, type StackCount,
} from '@chemimon/shared';
import { z } from 'zod';
import type { AppDeps } from '../app';
import type { Prisma } from '../generated/prisma/client';
import { recordDiscoveries } from '../player/discoveries';
import { lockPlayer } from '../player/grant';
import { applyCoins } from '../wallet/ledger';

export type SendOutcome =
  | { kind: 'UNKNOWN_PLACE' }
  | { kind: 'PLACE_LOCKED' }
  | { kind: 'INSUFFICIENT_MONSTERS' }
  | { kind: 'SLOTS_FULL' }
  | { kind: 'INSUFFICIENT_COINS'; needed: number; have: number }
  | { kind: 'SENT'; trip: ExpeditionView; coins: number };

export type CollectOutcome =
  | { kind: 'NOT_FOUND' }
  | { kind: 'NOT_READY' }
  | { kind: 'COLLECTED'; body: ExpeditionCollectResponse };

export type PermitOutcome =
  | { kind: 'UNKNOWN_PLACE' }
  | { kind: 'PERMIT_OWNED' }
  | { kind: 'INSUFFICIENT_COINS'; needed: number; have: number }
  | { kind: 'BOUGHT'; coins: number };

const TX_OPTS = { maxWait: 10_000, timeout: 15_000 };

/** Stored `expeditions.result`: the yield computed at send time. */
const StoredResultSchema = z.array(StackCountSchema);

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

type TripRow = {
  id: string; placeId: string; monsterChemicalId: string; status: 'running' | 'collected';
  startedAt: Date; readyAt: Date; result: Prisma.JsonValue;
};
const toView = (t: TripRow): ExpeditionView => ({
  id: t.id,
  placeId: t.placeId,
  chemicalId: t.monsterChemicalId,
  status: t.status,
  startedAt: t.startedAt.toISOString(),
  readyAt: t.readyAt.toISOString(),
  result: StoredResultSchema.parse(t.result),
});

const findPlace = (deps: AppDeps, placeId: string): Place | undefined => deps.economy.places.find((p) => p.id === placeId);

async function isUnlocked(tx: Prisma.TransactionClient, playerId: string, place: Place): Promise<boolean> {
  if (place.permitPrice === 0) return true;
  return (await tx.playerPermit.count({ where: { playerId, placeId: place.id } })) > 0;
}

export async function listExpeditions(deps: AppDeps, playerId: string): Promise<ExpeditionsResponse> {
  const [permits, trips] = await Promise.all([
    deps.db.playerPermit.findMany({ where: { playerId }, select: { placeId: true } }),
    deps.db.expedition.findMany({ where: { playerId, status: 'running' }, orderBy: [{ startedAt: 'asc' }, { id: 'asc' }] }),
  ]);
  const owned = new Set(permits.map((p) => p.placeId));
  return {
    places: deps.economy.places.map((p) => ({ ...p, unlocked: p.permitPrice === 0 || owned.has(p.id) })),
    trips: trips.map(toView),
  };
}

/** Check order (Global Constraints): place, unlocked, owns 1, free slot, Xu >= fee. Then remove 1 monster, charge, create. */
export async function sendExpedition(deps: AppDeps, playerId: string, req: ExpeditionStartRequest): Promise<SendOutcome> {
  const place = findPlace(deps, req.placeId);
  if (!place) return { kind: 'UNKNOWN_PLACE' };
  return deps.db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    const now = deps.now();

    if (!(await isUnlocked(tx, playerId, place))) return { kind: 'PLACE_LOCKED' } as const;

    // Rows at count 0 are kept (breeding and selling decrement to 0), so ownership is count >= 1.
    const row = await tx.playerMonster.findUnique({
      where: { playerId_chemicalId: { playerId, chemicalId: req.chemicalId } },
      select: { count: true },
    });
    const chem = deps.catalog.chemicals.find((c) => c.id === req.chemicalId);
    if (!chem || (row?.count ?? 0) < 1) return { kind: 'INSUFFICIENT_MONSTERS' } as const;

    const running = await tx.expedition.count({ where: { playerId, status: 'running' } });
    if (running >= EXPEDITION_SLOTS) return { kind: 'SLOTS_FULL' } as const;

    // The id is made here so the ledger ref_id is the trip id. A 0 Xu fee writes no ledger row.
    const tripId = randomUUID();
    let coins: number;
    if (place.fee > 0) {
      const paid = await applyCoins(tx, playerId, -place.fee, 'expedition_fee', tripId);
      if (!paid.ok) return { kind: 'INSUFFICIENT_COINS', needed: place.fee, have: paid.balance } as const;
      coins = paid.balance;
    } else {
      coins = (await tx.user.findUniqueOrThrow({ where: { id: playerId }, select: { coins: true } })).coins;
    }

    // Under the player lock the count read above is current; the guard is a backstop. A refused guard after
    // a fee would leave the fee charged, so throw and let Prisma roll the whole transaction back.
    const upd = await tx.playerMonster.updateMany({
      where: { playerId, chemicalId: req.chemicalId, count: { gte: 1 } },
      data: { count: { decrement: 1 } },
    });
    if (upd.count === 0) throw new Error(`expedition send: ${req.chemicalId} vanished under the player lock`);

    const trip = await tx.expedition.create({
      data: {
        id: tripId,
        playerId,
        placeId: place.id,
        monsterChemicalId: req.chemicalId,
        status: 'running',
        startedAt: now,
        readyAt: new Date(now.getTime() + place.durationS * 1000 * deps.timeScale.expedition),
        result: expeditionYield(place, habitatFor(chem)),
      },
    });
    return { kind: 'SENT', trip: toView(trip), coins } as const;
  }, TX_OPTS);
}

export async function collectExpedition(deps: AppDeps, playerId: string, tripId: string): Promise<CollectOutcome> {
  return deps.db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    const now = deps.now();

    const trip = await tx.expedition.findFirst({ where: { id: tripId, playerId } });
    if (!trip) return { kind: 'NOT_FOUND' } as const;
    if (trip.status === 'collected') {
      return { kind: 'COLLECTED', body: ExpeditionCollectResponseSchema.parse(trip.collectOutcome) } as const;
    }
    if (now.getTime() < trip.readyAt.getTime()) return { kind: 'NOT_READY' } as const;

    const products = StoredResultSchema.parse(trip.result);
    const returned: StackCount = { chemicalId: trip.monsterChemicalId, count: 1 };
    // The monster can also be a drop (n2 sent to air): sum per chemical, then upsert in sorted order
    // so lock acquisition order is the same for every caller.
    const add = new Map<string, number>();
    for (const s of [returned, ...products]) add.set(s.chemicalId, (add.get(s.chemicalId) ?? 0) + s.count);
    for (const [chemicalId, count] of [...add].sort((a, b) => byId(a[0], b[0]))) {
      await tx.playerMonster.upsert({
        where: { playerId_chemicalId: { playerId, chemicalId } },
        create: { playerId, chemicalId, count },
        update: { count: { increment: count } },
      });
    }

    // Every kind counts here (the Codex lists elements and compounds); First Discovery stays breeding-only.
    const fresh = await recordDiscoveries(tx, playerId, products.map((p) => p.chemicalId), 'expedition', now);
    const body = ExpeditionCollectResponseSchema.parse({ returned, products, newDiscoveries: fresh });
    await tx.expedition.update({ where: { id: trip.id }, data: { status: 'collected', collectOutcome: body } });
    return { kind: 'COLLECTED', body } as const;
  }, TX_OPTS);
}

/** A permit is bought once per place. Price 0, or a permit row already there, is PERMIT_OWNED with no charge. */
export async function buyPermit(deps: AppDeps, playerId: string, placeId: string): Promise<PermitOutcome> {
  const place = findPlace(deps, placeId);
  if (!place) return { kind: 'UNKNOWN_PLACE' };
  if (place.permitPrice === 0) return { kind: 'PERMIT_OWNED' };
  return deps.db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    if (await isUnlocked(tx, playerId, place)) return { kind: 'PERMIT_OWNED' } as const;
    // ref_id = place id: the unique (player_id, reason, ref_id) index is the last guard against a second charge.
    const paid = await applyCoins(tx, playerId, -place.permitPrice, 'permit', place.id);
    if (!paid.ok) return { kind: 'INSUFFICIENT_COINS', needed: place.permitPrice, have: paid.balance } as const;
    await tx.playerPermit.create({ data: { playerId, placeId: place.id, boughtAt: deps.now() } });
    return { kind: 'BOUGHT', coins: paid.balance } as const;
  }, TX_OPTS);
}
