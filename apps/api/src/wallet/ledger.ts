import type { Prisma } from '../generated/prisma/client';

export type LedgerReason = 'starter' | 'breeding_fee' | 'sell_floor' | 'expedition_fee' | 'permit' | 'order';
export type ApplyCoinsResult = { ok: true; balance: number } | { ok: false; balance: number };

/**
 * The only way Xu changes. Call it inside the transaction that holds lockPlayer(tx, playerId).
 * One guarded UPDATE moves the balance only when the result stays >= 0 (the users_coins_check CHECK
 * is the last line of defence). On success it appends one coin_ledger row with balance_after; the
 * unique (player_id, reason, ref_id) index makes a repeated event throw P2002 and roll the transaction back.
 * On a failed guard nothing is written and `balance` is the unchanged current balance.
 */
export async function applyCoins(
  tx: Prisma.TransactionClient,
  playerId: string,
  delta: number,
  reason: LedgerReason,
  refId: string,
): Promise<ApplyCoinsResult> {
  if (!Number.isSafeInteger(delta)) throw new Error(`applyCoins: delta must be an integer, got ${delta}`);
  const updated = await tx.$queryRaw<{ coins: number }[]>`
    UPDATE users SET coins = coins + ${delta}::int
    WHERE id = ${playerId}::uuid AND coins + ${delta}::int >= 0
    RETURNING coins`;
  const row = updated[0];
  if (!row) {
    const { coins } = await tx.user.findUniqueOrThrow({ where: { id: playerId }, select: { coins: true } });
    return { ok: false, balance: coins };
  }
  await tx.coinLedger.create({ data: { playerId, delta, balanceAfter: row.coins, reason, refId } });
  return { ok: true, balance: row.coins };
}
