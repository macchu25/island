import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ApiErrorBodySchema, BreedingResponseSchema, CodexResponseSchema, CollectResponseSchema, MeResponseSchema,
} from '@chemimon/shared';
import { createApp } from '../src/app';
import { seedCatalog } from '../src/seed';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { app as app0, clock, cookieOf, db, post, reg } from './helpers/app';

const app1 = createApp({ db, catalog: fixtureCatalog, now: () => clock.now, timeScale: { breeding: 1, extractor: 0 } });
type App = typeof app0;

const spark = { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'spark' };
const water = { inputs: [{ chemicalId: 'h2', count: 2 }, { chemicalId: 'o2', count: 1 }], conditions: spark };

const send = (a: App, path: string, cookie: string, body?: unknown) =>
  a.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const start = (a: App, cookie: string, body: unknown) => send(a, '/api/breeding', cookie, body);
const collect = (a: App, cookie: string, id: string) => send(a, `/api/breeding/${id}/collect`, cookie);
const errCode = async (res: Response) => ApiErrorBodySchema.parse(await res.json()).error.code;

async function register(n = 0): Promise<{ cookie: string; id: string }> {
  const r = n === 0 ? reg : { email: `p${n}@example.com`, password: 'password123', displayName: `Player_${n}` };
  const cookie = cookieOf(await post('/api/auth/register', r));
  const me = MeResponseSchema.parse(await (await app0.request('/api/me', { headers: { cookie } })).json());
  return { cookie, id: me.player.id };
}
async function inv(playerId: string): Promise<Record<string, number>> {
  const rows = await db.playerMonster.findMany({ where: { playerId } });
  return Object.fromEntries(rows.map((r) => [r.chemicalId, r.count]));
}
async function startedId(a: App, cookie: string, body: unknown = water): Promise<string> {
  const res = await start(a, cookie, body);
  expect(res.status).toBe(201);
  const b = BreedingResponseSchema.parse(await res.json());
  if (b.status !== 'STARTED') throw new Error('expected STARTED');
  return b.sessionId;
}

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = new Date('2026-11-20T00:00:00Z');
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

