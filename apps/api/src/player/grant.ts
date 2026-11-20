import { STARTER_COUNT, STARTER_ELEMENTS } from '@chemimon/shared';
import type { Prisma } from '../generated/prisma/client';

export async function grantStarterKit(tx: Prisma.TransactionClient, playerId: string): Promise<void> {
  await tx.playerMonster.createMany({
    data: STARTER_ELEMENTS.map((chemicalId) => ({ playerId, chemicalId, count: STARTER_COUNT })),
  });
}

/**
 * Per-player mutex: serialises all mutations of one player's rows inside a transaction.
 * FOR NO KEY UPDATE conflicts with itself (so our writers still queue), but not with the
 * FOR KEY SHARE locks that foreign-key checks take on users, so inserts that reference the
 * player (sessions, discoveries) are not blocked by a held lock.
 */
export async function lockPlayer(tx: Prisma.TransactionClient, playerId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${playerId}::uuid FOR NO KEY UPDATE`;
}
