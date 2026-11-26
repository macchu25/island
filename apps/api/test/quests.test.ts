import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadCatalog } from '@chemimon/content';
import { BreedingResponseSchema, MarketOrdersResponseSchema, QuestsResponseSchema, type QuestView } from '@chemimon/shared';
import { questViews, type QuestStats } from '../src/quests/quests';
import { seedCatalog } from '../src/seed';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { app, clock, cookieOf, db, post, reg } from './helpers/app';

const spark = { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'spark' };
const water = { inputs: [{ chemicalId: 'h2', count: 2 }, { chemicalId: 'o2', count: 1 }], conditions: spark };

const send = (path: string, cookie: string, body?: unknown) =>
  app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
async function quests(cookie: string): Promise<Record<string, QuestView>> {
  const res = await app.request('/api/quests', { headers: { cookie } });
  expect(res.status).toBe(200);
  const { quests: list } = QuestsResponseSchema.parse(await res.json());
  return Object.fromEntries(list.map((q) => [q.id, q]));
}

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = new Date('2026-11-20T00:00:00Z');
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

describe('GET /api/quests', () => {
  it('requires auth', async () => {
    expect((await app.request('/api/quests')).status).toBe(401);
  });

  it('a new player: every quest at 0, in order, only quests the fixture catalog can satisfy', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const res = await app.request('/api/quests', { headers: { cookie } });
    const { quests: list } = QuestsResponseSchema.parse(await res.json());
    // Fixture: 5 compounds and no sodium oxides, so discover-10 and one-pair-two-results are hidden.
    expect(list.map((q) => q.id)).toEqual([
      'extract-first', 'breed-first', 'collect-first', 'sell-first', 'expedition-first', 'deliver-first', 'make-water', 'discover-3',
      'hot-1000', 'refine-iron', 'breed-10', 'deliver-10', 'first-discovery', 'complete-codex',
    ]);
    expect(list.every((q) => q.progress === 0 && !q.done)).toBe(true);
    expect(list.find((q) => q.id === 'complete-codex')!.goal).toBe(5);
  });

  it('extractor claim, breed, collect and the water discovery each move their quest', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    expect((await send('/api/extractor/claim', cookie, { chemicalId: 'h2' })).status).toBe(200);
    let q = await quests(cookie);
    expect(q['extract-first']).toMatchObject({ progress: 1, goal: 1, done: true });
    expect(q['breed-first']!.done).toBe(false);

    const started = BreedingResponseSchema.parse(await (await send('/api/breeding', cookie, water)).json());
    if (started.status !== 'STARTED') throw new Error('expected STARTED');
    q = await quests(cookie);
    expect(q['breed-first']!.done).toBe(true);
    expect(q['breed-10']).toMatchObject({ progress: 1, goal: 10, done: false });
    expect(q['collect-first']!.done).toBe(false);

    expect((await send(`/api/breeding/${started.sessionId}/collect`, cookie)).status).toBe(200);
    q = await quests(cookie);
    expect(q['collect-first']!.done).toBe(true);
    expect(q['make-water']!.done).toBe(true);
    expect(q['first-discovery']!.done).toBe(true);
    expect(q['discover-3']).toMatchObject({ progress: 1, goal: 3, done: false });
  });

  it('selling once completes sell-first', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    expect((await quests(cookie))['sell-first']!.done).toBe(false);
    expect((await send('/api/market/sell', cookie, { chemicalId: 'h2', count: 1 })).status).toBe(200);
    expect((await quests(cookie))['sell-first']).toMatchObject({ progress: 1, goal: 1, done: true });
  });

  it('delivering one market order completes deliver-first and moves deliver-10', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    expect((await quests(cookie))['deliver-first']).toMatchObject({ progress: 0, goal: 1, done: false });
    const r = MarketOrdersResponseSchema.parse(await (await app.request('/api/market/orders', { headers: { cookie } })).json());
    const food = r.stalls.find((s) => s.id === 'food')!.order!;
    expect((await send(`/api/market/orders/${food.id}/deliver`, cookie)).status).toBe(200);
    const q = await quests(cookie);
    expect(q['deliver-first']).toMatchObject({ progress: 1, goal: 1, done: true });
    expect(q['deliver-10']).toMatchObject({ progress: 1, goal: 10, done: false });
    // A floor sale is not a delivery.
    expect((await send('/api/market/sell', cookie, { chemicalId: 'h2', count: 1 })).status).toBe(200);
    expect((await quests(cookie))['deliver-10']!.progress).toBe(1);
  });

  it('a 1000 °C breeding completes hot-1000; a 25 °C one does not', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    expect((await send('/api/breeding', cookie, water)).status).toBe(201);
    expect((await quests(cookie))['hot-1000']!.done).toBe(false);
    const hot = {
      inputs: [{ chemicalId: 'c', count: 1 }, { chemicalId: 'o2', count: 1 }],
      conditions: { ...spark, temperatureC: 1000, activation: 'none' },
    };
    expect((await send('/api/breeding', cookie, hot)).status).toBe(201);
    expect((await quests(cookie))['hot-1000']).toMatchObject({ progress: 1, done: true });
  });

  it('first discovery counts only for the player who made it', async () => {
    const a = cookieOf(await post('/api/auth/register', reg));
    const b = cookieOf(await post('/api/auth/register', { email: 'b@example.com', password: 'password123', displayName: 'Bob_1' }));
    for (const cookie of [a, b]) {
      const s = BreedingResponseSchema.parse(await (await send('/api/breeding', cookie, water)).json());
      if (s.status !== 'STARTED') throw new Error('expected STARTED');
      await send(`/api/breeding/${s.sessionId}/collect`, cookie);
    }
    expect((await quests(a))['first-discovery']!.done).toBe(true);
    expect((await quests(b))['first-discovery']!.done).toBe(false);
    expect((await quests(b))['make-water']!.done).toBe(true);
  });
});

