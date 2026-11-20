import { Hono } from 'hono';
import { CatalogResponseSchema } from '@chemimon/shared';
import type { AppDeps, AppEnv } from '../app';

export function catalogRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  r.get('/', (c) =>
    c.json(CatalogResponseSchema.parse({ chemicals: deps.catalog.chemicals, monsters: deps.catalog.monsters })),
  );
  return r;
}
