import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadBuyers, loadCatalog, loadEconomy } from '@chemimon/content';
import {
  ApiErrorBodySchema, ExpeditionCollectResponseSchema, ExpeditionsResponseSchema, ExpeditionStartResponseSchema,
  ExtractorClaimResponseSchema, MeResponseSchema, SellResponseSchema,
} from '@chemimon/shared';
import { createApp } from '../src/app';
import { seedCatalog } from '../src/seed';
import { lockPlayer } from '../src/player/grant';
import { applyCoins } from '../src/wallet/ledger';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { fixtureBuyers } from './helpers/fixtureBuyers';
import { fixtureEconomy } from './helpers/fixtureEconomy';
import { app as app0, clock, cookieOf, db } from './helpers/app';

type App = typeof app0;
/** Real durations: sand is 600 s. */
const app1 = createApp({
  db, catalog: fixtureCatalog, economy: fixtureEconomy, buyers: fixtureBuyers, now: () => clock.now,
  timeScale: { breeding: 0, extractor: 0, expedition: 1 },
});

const req = (a: App, path: string, cookie: string, body?: unknown) =>
  a.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const send = (cookie: string, placeId: string, chemicalId: string, a: App = app0) =>
  req(a, '/api/expeditions', cookie, { placeId, chemicalId });
const collect = (cookie: string, id: string, a: App = app0) =>
  a.request(`/api/expeditions/${id}/collect`, { method: 'POST', headers: { cookie } });
const list = async (cookie: string) =>
  ExpeditionsResponseSchema.parse(await (await app0.request('/api/expeditions', { headers: { cookie } })).json());
const errOf = async (res: Response) => ApiErrorBodySchema.parse(await res.json()).error;

