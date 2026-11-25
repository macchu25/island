import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { SellRequestSchema, SellResponseSchema } from '@chemimon/shared';
import type { AppDeps, AppEnv } from '../app';
import { requirePlayer } from '../auth/session';
import { apiError } from '../http/errors';
import { parseBody } from '../http/validate';
import { lockPlayer } from '../player/grant';
import { applyCoins } from '../wallet/ledger';

export function marketRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();

  r.post('/sell', requirePlayer(deps), async (c) => {
    const parsed = await parseBody(c, SellRequestSchema);
    if (!parsed.ok) return parsed.res;
    const { chemicalId, count } = parsed.data;
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

  return r;
}