describe('POST /api/breeding', () => {
  it('requires auth', async () => {
    expect((await start(app0, '', water)).status).toBe(401);
  });

  it('h2x2 + o2x1, spark, 25 C -> 201 STARTED, consumes inputs, /me shows session', async () => {
    const p = await register();
    const res = await start(app0, p.cookie, water);
    expect(res.status).toBe(201);
    const body = BreedingResponseSchema.parse(await res.json());
    expect(body).toMatchObject({
      status: 'STARTED',
      readyAt: clock.now.toISOString(),
      consumed: [{ chemicalId: 'h2', count: 2 }, { chemicalId: 'o2', count: 1 }],
    });
    const i = await inv(p.id);
    expect(i.h2).toBe(2);
    expect(i.o2).toBe(3);
    const row = await db.breedingSession.findFirstOrThrow({ where: { playerId: p.id } });
    expect(row.status).toBe('running');
    expect(row.reactionId).toBe('r-water');
    const me = MeResponseSchema.parse(await (await app0.request('/api/me', { headers: { cookie: p.cookie } })).json());
    expect(me.sessions).toHaveLength(1);
    expect(me.sessions[0]).toMatchObject({ id: row.id, status: 'ready', conditions: spark });
  });

  it('timeScale 1: readyAt = now + 10 s and /me shows running', async () => {
    const p = await register();
    const res = await start(app1, p.cookie, water);
    expect(res.status).toBe(201);
    const body = BreedingResponseSchema.parse(await res.json());
    expect(body).toMatchObject({ readyAt: new Date(clock.now.getTime() + 10_000).toISOString() });
    const me = MeResponseSchema.parse(await (await app1.request('/api/me', { headers: { cookie: p.cookie } })).json());
    expect(me.sessions[0]!.status).toBe('running');
  });

  it('NO_REACTION -> 200, inventory unchanged, no session', async () => {
    const p = await register();
    const before = await inv(p.id);
    const res = await start(app0, p.cookie, { ...water, conditions: { ...spark, activation: 'none' } });
    expect(res.status).toBe(200);
    expect(BreedingResponseSchema.parse(await res.json())).toEqual({ status: 'NO_REACTION' });
    expect(await inv(p.id)).toEqual(before);
    expect(await db.breedingSession.count()).toBe(0);
  });

  it('third start while 2 run -> 409 SLOTS_FULL', async () => {
    const p = await register();
    await startedId(app0, p.cookie);
    await startedId(app0, p.cookie, { ...water, inputs: [{ chemicalId: 'h2', count: 1 }, { chemicalId: 'c', count: 1 }] });
    const before = await inv(p.id);
    const res = await start(app0, p.cookie, { ...water, inputs: [{ chemicalId: 'h2', count: 1 }, { chemicalId: 'c', count: 1 }] });
    expect(res.status).toBe(409);
    expect(await errCode(res)).toBe('SLOTS_FULL');
    expect(await inv(p.id)).toEqual(before);
  });

  it('unknown chemical id -> 400 UNKNOWN_CHEMICAL, inventory unchanged', async () => {
    const p = await register();
    const before = await inv(p.id);
    const res = await start(app0, p.cookie, { ...water, inputs: [{ chemicalId: 'h2', count: 2 }, { chemicalId: 'xx9', count: 1 }] });
    expect(res.status).toBe(400);
    expect(await errCode(res)).toBe('UNKNOWN_CHEMICAL');
    expect(await inv(p.id)).toEqual(before);
  });

  it('second input short -> 409 INSUFFICIENT_MONSTERS and the first decrement rolls back', async () => {
    const p = await register();
    await db.playerMonster.updateMany({ where: { playerId: p.id, chemicalId: 'o2' }, data: { count: 0 } });
    const res = await start(app0, p.cookie, water);
    expect(res.status).toBe(409);
    expect(await errCode(res)).toBe('INSUFFICIENT_MONSTERS');
    const i = await inv(p.id);
    expect(i.h2).toBe(4);
    expect(i.o2).toBe(0);
    expect(await db.breedingSession.count()).toBe(0);
  });

  it.each([
    ['same id twice', { ...water, inputs: [{ chemicalId: 'h2', count: 2 }, { chemicalId: 'h2', count: 1 }] }],
    ['count 5', { ...water, inputs: [{ chemicalId: 'h2', count: 5 }, { chemicalId: 'o2', count: 1 }] }],
    ['count 0', { ...water, inputs: [{ chemicalId: 'h2', count: 0 }, { chemicalId: 'o2', count: 1 }] }],
    ['temperature 30', { ...water, conditions: { ...spark, temperatureC: 30 } }],
    ['three inputs', { ...water, inputs: [...water.inputs, { chemicalId: 'c', count: 1 }] }],
  ])('%s -> 400 VALIDATION, inventory unchanged', async (_name, body) => {
    const p = await register();
    const before = await inv(p.id);
    const res = await start(app0, p.cookie, body);
    expect(res.status).toBe(400);
    expect(await errCode(res)).toBe('VALIDATION');
    expect(await inv(p.id)).toEqual(before);
    expect(await db.breedingSession.count()).toBe(0);
  });
});

