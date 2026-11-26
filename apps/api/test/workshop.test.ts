import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ApiErrorBodySchema, BlueprintResponseSchema, MeResponseSchema, SellResponseSchema, WORKSHOP_SLOTS,
  WorkshopCollectResponseSchema, WorkshopResponseSchema, WorkshopStartResponseSchema,
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
import { app as app0, clock, cookieOf, db } from './helpers/app';

type App = typeof app0;
const T0 = new Date('2026-11-20T00:00:00Z');
const at = (base: Date, s: number) => new Date(base.getTime() + s * 1000);
/** Real durations (WORKSHOP_TIME_SCALE 1): can is 120 s. */
const app1 = createApp({
  db, catalog: fixtureCatalog, economy: fixtureEconomy, buyers: fixtureBuyers, products: fixtureProducts, now: () => clock.now,
  timeScale: { breeding: 0, extractor: 0, expedition: 0, market: 1, workshop: 1 },
});
const product = (id: string) => fixtureProducts.find((p) => p.id === id)!;

const req = (a: App, path: string, cookie: string, body?: unknown) =>
  a.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const start = (cookie: string, productId: string, a: App = app1) => req(a, '/api/workshop/jobs', cookie, { productId });
const collect = (cookie: string, id: string, a: App = app1) => req(a, `/api/workshop/jobs/${id}/collect`, cookie);
const buy = (cookie: string, productId: string, a: App = app1) => req(a, '/api/workshop/blueprints', cookie, { productId });
const sell = (cookie: string, body: unknown) => req(app1, '/api/market/sell', cookie, body);
const workshop = async (cookie: string) => {
  const res = await app1.request('/api/workshop', { headers: { cookie } });
  expect(res.status).toBe(200);
  return WorkshopResponseSchema.parse(await res.json());
};
const me = async (cookie: string) => MeResponseSchema.parse(await (await app1.request('/api/me', { headers: { cookie } })).json());
const errOf = async (res: Response) => ApiErrorBodySchema.parse(await res.json()).error;

