import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CodexResponseSchema, QuestsResponseSchema, STARTER_ELEMENTS } from '@chemimon/shared';
import { recordDiscoveries } from '../src/player/discoveries';
import { seedCatalog } from '../src/seed';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { app, clock, cookieOf, db, post, reg } from './helpers/app';

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = new Date('2026-11-20T00:00:00Z');
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

describe('starter kit discoveries', () => {
  it('register: 6 x 4 monsters, 200 Xu, 6 starter discovery rows without bred_at, Codex owns exactly those 6', async () => {
    const res = await post('/api/auth/register', reg);
    expect(res.status).toBe(201);
    const cookie = cookieOf(res);
    const u = await db.user.findFirstOrThrow();
    expect(u.coins).toBe(200);
    const mons = await db.playerMonster.findMany({ where: { playerId: u.id } });
    expect(mons).toHaveLength(6);
    expect(mons.every((m) => m.count === 4)).toBe(true);
    const rows = await db.playerDiscovery.findMany({ where: { playerId: u.id } });
    expect(rows.map((r) => r.chemicalId).sort()).toEqual([...STARTER_ELEMENTS].sort());
    expect(rows.every((r) => r.source === 'starter' && r.bredAt === null)).toBe(true);
    const { entries } = CodexResponseSchema.parse(await (await app.request('/api/codex', { headers: { cookie } })).json());
    expect(entries.filter((e) => e.state === 'owned').map((e) => e.chemicalId).sort()).toEqual([...STARTER_ELEMENTS].sort());
  });
});

describe('recordDiscoveries', () => {
  it('returns only new ids, keeps the first source, stamps bred_at once for breeding', async () => {
    await post('/api/auth/register', reg);
    const u = await db.user.findFirstOrThrow();
    const t1 = new Date('2026-11-21T00:00:00Z');
    const t2 = new Date('2026-11-22T00:00:00Z');
    const run = (ids: string[], source: 'extractor' | 'expedition' | 'breeding', at: Date) =>
      db.$transaction((tx) => recordDiscoveries(tx, u.id, ids, source, at));
    expect(await run(['mg', 'fe2o3', 'mg'], 'expedition', t1)).toEqual(['mg', 'fe2o3']);
    expect(await run(['mg'], 'extractor', t2)).toEqual([]);
    expect(await run(['mg', 'fe'], 'breeding', t2)).toEqual(['fe']);
    const row = (id: string) => db.playerDiscovery.findUniqueOrThrow({ where: { playerId_chemicalId: { playerId: u.id, chemicalId: id } } });
    expect(await row('mg')).toMatchObject({ source: 'expedition', bredAt: t2 });
    expect(await row('fe')).toMatchObject({ source: 'breeding', bredAt: t2 });
    expect((await row('fe2o3')).bredAt).toBeNull();
    expect(await run(['mg'], 'breeding', new Date('2026-11-23T00:00:00Z'))).toEqual([]);
    expect((await row('mg')).bredAt).toEqual(t2);
  });

  it('the database refuses an unknown source', async () => {
    await post('/api/auth/register', reg);
    const u = await db.user.findFirstOrThrow();
    await expect(db.playerDiscovery.create({ data: { playerId: u.id, chemicalId: 'mg', source: 'gift' } })).rejects.toThrow();
  });
});

describe('discovery_backfill migration', () => {
  it('old account: 25 elements known, compound quests keep their progress, idempotent', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const u = await db.user.findFirstOrThrow();
    // Rebuild the pre-migration state: all 25 monsters, compound rows with no source info and no bred_at, no element rows.
    await db.playerDiscovery.deleteMany({ where: { playerId: u.id } });
    for (const c of fixtureCatalog.chemicals.filter((x) => x.kind === 'element')) {
      await db.playerMonster.upsert({
        where: { playerId_chemicalId: { playerId: u.id, chemicalId: c.id } },
        create: { playerId: u.id, chemicalId: c.id, count: 4 }, update: {},
      });
    }
    const at = new Date('2026-11-10T00:00:00Z');
    await db.playerDiscovery.createMany({ data: ['h2o', 'co2', 'co'].map((chemicalId) => ({ playerId: u.id, chemicalId, discoveredAt: at })) });
    const before = QuestsResponseSchema.parse(await (await app.request('/api/quests', { headers: { cookie } })).json());
    expect(before.quests.find((q) => q.id === 'discover-3')!.progress).toBe(0); // bred_at still null

    const sql = readFileSync(fileURLToPath(new URL('../prisma/migrations/20261125100100_discovery_backfill/migration.sql', import.meta.url)), 'utf8');
    const statements = sql.split(';').map((s) => s.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean);
    expect(statements).toHaveLength(2);
    for (let pass = 0; pass < 2; pass++) {
      for (const s of statements) await db.$executeRawUnsafe(s);
    }

    const { entries } = CodexResponseSchema.parse(await (await app.request('/api/codex', { headers: { cookie } })).json());
    expect(entries.filter((e) => e.state === 'owned')).toHaveLength(25);
    expect(entries.filter((e) => e.state === 'discovered')).toHaveLength(3);
    const rows = await db.playerDiscovery.findMany({ where: { playerId: u.id } });
    expect(rows).toHaveLength(28);
    expect(rows.filter((r) => r.source === 'starter' && r.bredAt === null)).toHaveLength(25);
    for (const r of rows.filter((x) => ['h2o', 'co2', 'co'].includes(x.chemicalId))) {
      expect(r).toMatchObject({ source: 'breeding', bredAt: at });
    }
    const after = QuestsResponseSchema.parse(await (await app.request('/api/quests', { headers: { cookie } })).json());
    expect(after.quests.find((q) => q.id === 'discover-3')).toMatchObject({ progress: 3, done: true });
    expect(after.quests.find((q) => q.id === 'make-water')!.done).toBe(true);
  });
});
