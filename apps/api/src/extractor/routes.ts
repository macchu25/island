import { Hono } from 'hono';
import {
  EXTRACTOR_CAP, EXTRACTOR_COOLDOWN_S, ExtractorClaimRequestSchema, ExtractorClaimResponseSchema,
  EXTRACTOR_ELEMENTS,
} from '@chemimon/shared';
import type { AppDeps, AppEnv } from '../app';
import { requirePlayer } from '../auth/session';
import { apiError } from '../http/errors';
import { parseBody } from '../http/validate';
import { lockPlayer } from '../player/grant';
import { recordDiscoveries } from '../player/discoveries';

export function extractorRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  r.post('/claim', requirePlayer(deps), async (c) => {
    const parsed = await parseBody(c, ExtractorClaimRequestSchema);
    if (!parsed.ok) return parsed.res;
    const { chemicalId } = parsed.data;
    const playerId = c.var.playerId;
    if (!(EXTRACTOR_ELEMENTS as readonly string[]).includes(chemicalId)) {
      return apiError(c, 400, 'EXTRACTOR_NOT_ELIGIBLE', 'That element is not available from the extractor');
    }
    const cooldownMs = EXTRACTOR_COOLDOWN_S * 1000 * deps.timeScale.extractor;
    const out = await deps.db.$transaction(async (tx) => {
      await lockPlayer(tx, playerId);
      const now = deps.now();
      const state = await tx.extractorState.findUnique({ where: { playerId } });
      if (state && now.getTime() < state.lastClaimAt.getTime() + cooldownMs) return 'cooldown' as const;
      const row = await tx.playerMonster.findUnique({ where: { playerId_chemicalId: { playerId, chemicalId } } });
      if ((row?.count ?? 0) >= EXTRACTOR_CAP) return 'cap' as const;
      const updated = await tx.playerMonster.upsert({
        where: { playerId_chemicalId: { playerId, chemicalId } },
        create: { playerId, chemicalId, count: 1 },
        update: { count: { increment: 1 } },
      });
      await recordDiscoveries(tx, playerId, [chemicalId], 'extractor', now);
      await tx.extractorState.upsert({
        where: { playerId },
        create: { playerId, lastClaimAt: now },
        update: { lastClaimAt: now },
      });
      return { count: updated.count, nextClaimAt: new Date(now.getTime() + cooldownMs) };
    });
    if (out === 'cooldown') return apiError(c, 429, 'EXTRACTOR_COOLDOWN', 'Extractor is cooling down');
    if (out === 'cap') return apiError(c, 409, 'EXTRACTOR_CAP', 'Monster cap reached');
    return c.json(
      ExtractorClaimResponseSchema.parse({
        inventory: { chemicalId, count: out.count },
        nextClaimAt: out.nextClaimAt.toISOString(),
      }),
    );
  });
  return r;
}
