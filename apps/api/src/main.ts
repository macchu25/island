import { loadCatalog } from '@chemimon/content';
import { startServer } from './server';

/**
 * Runnable api entry. Env: DATABASE_URL (required), PORT (3101), BREEDING_TIME_SCALE (1),
 * EXTRACTOR_COOLDOWN_SCALE (1), CONTENT_INCLUDE_DRAFTS ('1' also loads data/drafts/reactions.yaml).
 */
for (const key of ['BREEDING_TIME_SCALE', 'EXTRACTOR_COOLDOWN_SCALE'] as const) {
  const raw = process.env[key];
  if (raw !== undefined && !(Number.isFinite(Number(raw)) && Number(raw) >= 0)) {
    throw new Error(`${key} must be a number >= 0, got "${raw}"`);
  }
}

const includeDrafts = process.env.CONTENT_INCLUDE_DRAFTS === '1';
const catalog = loadCatalog({ includeDrafts });
const server = startServer(catalog);

server.on('listening', () => {
  console.log(
    `api listening on http://localhost:${process.env.PORT ?? 3101} ` +
      `(${catalog.reactions.length} rules, drafts ${includeDrafts ? 'on' : 'off'}, ` +
      `breeding x${process.env.BREEDING_TIME_SCALE ?? 1}, extractor x${process.env.EXTRACTOR_COOLDOWN_SCALE ?? 1})`,
  );
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
