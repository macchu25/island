import { Hono } from 'hono';
import { BreedingRequestSchema, BreedingResponseSchema } from '@chemimon/shared';
import { z } from 'zod';
import type { AppDeps, AppEnv } from '../app';
import { requirePlayer } from '../auth/session';
import { apiError } from '../http/errors';
import { parseBody } from '../http/validate';
import { collectBreeding, startBreeding } from './service';

const SessionIdSchema = z.uuid();

export function breedingRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();

  r.post('/', requirePlayer(deps), async (c) => {
    const parsed = await parseBody(c, BreedingRequestSchema);
    if (!parsed.ok) return parsed.res;
    const out = await startBreeding(deps, c.var.playerId, parsed.data);
    switch (out.kind) {
      case 'UNKNOWN_CHEMICAL':
        return apiError(c, 400, 'UNKNOWN_CHEMICAL', `Unknown chemical: ${out.chemicalId}`);
      case 'SLOTS_FULL':
        return apiError(c, 409, 'SLOTS_FULL', 'All breeding slots are in use');
      case 'INSUFFICIENT_MONSTERS':
        return apiError(c, 409, 'INSUFFICIENT_MONSTERS', `Not enough ${out.chemicalId}`);
      case 'NO_REACTION':
        return c.json(BreedingResponseSchema.parse({ status: 'NO_REACTION' }), 200);
      case 'STARTED':
        return c.json(
          BreedingResponseSchema.parse({
            status: 'STARTED',
            sessionId: out.sessionId,
            readyAt: out.readyAt.toISOString(),
            consumed: out.consumed,
          }),
          201,
        );
    }
  });

  r.post('/:id/collect', requirePlayer(deps), async (c) => {
    const id = SessionIdSchema.safeParse(c.req.param('id'));
    if (!id.success) return apiError(c, 404, 'NOT_FOUND', 'Breeding session not found');
    const out = await collectBreeding(deps, c.var.playerId, id.data);
    if (out.kind === 'NOT_FOUND') return apiError(c, 404, 'NOT_FOUND', 'Breeding session not found');
    if (out.kind === 'NOT_READY') return apiError(c, 409, 'NOT_READY', 'Breeding is not finished yet');
    return c.json(out.body, 200);
  });

  return r;
}
