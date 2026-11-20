import { serve } from '@hono/node-server';
import type { Catalog } from '@chemimon/shared';
import { createApp } from './app';
import { createDb } from './db';

/** Wired to a real catalog loader in Task 11. */
export function startServer(catalog: Catalog) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const port = Number(process.env.PORT ?? 3101);
  const app = createApp({
    db: createDb(url),
    catalog,
    now: () => new Date(),
    timeScale: {
      breeding: Number(process.env.BREEDING_TIME_SCALE ?? 1),
      extractor: Number(process.env.EXTRACTOR_COOLDOWN_SCALE ?? 1),
    },
  });
  return serve({ fetch: app.fetch, port });
}
