import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ApiErrorBodySchema, DeliverResponseSchema, MarketOrdersResponseSchema, MeResponseSchema, orderKey, pickTemplate,
  STARTER_ELEMENTS, type Buyers, type MarketOrdersResponse, type OrderTemplate, type StallView,
} from '@chemimon/shared';
import { createApp } from '../src/app';
import { seedCatalog } from '../src/seed';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { fixtureBuyers } from './helpers/fixtureBuyers';
import { fixtureEconomy } from './helpers/fixtureEconomy';
import { app as app0, clock, cookieOf, db } from './helpers/app';

type App = typeof app0;
const T0 = new Date('2026-11-20T00:00:00Z');
const { orderCooldownS: COOLDOWN_S, orderLifetimeS: LIFETIME_S } = fixtureBuyers;
const at = (base: Date, s: number) => new Date(base.getTime() + s * 1000);
const makeApp = (buyers: Buyers, market = 1) =>
  createApp({
    db, catalog: fixtureCatalog, economy: fixtureEconomy, buyers, now: () => clock.now,
    timeScale: { breeding: 0, extractor: 0, expedition: 0, market },
  });
const tpl = (id: string): OrderTemplate => fixtureBuyers.orders.find((o) => o.id === id)!;
/** A real food template whose chemical (co2) is in the fixture catalog but is not a starter. */
const sodaCo2: OrderTemplate = {
  id: 'soda-co2', stallId: 'food', buyer: 'Xưởng nước ngọt', chemicalId: 'co2', count: 3, reward: 25, line: 'tạo ga cho nước ngọt',
};
const cityTemplates = fixtureBuyers.orders.filter((o) => o.stallId === 'city');

async function register(n = 0, a: App = app0): Promise<{ cookie: string; id: string }> {
  const r = { email: `m${n}@example.com`, password: 'password123', displayName: `Trader_${n}` };
  const res = await a.request('/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(r),
  });
  const cookie = cookieOf(res);
  const me = MeResponseSchema.parse(await (await a.request('/api/me', { headers: { cookie } })).json());
  return { cookie, id: me.player.id };
}
const getRaw = (cookie: string, a: App = app0) => a.request('/api/market/orders', { headers: { cookie } });
async function orders(cookie: string, a: App = app0): Promise<MarketOrdersResponse> {
  const res = await getRaw(cookie, a);
  expect(res.status).toBe(200);
  return MarketOrdersResponseSchema.parse(await res.json());
}
const stall = (r: MarketOrdersResponse, id: string): StallView => r.stalls.find((s) => s.id === id)!;
const deliver = (cookie: string, orderId: string, a: App = app0) =>
  a.request(`/api/market/orders/${orderId}/deliver`, { method: 'POST', headers: { cookie } });
const errOf = async (res: Response) => ApiErrorBodySchema.parse(await res.json()).error;
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
const coinsOf = async (id: string) => (await db.user.findUniqueOrThrow({ where: { id } })).coins;
/** Everything a refused deliver must leave alone. */
async function snapshot(id: string) {
  return {
    inv: await inv(id),
    coins: await coinsOf(id),
    ledger: await db.coinLedger.count({ where: { playerId: id } }),
    orders: await db.marketOrder.findMany({ where: { playerId: id }, orderBy: { id: 'asc' } }),
  };
}
async function outcome(responses: Response[]): Promise<[number, string | null][]> {
  const out = await Promise.all(
    responses.map(async (r) => [r.status, r.status >= 400 ? (await errOf(r)).code : null] as [number, string | null]),
  );
  return out.sort((a, b) => a[0] - b[0]);
}
const starterEligible = (stallId: string) =>
  fixtureBuyers.orders.filter((o) => o.stallId === stallId && (STARTER_ELEMENTS as readonly string[]).includes(o.chemicalId));

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = T0;
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

