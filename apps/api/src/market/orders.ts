import { randomUUID } from 'node:crypto';
import {
  orderKey, pickTemplate, type DeliverResponse, type MarketOrdersResponse, type OrderTemplate, type Stall, type StallView,
} from '@chemimon/shared';
import type { AppDeps } from '../app';
import type { Prisma } from '../generated/prisma/client';
import { lockPlayer } from '../player/grant';
import { applyCoins } from '../wallet/ledger';
import { craftedIds, productCount, removeProducts } from '../workshop/service';

export type DeliverOutcome =
  | { kind: 'UNKNOWN_ORDER' }
  | { kind: 'ORDER_CLOSED' }
  | { kind: 'ORDER_EXPIRED' }
  | { kind: 'INSUFFICIENT_MONSTERS'; chemicalId: string }
  | { kind: 'INSUFFICIENT_PRODUCTS'; productId: string }
  | { kind: 'DELIVERED'; body: DeliverResponse };

const TX_OPTS = { maxWait: 10_000, timeout: 15_000 };

type OrderRow = {
  id: string; templateId: string; chemicalId: string | null; productId: string | null; count: number; reward: number; expiresAt: Date;
};

/** What makes a template eligible: its chemical is discovered, or its product has one collected workshop job. */
type Unlocks = { discovered: ReadonlySet<string>; crafted: ReadonlySet<string> };

/** Seconds of content time scaled by MARKET_TIME_SCALE, in ms. */
const scaledMs = (deps: AppDeps, seconds: number) => seconds * 1000 * deps.timeScale.market;

/** The template of an open row, or undefined when content no longer has it in this stall. */
function templateOf(deps: AppDeps, stallId: string, templateId: string): OrderTemplate | undefined {
  return deps.buyers.orders.find((o) => o.id === templateId && o.stallId === stallId);
}

/** Item, count and reward come from the row (the snapshot); buyer and line from the template. A null column is left out. */
function stallView(stall: Stall, order: { row: OrderRow; template: OrderTemplate } | null, readyAt: Date | null): StallView {
  return {
    id: stall.id,
    name: stall.name,
    icon: stall.icon,
    order: order && {
      id: order.row.id,
      templateId: order.row.templateId,
      buyer: order.template.buyer,
      ...(order.row.chemicalId !== null ? { chemicalId: order.row.chemicalId } : {}),
      ...(order.row.productId !== null ? { productId: order.row.productId } : {}),
      count: order.row.count,
      reward: order.row.reward,
      line: order.template.line,
      expiresAt: order.row.expiresAt.toISOString(),
    },
    readyAt: readyAt && readyAt.toISOString(),
  };
}

async function unlocksOf(tx: Prisma.TransactionClient, playerId: string): Promise<Unlocks> {
  const rows = await tx.playerDiscovery.findMany({ where: { playerId }, select: { chemicalId: true } });
  return { discovered: new Set(rows.map((r) => r.chemicalId)), crafted: await craftedIds(tx, playerId) };
}

/** A chemical template needs the chemical discovered; a product template needs one collected job of the product. */
function isEligible(o: OrderTemplate, u: Unlocks): boolean {
  if (o.chemicalId !== undefined) return u.discovered.has(o.chemicalId);
  return o.productId !== undefined && u.crafted.has(o.productId);
}

/**
 * Stall state rules (Global Constraints). Caller holds lockPlayer, so the read-then-open cannot race;
 * the partial unique index market_orders_one_open_per_stall is the last guard.
 * 1. Open row, template still in content, now < expires_at: show it unchanged (a snapshot).
 * 2. Open row past expires_at, or its template is gone: set it expired, go on.
 * 3. Latest delivery with now < delivered_at + cooldown: no order, readyAt = that time.
 * 4. Otherwise open a new order now from the eligible templates (deterministic pick), or show none.
 */
async function resolveStall(
  deps: AppDeps, tx: Prisma.TransactionClient, playerId: string, stall: Stall, unlocks: Unlocks, now: Date,
): Promise<StallView> {
  const open = await tx.marketOrder.findFirst({ where: { playerId, stallId: stall.id, status: 'open' } });
  if (open) {
    const template = templateOf(deps, stall.id, open.templateId);
    if (template && now.getTime() < open.expiresAt.getTime()) return stallView(stall, { row: open, template }, null);
    await tx.marketOrder.update({ where: { id: open.id }, data: { status: 'expired' } });
  }

  const last = await tx.marketOrder.findFirst({
    where: { playerId, stallId: stall.id, status: 'delivered' },
    orderBy: { deliveredAt: 'desc' },
    select: { deliveredAt: true },
  });
  if (last?.deliveredAt) {
    const readyAt = new Date(last.deliveredAt.getTime() + scaledMs(deps, deps.buyers.orderCooldownS));
    if (now.getTime() < readyAt.getTime()) return stallView(stall, null, readyAt);
  }

  const delivered = await tx.marketOrder.count({ where: { playerId, stallId: stall.id, status: 'delivered' } });
  const eligible = deps.buyers.orders.filter((o) => o.stallId === stall.id && isEligible(o, unlocks));
  // The key window uses the content lifetime, not the scaled one, so the pick does not depend on MARKET_TIME_SCALE.
  const template = pickTemplate(eligible, orderKey(playerId, stall.id, delivered, now, deps.buyers.orderLifetimeS));
  if (!template) return stallView(stall, null, null);
  const row = await tx.marketOrder.create({
    data: {
      id: randomUUID(),
      playerId,
      stallId: stall.id,
      templateId: template.id,
      chemicalId: template.chemicalId ?? null,
      productId: template.productId ?? null,
      count: template.count,
      reward: template.reward,
      status: 'open',
      openedAt: now,
      expiresAt: new Date(now.getTime() + scaledMs(deps, deps.buyers.orderLifetimeS)),
    },
  });
  return stallView(stall, { row, template }, null);
}

