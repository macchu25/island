import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CodexResponseSchema } from '@chemimon/shared';
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

const get = async (cookie: string) => app.request('/api/codex', { headers: { cookie } });

describe('GET /api/codex', () => {
  it('requires auth', async () => {
    expect((await app.request('/api/codex')).status).toBe(401);
  });
  it('after register: 25 owned, 3 unknown, no email, ordered', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const res = await get(cookie);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.toLowerCase()).not.toContain('example.com');
    const { entries } = CodexResponseSchema.parse(JSON.parse(text));
    expect(entries).toHaveLength(28);
    expect(entries.filter((e) => e.state === 'owned')).toHaveLength(25);
    expect(entries.filter((e) => e.state === 'unknown')).toHaveLength(3);
    expect(entries[0]!.chemicalId).toBe('h2');
    expect(entries[24]!.chemicalId).toBe('pb');
    expect(entries.slice(25).map((e) => e.chemicalId)).toEqual(['co', 'co2', 'h2o']);
    expect(entries[0]!.count).toBe(4);
  });
  it('element stays owned at count 0', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    await db.playerMonster.updateMany({ where: { chemicalId: 'h2' }, data: { count: 0 } });
    const { entries } = CodexResponseSchema.parse(await (await get(cookie)).json());
    expect(entries[0]).toMatchObject({ chemicalId: 'h2', state: 'owned', count: 0, firstDiscoverer: null });
  });
  it('discovered compound with first discoverer', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const u = await db.user.findFirstOrThrow();
    await db.playerDiscovery.create({ data: { playerId: u.id, chemicalId: 'h2o', discoveredAt: clock.now } });
    await db.firstDiscovery.create({ data: { playerId: u.id, chemicalId: 'h2o', discoveredAt: clock.now } });
    await db.playerMonster.create({ data: { playerId: u.id, chemicalId: 'h2o', count: 2 } });
    const text = await (await get(cookie)).text();
    expect(text.toLowerCase()).not.toContain('example.com');
    const { entries } = CodexResponseSchema.parse(JSON.parse(text));
    const h2o = entries.find((e) => e.chemicalId === 'h2o')!;
    expect(h2o).toMatchObject({ state: 'discovered', count: 2 });
    expect(h2o.firstDiscoverer).toEqual({ displayName: 'Alice_1', at: clock.now.toISOString() });
    expect(entries.find((e) => e.chemicalId === 'co2')!.state).toBe('unknown');
  });
  it('hides the first discoverer from a player who has not discovered the compound', async () => {
    cookieOf(await post('/api/auth/register', reg));
    const alice = await db.user.findFirstOrThrow();
    await db.playerDiscovery.create({ data: { playerId: alice.id, chemicalId: 'h2o', discoveredAt: clock.now } });
    await db.firstDiscovery.create({ data: { playerId: alice.id, chemicalId: 'h2o', discoveredAt: clock.now } });
    const bob = cookieOf(await post('/api/auth/register', { email: 'bob@example.com', password: 'password123', displayName: 'Bob_2' }));
    const text = await (await get(bob)).text();
    expect(text).not.toContain('Alice_1');
    const h2o = CodexResponseSchema.parse(JSON.parse(text)).entries.find((e) => e.chemicalId === 'h2o')!;
    expect(h2o).toMatchObject({ state: 'unknown', firstDiscoverer: null });
  });
});