describe('discovery-based quests', () => {
  const hotIron = { inputs: [{ chemicalId: 'fe2o3', count: 1 }, { chemicalId: 'h2', count: 3 }], conditions: { ...spark, temperatureC: 1000, activation: 'none' } };

  it('refine-iron: breeding fe2o3 + h2 at 1000 C gives fe a bred_at and completes the quest', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const u = await db.user.findFirstOrThrow();
    await db.playerMonster.create({ data: { playerId: u.id, chemicalId: 'fe2o3', count: 1 } });
    expect((await quests(cookie))['refine-iron']!.done).toBe(false);
    const s = BreedingResponseSchema.parse(await (await send('/api/breeding', cookie, hotIron)).json());
    if (s.status !== 'STARTED') throw new Error('expected STARTED');
    expect((await quests(cookie))['refine-iron']!.done).toBe(false);
    clock.now = new Date(clock.now.getTime() + 1000);
    expect((await send(`/api/breeding/${s.sessionId}/collect`, cookie)).status).toBe(200);
    const fe = await db.playerDiscovery.findUniqueOrThrow({ where: { playerId_chemicalId: { playerId: u.id, chemicalId: 'fe' } } });
    expect(fe).toMatchObject({ source: 'breeding' });
    expect(fe.bredAt).not.toBeNull();
    expect((await quests(cookie))['refine-iron']).toMatchObject({ progress: 1, done: true });
  });

  it('a compound owned from another source does not count until it is bred', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const u = await db.user.findFirstOrThrow();
    await db.playerDiscovery.createMany({ data: [
      { playerId: u.id, chemicalId: 'fe2o3', source: 'expedition' },
      { playerId: u.id, chemicalId: 'fe3o4', source: 'expedition' },
    ] });
    await db.playerMonster.create({ data: { playerId: u.id, chemicalId: 'fe2o3', count: 1 } });
    expect((await quests(cookie))['discover-3']!.progress).toBe(0);
    const s = BreedingResponseSchema.parse(await (await send('/api/breeding', cookie, hotIron)).json());
    if (s.status !== 'STARTED') throw new Error('expected STARTED');
    await send(`/api/breeding/${s.sessionId}/collect`, cookie);
    // h2o is bred now; fe2o3 was only owned, never produced by breeding.
    expect((await quests(cookie))['discover-3']!.progress).toBe(1);
    // Breeding a compound already owned from an expedition stamps bred_at and keeps the source.
    await db.playerMonster.update({ where: { playerId_chemicalId: { playerId: u.id, chemicalId: 'h2' } }, data: { count: 4 } });
    const w = BreedingResponseSchema.parse(await (await send('/api/breeding', cookie, water)).json());
    if (w.status !== 'STARTED') throw new Error('expected STARTED');
    expect((await send(`/api/breeding/${w.sessionId}/collect`, cookie)).status).toBe(200);
    await db.playerDiscovery.update({ where: { playerId_chemicalId: { playerId: u.id, chemicalId: 'h2o' } }, data: { source: 'expedition', bredAt: null } });
    await db.playerMonster.update({ where: { playerId_chemicalId: { playerId: u.id, chemicalId: 'h2' } }, data: { count: 4 } });
    await db.playerMonster.update({ where: { playerId_chemicalId: { playerId: u.id, chemicalId: 'o2' } }, data: { count: 4 } });
    expect((await quests(cookie))['discover-3']!.progress).toBe(0);
    const w2 = BreedingResponseSchema.parse(await (await send('/api/breeding', cookie, water)).json());
    if (w2.status !== 'STARTED') throw new Error('expected STARTED');
    await send(`/api/breeding/${w2.sessionId}/collect`, cookie);
    const h2o = await db.playerDiscovery.findUniqueOrThrow({ where: { playerId_chemicalId: { playerId: u.id, chemicalId: 'h2o' } } });
    expect(h2o.source).toBe('expedition');
    expect(h2o.bredAt).not.toBeNull();
    expect((await quests(cookie))['discover-3']!.progress).toBe(1);
  });

  it('expedition-first counts expedition rows', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const u = await db.user.findFirstOrThrow();
    expect((await quests(cookie))['expedition-first']).toMatchObject({ progress: 0, done: false });
    await db.expedition.create({ data: {
      playerId: u.id, placeId: 'sand', monsterChemicalId: 'h2', status: 'running',
      startedAt: clock.now, readyAt: clock.now, result: [],
    } });
    expect((await quests(cookie))['expedition-first']).toMatchObject({ progress: 1, done: true });
  });
});

