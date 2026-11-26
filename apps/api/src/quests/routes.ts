import { Hono } from 'hono';
import { QuestsResponseSchema } from '@chemimon/shared';
import type { AppDeps, AppEnv } from '../app';
import { requirePlayer } from '../auth/session';
import { questViews } from './quests';

export function questRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  r.get('/', requirePlayer(deps), async (c) => {
    const playerId = c.var.playerId;
    const [extractor, started, collected, discoveries, firsts, sold, hot, expeditions, delivered] = await Promise.all([
      deps.db.extractorState.findUnique({ where: { playerId } }),
      deps.db.breedingSession.count({ where: { playerId } }),
      deps.db.breedingSession.count({ where: { playerId, status: 'collected' } }),
      deps.db.playerDiscovery.findMany({ where: { playerId, bredAt: { not: null } }, select: { chemicalId: true } }),
      deps.db.firstDiscovery.count({ where: { playerId } }),
      deps.db.coinLedger.count({ where: { playerId, reason: 'sell_floor' } }),
      deps.db.breedingSession.count({
        where: { playerId, conditions: { path: ['temperatureC'], gte: 1000 } },
      }),
      deps.db.expedition.count({ where: { playerId } }),
      deps.db.coinLedger.count({ where: { playerId, reason: 'order' } }),
    ]);
    const compounds = deps.catalog.chemicals.filter((x) => x.kind === 'compound');
    const compoundIds = new Set(compounds.map((x) => x.id));
    const quests = questViews(
      {
        extractorUsed: extractor !== null,
        breedingsStarted: started,
        breedingsCollected: collected,
        discovered: new Set(discoveries.map((d) => d.chemicalId).filter((id) => compoundIds.has(id))),
        bred: new Set(discoveries.map((d) => d.chemicalId)),
        expeditions,
        delivered,
        firstDiscoveries: firsts,
        sold,
        hotBreedings: hot,
        compoundTotal: compounds.length,
      },
      new Set(deps.catalog.chemicals.map((x) => x.id)),
    );
    return c.json(QuestsResponseSchema.parse({ quests }));
  });
  return r;
}
