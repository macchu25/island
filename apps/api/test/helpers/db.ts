import type { PrismaClient } from '../../src/generated/prisma/client';

/** Truncate player tables only; catalog tables stay. */
export async function resetPlayerData(db: PrismaClient): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "first_discoveries", "player_discoveries", "breeding_sessions", "player_monsters", "extractor_state", "sessions", "users" RESTART IDENTITY CASCADE',
  );
}
