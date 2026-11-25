import { randomUUID } from 'node:crypto';
import { resolve } from '@chemimon/chem-engine';
import {
  BREEDING_SLOTS, CollectResponseSchema, conditionFee, StackCountSchema,
  type BreedingRequest, type CollectResponse, type StackCount,
} from '@chemimon/shared';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { lockPlayer } from '../player/grant';
import { applyCoins } from '../wallet/ledger';

/** Thrown inside the start transaction (backstop decrement) so Prisma rolls back every decrement already applied. */
export class InsufficientMonstersError extends Error {
  constructor(public readonly chemicalId: string) {
    super(`Not enough ${chemicalId}`);
    this.name = 'InsufficientMonstersError';
  }
}

export type StartOutcome =
  | { kind: 'UNKNOWN_CHEMICAL'; chemicalId: string }
  | { kind: 'SLOTS_FULL' }
  | { kind: 'INSUFFICIENT_MONSTERS'; chemicalId: string }
  | { kind: 'NO_REACTION' }
  | { kind: 'INSUFFICIENT_COINS'; needed: number; have: number }
  | { kind: 'STARTED'; sessionId: string; readyAt: Date; consumed: StackCount[] };

export type CollectOutcome =
  | { kind: 'NOT_FOUND' }
  | { kind: 'NOT_READY' }
  | { kind: 'COLLECTED'; body: CollectResponse };

const TX_OPTS = { maxWait: 10_000, timeout: 15_000 };

/** Stored `breeding_sessions.result`: only REACTION results are ever stored. */
const StoredResultSchema = z.object({
  status: z.literal('REACTION'),
  ruleId: z.string(),
  durationS: z.number(),
  consumed: z.array(StackCountSchema),
  products: z.array(StackCountSchema),
  returned: z.array(StackCountSchema),
});

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export async function startBreeding(deps: AppDeps, playerId: string, req: BreedingRequest): Promise<StartOutcome> {
  const known = new Set(deps.catalog.chemicals.map((c) => c.id));
  try {
    return await deps.db.$transaction(async (tx) => {
      await lockPlayer(tx, playerId);
      const now = deps.now();

      const unknown = req.inputs.find((i) => !known.has(i.chemicalId));
      if (unknown) return { kind: 'UNKNOWN_CHEMICAL', chemicalId: unknown.chemicalId } as const;

      // The player must own every requested monster before anything is resolved: the requested counts
      // feed rule selection (ratio), and resolving for stock the player lacks would leak recipes.
      const owned = await tx.playerMonster.findMany({
        where: { playerId, chemicalId: { in: req.inputs.map((i) => i.chemicalId) } },
        select: { chemicalId: true, count: true },
      });
      const have = new Map(owned.map((o) => [o.chemicalId, o.count]));
      const short = req.inputs.find((i) => (have.get(i.chemicalId) ?? 0) < i.count);
      if (short) return { kind: 'INSUFFICIENT_MONSTERS', chemicalId: short.chemicalId } as const;

      const running = await tx.breedingSession.count({ where: { playerId, status: 'running' } });
      if (running >= BREEDING_SLOTS) return { kind: 'SLOTS_FULL' } as const;

      const result = resolve(deps.catalog.reactions, req.inputs, req.conditions);
      // NO_REACTION is free: it returns before any Xu is read or charged.
      if (result.status === 'NO_REACTION') return { kind: 'NO_REACTION' } as const;

      // Charge the condition fee before anything is consumed. The id is made here so the ledger ref_id is the session id.
      // Under the player lock the guard sees the latest balance; a refused guard writes nothing and returns.
      const sessionId = randomUUID();
      const fee = conditionFee(req.conditions, deps.economy.conditionPrices);
      const paid = await applyCoins(tx, playerId, -fee, 'breeding_fee', sessionId);
      if (!paid.ok) return { kind: 'INSUFFICIENT_COINS', needed: fee, have: paid.balance } as const;

      // Backstop: the ownership check above already passed under the player lock; keep the guarded decrement anyway.
      for (const c of result.consumed) {
        const upd = await tx.playerMonster.updateMany({
          where: { playerId, chemicalId: c.chemicalId, count: { gte: c.count } },
          data: { count: { decrement: c.count } },
        });
        if (upd.count === 0) throw new InsufficientMonstersError(c.chemicalId);
      }

      const reaction = await tx.reaction.findUnique({ where: { id: result.ruleId }, select: { id: true } });
      const readyAt = new Date(now.getTime() + result.durationS * 1000 * deps.timeScale.breeding);
      const inputs = [...req.inputs].sort((a, b) => byId(a.chemicalId, b.chemicalId));
      const session = await tx.breedingSession.create({
        data: {
          id: sessionId,
          playerId,
          inputs,
          conditions: req.conditions,
          status: 'running',
          result,
          reactionId: reaction ? reaction.id : null,
          startedAt: now,
          readyAt,
          fee,
        },
        select: { id: true },
      });
      return { kind: 'STARTED', sessionId: session.id, readyAt, consumed: result.consumed } as const;
    }, TX_OPTS);
  } catch (err) {
    if (err instanceof InsufficientMonstersError) return { kind: 'INSUFFICIENT_MONSTERS', chemicalId: err.chemicalId };
    throw err;
  }
}

export async function collectBreeding(deps: AppDeps, playerId: string, sessionId: string): Promise<CollectOutcome> {
  const kindOf = new Map(deps.catalog.chemicals.map((c) => [c.id, c.kind]));
  return deps.db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    const now = deps.now();

    const session = await tx.breedingSession.findFirst({ where: { id: sessionId, playerId } });
    if (!session) return { kind: 'NOT_FOUND' } as const;
    if (session.status === 'collected') {
      return { kind: 'COLLECTED', body: CollectResponseSchema.parse(session.collectOutcome) } as const;
    }
    if (now.getTime() < session.readyAt.getTime()) return { kind: 'NOT_READY' } as const;

    const result = StoredResultSchema.parse(session.result);
    // Sorted order keeps lock acquisition order identical across players (no deadlock on shared keys).
    const products = [...result.products].sort((a, b) => byId(a.chemicalId, b.chemicalId));
    for (const p of products) {
      await tx.playerMonster.upsert({
        where: { playerId_chemicalId: { playerId, chemicalId: p.chemicalId } },
        create: { playerId, chemicalId: p.chemicalId, count: p.count },
        update: { count: { increment: p.count } },
      });
    }

    const newDiscoveries: string[] = [];
    const firstDiscoveries: string[] = [];
    for (const p of products) {
      if (kindOf.get(p.chemicalId) !== 'compound') continue;
      const mine = await tx.playerDiscovery.createMany({
        data: [{ playerId, chemicalId: p.chemicalId, discoveredAt: now }],
        skipDuplicates: true,
      });
      if (mine.count === 1) newDiscoveries.push(p.chemicalId);
      const first = await tx.firstDiscovery.createMany({
        data: [{ playerId, chemicalId: p.chemicalId, discoveredAt: now }],
        skipDuplicates: true,
      });
      if (first.count === 1) firstDiscoveries.push(p.chemicalId);
    }

    const body = CollectResponseSchema.parse({ products, newDiscoveries, firstDiscoveries });
    await tx.breedingSession.update({
      where: { id: session.id },
      data: { status: 'collected', collectOutcome: body },
    });
    return { kind: 'COLLECTED', body } as const;
  }, TX_OPTS);
}
