import { randomUUID } from 'node:crypto';
import {
  WORKSHOP_SLOTS, WorkshopCollectResponseSchema,
  type Product, type WorkshopCollectResponse, type WorkshopJobView, type WorkshopResponse,
} from '@chemimon/shared';
import type { AppDeps } from '../app';
import type { Prisma } from '../generated/prisma/client';
import { lockPlayer } from '../player/grant';
import { applyCoins } from '../wallet/ledger';

export type StartOutcome =
  | { kind: 'UNKNOWN_PRODUCT' }
  | { kind: 'BLUEPRINT_LOCKED' }
  | { kind: 'INSUFFICIENT_MONSTERS'; chemicalId: string }
  | { kind: 'SLOTS_FULL' }
  | { kind: 'STARTED'; job: WorkshopJobView };

export type CollectOutcome =
  | { kind: 'NOT_FOUND' }
  | { kind: 'NOT_READY' }
  | { kind: 'COLLECTED'; body: WorkshopCollectResponse };

export type BlueprintOutcome =
  | { kind: 'UNKNOWN_PRODUCT' }
  | { kind: 'BLUEPRINT_OWNED' }
  | { kind: 'INSUFFICIENT_COINS'; needed: number; have: number }
  | { kind: 'BOUGHT'; coins: number };

const TX_OPTS = { maxWait: 10_000, timeout: 15_000 };

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

type JobRow = { id: string; productId: string; status: string; startedAt: Date; readyAt: Date };
const toView = (j: JobRow): WorkshopJobView => ({
  id: j.id,
  productId: j.productId,
  status: j.status === 'collected' ? 'collected' : 'running',
  startedAt: j.startedAt.toISOString(),
  readyAt: j.readyAt.toISOString(),
});

export const findProduct = (deps: AppDeps, productId: string): Product | undefined =>
  deps.products.find((p) => p.id === productId);

async function isUnlocked(tx: Prisma.TransactionClient, playerId: string, product: Product): Promise<boolean> {
  if (product.blueprintPrice === 0) return true;
  return (await tx.playerBlueprint.count({ where: { playerId, productId: product.id } })) > 0;
}

/** Ingredients summed per chemical, sorted by id so every caller takes row locks in the same order. */
function ingredientsOf(product: Product): [string, number][] {
  const need = new Map<string, number>();
  for (const i of product.ingredients) need.set(i.chemicalId, (need.get(i.chemicalId) ?? 0) + i.count);
  return [...need].sort((a, b) => byId(a[0], b[0]));
}

/**
 * Guarded decrement of product stock. Rows at count 0 are kept, so a missing row and a short row both
 * return false. Call it under lockPlayer.
 */
export async function removeProducts(tx: Prisma.TransactionClient, playerId: string, productId: string, count: number): Promise<boolean> {
  const upd = await tx.playerProduct.updateMany({
    where: { playerId, productId, count: { gte: count } },
    data: { count: { decrement: count } },
  });
  return upd.count > 0;
}

export async function productCount(tx: Prisma.TransactionClient, playerId: string, productId: string): Promise<number> {
  const row = await tx.playerProduct.findUnique({ where: { playerId_productId: { playerId, productId } }, select: { count: true } });
  return row?.count ?? 0;
}

/** Products this player has collected at least one job of. Product orders are offered only for these. */
export async function craftedIds(tx: Prisma.TransactionClient, playerId: string): Promise<ReadonlySet<string>> {
  const rows = await tx.workshopJob.findMany({ where: { playerId, status: 'collected' }, distinct: ['productId'], select: { productId: true } });
  return new Set(rows.map((r) => r.productId));
}

export async function listWorkshop(deps: AppDeps, playerId: string): Promise<WorkshopResponse> {
  const [blueprints, jobs] = await Promise.all([
    deps.db.playerBlueprint.findMany({ where: { playerId }, select: { productId: true } }),
    deps.db.workshopJob.findMany({ where: { playerId, status: 'running' }, orderBy: [{ startedAt: 'asc' }, { id: 'asc' }] }),
  ]);
  const owned = new Set(blueprints.map((b) => b.productId));
  return {
    products: deps.products.map((p) => ({ ...p, unlocked: p.blueprintPrice === 0 || owned.has(p.id) })),
    jobs: jobs.map(toView),
  };
}

