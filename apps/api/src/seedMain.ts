import { loadCatalog } from '@chemimon/content';
import { createDb } from './db';
import { seedCatalog } from './seed';

/**
 * `pnpm --filter @chemimon/api db:seed [-- --reset-players]`
 * Env: DATABASE_URL (required), CONTENT_INCLUDE_DRAFTS ('1' also seeds draft reactions).
 * --reset-players truncates every player table first. It refuses any database except chemimon_test.
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const resetPlayers = process.argv.includes('--reset-players');
const dbName = new URL(url).pathname.replace(/^\//, '');
if (resetPlayers && dbName !== 'chemimon_test') {
  throw new Error(`--reset-players only runs on chemimon_test, not "${dbName}"`);
}

const includeDrafts = process.env.CONTENT_INCLUDE_DRAFTS === '1';
const catalog = loadCatalog({ includeDrafts });
const db = createDb(url);
try {
  if (resetPlayers) {
    await db.$executeRawUnsafe(
      'TRUNCATE TABLE "coin_ledger", "expeditions", "player_permits", "first_discoveries", "player_discoveries", "breeding_sessions", "player_monsters", "extractor_state", "sessions", "users" RESTART IDENTITY CASCADE',
    );
    console.log(`reset player tables in ${dbName}`);
  }
  await seedCatalog(db, catalog);
  console.log(
    `seeded ${dbName}: ${catalog.chemicals.length} chemicals, ${catalog.monsters.length} monsters, ` +
      `${catalog.reactions.length} reactions (drafts ${includeDrafts ? 'on' : 'off'})`,
  );
} finally {
  await db.$disconnect();
}
