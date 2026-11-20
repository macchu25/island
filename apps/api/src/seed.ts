import type { Catalog } from '@chemimon/shared';
import { Prisma, type PrismaClient } from './generated/prisma/client';

/** Upsert catalog tables in one transaction; reactions absent from the catalog are deleted. */
export async function seedCatalog(db: PrismaClient, catalog: Catalog): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const c of catalog.chemicals) {
      const data = {
        formula: c.formula, name: c.name, kind: c.kind,
        atomicNumber: c.atomicNumber ?? null, group: c.group ?? null, period: c.period ?? null,
        phaseAt25c: c.phaseAt25C, family: c.family,
      };
      await tx.chemical.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
    }
    for (const m of catalog.monsters) {
      const data = {
        chemicalId: m.chemicalId, displayName: m.displayName, rarity: m.rarity,
        silhouette: m.silhouette, color: m.color, assetKey: m.assetKey, blurb: m.blurb,
      };
      await tx.monster.upsert({ where: { id: m.id }, create: { id: m.id, ...data }, update: data });
    }
    await tx.reaction.deleteMany({ where: { id: { notIn: catalog.reactions.map((r) => r.id) } } });
    for (const r of catalog.reactions) {
      const data = {
        priority: r.priority, durationS: r.durationS, conditions: r.conditions,
        ratio: r.ratio ?? Prisma.DbNull, source: r.source, reviewed: r.reviewed,
      };
      await tx.reaction.upsert({
        where: { id: r.id },
        create: { id: r.id, ...data },
        update: data,
      });
      await tx.reactionInput.deleteMany({ where: { reactionId: r.id } });
      await tx.reactionOutput.deleteMany({ where: { reactionId: r.id } });
      await tx.reactionInput.createMany({
        data: r.inputs.map((t) => ({ reactionId: r.id, chemicalId: t.chemicalId, coefficient: t.coefficient })),
      });
      await tx.reactionOutput.createMany({
        data: r.outputs.map((t) => ({ reactionId: r.id, chemicalId: t.chemicalId, coefficient: t.coefficient })),
      });
    }
  }, { timeout: 60_000, maxWait: 10_000 });
}
