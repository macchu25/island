import { STARTER_COUNT, STARTER_ELEMENTS } from '@chemimon/shared';
import type { Prisma } from '../generated/prisma/client';

export async function grantStarterKit(tx: Prisma.TransactionClient, playerId: string): Promise<void> {
  await tx.playerMonster.createMany({
    data: STARTER_ELEMENTS.map((chemicalId) => ({ playerId, chemicalId, count: STARTER_COUNT })),
  });
}

/** Per-player mutex: serialises all mutations of one player's rows inside a transaction. */
export async function lockPlayer(tx: Prisma.TransactionClient, playerId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${playerId}::uuid FOR UPDATE`;
}