async function register(n = 0): Promise<{ cookie: string; id: string }> {
  const r = { email: `w${n}@example.com`, password: 'password123', displayName: `Maker_${n}` };
  const cookie = cookieOf(await req(app1, '/api/auth/register', '', r));
  return { cookie, id: (await me(cookie)).player.id };
}
async function setCount(playerId: string, chemicalId: string, count: number): Promise<void> {
  await db.playerMonster.upsert({
    where: { playerId_chemicalId: { playerId, chemicalId } },
    create: { playerId, chemicalId, count },
    update: { count },
  });
}
async function inv(playerId: string): Promise<Record<string, number>> {
  const rows = await db.playerMonster.findMany({ where: { playerId } });
  return Object.fromEntries(rows.map((r) => [r.chemicalId, r.count]));
}
async function stock(playerId: string): Promise<Record<string, number>> {
  const rows = await db.playerProduct.findMany({ where: { playerId } });
  return Object.fromEntries(rows.map((r) => [r.productId, r.count]));
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
async function snapshot(id: string) {
  return {
    inv: await inv(id),
    stock: await stock(id),
    coins: await coinsOf(id),
    ledger: await db.coinLedger.count({ where: { playerId: id } }),
    jobs: await db.workshopJob.count({ where: { playerId: id } }),
    blueprints: await db.playerBlueprint.count({ where: { playerId: id } }),
  };
}
async function outcome(responses: Response[]): Promise<[number, string | null][]> {
  const out = await Promise.all(
    responses.map(async (r) => [r.status, r.status >= 400 ? (await errOf(r)).code : null] as [number, string | null]),
  );
  return out.sort((a, b) => a[0] - b[0]);
}
async function startedId(cookie: string, productId: string, a: App = app1): Promise<string> {
  const res = await start(cookie, productId, a);
  expect(res.status).toBe(201);
  return WorkshopStartResponseSchema.parse(await res.json()).job.id;
}

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = T0;
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

describe('GET /api/workshop', () => {
  it('requires auth', async () => {
    expect((await app1.request('/api/workshop')).status).toBe(401);
    expect((await req(app1, '/api/workshop/jobs', '', { productId: 'can' })).status).toBe(401);
    expect((await req(app1, '/api/workshop/blueprints', '', { productId: 'soap' })).status).toBe(401);
    expect((await req(app1, '/api/workshop/jobs/00000000-0000-4000-8000-000000000000/collect', '')).status).toBe(401);
  });

  it('a fresh player: can and wire unlocked, soap locked, no jobs', async () => {
    const p = await register();
    const w = await workshop(p.cookie);
    expect(w.products.map((x) => [x.id, x.unlocked])).toEqual([['can', true], ['wire', true], ['soap', false]]);
    expect(w.products[2]).toMatchObject({ ...product('soap'), unlocked: false });
    expect(w.jobs).toEqual([]);
  });
});

describe('POST /api/workshop/jobs', () => {
  it('start can with 2 Al: job running, Al 0, readyAt = now + 120 s; the list shows it', async () => {
    const p = await register();
    await setCount(p.id, 'al', 2);
    const res = await start(p.cookie, 'can');
    expect(res.status).toBe(201);
    const { job } = WorkshopStartResponseSchema.parse(await res.json());
    expect(job).toMatchObject({
      productId: 'can', status: 'running', startedAt: T0.toISOString(), readyAt: at(T0, product('can').durationS).toISOString(),
    });
    expect((await inv(p.id)).al).toBe(0);
    expect((await workshop(p.cookie)).jobs).toEqual([job]);
    // No Xu fee for crafting.
    expect(await coinsOf(p.id)).toBe(fixtureEconomy.starterCoins);
  });

  it('a second start with 0 Al -> 409 INSUFFICIENT_MONSTERS, no change', async () => {
    const p = await register();
    await setCount(p.id, 'al', 2);
    await startedId(p.cookie, 'can');
    const before = await snapshot(p.id);
    const res = await start(p.cookie, 'can');
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('INSUFFICIENT_MONSTERS');
    expect(await snapshot(p.id)).toEqual(before);
  });

  it(`a job past ${WORKSHOP_SLOTS} running -> 409 SLOTS_FULL, no change`, async () => {
    const p = await register();
    await setCount(p.id, 'al', 6);
    for (let i = 0; i < WORKSHOP_SLOTS; i++) await startedId(p.cookie, 'can');
    const before = await snapshot(p.id);
    const res = await start(p.cookie, 'can');
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('SLOTS_FULL');
    expect(await snapshot(p.id)).toEqual(before);
    expect((await inv(p.id)).al).toBe(2);
  });

  it('two ingredients (soap: 2 Na + 1 H2O) are both removed', async () => {
    const p = await register();
    expect((await buy(p.cookie, 'soap')).status).toBe(200);
    await setCount(p.id, 'h2o', 1);
    const naBefore = (await inv(p.id)).na!;
    await startedId(p.cookie, 'soap');
    expect(await inv(p.id)).toMatchObject({ na: naBefore - 2, h2o: 0 });
  });

  it('soap before its blueprint -> 409 BLUEPRINT_LOCKED; unknown product -> 400 UNKNOWN_PRODUCT; no change', async () => {
    const p = await register();
    await setCount(p.id, 'h2o', 1);
    const before = await snapshot(p.id);
    const locked = await start(p.cookie, 'soap');
    expect(locked.status).toBe(409);
    expect((await errOf(locked)).code).toBe('BLUEPRINT_LOCKED');
    const unknown = await start(p.cookie, 'unobtainium');
    expect(unknown.status).toBe(400);
    expect((await errOf(unknown)).code).toBe('UNKNOWN_PRODUCT');
    expect((await start(p.cookie, '')).status).toBe(400);
    expect(await snapshot(p.id)).toEqual(before);
  });

  it('Review Focus 2: exact ingredients -> Al 0; the market cannot sell Al and breeding refuses it', async () => {
    const p = await register();
    await setCount(p.id, 'al', 2);
    await startedId(p.cookie, 'can');
    expect((await inv(p.id)).al).toBe(0);

    const sold = await sell(p.cookie, { chemicalId: 'al', count: 1 });
    expect(sold.status).toBe(409);
    expect((await errOf(sold)).code).toBe('INSUFFICIENT_MONSTERS');

    const bred = await req(app1, '/api/breeding', p.cookie, {
      inputs: [{ chemicalId: 'al', count: 1 }, { chemicalId: 'o2', count: 1 }],
      conditions: { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'spark' },
    });
    expect(bred.status).toBe(409);
    expect((await errOf(bred)).code).toBe('INSUFFICIENT_MONSTERS');
    expect((await inv(p.id)).al).toBe(0);
  });

  it('concurrent starts with stock for one -> one 201, one 409 INSUFFICIENT_MONSTERS', async () => {
    for (let n = 0; n < 3; n++) {
      const p = await register(30 + n);
      await setCount(p.id, 'al', 2);
      const res = await Promise.all([start(p.cookie, 'can'), start(p.cookie, 'can')]);
      expect(await outcome(res)).toEqual([[201, null], [409, 'INSUFFICIENT_MONSTERS']]);
      expect((await inv(p.id)).al).toBe(0);
      expect(await db.workshopJob.count({ where: { playerId: p.id } })).toBe(1);
    }
  });

  it('WORKSHOP_TIME_SCALE 0 makes the job ready at once', async () => {
    const p = await register();
    await setCount(p.id, 'al', 2);
    const res = await start(p.cookie, 'can', app0);
    const { job } = WorkshopStartResponseSchema.parse(await res.json());
    expect(job.readyAt).toBe(T0.toISOString());
  });
});

describe('POST /api/workshop/jobs/:id/collect', () => {
  it('before ready -> 409 NOT_READY; after -> one can; collect again -> same body, still 1', async () => {
    const p = await register();
    await setCount(p.id, 'al', 2);
    const id = await startedId(p.cookie, 'can');

    clock.now = at(T0, product('can').durationS - 1);
    const early = await collect(p.cookie, id);
    expect(early.status).toBe(409);
    expect((await errOf(early)).code).toBe('NOT_READY');
    expect(await stock(p.id)).toEqual({});

    clock.now = at(T0, product('can').durationS);
    const res = await collect(p.cookie, id);
    expect(res.status).toBe(200);
    const body = WorkshopCollectResponseSchema.parse(await res.json());
    expect(body).toEqual({ product: { productId: 'can', count: 1 } });
    expect(await stock(p.id)).toEqual({ can: 1 });
    expect((await workshop(p.cookie)).jobs).toEqual([]);
    expect((await db.workshopJob.findUniqueOrThrow({ where: { id } })).collectedAt).toEqual(clock.now);

    clock.now = at(clock.now, 60);
    const again = await collect(p.cookie, id);
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual(body);
    expect(await stock(p.id)).toEqual({ can: 1 });
  });

  it('controller ruling: the body counts what this job made (1), not the stock total', async () => {
    const p = await register();
    await setCount(p.id, 'al', 2);
    await db.playerProduct.create({ data: { playerId: p.id, productId: 'can', count: 2 } });
    const id = await startedId(p.cookie, 'can', app0);
    const body = WorkshopCollectResponseSchema.parse(await (await collect(p.cookie, id, app0)).json());
    expect(body.product).toEqual({ productId: 'can', count: 1 });
    expect((await me(p.cookie)).products).toEqual([{ productId: 'can', count: 3 }]);
  });

  it('Review Focus 1: two concurrent collects -> both 200, equal bodies, one product added', async () => {
    for (let n = 0; n < 3; n++) {
      const p = await register(40 + n);
      await setCount(p.id, 'al', 2);
      const id = await startedId(p.cookie, 'can', app0);
      const res = await Promise.all([collect(p.cookie, id, app0), collect(p.cookie, id, app0)]);
      expect(res.map((r) => r.status)).toEqual([200, 200]);
      const [a, b] = await Promise.all(res.map((r) => r.json()));
      expect(b).toEqual(a);
      expect(await stock(p.id)).toEqual({ can: 1 });
    }
  });

  it("another player's job, an unknown uuid and a malformed id -> 404 NOT_FOUND", async () => {
    const p = await register(1);
    const q = await register(2);
    await setCount(q.id, 'al', 2);
    const theirs = await startedId(q.cookie, 'can', app0);
    for (const id of [theirs, '00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
      const res = await collect(p.cookie, id, app0);
      expect(res.status).toBe(404);
      expect((await errOf(res)).code).toBe('NOT_FOUND');
    }
    expect(await stock(q.id)).toEqual({});
  });
});

describe('POST /api/workshop/blueprints', () => {
  it('buy soap: coins -30, one blueprint ledger row (ref soap), soap unlocked; again -> 409 BLUEPRINT_OWNED', async () => {
    const p = await register();
    const price = product('soap').blueprintPrice;
    const res = await buy(p.cookie, 'soap');
    expect(res.status).toBe(200);
    expect(BlueprintResponseSchema.parse(await res.json())).toEqual({ productId: 'soap', coins: fixtureEconomy.starterCoins - price });
    const ledger = await db.coinLedger.findMany({ where: { playerId: p.id, reason: 'blueprint' } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ delta: -price, refId: 'soap', balanceAfter: fixtureEconomy.starterCoins - price });
    expect((await workshop(p.cookie)).products.find((x) => x.id === 'soap')!.unlocked).toBe(true);

    const before = await snapshot(p.id);
    const again = await buy(p.cookie, 'soap');
    expect(again.status).toBe(409);
    expect((await errOf(again)).code).toBe('BLUEPRINT_OWNED');
    expect(await snapshot(p.id)).toEqual(before);
  });

  it('price-0 can -> 409 BLUEPRINT_OWNED; unknown -> 400 UNKNOWN_PRODUCT; no change', async () => {
    const p = await register();
    const before = await snapshot(p.id);
    const free = await buy(p.cookie, 'can');
    expect(free.status).toBe(409);
    expect((await errOf(free)).code).toBe('BLUEPRINT_OWNED');
    const unknown = await buy(p.cookie, 'unobtainium');
    expect(unknown.status).toBe(400);
    expect((await errOf(unknown)).code).toBe('UNKNOWN_PRODUCT');
    expect(await snapshot(p.id)).toEqual(before);
  });

  it('short Xu -> 409 INSUFFICIENT_COINS with needed and have, no change', async () => {
    const p = await register();
    await setCoins(p.id, 10);
    const before = await snapshot(p.id);
    const res = await buy(p.cookie, 'soap');
    expect(res.status).toBe(409);
    const err = await errOf(res);
    expect(err.code).toBe('INSUFFICIENT_COINS');
    expect(err.details).toEqual({ needed: product('soap').blueprintPrice, have: 10 });
    expect(await snapshot(p.id)).toEqual(before);
  });

  it('Review Focus 3: concurrent double purchase -> one 200, one 409 BLUEPRINT_OWNED, charged once', async () => {
    for (let n = 0; n < 3; n++) {
      const p = await register(50 + n);
      const res = await Promise.all([buy(p.cookie, 'soap'), buy(p.cookie, 'soap')]);
      expect(await outcome(res)).toEqual([[200, null], [409, 'BLUEPRINT_OWNED']]);
      expect(await coinsOf(p.id)).toBe(fixtureEconomy.starterCoins - product('soap').blueprintPrice);
      expect(await db.coinLedger.count({ where: { playerId: p.id, reason: 'blueprint' } })).toBe(1);
      expect(await db.playerBlueprint.count({ where: { playerId: p.id } })).toBe(1);
    }
  });
});

describe('POST /api/market/sell with a product', () => {
  it('sell 1 can -> + floorPrice Xu, one sell_floor row; with 0 cans -> 409 INSUFFICIENT_PRODUCTS', async () => {
    const p = await register();
    await db.playerProduct.create({ data: { playerId: p.id, productId: 'can', count: 1 } });
    const res = await sell(p.cookie, { productId: 'can', count: 1 });
    expect(res.status).toBe(200);
    const body = SellResponseSchema.parse(await res.json());
    expect(body).toEqual({ coins: fixtureEconomy.starterCoins + product('can').floorPrice, product: { productId: 'can', count: 0 } });
    const row = await db.coinLedger.findFirstOrThrow({ where: { playerId: p.id, reason: 'sell_floor' } });
    expect(row).toMatchObject({ delta: product('can').floorPrice, balanceAfter: body.coins });

    const before = await snapshot(p.id);
    const short = await sell(p.cookie, { productId: 'can', count: 1 });
    expect(short.status).toBe(409);
    expect((await errOf(short)).code).toBe('INSUFFICIENT_PRODUCTS');
    // A product never owned at all is short too.
    const never = await sell(p.cookie, { productId: 'wire', count: 1 });
    expect(never.status).toBe(409);
    expect((await errOf(never)).code).toBe('INSUFFICIENT_PRODUCTS');
    expect(await snapshot(p.id)).toEqual(before);
  });

  it('a body with both ids or neither -> 400; an unknown product -> 400 UNKNOWN_PRODUCT', async () => {
    const p = await register();
    const before = await snapshot(p.id);
    for (const body of [{ chemicalId: 'h2', productId: 'can', count: 1 }, { count: 1 }]) {
      const res = await sell(p.cookie, body);
      expect(res.status).toBe(400);
      expect((await errOf(res)).code).toBe('VALIDATION');
    }
    const unknown = await sell(p.cookie, { productId: 'unobtainium', count: 1 });
    expect(unknown.status).toBe(400);
    expect((await errOf(unknown)).code).toBe('UNKNOWN_PRODUCT');
    expect(await snapshot(p.id)).toEqual(before);
  });
});

describe('GET /api/me products', () => {
  it('lists product stock sorted by id', async () => {
    const p = await register();
    expect((await me(p.cookie)).products).toEqual([]);
    await db.playerProduct.createMany({ data: [{ playerId: p.id, productId: 'wire', count: 2 }, { playerId: p.id, productId: 'can', count: 1 }] });
    expect((await me(p.cookie)).products).toEqual([{ productId: 'can', count: 1 }, { productId: 'wire', count: 2 }]);
  });

  it('the DB refuses a negative product count', async () => {
    const p = await register();
    await expect(db.playerProduct.create({ data: { playerId: p.id, productId: 'can', count: -1 } })).rejects.toThrow();
  });
});
