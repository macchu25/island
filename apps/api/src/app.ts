import { Hono } from 'hono';
import type { Catalog, Economy } from '@chemimon/shared';
import type { PrismaClient } from './generated/prisma/client';
import { authRoutes } from './auth/routes';
import { requirePlayer } from './auth/session';
import { apiError } from './http/errors';
import { breedingRoutes } from './breeding/routes';
import { marketRoutes } from './market/routes';
import { questRoutes } from './quests/routes';
import { catalogRoutes } from './catalog/routes';
import { codexRoutes } from './codex/routes';
import { economyRoutes } from './economy/routes';
import { extractorRoutes } from './extractor/routes';
import { buildMe } from './player/me';

export interface AppDeps {
  db: PrismaClient;
  catalog: Catalog;
  /** Prices and starter coins from economy.yaml (validated against the catalog at boot). */
  economy: Economy;
  now: () => Date;
  timeScale: { breeding: number; extractor: number };
}
export type AppEnv = { Variables: { playerId: string } };

export { requirePlayer } from './auth/session';
export { apiError } from './http/errors';
export { parseBody } from './http/validate';
export { grantStarterKit, lockPlayer } from './player/grant';

export function createApp(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.route('/api/auth', authRoutes(deps));
  app.get('/api/me', requirePlayer(deps), async (c) => c.json(await buildMe(deps, c.var.playerId)));
  app.route('/api/catalog', catalogRoutes(deps));
  app.route('/api/codex', codexRoutes(deps));
  app.route('/api/economy', economyRoutes(deps));
  app.route('/api/extractor', extractorRoutes(deps));
  app.route('/api/breeding', breedingRoutes(deps));
  app.route('/api/market', marketRoutes(deps));
  app.route('/api/quests', questRoutes(deps));
  app.notFound((c) => apiError(c, 404, 'NOT_FOUND', 'Not found'));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: { code: 'INTERNAL', message: 'Internal error' } }, 500);
  });
  return app;
}
