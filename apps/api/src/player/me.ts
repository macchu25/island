import { ConditionsSchema, EXTRACTOR_COOLDOWN_S, MeResponseSchema, StackCountSchema, type MeResponse } from '@chemimon/shared';
import { z } from 'zod';
import type { AppDeps } from '../app';


export async function buildMe(deps: AppDeps, playerId: string): Promise<MeResponse> {
  const { db } = deps;
  const now = deps.now();
  const [user, inv, running, extractor] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: playerId } }),
    db.playerMonster.findMany({ where: { playerId }, orderBy: { chemicalId: 'asc' } }),
    db.breedingSession.findMany({ where: { playerId, status: 'running' }, orderBy: { startedAt: 'asc' } }),
    db.extractorState.findUnique({ where: { playerId } }),
  ]);
  let nextClaimAt: string | null = null;
  if (extractor) {
    const next = extractor.lastClaimAt.getTime() + EXTRACTOR_COOLDOWN_S * 1000 * deps.timeScale.extractor;
    if (next > now.getTime()) nextClaimAt = new Date(next).toISOString();
  }
  const out: MeResponse = {
    player: { id: user.id, email: user.email, displayName: user.displayName },
    coins: 0,
    inventory: inv.map((r) => ({ chemicalId: r.chemicalId, count: r.count })),
    sessions: running.map((s) => ({
      id: s.id,
      status: now.getTime() >= s.readyAt.getTime() ? ('ready' as const) : ('running' as const),
      inputs: z.array(StackCountSchema).parse(s.inputs),
      conditions: ConditionsSchema.parse(s.conditions),
      readyAt: s.readyAt.toISOString(),
    })),
    extractor: { nextClaimAt },
  };
  return MeResponseSchema.parse(out);
}
