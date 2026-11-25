import { serve } from '@hono/node-server';
import type { Catalog, Economy } from '@chemimon/shared';
import { createApp } from './app';
import type { PrismaClient } from './generated/prisma/client';

export function startServer(catalog: Catalog, economy: Economy, db: PrismaClient, opts: { host: string; port: number }) {
  const app = createApp({
    db,
    catalog,
    economy,
    now: () => new Date(),
    timeScale: {
      breeding: Number(process.env.BREEDING_TIME_SCALE ?? 1),
      extractor: Number(process.env.EXTRACTOR_COOLDOWN_SCALE ?? 1),
    },
  });
  return serve({ fetch: app.fetch, hostname: opts.host, port: opts.port });
}