describe('GET /api/market/orders', () => {
  it('requires auth', async () => {
    expect((await app0.request('/api/market/orders')).status).toBe(401);
    expect((await app0.request('/api/market/orders/x/deliver', { method: 'POST' })).status).toBe(401);
  });

  it('a fresh player (6 starters): food is snack-n2, city is its key pick, factory and tech are empty', async () => {
    const p = await register();
    const r = await orders(p.cookie);
    expect(r.stalls.map((s) => [s.id, s.name, s.icon])).toEqual(fixtureBuyers.stalls.map((s) => [s.id, s.name, s.icon]));
    const food = stall(r, 'food');
    expect(food.readyAt).toBeNull();
    expect(food.order).toMatchObject({
      templateId: 'snack-n2', buyer: 'Xưởng bánh snack', chemicalId: 'n2', count: 3, reward: 15,
      line: 'bơm vào túi snack để bánh không ẩm, không nát', expiresAt: at(T0, LIFETIME_S).toISOString(),
    });
    const city = stall(r, 'city');
    expect(['pool-cl2', 'hospital-o2', 'bus-h2', 'pencil-c']).toContain(city.order!.templateId);
    expect(city.order!.templateId).toBe(pickTemplate(starterEligible('city'), orderKey(p.id, 'city', 0, T0, LIFETIME_S))!.id);
    expect(stall(r, 'factory')).toMatchObject({ order: null, readyAt: null });
    expect(stall(r, 'tech')).toMatchObject({ order: null, readyAt: null });

    const rows = await db.marketOrder.findMany({ where: { playerId: p.id }, orderBy: { stallId: 'asc' } });
    expect(rows.map((o) => [o.stallId, o.status])).toEqual([['city', 'open'], ['food', 'open']]);
    expect(rows[1]).toMatchObject({ id: food.order!.id, chemicalId: 'n2', count: 3, reward: 15, openedAt: T0, deliveredAt: null });
  });

  it('an account that discovered every element sees an order in all 4 stalls', async () => {
    const p = await register();
    const elements = fixtureCatalog.chemicals.filter((c) => c.kind === 'element').map((c) => c.id);
    await db.playerDiscovery.createMany({
      data: elements.map((chemicalId) => ({ playerId: p.id, chemicalId, source: 'expedition' })),
      skipDuplicates: true,
    });
    const r = await orders(p.cookie);
    expect(r.stalls.map((s) => s.order?.templateId ?? null)).toEqual([
      'snack-n2', 'steel-fe', expect.any(String), 'ring-au',
    ]);
  });

  it('is deterministic: the same player and clock read twice give the same orders; another player gets its own key pick', async () => {
    const p = await register(1);
    const a = await orders(p.cookie);
    const b = await orders(p.cookie);
    expect(b).toEqual(a);
    expect(await db.marketOrder.count({ where: { playerId: p.id } })).toBe(2);

    const q = await register(2);
    const c = await orders(q.cookie);
    expect(stall(c, 'city').order!.templateId).toBe(
      pickTemplate(starterEligible('city'), orderKey(q.id, 'city', 0, T0, LIFETIME_S))!.id,
    );
    expect(stall(c, 'food').order!.id).not.toBe(stall(a, 'food').order!.id);
  });

  it('Review Focus 2: two concurrent first reads open exactly one row per stall', async () => {
    for (let n = 0; n < 3; n++) {
      const p = await register(10 + n);
      const [r1, r2] = await Promise.all([getRaw(p.cookie), getRaw(p.cookie)]);
      expect([r1.status, r2.status]).toEqual([200, 200]);
      const b1 = MarketOrdersResponseSchema.parse(await r1.json());
      const b2 = MarketOrdersResponseSchema.parse(await r2.json());
      expect(b2).toEqual(b1);
      const rows = await db.marketOrder.groupBy({ by: ['stallId'], where: { playerId: p.id, status: 'open' }, _count: true });
      expect(rows.map((x) => [x.stallId, x._count]).sort()).toEqual([['city', 1], ['food', 1]]);
    }
  });

  it('Review Focus 3: discovering a chemical while an order is open does not change it', async () => {
    const buyers: Buyers = { ...fixtureBuyers, orders: [...fixtureBuyers.orders, sodaCo2] };
    const a = makeApp(buyers);
    const p = await register(0, a);
    // A clock window where this player's key would pick soda-co2 once co2 is eligible.
    let k = 0;
    while (pickTemplate([tpl('snack-n2'), sodaCo2], orderKey(p.id, 'food', 0, at(T0, k * LIFETIME_S), LIFETIME_S))!.id !== 'soda-co2') k++;
    clock.now = at(T0, k * LIFETIME_S);
    const before = stall(await orders(p.cookie, a), 'food').order!;
    expect(before.templateId).toBe('snack-n2');

    await db.playerDiscovery.create({ data: { playerId: p.id, chemicalId: 'co2', source: 'expedition' } });
    clock.now = at(clock.now, 60);
    const after = stall(await orders(p.cookie, a), 'food').order!;
    expect(after).toEqual(before);
    expect(await db.marketOrder.count({ where: { playerId: p.id, stallId: 'food' } })).toBe(1);
  });

  it('an open order is a snapshot: a content change to its template does not change chemical, count or reward', async () => {
    const p = await register();
    const opened = stall(await orders(p.cookie), 'food').order!;
    const changed = makeApp({
      ...fixtureBuyers,
      orders: fixtureBuyers.orders.map((o) => (o.id === 'snack-n2' ? { ...o, count: 1, reward: 99 } : o)),
    });
    expect(stall(await orders(p.cookie, changed), 'food').order).toEqual(opened);
    const res = await deliver(p.cookie, opened.id, changed);
    expect(res.status).toBe(200);
    const body = DeliverResponseSchema.parse(await res.json());
    expect(body.inventory).toEqual({ chemicalId: 'n2', count: 1 });
    expect(body.coins).toBe(fixtureEconomy.starterCoins + 15);
  });

  it('an open order whose template is gone from content is set to expired on read', async () => {
    const p = await register();
    const opened = stall(await orders(p.cookie), 'food').order!;
    const gone = makeApp({ ...fixtureBuyers, orders: fixtureBuyers.orders.filter((o) => o.id !== 'snack-n2') });
    expect(stall(await orders(p.cookie, gone), 'food')).toMatchObject({ order: null, readyAt: null });
    expect((await db.marketOrder.findUniqueOrThrow({ where: { id: opened.id } })).status).toBe('expired');
    expect(await db.marketOrder.count({ where: { playerId: p.id, stallId: 'food', status: 'open' } })).toBe(0);
  });
});

