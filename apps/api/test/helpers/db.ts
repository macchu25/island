import type { PrismaClient } from '../../src/generated/prisma/client';

/** Truncate player tables only; catalog tables stay. */
export async function resetPlayerData(db: PrismaClient): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "player_labs", "workshop_jobs", "player_products", "player_blueprints", "market_orders", "coin_ledger", "expeditions", "player_permits", "first_discoveries", "player_discoveries", "breeding_sessions", "player_monsters", "extractor_state", "sessions", "users" RESTART IDENTITY CASCADE',
  );
}

/** Gives a player a lab or catalyst item directly (no Xu), for tests that breed at a gated condition. */
export async function grantLab(db: PrismaClient, playerId: string, ...itemIds: string[]): Promise<void> {
  await db.playerLab.createMany({ data: itemIds.map((itemId) => ({ playerId, itemId })), skipDuplicates: true });
}