describe('questViews', () => {
  const stats = (over: Partial<QuestStats> = {}): QuestStats => ({
    extractorUsed: false, breedingsStarted: 0, breedingsCollected: 0, discovered: new Set(), bred: new Set(), expeditions: 0, delivered: 0, firstDiscoveries: 0, sold: 0, hotBreedings: 0,
    compoundTotal: 20, ...over,
  });
  const all = new Set(['h2o', 'na2o', 'na2o2', 'fe']);

  it('deliver quests count delivered orders and use the approved titles', () => {
    const v = new Map(questViews(stats({ delivered: 3 }), all).map((q) => [q.id, q]));
    expect(v.get('deliver-first')).toMatchObject({ title: 'Giao đơn hàng đầu tiên', progress: 1, goal: 1, done: true });
    expect(v.get('deliver-10')).toMatchObject({ title: 'Giao 10 đơn hàng', progress: 3, goal: 10, done: false });
  });

  it('caps progress at the goal', () => {
    const v = questViews(stats({ breedingsStarted: 37 }), all);
    expect(v.find((q) => q.id === 'breed-10')).toMatchObject({ progress: 10, done: true });
  });

  it('the real catalog shows all 16 quests; one pair counts both sodium oxides', () => {
    const real = loadCatalog();
    const compoundTotal = real.chemicals.filter((c) => c.kind === 'compound').length;
    const v = questViews(stats({ discovered: new Set(['na2o']), compoundTotal }), new Set(real.chemicals.map((c) => c.id)));
    expect(v).toHaveLength(16);
    expect(v.map((q) => q.id).slice(4, 6)).toEqual(['expedition-first', 'deliver-first']);
    expect(v.map((q) => q.id).indexOf('deliver-10')).toBe(v.map((q) => q.id).indexOf('breed-10') + 1);
    expect(v.find((q) => q.id === 'one-pair-two-results')).toMatchObject({ progress: 1, goal: 2, done: false });
    expect(v.find((q) => q.id === 'complete-codex')!.goal).toBe(compoundTotal);
  });

  it('compound-counting quests say breeding, and the Codex hints name the "chưa lai tạo" mark', () => {
    const v = new Map(questViews(stats(), all).map((q) => [q.id, q]));
    expect(v.get('discover-3')!.title).toBe('Lai tạo ra 3 hợp chất');
    expect(v.get('discover-10')!.title).toBe('Lai tạo ra 10 hợp chất');
    expect(v.get('complete-codex')!.title).toBe('Lai tạo đủ mọi hợp chất');
    expect(v.get('discover-10')!.hint).toContain('chưa lai tạo');
    expect(v.get('complete-codex')!.hint).toContain('chưa lai tạo');
  });
});