describe('POST /api/market/orders/:id/deliver', () => {
  it('deliver snack-n2: pays the reward, removes 3 N₂, writes one order ledger row, then the stall waits the cooldown', async () => {
    const p = await register();
    const order = stall(await orders(p.cookie), 'food').order!;
    clock.now = at(T0, 100);
    const res = await deliver(p.cookie, order.id);
    expect(res.status).toBe(200);
    const body = DeliverResponseSchema.parse(await res.json());
    const deliveredAt = clock.now;
    const readyAt = at(deliveredAt, COOLDOWN_S).toISOString();
    expect(body).toEqual({
      coins: fixtureEconomy.starterCoins + 15,
      inventory: { chemicalId: 'n2', count: 1 },
      stall: { id: 'food', name: 'Phố ẩm thực', icon: '🍜', order: null, readyAt },
    });
    expect(await coinsOf(p.id)).toBe(fixtureEconomy.starterCoins + 15);
    const ledger = await db.coinLedger.findMany({ where: { playerId: p.id, reason: 'order' } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ delta: 15, refId: order.id, balanceAfter: fixtureEconomy.starterCoins + 15 });
    expect(await db.marketOrder.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: 'delivered', deliveredAt });

    clock.now = at(deliveredAt, COOLDOWN_S - 1);
    expect(stall(await orders(p.cookie), 'food')).toMatchObject({ order: null, readyAt });
    expect(await db.marketOrder.count({ where: { playerId: p.id, stallId: 'food' } })).toBe(1);

    clock.now = at(deliveredAt, COOLDOWN_S);
    const next = stall(await orders(p.cookie), 'food');
    expect(next.readyAt).toBeNull();
    expect(next.order).toMatchObject({ templateId: 'snack-n2', expiresAt: at(clock.now, LIFETIME_S).toISOString() });
    expect(next.order!.id).not.toBe(order.id);
  });

  it('the delivered count of the stall is part of the key of the next order', async () => {
    const p = await register();
    const first = stall(await orders(p.cookie), 'city').order!;
    await setCount(p.id, first.chemicalId, first.count);
    expect((await deliver(p.cookie, first.id)).status).toBe(200);
    // A read time where delivered count 1 and 0 pick different templates, so the assertion proves the count is in the key.
    const pickAt = (n: number, t: Date) => pickTemplate(starterEligible('city'), orderKey(p.id, 'city', n, t, LIFETIME_S))!.id;
    let k = 0;
    while (pickAt(1, at(T0, COOLDOWN_S + k * LIFETIME_S)) === pickAt(0, at(T0, COOLDOWN_S + k * LIFETIME_S))) k++;
    clock.now = at(T0, COOLDOWN_S + k * LIFETIME_S);
    const next = stall(await orders(p.cookie), 'city').order!;
    expect(next.templateId).toBe(pickTemplate(starterEligible('city'), orderKey(p.id, 'city', 1, clock.now, LIFETIME_S))!.id);
    const row = await db.marketOrder.findUniqueOrThrow({ where: { id: next.id } });
    expect(row.openedAt).toEqual(clock.now);
  });

  it('Review Focus 1: two concurrent delivers of one order: one 200, one 409 ORDER_CLOSED, one ledger row, monsters removed once', async () => {
    for (let n = 0; n < 3; n++) {
      const p = await register(20 + n);
      const order = stall(await orders(p.cookie), 'food').order!;
      const res = await Promise.all([deliver(p.cookie, order.id), deliver(p.cookie, order.id)]);
      expect(await outcome(res)).toEqual([[200, null], [409, 'ORDER_CLOSED']]);
      expect(await db.coinLedger.count({ where: { playerId: p.id, reason: 'order' } })).toBe(1);
      expect((await inv(p.id)).n2).toBe(1);
      expect(await coinsOf(p.id)).toBe(fixtureEconomy.starterCoins + 15);
    }
  });

  it('a delivered order delivered again -> 409 ORDER_CLOSED; an expired row -> 409 ORDER_CLOSED', async () => {
    const p = await register();
    const order = stall(await orders(p.cookie), 'food').order!;
    await setCount(p.id, 'n2', 10);
    expect((await deliver(p.cookie, order.id)).status).toBe(200);
    const again = await deliver(p.cookie, order.id);
    expect(again.status).toBe(409);
    expect((await errOf(again)).code).toBe('ORDER_CLOSED');

    const city = stall(await orders(p.cookie), 'city').order!;
    clock.now = at(T0, LIFETIME_S);
    await orders(p.cookie); // sets the city row expired
    const res = await deliver(p.cookie, city.id);
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('ORDER_CLOSED');
  });

  it('Review Focus 4: deliver at expires_at -> 409 ORDER_EXPIRED, no change; the next read expires it and opens a full new order', async () => {
    const p = await register();
    const order = stall(await orders(p.cookie), 'food').order!;
    clock.now = new Date(order.expiresAt);
    const before = await snapshot(p.id);
    const res = await deliver(p.cookie, order.id);
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('ORDER_EXPIRED');
    expect(await snapshot(p.id)).toEqual(before);

    const next = stall(await orders(p.cookie), 'food').order!;
    expect((await db.marketOrder.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('expired');
    expect(next.id).not.toBe(order.id);
    expect(next.expiresAt).toBe(at(clock.now, LIFETIME_S).toISOString());
  });

  it('one millisecond before expires_at the order can still be delivered', async () => {
    const p = await register();
    const order = stall(await orders(p.cookie), 'food').order!;
    clock.now = new Date(new Date(order.expiresAt).getTime() - 1);
    expect((await deliver(p.cookie, order.id)).status).toBe(200);
  });

  it('2 N₂ of 3 -> 409 INSUFFICIENT_MONSTERS, no change', async () => {
    const p = await register();
    const order = stall(await orders(p.cookie), 'food').order!;
    await setCount(p.id, 'n2', 2);
    const before = await snapshot(p.id);
    const res = await deliver(p.cookie, order.id);
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('INSUFFICIENT_MONSTERS');
    expect(await snapshot(p.id)).toEqual(before);
  });

  it('another player\'s order, an unknown uuid and a malformed id -> 404 UNKNOWN_ORDER', async () => {
    const p = await register(1);
    const q = await register(2);
    const theirs = stall(await orders(q.cookie), 'food').order!;
    const before = await snapshot(q.id);
    for (const id of [theirs.id, '00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
      const res = await deliver(p.cookie, id);
      expect(res.status).toBe(404);
      expect((await errOf(res)).code).toBe('UNKNOWN_ORDER');
    }
    expect(await snapshot(q.id)).toEqual(before);
  });

  it('MARKET_TIME_SCALE 0.5 halves the lifetime and the cooldown', async () => {
    const half = makeApp(fixtureBuyers, 0.5);
    const p = await register(0, half);
    const order = stall(await orders(p.cookie, half), 'food').order!;
    expect(order.expiresAt).toBe(at(T0, LIFETIME_S / 2).toISOString());
    const body = DeliverResponseSchema.parse(await (await deliver(p.cookie, order.id, half)).json());
    expect(body.stall.readyAt).toBe(at(T0, COOLDOWN_S / 2).toISOString());
    clock.now = at(T0, COOLDOWN_S / 2);
    expect(stall(await orders(p.cookie, half), 'food').order).not.toBeNull();
  });
});
