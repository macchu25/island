import { STARTER_ELEMENTS, type Catalog } from '@chemimon/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createDb } from '../src/db';
import { seedCatalog } from '../src/seed';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { resetPlayerData } from './helpers/db';

const db = createDb(process.env.DATABASE_URL!);

async function counts() {
  return {
    chemicals: await db.chemical.count(),
    monsters: await db.monster.count(),
    reactions: await db.reaction.count(),
    inputs: await db.reactionInput.count(),
    outputs: await db.reactionOutput.count(),
  };
}

beforeEach(async () => {
  await resetPlayerData(db);
  await seedCatalog(db, fixtureCatalog);
});
afterAll(() => db.$disconnect());

describe('seedCatalog', () => {
  it('fixture covers all starter elements', () => {
    const ids = new Set(fixtureCatalog.chemicals.map((c) => c.id));
    for (const e of STARTER_ELEMENTS) expect(ids.has(e)).toBe(true);
  });

  it('writes chemicals, monsters, reactions with inputs and outputs', async () => {
    const c = await counts();
    expect(c.chemicals).toBe(fixtureCatalog.chemicals.length);
    expect(c.monsters).toBe(fixtureCatalog.monsters.length);
    expect(c.reactions).toBe(fixtureCatalog.reactions.length);
    expect(c.inputs).toBe(fixtureCatalog.reactions.reduce((n, r) => n + r.inputs.length, 0));
    expect(c.outputs).toBe(fixtureCatalog.reactions.reduce((n, r) => n + r.outputs.length, 0));
    const r = await db.reaction.findUniqueOrThrow({ where: { id: 'r-co2' } });
    expect(r.ratio).toEqual({ min: 1, max: 4 });
    expect(r.conditions).toEqual({ temperatureC: { min: 450, max: 2500 } });
  });

  it('is idempotent', async () => {
    const before = await counts();
    await seedCatalog(db, fixtureCatalog);
    expect(await counts()).toEqual(before);
  });

  it('deletes reactions absent from the catalog', async () => {
    const smaller: Catalog = { ...fixtureCatalog, reactions: fixtureCatalog.reactions.filter((r) => r.id !== 'r-co') };
    await seedCatalog(db, smaller);
    expect(await db.reaction.findUnique({ where: { id: 'r-co' } })).toBeNull();
    expect(await db.reactionInput.count({ where: { reactionId: 'r-co' } })).toBe(0);
    expect(await db.reaction.count()).toBe(fixtureCatalog.reactions.length - 1);
  });

  it('updates changed reaction fields and replaces its terms', async () => {
    const changed: Catalog = {
      ...fixtureCatalog,
      reactions: fixtureCatalog.reactions.map((r) =>
        r.id === 'r-water' ? { ...r, durationS: 30, inputs: [{ chemicalId: 'h2', coefficient: 4 }] } : r),
    };
    await seedCatalog(db, changed);
    const r = await db.reaction.findUniqueOrThrow({ where: { id: 'r-water' }, include: { inputs: true } });
    expect(r.durationS).toBe(30);
    expect(r.inputs).toHaveLength(1);
    expect(r.inputs[0]?.coefficient).toBe(4);
  });

  it('rejects player_monsters.count = -1 via CHECK constraint', async () => {
    const u = await db.user.create({ data: { email: 'a@b.c', displayName: 'a', passwordHash: 'x' } });
    await expect(
      db.playerMonster.create({ data: { playerId: u.id, chemicalId: 'h2', count: -1 } }),
    ).rejects.toThrow(/check|constraint/i);
  });
});
