import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BreedingResponseSchema, QuestsResponseSchema, type QuestView } from '@chemimon/shared';
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
    // Fixture: 3 compounds and no sodium oxides, so discover-10 and one-pair-two-results are hidden.
    expect(list.map((q) => q.id)).toEqual([
      'extract-first', 'breed-first', 'collect-first', 'sell-first', 'make-water', 'discover-3', 'hot-1000', 'breed-10', 'first-discovery', 'complete-codex',
    ]);
    expect(list.every((q) => q.progress === 0 && !q.done)).toBe(true);
    expect(list.find((q) => q.id === 'complete-codex')!.goal).toBe(3);
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

describe('questViews', () => {
  const stats = (over: Partial<QuestStats> = {}): QuestStats => ({
    extractorUsed: false, breedingsStarted: 0, breedingsCollected: 0, discovered: new Set(), firstDiscoveries: 0, sold: 0, hotBreedings: 0,
    compoundTotal: 20, ...over,
  });
  const all = new Set(['h2o', 'na2o', 'na2o2']);

  it('caps progress at the goal', () => {
    const v = questViews(stats({ breedingsStarted: 37 }), all);
    expect(v.find((q) => q.id === 'breed-10')).toMatchObject({ progress: 10, done: true });
  });

  it('the real catalog (20 compounds) shows all 12 quests; one pair counts both sodium oxides', () => {
    const v = questViews(stats({ discovered: new Set(['na2o']) }), all);
    expect(v).toHaveLength(12);
    expect(v.find((q) => q.id === 'one-pair-two-results')).toMatchObject({ progress: 1, goal: 2, done: false });
    expect(v.find((q) => q.id === 'complete-codex')!.goal).toBe(20);
  });
});