async function register(n = 0, a: App = app0): Promise<{ cookie: string; id: string }> {
  const r = { email: `x${n}@example.com`, password: 'password123', displayName: `Explorer_${n}` };
  const cookie = cookieOf(await req(a, '/api/auth/register', '', r));
  const me = MeResponseSchema.parse(await (await a.request('/api/me', { headers: { cookie } })).json());
  return { cookie, id: me.player.id };
}
async function inv(playerId: string): Promise<Record<string, number>> {
  const rows = await db.playerMonster.findMany({ where: { playerId } });
  return Object.fromEntries(rows.map((r) => [r.chemicalId, r.count]));
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
const ledgerSum = async (id: string) =>
  (await db.coinLedger.aggregate({ where: { playerId: id }, _sum: { delta: true } }))._sum.delta ?? 0;
async function sentId(cookie: string, placeId: string, chemicalId: string, a: App = app0): Promise<string> {
  const res = await send(cookie, placeId, chemicalId, a);
  expect(res.status).toBe(201);
  return ExpeditionStartResponseSchema.parse(await res.json()).trip.id;
}
/** Everything a refused send must leave alone. */
async function snapshot(id: string) {
  return {
    inv: await inv(id),
    coins: await coinsOf(id),
    ledger: await db.coinLedger.count({ where: { playerId: id } }),
    trips: await db.expedition.count({ where: { playerId: id } }),
  };
}
/** Statuses sorted ascending, plus the error code of each non-2xx response. */
async function outcome(responses: Response[]): Promise<[number, string | null][]> {
  const out = await Promise.all(
    responses.map(async (r) => [r.status, r.status >= 400 ? (await errOf(r)).code : null] as [number, string | null]),
  );
  return out.sort((a, b) => a[0] - b[0]);
}

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = new Date('2026-11-20T00:00:00Z');
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

describe('GET /api/expeditions', () => {
  it('requires auth', async () => {
    expect((await app0.request('/api/expeditions')).status).toBe(401);
  });

  it('lists every place with unlocked (permitPrice 0 or a permit row) and no trips', async () => {
    const p = await register();
    const body = await list(p.cookie);
    expect(body.places.map((pl) => [pl.id, pl.unlocked])).toEqual([['sand', true], ['iron', true], ['air', false]]);
    expect(body.places[2]).toMatchObject({ fee: 20, permitPrice: 60, bonusHabitat: 'gas', durationS: 1200 });
    expect(body.trips).toEqual([]);
    await db.playerPermit.create({ data: { playerId: p.id, placeId: 'air' } });
    expect((await list(p.cookie)).places.find((pl) => pl.id === 'air')!.unlocked).toBe(true);
  });

  it('trips are running ones of this player only', async () => {
    const p = await register(1);
    const q = await register(2);
    const a = await sentId(p.cookie, 'sand', 'h2');
    const b = await sentId(p.cookie, 'sand', 'c');
    await sentId(q.cookie, 'sand', 'h2');
    expect((await collect(p.cookie, a)).status).toBe(200);
    const trips = (await list(p.cookie)).trips;
    expect(trips.map((t) => t.id)).toEqual([b]);
    expect(trips[0]).toMatchObject({ placeId: 'sand', chemicalId: 'c', status: 'running', result: [{ chemicalId: 'si', count: 4 }] });
  });
});

describe('POST /api/expeditions: send check order', () => {
  /** Two running sand trips (slots full), then 0 Xu, so every later check would also fail. */
  async function allFailing(): Promise<{ cookie: string; id: string }> {
    const p = await register();
    await sentId(p.cookie, 'sand', 'h2');
    await sentId(p.cookie, 'sand', 'h2');
    await setCoins(p.id, 0);
    return p;
  }

  it('requires auth', async () => {
    expect((await send('', 'sand', 'h2')).status).toBe(401);
  });

  it('bad body -> 400 VALIDATION', async () => {
    const p = await register();
    expect((await errOf(await req(app0, '/api/expeditions', p.cookie, { placeId: 'sand' }))).code).toBe('VALIDATION');
  });

  it('1. unknown place -> 400 UNKNOWN_PLACE before anything else', async () => {
    const p = await allFailing();
    const before = await snapshot(p.id);
    const res = await send(p.cookie, 'nowhere', 'he');
    expect(res.status).toBe(400);
    expect((await errOf(res)).code).toBe('UNKNOWN_PLACE');
    expect(await snapshot(p.id)).toEqual(before);
  });

  it('2. locked place -> 409 PLACE_LOCKED before ownership, slots and Xu', async () => {
    const p = await allFailing();
    const before = await snapshot(p.id);
    const res = await send(p.cookie, 'air', 'he');
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('PLACE_LOCKED');
    expect(await snapshot(p.id)).toEqual(before);
  });

  it('3. monster not owned -> 409 INSUFFICIENT_MONSTERS before slots and Xu', async () => {
    const p = await allFailing();
    const before = await snapshot(p.id);
    const res = await send(p.cookie, 'iron', 'he');
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('INSUFFICIENT_MONSTERS');
    expect(await snapshot(p.id)).toEqual(before);
  });

  it('3b. a row at count 0 is not owned -> 409 INSUFFICIENT_MONSTERS', async () => {
    const p = await register();
    await db.playerMonster.updateMany({ where: { playerId: p.id, chemicalId: 'na' }, data: { count: 0 } });
    const before = await snapshot(p.id);
    const res = await send(p.cookie, 'sand', 'na');
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('INSUFFICIENT_MONSTERS');
    expect(await snapshot(p.id)).toEqual(before);
  });

  it('4. no free slot -> 409 SLOTS_FULL before Xu', async () => {
    const p = await allFailing();
    const before = await snapshot(p.id);
    const res = await send(p.cookie, 'iron', 'h2');
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('SLOTS_FULL');
    expect(await snapshot(p.id)).toEqual(before);
  });

  it('5. Xu below fee -> 409 INSUFFICIENT_COINS with { needed, have }', async () => {
    const p = await register();
    await setCoins(p.id, 9);
    const before = await snapshot(p.id);
    const res = await send(p.cookie, 'iron', 'h2');
    expect(res.status).toBe(409);
    expect(await errOf(res)).toMatchObject({ code: 'INSUFFICIENT_COINS', details: { needed: 10, have: 9 } });
    expect(await snapshot(p.id)).toEqual(before);
  });

  it('fee 0 with 0 Xu still sends', async () => {
    const p = await register();
    await setCoins(p.id, 0);
    const res = await send(p.cookie, 'sand', 'h2');
    expect(res.status).toBe(201);
    expect(ExpeditionStartResponseSchema.parse(await res.json()).coins).toBe(0);
  });
});

describe('POST /api/expeditions: send', () => {
  it('fee 0 -> 201, monster leaves inventory, no ledger row', async () => {
    const p = await register();
    const ledgerBefore = await db.coinLedger.count({ where: { playerId: p.id } });
    const res = await send(p.cookie, 'sand', 'h2');
    expect(res.status).toBe(201);
    const body = ExpeditionStartResponseSchema.parse(await res.json());
    expect(body.coins).toBe(200);
    expect(body.trip).toMatchObject({
      placeId: 'sand', chemicalId: 'h2', status: 'running',
      startedAt: clock.now.toISOString(), readyAt: clock.now.toISOString(),
      result: [{ chemicalId: 'si', count: 4 }],
    });
    expect((await inv(p.id)).h2).toBe(3);
    expect(await db.coinLedger.count({ where: { playerId: p.id } })).toBe(ledgerBefore);
    expect(await coinsOf(p.id)).toBe(200);
    const row = await db.expedition.findUniqueOrThrow({ where: { id: body.trip.id } });
    expect(row).toMatchObject({ playerId: p.id, placeId: 'sand', monsterChemicalId: 'h2', status: 'running', collectOutcome: null });
  });

  it('the last monster of a kind can go: the row stays at count 0', async () => {
    const p = await register();
    await db.playerMonster.updateMany({ where: { playerId: p.id, chemicalId: 'na' }, data: { count: 1 } });
    await sentId(p.cookie, 'sand', 'na');
    expect((await inv(p.id)).na).toBe(0);
  });

  it('while the last monster of a kind is away it cannot be sold or bred; collect brings the count back to 1', async () => {
    const p = await register();
    await db.playerMonster.updateMany({ where: { playerId: p.id, chemicalId: 'c' }, data: { count: 1 } });
    const id = await sentId(p.cookie, 'sand', 'c');
    expect((await inv(p.id)).c).toBe(0);

    const sold = await req(app0, '/api/market/sell', p.cookie, { chemicalId: 'c', count: 1 });
    expect(sold.status).toBe(409);
    expect(await errOf(sold)).toMatchObject({ code: 'INSUFFICIENT_MONSTERS' });

    // r-co2 (c + o2 at 450 C or more) would match if c were home.
    const co2 = {
      inputs: [{ chemicalId: 'c', count: 1 }, { chemicalId: 'o2', count: 1 }],
      conditions: { temperatureC: 1000, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'none' },
    };
    const bred = await req(app0, '/api/breeding', p.cookie, co2);
    expect(bred.status).toBe(409);
    expect(await errOf(bred)).toMatchObject({ code: 'INSUFFICIENT_MONSTERS' });
    expect(await db.breedingSession.count({ where: { playerId: p.id } })).toBe(0);

    expect((await collect(p.cookie, id)).status).toBe(200);
    expect((await inv(p.id)).c).toBe(1);
  });

  it('fee 10 -> one expedition_fee ledger row with ref_id = trip id', async () => {
    const p = await register();
    const res = await send(p.cookie, 'iron', 'na');
    expect(res.status).toBe(201);
    const body = ExpeditionStartResponseSchema.parse(await res.json());
    expect(body.coins).toBe(190);
    expect(await coinsOf(p.id)).toBe(190);
    // na is crystal, iron's bonus is metal: base yield.
    expect(body.trip.result).toEqual([{ chemicalId: 'fe2o3', count: 3 }, { chemicalId: 'fe3o4', count: 2 }]);
    const fees = await db.coinLedger.findMany({ where: { playerId: p.id, reason: 'expedition_fee' } });
    expect(fees).toHaveLength(1);
    expect(fees[0]).toMatchObject({ delta: -10, balanceAfter: 190, refId: body.trip.id });
    expect(await ledgerSum(p.id)).toBe(190);
  });

  it('readyAt = now + durationS * 1000 * timeScale.expedition', async () => {
    const p = await register(0, app1);
    const res = await send(p.cookie, 'iron', 'h2', app1);
    const body = ExpeditionStartResponseSchema.parse(await res.json());
    expect(body.trip.readyAt).toBe(new Date(clock.now.getTime() + 900_000).toISOString());
  });

  it('concurrent sends with stock for one -> one 201, one 409 INSUFFICIENT_MONSTERS', async () => {
    const p = await register();
    for (let round = 0; round < 5; round++) {
      await db.expedition.deleteMany({ where: { playerId: p.id } });
      await db.playerMonster.updateMany({ where: { playerId: p.id, chemicalId: 'h2' }, data: { count: 1 } });
      const res = await Promise.all([send(p.cookie, 'sand', 'h2'), send(p.cookie, 'sand', 'h2')]);
      expect(await outcome(res)).toEqual([[201, null], [409, 'INSUFFICIENT_MONSTERS']]);
      expect((await inv(p.id)).h2).toBe(0);
      expect(await db.expedition.count({ where: { playerId: p.id } })).toBe(1);
    }
  });
});

describe('POST /api/expeditions/:id/collect', () => {
  it('requires auth', async () => {
    expect((await collect('', '00000000-0000-4000-8000-000000000000')).status).toBe(401);
  });

  it('returns the monster and adds the yield; the trip leaves the running list', async () => {
    const p = await register();
    const id = await sentId(p.cookie, 'sand', 'h2');
    const res = await collect(p.cookie, id);
    expect(res.status).toBe(200);
    expect(ExpeditionCollectResponseSchema.parse(await res.json())).toEqual({
      returned: { chemicalId: 'h2', count: 1 },
      products: [{ chemicalId: 'si', count: 4 }],
      newDiscoveries: ['si'],
    });
    const i = await inv(p.id);
    expect(i.h2).toBe(4);
    expect(i.si).toBe(4);
    expect((await list(p.cookie)).trips).toEqual([]);
    expect(await db.expedition.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'collected' });
  });

  it('permit then send to air with a gas monster -> bonus yield (floor of 1.5x), monster and drops can share a kind', async () => {
    const p = await register();
    expect((await req(app0, '/api/permits', p.cookie, { placeId: 'air' })).status).toBe(200);
    const res = await send(p.cookie, 'air', 'h2');
    expect(res.status).toBe(201);
    const start = ExpeditionStartResponseSchema.parse(await res.json());
    expect(start.coins).toBe(200 - 60 - 20);
    // h2 is gas, air's bonus is gas: 2 -> 3, 1 -> 1.
    expect(start.trip.result).toEqual([
      { chemicalId: 'n2', count: 3 }, { chemicalId: 'o2', count: 3 }, { chemicalId: 'ar', count: 1 }, { chemicalId: 'ne', count: 1 },
    ]);
    const body = ExpeditionCollectResponseSchema.parse(await (await collect(p.cookie, start.trip.id)).json());
    expect(body.products).toEqual(start.trip.result);
    expect([...body.newDiscoveries].sort()).toEqual(['ar', 'ne']);
    expect(await inv(p.id)).toMatchObject({ h2: 4, n2: 7, o2: 7, ar: 1, ne: 1 });

    // The monster sent can be one of the drops: both counts are added.
    const n2Trip = await sentId(p.cookie, 'air', 'n2');
    expect((await inv(p.id)).n2).toBe(6);
    expect((await collect(p.cookie, n2Trip)).status).toBe(200);
    expect((await inv(p.id)).n2).toBe(6 + 1 + 3);
  });

  it('before readyAt -> 409 NOT_READY, nothing added; at readyAt -> 200', async () => {
    const p = await register(0, app1);
    const id = await sentId(p.cookie, 'sand', 'h2', app1);
    const before = await inv(p.id);
    const early = await collect(p.cookie, id, app1);
    expect(early.status).toBe(409);
    expect((await errOf(early)).code).toBe('NOT_READY');
    clock.now = new Date(clock.now.getTime() + 599_999);
    expect((await collect(p.cookie, id, app1)).status).toBe(409);
    expect(await inv(p.id)).toEqual(before);
    clock.now = new Date(clock.now.getTime() + 1);
    expect((await collect(p.cookie, id, app1)).status).toBe(200);
  });

  it('collect twice -> the same body, monster and yield added once', async () => {
    const p = await register();
    const id = await sentId(p.cookie, 'sand', 'h2');
    const first = await (await collect(p.cookie, id)).json();
    const second = await collect(p.cookie, id);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(first);
    const i = await inv(p.id);
    expect(i.h2).toBe(4);
    expect(i.si).toBe(4);
  });

  it('concurrent collects -> both 200 with equal bodies, added once', async () => {
    const p = await register();
    for (let round = 0; round < 5; round++) {
      const id = await sentId(p.cookie, 'sand', 'h2');
      const siBefore = (await inv(p.id)).si ?? 0;
      const res = await Promise.all([collect(p.cookie, id), collect(p.cookie, id)]);
      expect(res.map((r) => r.status)).toEqual([200, 200]);
      const [a, b] = await Promise.all(res.map((r) => r.json()));
      expect(a).toEqual(b);
      const i = await inv(p.id);
      expect(i.h2).toBe(4);
      expect(i.si).toBe(siBefore + 4);
    }
  });

  it('records discoveries with source expedition; known chemicals keep their first source', async () => {
    const p = await register();
    await db.playerPermit.create({ data: { playerId: p.id, placeId: 'air' } });
    const id = await sentId(p.cookie, 'air', 'h2');
    await collect(p.cookie, id);
    const rows = await db.playerDiscovery.findMany({ where: { playerId: p.id, chemicalId: { in: ['ar', 'ne', 'n2', 'o2'] } } });
    const src = Object.fromEntries(rows.map((r) => [r.chemicalId, [r.source, r.bredAt]]));
    expect(src).toEqual({ ar: ['expedition', null], ne: ['expedition', null], n2: ['starter', null], o2: ['starter', null] });
    const sand = await sentId(p.cookie, 'sand', 'h2');
    const body = ExpeditionCollectResponseSchema.parse(await (await collect(p.cookie, sand)).json());
    expect(body.newDiscoveries).toEqual(['si']);
    const again = ExpeditionCollectResponseSchema.parse(await (await collect(p.cookie, sand)).json());
    expect(again.newDiscoveries).toEqual(['si']);
  });

  it('a trip of another player, an unknown uuid or a malformed id -> 404 NOT_FOUND', async () => {
    const p = await register(1);
    const q = await register(2);
    const id = await sentId(p.cookie, 'sand', 'h2');
    const qBefore = await inv(q.id);
    for (const bad of [id, '00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
      const res = await collect(q.cookie, bad);
      expect(res.status).toBe(404);
      expect((await errOf(res)).code).toBe('NOT_FOUND');
    }
    expect(await inv(q.id)).toEqual(qBefore);
    expect(await db.expedition.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'running' });
  });

  it('a free slot opens after collect', async () => {
    const p = await register();
    const a = await sentId(p.cookie, 'sand', 'h2');
    await sentId(p.cookie, 'sand', 'h2');
    expect((await errOf(await send(p.cookie, 'sand', 'h2'))).code).toBe('SLOTS_FULL');
    await collect(p.cookie, a);
    expect((await send(p.cookie, 'sand', 'h2')).status).toBe(201);
  });
});

