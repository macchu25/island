import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { DeliverResponseSchema, MarketOrdersResponseSchema, SellRequestSchema, SellResponseSchema } from '@chemimon/shared';
import { z } from 'zod';
import type { AppDeps, AppEnv } from '../app';
import { requirePlayer } from '../auth/session';
import { apiError } from '../http/errors';
import { parseBody } from '../http/validate';
import { lockPlayer } from '../player/grant';
import { applyCoins } from '../wallet/ledger';
import { findProduct, productCount, removeProducts } from '../workshop/service';
import { deliverOrder, listOrders } from './orders';

const OrderIdSchema = z.uuid();
const TX_OPTS = { maxWait: 10_000, timeout: 15_000 };

export function marketRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();

  r.post('/sell', requirePlayer(deps), async (c) => {
    const parsed = await parseBody(c, SellRequestSchema);
    if (!parsed.ok) return parsed.res;
    const { chemicalId, productId, count } = parsed.data;
    const playerId = c.var.playerId;

    // The schema allows exactly one of chemicalId and productId.
    if (productId !== undefined) {
      const product = findProduct(deps, productId);
      if (!product) return apiError(c, 400, 'UNKNOWN_PRODUCT', `Unknown product: ${productId}`);
      const out = await deps.db.$transaction(
        async (tx) => {
          await lockPlayer(tx, playerId);
          if (!(await removeProducts(tx, playerId, productId, count))) return null;
          const paid = await applyCoins(tx, playerId, product.floorPrice * count, 'sell_floor', randomUUID());
          if (!paid.ok) throw new Error('sell credit refused');
          return { coins: paid.balance, product: { productId, count: await productCount(tx, playerId, productId) } };
        },
        TX_OPTS,
      );
      if (!out) return apiError(c, 409, 'INSUFFICIENT_PRODUCTS', `Not enough ${productId}`);
      return c.json(SellResponseSchema.parse(out), 200);
    }

    // Unreachable after the schema refine; it narrows chemicalId to a string.
    if (chemicalId === undefined) return apiError(c, 400, 'VALIDATION', 'exactly one of chemicalId or productId');
    const chem = chemicalId;
    const floor = deps.economy.floorPrices[chem];
    if (floor === undefined) return apiError(c, 400, 'UNKNOWN_CHEMICAL', `Unknown chemical: ${chem}`);
    const out = await deps.db.$transaction(
      async (tx) => {
        await lockPlayer(tx, playerId);
        const upd = await tx.playerMonster.updateMany({
          where: { playerId, chemicalId: chem, count: { gte: count } },
          data: { count: { decrement: count } },
        });
        if (upd.count === 0) return null;
        const paid = await applyCoins(tx, playerId, floor * count, 'sell_floor', randomUUID());
        if (!paid.ok) throw new Error('sell credit refused');
        const row = await tx.playerMonster.findUniqueOrThrow({
          where: { playerId_chemicalId: { playerId, chemicalId: chem } },
          select: { count: true },
        });
        return { coins: paid.balance, inventory: { chemicalId: chem, count: row.count } };
      },
      TX_OPTS,
    );
    if (!out) return apiError(c, 409, 'INSUFFICIENT_MONSTERS', `Not enough ${chem}`);
    return c.json(SellResponseSchema.parse(out), 200);
  });

  r.get('/orders', requirePlayer(deps), async (c) =>
    c.json(MarketOrdersResponseSchema.parse(await listOrders(deps, c.var.playerId)), 200));

  r.post('/orders/:id/deliver', requirePlayer(deps), async (c) => {
    const id = OrderIdSchema.safeParse(c.req.param('id'));
    if (!id.success) return apiError(c, 404, 'UNKNOWN_ORDER', 'Order not found');
    const out = await deliverOrder(deps, c.var.playerId, id.data);
    switch (out.kind) {
      case 'UNKNOWN_ORDER':
        return apiError(c, 404, 'UNKNOWN_ORDER', 'Order not found');
      case 'ORDER_CLOSED':
        return apiError(c, 409, 'ORDER_CLOSED', 'This order is already closed');
      case 'ORDER_EXPIRED':
        return apiError(c, 409, 'ORDER_EXPIRED', 'This order has expired');
      case 'INSUFFICIENT_MONSTERS':
        return apiError(c, 409, 'INSUFFICIENT_MONSTERS', `Not enough ${out.chemicalId}`);
      case 'INSUFFICIENT_PRODUCTS':
        return apiError(c, 409, 'INSUFFICIENT_PRODUCTS', `Not enough ${out.productId}`);
      case 'DELIVERED':
        return c.json(DeliverResponseSchema.parse(out.body), 200);
    }
  });

  return r;
}
