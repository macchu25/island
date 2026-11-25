import type { DiscoverySource } from '@chemimon/shared';
import type { Prisma } from '../generated/prisma/client';

/**
 * Records that the player now owns each chemical. The first source is kept forever; later calls
 * never change it. Breeding also stamps bred_at the first time (elements too), even when the row
 * already exists from another source. Returns the ids that had no row yet.
 * Callers hold the player lock (lockPlayer), so the read-then-insert cannot race.
 */
export async function recordDiscoveries(
  tx: Prisma.TransactionClient,
  playerId: string,
  chemicalIds: readonly string[],
  source: DiscoverySource,
  now: Date,
): Promise<string[]> {
  const ids = [...new Set(chemicalIds)];
  if (ids.length === 0) return [];
  const known = new Set(
    (await tx.playerDiscovery.findMany({ where: { playerId, chemicalId: { in: ids } }, select: { chemicalId: true } }))
      .map((r) => r.chemicalId),
  );
  const fresh = ids.filter((id) => !known.has(id));
  if (fresh.length > 0) {
    await tx.playerDiscovery.createMany({
      data: fresh.map((chemicalId) => ({
        playerId, chemicalId, discoveredAt: now, source, bredAt: source === 'breeding' ? now : null,
      })),
      skipDuplicates: true,
    });
  }
  if (source === 'breeding') {
    await tx.playerDiscovery.updateMany({
      where: { playerId, chemicalId: { in: ids }, bredAt: null },
      data: { bredAt: now },
    });
  }
  return fresh;
}
