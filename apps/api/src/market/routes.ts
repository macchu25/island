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
import { deliverOrder, listOrders } from './orders';

const OrderIdSchema = z.uuid();

export function marketRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();

  r.post('/sell', requirePlayer(deps), async (c) => {
    const parsed = await parseBody(c, SellRequestSchema);
    if (!parsed.ok) return parsed.res;
    const { chemicalId, count } = parsed.data;
    if (chemicalId === undefined) return apiError(c, 400, 'VALIDATION', 'Selling products is not supported yet');
    const playerId = c.var.playerId;
    const floor = deps.economy.floorPrices[chemicalId];
    if (floor === undefined) return apiError(c, 400, 'UNKNOWN_CHEMICAL', `Unknown chemical: ${chemicalId}`);

    const out = await deps.db.$transaction(
      async (tx) => {
        await lockPlayer(tx, playerId);
        const upd = await tx.playerMonster.updateMany({
          where: { playerId, chemicalId, count: { gte: count } },
          data: { count: { decrement: count } },
        });
        if (upd.count === 0) return null;
        const paid = await applyCoins(tx, playerId, floor * count, 'sell_floor', randomUUID());
        if (!paid.ok) throw new Error('sell credit refused');
        const row = await tx.playerMonster.findUniqueOrThrow({
          where: { playerId_chemicalId: { playerId, chemicalId } },
          select: { count: true },
        });
        return { coins: paid.balance, inventory: { chemicalId, count: row.count } };
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
    if (!out) return apiError(c, 409, 'INSUFFICIENT_MONSTERS', `Not enough ${chemicalId}`);
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
      case 'DELIVERED':
        return c.json(DeliverResponseSchema.parse(out.body), 200);
    }
  });

  return r;
}
