import { loadBuyers, loadCatalog, loadEconomy } from '@chemimon/content';
import { bootCheck, parseHost, parsePort } from './boot';
import { createDb } from './db';
import { startServer } from './server';

/**
 * Runnable api entry. Env: DATABASE_URL (required), HOST (127.0.0.1), PORT (3101, integer 1..65535),
 * BREEDING_TIME_SCALE (1), EXTRACTOR_COOLDOWN_SCALE (1), EXPEDITION_TIME_SCALE (1),
 * CONTENT_INCLUDE_DRAFTS (default off; '1' also loads the unreviewed data/drafts/reactions.yaml).
 * Refuses to start (exit 1) when the catalog or economy.yaml or buyers.yaml fails validation or a catalog chemical is missing from the DB.
 */
for (const key of ['BREEDING_TIME_SCALE', 'EXTRACTOR_COOLDOWN_SCALE', 'EXPEDITION_TIME_SCALE'] as const) {
  const raw = process.env[key];
  if (raw !== undefined && !(Number.isFinite(Number(raw)) && Number(raw) >= 0)) {
    throw new Error(`${key} must be a number >= 0, got "${raw}"`);
  }
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const host = parseHost(process.env.HOST);
const port = parsePort(process.env.PORT);

const includeDrafts = process.env.CONTENT_INCLUDE_DRAFTS === '1';
const catalog = loadCatalog({ includeDrafts });
const economy = loadEconomy();
const buyers = loadBuyers();
const db = createDb(url);

const problems = await bootCheck(catalog, economy, buyers, db, includeDrafts);
if (problems.length > 0) {
  console.error(`api refusing to start (drafts ${includeDrafts ? 'on' : 'off'}), ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  await db.$disconnect();
  process.exit(1);
}

const server = startServer(catalog, economy, buyers, db, { host, port });

server.on('listening', () => {
  console.log(
    `api listening on http://${host}:${port} ` +
      `(${catalog.reactions.length} rules, drafts ${includeDrafts ? 'on' : 'off'}, ` +
      `breeding x${process.env.BREEDING_TIME_SCALE ?? 1}, extractor x${process.env.EXTRACTOR_COOLDOWN_SCALE ?? 1}, ` +
        `expedition x${process.env.EXPEDITION_TIME_SCALE ?? 1})`,
  );
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