/** GET /api/market/orders. It writes: it expires stale rows and opens new orders, under the player lock. */
export async function listOrders(deps: AppDeps, playerId: string): Promise<MarketOrdersResponse> {
  return deps.db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    const now = deps.now();
    const unlocks = await unlocksOf(tx, playerId);
    const stalls: StallView[] = [];
    for (const stall of deps.buyers.stalls) stalls.push(await resolveStall(deps, tx, playerId, stall, unlocks, now));
    return { stalls };
  }, TX_OPTS);
}

type Left = Pick<DeliverResponse, 'inventory' | 'product'>;
type Short = { kind: 'INSUFFICIENT_MONSTERS'; chemicalId: string } | { kind: 'INSUFFICIENT_PRODUCTS'; productId: string };

/** Removes `count` products; returns the stock left, or the refusal. Rows at count 0 are kept, so the guarded decrement is the check. */
async function takeProduct(tx: Prisma.TransactionClient, playerId: string, productId: string, count: number): Promise<Left | Short> {
  if (!(await removeProducts(tx, playerId, productId, count))) return { kind: 'INSUFFICIENT_PRODUCTS', productId };
  return { product: { productId, count: await productCount(tx, playerId, productId) } };
}

/** Removes `count` monsters; returns the inventory left, or the refusal. */
async function takeChemical(tx: Prisma.TransactionClient, playerId: string, chemicalId: string | null, count: number): Promise<Left | Short> {
  if (chemicalId === null) throw new Error('market order row has neither chemical_id nor product_id');
  const upd = await tx.playerMonster.updateMany({
    where: { playerId, chemicalId, count: { gte: count } },
    data: { count: { decrement: count } },
  });
  if (upd.count === 0) return { kind: 'INSUFFICIENT_MONSTERS', chemicalId };
  const inv = await tx.playerMonster.findUniqueOrThrow({
    where: { playerId_chemicalId: { playerId, chemicalId } },
    select: { count: true },
  });
  return { inventory: { chemicalId, count: inv.count } };
}

/**
 * Check order (Global Constraints): exists and is this player's, status open, now < expires_at, owns count.
 * Then remove the monsters (or products), pay the reward (ledger reason `order`, ref_id = order id), set delivered.
 * An open order whose template is gone from content counts as expired; the next read sets it expired.
 * A row whose stall is gone from content is not touched by reads (reads loop only over stalls in content).
 */
export async function deliverOrder(deps: AppDeps, playerId: string, orderId: string): Promise<DeliverOutcome> {
  return deps.db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    const now = deps.now();

    const order = await tx.marketOrder.findFirst({ where: { id: orderId, playerId } });
    if (!order) return { kind: 'UNKNOWN_ORDER' } as const;
    if (order.status !== 'open') return { kind: 'ORDER_CLOSED' } as const;
    const stall = deps.buyers.stalls.find((s) => s.id === order.stallId);
    if (now.getTime() >= order.expiresAt.getTime() || !stall || !templateOf(deps, order.stallId, order.templateId)) {
      return { kind: 'ORDER_EXPIRED' } as const;
    }

    // The one-item CHECK means exactly one of the two columns is set.
    const left = order.productId !== null
      ? await takeProduct(tx, playerId, order.productId, order.count)
      : await takeChemical(tx, playerId, order.chemicalId, order.count);
    if ('kind' in left) return left;

    const paid = await applyCoins(tx, playerId, order.reward, 'order', order.id);
    if (!paid.ok) throw new Error(`order reward refused for ${order.id}`);
    await tx.marketOrder.update({ where: { id: order.id }, data: { status: 'delivered', deliveredAt: now } });
    const view = await resolveStall(deps, tx, playerId, stall, await unlocksOf(tx, playerId), now);
    return { kind: 'DELIVERED', body: { coins: paid.balance, ...left, stall: view } } as const;
  }, TX_OPTS);
}
