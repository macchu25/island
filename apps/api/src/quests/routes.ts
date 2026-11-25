import { Hono } from 'hono';
import { QuestsResponseSchema } from '@chemimon/shared';
import type { AppDeps, AppEnv } from '../app';
import { requirePlayer } from '../auth/session';
import { questViews } from './quests';

export function questRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  r.get('/', requirePlayer(deps), async (c) => {
    const playerId = c.var.playerId;
    const [extractor, started, collected, discoveries, firsts] = await Promise.all([
      deps.db.extractorState.findUnique({ where: { playerId } }),
      deps.db.breedingSession.count({ where: { playerId } }),
      deps.db.breedingSession.count({ where: { playerId, status: 'collected' } }),
      deps.db.playerDiscovery.findMany({ where: { playerId }, select: { chemicalId: true } }),
      deps.db.firstDiscovery.count({ where: { playerId } }),
    ]);
    const compounds = deps.catalog.chemicals.filter((x) => x.kind === 'compound');
    const compoundIds = new Set(compounds.map((x) => x.id));
    const quests = questViews(
      {
        extractorUsed: extractor !== null,
        breedingsStarted: started,
        breedingsCollected: collected,
        discovered: new Set(discoveries.map((d) => d.chemicalId).filter((id) => compoundIds.has(id))),
        firstDiscoveries: firsts,
        compoundTotal: compounds.length,
      },
      new Set(deps.catalog.chemicals.map((x) => x.id)),
    );
    return c.json(QuestsResponseSchema.parse({ quests }));
  });
  return r;
}
