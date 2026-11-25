import { Hono } from 'hono';
import { ExpeditionsResponseSchema, ExpeditionStartRequestSchema, ExpeditionStartResponseSchema } from '@chemimon/shared';
import { z } from 'zod';
import type { AppDeps, AppEnv } from '../app';
import { requirePlayer } from '../auth/session';
import { apiError } from '../http/errors';
import { parseBody } from '../http/validate';
import { collectExpedition, listExpeditions, sendExpedition } from './service';

const TripIdSchema = z.uuid();

export function expeditionRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();

  r.get('/', requirePlayer(deps), async (c) =>
    c.json(ExpeditionsResponseSchema.parse(await listExpeditions(deps, c.var.playerId)), 200));

  r.post('/', requirePlayer(deps), async (c) => {
    const parsed = await parseBody(c, ExpeditionStartRequestSchema);
    if (!parsed.ok) return parsed.res;
    const out = await sendExpedition(deps, c.var.playerId, parsed.data);
    switch (out.kind) {
      case 'UNKNOWN_PLACE':
        return apiError(c, 400, 'UNKNOWN_PLACE', `Unknown place: ${parsed.data.placeId}`);
      case 'PLACE_LOCKED':
        return apiError(c, 409, 'PLACE_LOCKED', 'This place needs a permit');
      case 'INSUFFICIENT_MONSTERS':
        return apiError(c, 409, 'INSUFFICIENT_MONSTERS', `Not enough ${parsed.data.chemicalId}`);
      case 'SLOTS_FULL':
        return apiError(c, 409, 'SLOTS_FULL', 'All expedition slots are in use');
      case 'INSUFFICIENT_COINS':
        return apiError(c, 409, 'INSUFFICIENT_COINS', `Not enough Xu: need ${out.needed}, have ${out.have}`, {
          needed: out.needed,
          have: out.have,
        });
      case 'SENT':
        return c.json(ExpeditionStartResponseSchema.parse({ trip: out.trip, coins: out.coins }), 201);
    }
  });

  r.post('/:id/collect', requirePlayer(deps), async (c) => {
    const id = TripIdSchema.safeParse(c.req.param('id'));
    if (!id.success) return apiError(c, 404, 'NOT_FOUND', 'Expedition not found');
    const out = await collectExpedition(deps, c.var.playerId, id.data);
    if (out.kind === 'NOT_FOUND') return apiError(c, 404, 'NOT_FOUND', 'Expedition not found');
    if (out.kind === 'NOT_READY') return apiError(c, 409, 'NOT_READY', 'The expedition has not returned yet');
    return c.json(out.body, 200);
  });

  return r;
}
