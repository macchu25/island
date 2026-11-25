import { Hono } from 'hono';
import { PermitRequestSchema, PermitResponseSchema } from '@chemimon/shared';
import type { AppDeps, AppEnv } from '../app';
import { requirePlayer } from '../auth/session';
import { buyPermit } from '../expeditions/service';
import { apiError } from '../http/errors';
import { parseBody } from '../http/validate';

export function permitRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();

  r.post('/', requirePlayer(deps), async (c) => {
    const parsed = await parseBody(c, PermitRequestSchema);
    if (!parsed.ok) return parsed.res;
    const { placeId } = parsed.data;
    const out = await buyPermit(deps, c.var.playerId, placeId);
    switch (out.kind) {
      case 'UNKNOWN_PLACE':
        return apiError(c, 400, 'UNKNOWN_PLACE', `Unknown place: ${placeId}`);
      case 'PERMIT_OWNED':
        return apiError(c, 409, 'PERMIT_OWNED', 'This place is already open');
      case 'INSUFFICIENT_COINS':
        return apiError(c, 409, 'INSUFFICIENT_COINS', `Not enough Xu: need ${out.needed}, have ${out.have}`, {
          needed: out.needed,
          have: out.have,
        });
      case 'BOUGHT':
        return c.json(PermitResponseSchema.parse({ placeId, coins: out.coins }), 200);
    }
  });

  return r;
}
