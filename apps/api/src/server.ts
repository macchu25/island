import { serve } from '@hono/node-server';
import type { Buyers, Catalog, Economy, Product } from '@chemimon/shared';
import { createApp } from './app';
import type { PrismaClient } from './generated/prisma/client';

export function startServer(catalog: Catalog, economy: Economy, buyers: Buyers, products: Product[], db: PrismaClient, opts: { host: string; port: number }) {
  const app = createApp({
    db,
    catalog,
    economy,
    buyers,
    products,
    now: () => new Date(),
    timeScale: {
      breeding: Number(process.env.BREEDING_TIME_SCALE ?? 1),
      extractor: Number(process.env.EXTRACTOR_COOLDOWN_SCALE ?? 1),
      expedition: Number(process.env.EXPEDITION_TIME_SCALE ?? 1),
      market: Number(process.env.MARKET_TIME_SCALE ?? 1),
    },
  });
  return serve({ fetch: app.fetch, hostname: opts.host, port: opts.port });
}
