import { Hono } from 'hono';
import { CodexResponseSchema, type CodexEntry } from '@chemimon/shared';
import type { AppDeps, AppEnv } from '../app';
import { requirePlayer } from '../auth/session';

export function codexRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  r.get('/', requirePlayer(deps), async (c) => {
    const playerId = c.var.playerId;
    const [inv, disc, firsts] = await Promise.all([
      deps.db.playerMonster.findMany({ where: { playerId } }),
      deps.db.playerDiscovery.findMany({ where: { playerId } }),
      deps.db.firstDiscovery.findMany({ include: { player: { select: { displayName: true } } } }),
    ]);
    const counts = new Map(inv.map((i) => [i.chemicalId, i.count]));
    const discovered = new Set(disc.map((d) => d.chemicalId));
    const firstBy = new Map(firsts.map((f) => [f.chemicalId, f]));
    const elements = deps.catalog.chemicals
      .filter((x) => x.kind === 'element')
      .sort((a, b) => (a.atomicNumber ?? 0) - (b.atomicNumber ?? 0));
    const compounds = deps.catalog.chemicals
      .filter((x) => x.kind === 'compound')
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const entries: CodexEntry[] = [...elements, ...compounds].map((chem) => {
      const count = counts.get(chem.id) ?? 0;
      if (chem.kind === 'element') return { chemicalId: chem.id, state: 'owned', count, firstDiscoverer: null };
      const f = firstBy.get(chem.id);
      return {
        chemicalId: chem.id,
        state: discovered.has(chem.id) ? 'discovered' : 'unknown',
        count,
        firstDiscoverer: f ? { displayName: f.player.displayName, at: f.discoveredAt.toISOString() } : null,
      };
    });
    return c.json(CodexResponseSchema.parse({ entries }));
  });
  return r;
}
