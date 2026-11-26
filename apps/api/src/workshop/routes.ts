import { Hono } from 'hono';
import {
  BlueprintRequestSchema, BlueprintResponseSchema, WorkshopResponseSchema, WorkshopStartRequestSchema, WorkshopStartResponseSchema,
} from '@chemimon/shared';
import { z } from 'zod';
import type { AppDeps, AppEnv } from '../app';
import { requirePlayer } from '../auth/session';
import { apiError } from '../http/errors';
import { parseBody } from '../http/validate';
import { buyBlueprint, collectJob, listWorkshop, startJob } from './service';

const JobIdSchema = z.uuid();

export function workshopRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();

  r.get('/', requirePlayer(deps), async (c) =>
    c.json(WorkshopResponseSchema.parse(await listWorkshop(deps, c.var.playerId)), 200));

  r.post('/jobs', requirePlayer(deps), async (c) => {
    const parsed = await parseBody(c, WorkshopStartRequestSchema);
    if (!parsed.ok) return parsed.res;
    const { productId } = parsed.data;
    const out = await startJob(deps, c.var.playerId, productId);
    switch (out.kind) {
      case 'UNKNOWN_PRODUCT':
        return apiError(c, 400, 'UNKNOWN_PRODUCT', `Unknown product: ${productId}`);
      case 'BLUEPRINT_LOCKED':
        return apiError(c, 409, 'BLUEPRINT_LOCKED', 'This product needs a blueprint');
      case 'INSUFFICIENT_MONSTERS':
        return apiError(c, 409, 'INSUFFICIENT_MONSTERS', `Not enough ${out.chemicalId}`);
      case 'SLOTS_FULL':
        return apiError(c, 409, 'SLOTS_FULL', 'All workshop slots are in use');
      case 'STARTED':
        return c.json(WorkshopStartResponseSchema.parse({ job: out.job }), 201);
    }
  });

  r.post('/jobs/:id/collect', requirePlayer(deps), async (c) => {
    const id = JobIdSchema.safeParse(c.req.param('id'));
    if (!id.success) return apiError(c, 404, 'NOT_FOUND', 'Workshop job not found');
    const out = await collectJob(deps, c.var.playerId, id.data);
    if (out.kind === 'NOT_FOUND') return apiError(c, 404, 'NOT_FOUND', 'Workshop job not found');
    if (out.kind === 'NOT_READY') return apiError(c, 409, 'NOT_READY', 'The workshop job is not done yet');
    return c.json(out.body, 200);
  });

  r.post('/blueprints', requirePlayer(deps), async (c) => {
    const parsed = await parseBody(c, BlueprintRequestSchema);
    if (!parsed.ok) return parsed.res;
    const { productId } = parsed.data;
    const out = await buyBlueprint(deps, c.var.playerId, productId);
    switch (out.kind) {
      case 'UNKNOWN_PRODUCT':
        return apiError(c, 400, 'UNKNOWN_PRODUCT', `Unknown product: ${productId}`);
      case 'BLUEPRINT_OWNED':
        return apiError(c, 409, 'BLUEPRINT_OWNED', 'This blueprint is already known');
      case 'INSUFFICIENT_COINS':
        return apiError(c, 409, 'INSUFFICIENT_COINS', `Not enough Xu: need ${out.needed}, have ${out.have}`, {
          needed: out.needed,
          have: out.have,
        });
      case 'BOUGHT':
        return c.json(BlueprintResponseSchema.parse({ productId, coins: out.coins }), 200);
    }
  });

  return r;
}
