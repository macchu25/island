import { STARTER_COUNT, STARTER_ELEMENTS, type Economy } from '@chemimon/shared';
import type { Prisma } from '../generated/prisma/client';
import { applyCoins } from '../wallet/ledger';

/** Starter monsters plus economy.starterCoins Xu (one `starter` ledger row). Runs in the register transaction. */
export async function grantStarterKit(tx: Prisma.TransactionClient, playerId: string, economy: Economy): Promise<void> {
  await tx.playerMonster.createMany({
    data: STARTER_ELEMENTS.map((chemicalId) => ({ playerId, chemicalId, count: STARTER_COUNT })),
  });
  await lockPlayer(tx, playerId);
  const r = await applyCoins(tx, playerId, economy.starterCoins, 'starter', 'starter');
  if (!r.ok) throw new Error(`starter coins refused for ${playerId}`);
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
