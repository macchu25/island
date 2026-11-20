import { Hono } from 'hono';
import type { Catalog } from '@chemimon/shared';
import type { PrismaClient } from './generated/prisma/client';
import { authRoutes } from './auth/routes';
import { requirePlayer } from './auth/session';
import { apiError } from './http/errors';
import { buildMe } from './player/me';

export interface AppDeps {
  db: PrismaClient;
  catalog: Catalog;
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
  app.notFound((c) => apiError(c, 404, 'NOT_FOUND', 'Not found'));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: { code: 'VALIDATION', message: 'Internal error' } }, 500);
  });
  return app;
}