describe('no dead end with the shipped content', () => {
  const shipped = loadCatalog();
  const economy = loadEconomy();
  const real = createApp({ db, catalog: shipped, economy, buyers: loadBuyers(), now: () => clock.now, timeScale: { breeding: 0, extractor: 0, expedition: 0 } });

  beforeAll(() => seedCatalog(db, shipped));
  afterAll(() => seedCatalog(db, fixtureCatalog));

  it('0 Xu, empty inventory -> extractor h2 -> sand trip -> collect -> sell sio2 -> coins > 0', async () => {
    const p = await register(0, real);
    await setCoins(p.id, 0);
    await db.playerMonster.updateMany({ where: { playerId: p.id }, data: { count: 0 } });
    expect(await coinsOf(p.id)).toBe(0);

    const claim = await req(real, '/api/extractor/claim', p.cookie, { chemicalId: 'h2' });
    expect(claim.status).toBe(200);
    expect(ExtractorClaimResponseSchema.parse(await claim.json()).inventory).toEqual({ chemicalId: 'h2', count: 1 });

    const sand = economy.places.find((pl) => pl.id === 'sand')!;
    expect(sand.fee).toBe(0);
    const res = await req(real, '/api/expeditions', p.cookie, { placeId: 'sand', chemicalId: 'h2' });
    expect(res.status).toBe(201);
    const trip = ExpeditionStartResponseSchema.parse(await res.json()).trip;
    const got = ExpeditionCollectResponseSchema.parse(
      await (await real.request(`/api/expeditions/${trip.id}/collect`, { method: 'POST', headers: { cookie: p.cookie } })).json(),
    );
    const sio2 = got.products.find((x) => x.chemicalId === 'sio2')!;
    expect(sio2.count).toBeGreaterThan(0);

    const sold = await req(real, '/api/market/sell', p.cookie, { chemicalId: 'sio2', count: sio2.count });
    expect(sold.status).toBe(200);
    const coins = SellResponseSchema.parse(await sold.json()).coins;
    expect(coins).toBe(economy.floorPrices.sio2! * sio2.count);
    expect(coins).toBeGreaterThan(0);
    expect(await coinsOf(p.id)).toBe(coins);
    expect(await ledgerSum(p.id)).toBe(coins);
    expect((await inv(p.id)).h2).toBe(1);
  });
});
