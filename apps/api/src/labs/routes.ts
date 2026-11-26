import { Hono } from 'hono';
import { LabBuyRequestSchema, LabBuyResponseSchema, LabsResponseSchema } from '@chemimon/shared';
import type { AppDeps, AppEnv } from '../app';
import { requirePlayer } from '../auth/session';
import { apiError } from '../http/errors';
import { parseBody } from '../http/validate';
import { buyLab, listLabs } from './service';

export function labRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();

  r.get('/', requirePlayer(deps), async (c) =>
    c.json(LabsResponseSchema.parse({ items: await listLabs(deps, c.var.playerId) }), 200));

  r.post('/buy', requirePlayer(deps), async (c) => {
    const parsed = await parseBody(c, LabBuyRequestSchema);
    if (!parsed.ok) return parsed.res;
    const { itemId } = parsed.data;
    const out = await buyLab(deps, c.var.playerId, itemId);
    switch (out.kind) {
      case 'UNKNOWN_LAB':
        return apiError(c, 400, 'UNKNOWN_LAB', `Unknown lab item: ${itemId}`);
      case 'LAB_OWNED':
        return apiError(c, 409, 'LAB_OWNED', 'This item is already owned');
      case 'LAB_USELESS':
        return apiError(c, 409, 'LAB_USELESS', 'No reaction needs this item yet');
      case 'INSUFFICIENT_COINS':
        return apiError(c, 409, 'INSUFFICIENT_COINS', `Not enough Xu: need ${out.needed}, have ${out.have}`, {
          needed: out.needed,
          have: out.have,
        });
      case 'BOUGHT':
        return c.json(LabBuyResponseSchema.parse({ itemId, coins: out.coins }), 200);
    }
  });

  return r;
}