/** Check order (Global Constraints): known product, blueprint owned, owns every ingredient, free slot. No Xu fee. */
export async function startJob(deps: AppDeps, playerId: string, productId: string): Promise<StartOutcome> {
  const product = findProduct(deps, productId);
  if (!product) return { kind: 'UNKNOWN_PRODUCT' };
  const need = ingredientsOf(product);
  return deps.db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    const now = deps.now();

    if (!(await isUnlocked(tx, playerId, product))) return { kind: 'BLUEPRINT_LOCKED' } as const;

    const rows = await tx.playerMonster.findMany({
      where: { playerId, chemicalId: { in: need.map(([id]) => id) } },
      select: { chemicalId: true, count: true },
    });
    const have = new Map(rows.map((r) => [r.chemicalId, r.count]));
    const short = need.find(([id, n]) => (have.get(id) ?? 0) < n);
    if (short) return { kind: 'INSUFFICIENT_MONSTERS', chemicalId: short[0] } as const;

    const running = await tx.workshopJob.count({ where: { playerId, status: 'running' } });
    if (running >= WORKSHOP_SLOTS) return { kind: 'SLOTS_FULL' } as const;

    // Under the player lock the counts read above are current; the guard is a backstop. A miss after an
    // earlier decrement would leave half the ingredients taken, so throw and let Prisma roll back.
    for (const [chemicalId, count] of need) {
      const upd = await tx.playerMonster.updateMany({
        where: { playerId, chemicalId, count: { gte: count } },
        data: { count: { decrement: count } },
      });
      if (upd.count === 0) throw new Error(`workshop start: ${chemicalId} vanished under the player lock`);
    }

    const job = await tx.workshopJob.create({
      data: {
        id: randomUUID(),
        playerId,
        productId: product.id,
        status: 'running',
        startedAt: now,
        readyAt: new Date(now.getTime() + product.durationS * 1000 * deps.timeScale.workshop),
      },
    });
    return { kind: 'STARTED', job: toView(job) } as const;
  }, TX_OPTS);
}

/** One job makes one product. A second collect replays the stored body and adds nothing. */
export async function collectJob(deps: AppDeps, playerId: string, jobId: string): Promise<CollectOutcome> {
  return deps.db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    const now = deps.now();

    const job = await tx.workshopJob.findFirst({ where: { id: jobId, playerId } });
    if (!job) return { kind: 'NOT_FOUND' } as const;
    if (job.status === 'collected') {
      return { kind: 'COLLECTED', body: WorkshopCollectResponseSchema.parse(job.collectOutcome) } as const;
    }
    if (now.getTime() < job.readyAt.getTime()) return { kind: 'NOT_READY' } as const;

    await tx.playerProduct.upsert({
      where: { playerId_productId: { playerId, productId: job.productId } },
      create: { playerId, productId: job.productId, count: 1 },
      update: { count: { increment: 1 } },
    });
    // The body counts what this job made (1), not the stock total, like an expedition collect returns its yield.
    const body = WorkshopCollectResponseSchema.parse({ product: { productId: job.productId, count: 1 } });
    await tx.workshopJob.update({ where: { id: job.id }, data: { status: 'collected', collectedAt: now, collectOutcome: body } });
    return { kind: 'COLLECTED', body } as const;
  }, TX_OPTS);
}

/** A blueprint is bought once per product. Price 0, or a blueprint row already there, is BLUEPRINT_OWNED with no charge. */
export async function buyBlueprint(deps: AppDeps, playerId: string, productId: string): Promise<BlueprintOutcome> {
  const product = findProduct(deps, productId);
  if (!product) return { kind: 'UNKNOWN_PRODUCT' };
  if (product.blueprintPrice === 0) return { kind: 'BLUEPRINT_OWNED' };
  return deps.db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    if (await isUnlocked(tx, playerId, product)) return { kind: 'BLUEPRINT_OWNED' } as const;
    // ref_id = product id: the unique (player_id, reason, ref_id) index is the last guard against a second charge.
    const paid = await applyCoins(tx, playerId, -product.blueprintPrice, 'blueprint', product.id);
    if (!paid.ok) return { kind: 'INSUFFICIENT_COINS', needed: product.blueprintPrice, have: paid.balance } as const;
    await tx.playerBlueprint.create({ data: { playerId, productId: product.id, boughtAt: deps.now() } });
    return { kind: 'BOUGHT', coins: paid.balance } as const;
  }, TX_OPTS);
}
