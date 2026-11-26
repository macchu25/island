import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ApiErrorBodySchema, BreedingResponseSchema, CodexResponseSchema, CollectResponseSchema, MeResponseSchema,
} from '@chemimon/shared';
import { createApp } from '../src/app';
import { seedCatalog } from '../src/seed';
import { lockPlayer } from '../src/player/grant';
import { applyCoins } from '../src/wallet/ledger';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { fixtureBuyers } from './helpers/fixtureBuyers';
import { fixtureProducts } from './helpers/fixtureProducts';
import { fixtureEconomy } from './helpers/fixtureEconomy';
import { app as app0, clock, cookieOf, db, post, reg } from './helpers/app';

const app1 = createApp({ db, catalog: fixtureCatalog, economy: fixtureEconomy, buyers: fixtureBuyers, products: fixtureProducts, now: () => clock.now, timeScale: { breeding: 1, extractor: 0, expedition: 0, market: 1 } });
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

/** Moves the balance to `target` through the ledger, so the ledger sum stays equal to users.coins. */
async function setCoins(playerId: string, target: number): Promise<void> {
  await db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    const { coins } = await tx.user.findUniqueOrThrow({ where: { id: playerId }, select: { coins: true } });
    const r = await applyCoins(tx, playerId, target - coins, 'sell_floor', `test-set-${target}`);
    if (!r.ok) throw new Error('setCoins failed');
  });
}
const coinsOf = async (id: string) => (await db.user.findUniqueOrThrow({ where: { id } })).coins;
const ledgerOf = (id: string) => db.coinLedger.findMany({ where: { playerId: id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });

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

  it('requests more than owned -> 409 INSUFFICIENT_MONSTERS, nothing consumed, no session', async () => {
    const p = await register();
    await db.playerMonster.updateMany({ where: { playerId: p.id, chemicalId: 'h2' }, data: { count: 2 } });
    const before = await inv(p.id);
    const res = await start(app0, p.cookie, { ...water, inputs: [{ chemicalId: 'h2', count: 4 }, { chemicalId: 'o2', count: 1 }] });
    expect(res.status).toBe(409);
    expect(await errCode(res)).toBe('INSUFFICIENT_MONSTERS');
    expect(await inv(p.id)).toEqual(before);
    expect(await db.breedingSession.count()).toBe(0);
  });

  it('owns 0 of a species, non-reacting combination -> 409 INSUFFICIENT_MONSTERS, not NO_REACTION (no recipe probe)', async () => {
    const p = await register();
    await db.playerMonster.updateMany({ where: { playerId: p.id, chemicalId: 'he' }, data: { count: 0 } });
    const res = await start(app0, p.cookie, { ...water, inputs: [{ chemicalId: 'he', count: 1 }, { chemicalId: 'o2', count: 1 }] });
    expect(res.status).toBe(409);
    expect(await errCode(res)).toBe('INSUFFICIENT_MONSTERS');
    const res2 = await start(app0, p.cookie, { ...water, inputs: [{ chemicalId: 'co2', count: 1 }] });
    expect(res2.status).toBe(409);
    expect(await errCode(res2)).toBe('INSUFFICIENT_MONSTERS');
  });

  it('second input short -> 409 INSUFFICIENT_MONSTERS and h2 is untouched', async () => {
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

describe('breeding fee', () => {
  const hot = { ...water, conditions: { ...spark, temperatureC: 1000 } }; // 40 (1000 C) + 3 (spark) = 43
  const hotNoReaction = { ...water, conditions: { ...spark, temperatureC: 1000, environment: 'inert', activation: 'none' } }; // fee 50

  it('start at 1000 C + spark charges 43 and stores fee 43', async () => {
    const p = await register();
    const id = await startedId(app0, p.cookie, hot);
    expect(await coinsOf(p.id)).toBe(157);
    const row = await db.breedingSession.findUniqueOrThrow({ where: { id } });
    expect(row.fee).toBe(43);
    expect(row.reactionId).toBe('r-water');
    const fee = await db.coinLedger.findMany({ where: { playerId: p.id, reason: 'breeding_fee' } });
    expect(fee).toHaveLength(1);
    expect(fee[0]).toMatchObject({ delta: -43, balanceAfter: 157, refId: id });
  });

  it('a fee-0 start returns 201, stores fee 0, leaves coins and the ledger unchanged', async () => {
    const p = await register();
    // h2 + c matches fixture rule r-draft (no conditions); 25 C, 1 atm, air, none, none costs 0 Xu.
    const free = { inputs: [{ chemicalId: 'h2', count: 1 }, { chemicalId: 'c', count: 1 }], conditions: { ...spark, activation: 'none' } };
    const before = await ledgerOf(p.id);
    const id = await startedId(app0, p.cookie, free);
    expect((await db.breedingSession.findUniqueOrThrow({ where: { id } })).fee).toBe(0);
    expect(await coinsOf(p.id)).toBe(200);
    expect(await ledgerOf(p.id)).toEqual(before);
  });

  it('25 C spark water rule charges 3', async () => {
    const p = await register();
    const id = await startedId(app0, p.cookie, water);
    expect(await coinsOf(p.id)).toBe(197);
    expect((await db.breedingSession.findUniqueOrThrow({ where: { id } })).fee).toBe(3);
  });

  it('NO_REACTION with 0 Xu returns NO_REACTION and writes no ledger row', async () => {
    const p = await register();
    await setCoins(p.id, 0);
    const before = await ledgerOf(p.id);
    const beforeInv = await inv(p.id);
    const res = await start(app0, p.cookie, hotNoReaction);
    expect(res.status).toBe(200);
    expect(BreedingResponseSchema.parse(await res.json())).toEqual({ status: 'NO_REACTION' });
    expect(await coinsOf(p.id)).toBe(0);
    expect(await ledgerOf(p.id)).toEqual(before);
    expect(await inv(p.id)).toEqual(beforeInv);
    expect(await db.breedingSession.count()).toBe(0);
  });

  it('NO_REACTION with coins never charges', async () => {
    const p = await register();
    const res = await start(app0, p.cookie, hotNoReaction);
    expect(res.status).toBe(200);
    expect(await coinsOf(p.id)).toBe(200);
    expect(await db.coinLedger.count({ where: { playerId: p.id } })).toBe(1);
  });

  it('exactly the fee in Xu starts and leaves 0', async () => {
    const p = await register();
    await setCoins(p.id, 43);
    await startedId(app0, p.cookie, hot);
    expect(await coinsOf(p.id)).toBe(0);
    const ledger = await ledgerOf(p.id);
    expect(ledger.reduce((s, r) => s + r.delta, 0)).toBe(0);
    expect(ledger.filter((r) => r.reason === 'breeding_fee')).toMatchObject([{ delta: -43, balanceAfter: 0 }]);
  });

  it('fee - 1 Xu -> 409 INSUFFICIENT_COINS with details {needed, have} and no monsters consumed', async () => {
    const p = await register();
    await setCoins(p.id, 42);
    const before = await inv(p.id);
    const ledgerBefore = await ledgerOf(p.id);
    const res = await start(app0, p.cookie, hot);
    expect(res.status).toBe(409);
    const body = ApiErrorBodySchema.parse(await res.json());
    expect(body.error.code).toBe('INSUFFICIENT_COINS');
    expect(body.error.details).toEqual({ needed: 43, have: 42 });
    expect(await inv(p.id)).toEqual(before);
    expect(await coinsOf(p.id)).toBe(42);
    expect(await ledgerOf(p.id)).toEqual(ledgerBefore);
    expect(await db.breedingSession.count()).toBe(0);
  });

  it('INSUFFICIENT_MONSTERS is reported before INSUFFICIENT_COINS', async () => {
    const p = await register();
    await setCoins(p.id, 0);
    await db.playerMonster.updateMany({ where: { playerId: p.id, chemicalId: 'o2' }, data: { count: 0 } });
    const res = await start(app0, p.cookie, hot);
    expect(res.status).toBe(409);
    expect(await errCode(res)).toBe('INSUFFICIENT_MONSTERS');
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

  it('a starter element product gains bred_at but is not new: the player already had its row', async () => {
    const p = await register();
    await db.playerMonster.create({ data: { playerId: p.id, chemicalId: 'co2', count: 2 } });
    const id = await startedId(app0, p.cookie, { inputs: [{ chemicalId: 'co2', count: 2 }], conditions: { ...spark, temperatureC: 1000, activation: 'none' } });
    const res = await collect(app0, p.cookie, id);
    expect(res.status).toBe(200);
    expect(CollectResponseSchema.parse(await res.json())).toEqual({
      products: [{ chemicalId: 'co', count: 2 }, { chemicalId: 'o2', count: 1 }],
      newDiscoveries: ['co'],
      firstDiscoveries: ['co'],
    });
    const i = await inv(p.id);
    expect(i.co2).toBe(0);
    expect(i.o2).toBe(5);
    // o2 is a starter: the row keeps source 'starter' and gains bred_at.
    const o2 = await db.playerDiscovery.findUniqueOrThrow({ where: { playerId_chemicalId: { playerId: p.id, chemicalId: 'o2' } } });
    expect(o2.source).toBe('starter');
    expect(o2.bredAt).not.toBeNull();
    expect(await db.firstDiscovery.count({ where: { chemicalId: 'o2' } })).toBe(0);
  });

  it('a first bred element is a new discovery; First Discovery stays compounds-only', async () => {
    const p = await register();
    await db.playerMonster.create({ data: { playerId: p.id, chemicalId: 'fe2o3', count: 1 } });
    const hotIron = { inputs: [{ chemicalId: 'fe2o3', count: 1 }, { chemicalId: 'h2', count: 3 }], conditions: { ...spark, temperatureC: 1000, activation: 'none' } };
    const res = await collect(app0, p.cookie, await startedId(app0, p.cookie, hotIron));
    expect(res.status).toBe(200);
    expect(CollectResponseSchema.parse(await res.json())).toEqual({
      products: [{ chemicalId: 'fe', count: 2 }, { chemicalId: 'h2o', count: 3 }],
      newDiscoveries: ['fe', 'h2o'],
      firstDiscoveries: ['h2o'],
    });
    expect(await db.firstDiscovery.count({ where: { chemicalId: 'fe' } })).toBe(0);
  });

  it('R7: a compound already in the Codex from an expedition is not new when first bred', async () => {
    const p = await register();
    await db.playerDiscovery.create({ data: { playerId: p.id, chemicalId: 'h2o', source: 'expedition', discoveredAt: clock.now } });
    const res = await collect(app0, p.cookie, await startedId(app0, p.cookie));
    expect(CollectResponseSchema.parse(await res.json())).toEqual({
      products: [{ chemicalId: 'h2o', count: 2 }], newDiscoveries: [], firstDiscoveries: ['h2o'],
    });
    const row = await db.playerDiscovery.findUniqueOrThrow({ where: { playerId_chemicalId: { playerId: p.id, chemicalId: 'h2o' } } });
    expect(row.source).toBe('expedition');
    expect(row.bredAt).not.toBeNull();
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