describe('POST /api/breeding/:id/collect', () => {
  it('collect -> h2o 2, new + first discovery, codex discovered, slot freed', async () => {
    const p = await register();
    const id = await startedId(app0, p.cookie);
    const res = await collect(app0, p.cookie, id);
    expect(res.status).toBe(200);
    expect(CollectResponseSchema.parse(await res.json())).toEqual({
      products: [{ chemicalId: 'h2o', count: 2 }],
      newDiscoveries: ['h2o'],
      firstDiscoveries: ['h2o'],
    });
    expect((await inv(p.id)).h2o).toBe(2);
    const codex = CodexResponseSchema.parse(await (await app0.request('/api/codex', { headers: { cookie: p.cookie } })).json());
    expect(codex.entries.find((e) => e.chemicalId === 'h2o')).toMatchObject({
      state: 'discovered', count: 2, firstDiscoverer: { displayName: 'Alice_1' },
    });
    const me = MeResponseSchema.parse(await (await app0.request('/api/me', { headers: { cookie: p.cookie } })).json());
    expect(me.sessions).toHaveLength(0);
  });

  it('second player doing the same -> new discovery only', async () => {
    const a = await register();
    const b = await register(2);
    expect((await collect(app0, a.cookie, await startedId(app0, a.cookie))).status).toBe(200);
    const res = await collect(app0, b.cookie, await startedId(app0, b.cookie));
    expect(res.status).toBe(200);
    expect(CollectResponseSchema.parse(await res.json())).toEqual({
      products: [{ chemicalId: 'h2o', count: 2 }],
      newDiscoveries: ['h2o'],
      firstDiscoveries: [],
    });
    expect(await db.firstDiscovery.count()).toBe(1);
  });

  it('a player repeating the reaction gets no new discovery', async () => {
    const p = await register();
    await collect(app0, p.cookie, await startedId(app0, p.cookie));
    const res = await collect(app0, p.cookie, await startedId(app0, p.cookie));
    expect(CollectResponseSchema.parse(await res.json())).toEqual({
      products: [{ chemicalId: 'h2o', count: 2 }], newDiscoveries: [], firstDiscoveries: [],
    });
    expect((await inv(p.id)).h2o).toBe(4);
  });

  it('second collect -> identical body, no extra monsters', async () => {
    const p = await register();
    const id = await startedId(app0, p.cookie);
    const r1 = await collect(app0, p.cookie, id);
    const t1 = await r1.text();
    const r2 = await collect(app0, p.cookie, id);
    expect(r2.status).toBe(200);
    expect(await r2.text()).toBe(t1);
    expect((await inv(p.id)).h2o).toBe(2);
  });

  it('timeScale 1: collect at once -> 409 NOT_READY; after 10 s -> 200', async () => {
    const p = await register();
    const id = await startedId(app1, p.cookie);
    const r1 = await collect(app1, p.cookie, id);
    expect(r1.status).toBe(409);
    expect(await errCode(r1)).toBe('NOT_READY');
    expect((await inv(p.id)).h2o ?? 0).toBe(0);
    clock.now = new Date(clock.now.getTime() + 9_999);
    expect((await collect(app1, p.cookie, id)).status).toBe(409);
    clock.now = new Date(clock.now.getTime() + 1);
    const r2 = await collect(app1, p.cookie, id);
    expect(r2.status).toBe(200);
    expect((await inv(p.id)).h2o).toBe(2);
  });

  it('foreign session id -> 404 NOT_FOUND, owner can still collect', async () => {
    const a = await register();
    const b = await register(2);
    const id = await startedId(app0, a.cookie);
    const res = await collect(app0, b.cookie, id);
    expect(res.status).toBe(404);
    expect(await errCode(res)).toBe('NOT_FOUND');
    expect((await inv(b.id)).h2o ?? 0).toBe(0);
    expect((await collect(app0, a.cookie, id)).status).toBe(200);
  });

  it('unknown or malformed session id -> 404 NOT_FOUND', async () => {
    const p = await register();
    const r1 = await collect(app0, p.cookie, '00000000-0000-4000-8000-000000000000');
    expect(r1.status).toBe(404);
    expect(await errCode(r1)).toBe('NOT_FOUND');
    const r2 = await collect(app0, p.cookie, 'not-a-uuid');
    expect(r2.status).toBe(404);
    expect(await errCode(r2)).toBe('NOT_FOUND');
  });

  it('requires auth', async () => {
    expect((await collect(app0, '', '00000000-0000-4000-8000-000000000000')).status).toBe(401);
  });
});
