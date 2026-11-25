import { Hono } from 'hono';
import { EconomyResponseSchema } from '@chemimon/shared';
import type { AppDeps, AppEnv } from '../app';

/** GET /api/economy (no auth): condition prices and floor prices from economy.yaml. starterCoins is not exposed. */
export function economyRoutes(deps: AppDeps): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  const body = EconomyResponseSchema.parse({
    conditionPrices: deps.economy.conditionPrices,
    floorPrices: deps.economy.floorPrices,
  });
  r.get('/', (c) => c.json(body));
  return r;
}
