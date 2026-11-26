import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadBuyers, loadCatalog, loadEconomy, loadProducts } from '@chemimon/content';
import {
  ApiErrorBodySchema, BREEDING_SLOTS, BreedingResponseSchema, LabBuyResponseSchema, LabsResponseSchema, MeResponseSchema, type Catalog, type ReactionDef,
} from '@chemimon/shared';
import { createApp } from '../src/app';
import { seedCatalog } from '../src/seed';
import { lockPlayer } from '../src/player/grant';
import { applyCoins } from '../src/wallet/ledger';
import { grantLab, resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { fixtureBuyers } from './helpers/fixtureBuyers';
import { fixtureProducts } from './helpers/fixtureProducts';
import { fixtureEconomy } from './helpers/fixtureEconomy';
import { app, clock, cookieOf, db, post, reg } from './helpers/app';

type App = typeof app;
const timeScale = { breeding: 0, extractor: 0, expedition: 0, market: 1, workshop: 0 };

/** A fixture rule that needs 100..200 atm and catalyst Fe, so the pressure lab and catalyst:Fe become useful. */
const feRule: ReactionDef = {
  id: 'r-co-fe', inputs: [{ chemicalId: 'co', coefficient: 2 }, { chemicalId: 'o2', coefficient: 1 }],
  outputs: [{ chemicalId: 'co2', coefficient: 2 }], conditions: { pressureAtm: { min: 100, max: 200 }, catalyst: ['Fe'] },
  priority: 3, durationS: 10, source: 'fixture', reviewed: true,
};
const feCatalog: Catalog = { ...fixtureCatalog, reactions: [...fixtureCatalog.reactions, feRule] };
const appFe = createApp({ db, catalog: feCatalog, economy: fixtureEconomy, buyers: fixtureBuyers, products: fixtureProducts, now: () => clock.now, timeScale });
const liveApp = (includeDrafts: boolean) => createApp({
  db, catalog: loadCatalog({ includeDrafts }), economy: loadEconomy(), buyers: loadBuyers(), products: loadProducts(), now: () => clock.now, timeScale,
});

const spark = { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'spark' };
const water = { inputs: [{ chemicalId: 'h2', count: 2 }, { chemicalId: 'o2', count: 1 }], conditions: spark };

const send = (a: App, path: string, cookie: string, body: unknown) =>
  a.request(path, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body) });
const buy = (cookie: string, itemId: string, a: App = app) => send(a, '/api/labs/buy', cookie, { itemId });
const breed = (cookie: string, body: unknown, a: App = app) => send(a, '/api/breeding', cookie, body);
const errOf = async (res: Response) => ApiErrorBodySchema.parse(await res.json()).error;
const labs = async (cookie: string, a: App = app) => {
  const res = await a.request('/api/labs', { headers: { cookie } });
  expect(res.status).toBe(200);
  return LabsResponseSchema.parse(await res.json()).items;
};

async function register(): Promise<{ cookie: string; id: string }> {
  const cookie = cookieOf(await post('/api/auth/register', reg));
  const me = MeResponseSchema.parse(await (await app.request('/api/me', { headers: { cookie } })).json());
  return { cookie, id: me.player.id };
}
async function setCoins(playerId: string, target: number): Promise<void> {
  await db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    const { coins } = await tx.user.findUniqueOrThrow({ where: { id: playerId }, select: { coins: true } });
    const r = await applyCoins(tx, playerId, target - coins, 'sell_floor', `test-set-${target}`);
    if (!r.ok) throw new Error('setCoins failed');
  });
}
const coinsOf = async (id: string) => (await db.user.findUniqueOrThrow({ where: { id } })).coins;
const labRows = (id: string) => db.coinLedger.findMany({ where: { playerId: id, reason: 'lab' } });
const owned = async (id: string) => (await db.playerLab.findMany({ where: { playerId: id }, orderBy: { itemId: 'asc' } })).map((r) => r.itemId);

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = new Date('2026-11-20T00:00:00Z');
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

describe('GET /api/labs', () => {
  it('requires auth', async () => {
    expect((await app.request('/api/labs')).status).toBe(401);
  });

  it('lists every lab then every paid catalyst, with opens text from content, price, owned and useful', async () => {
    const p = await register();
    expect(await labs(p.cookie)).toEqual([
      { id: 'furnace', kind: 'lab', name: 'Lò cao', opens: 'Mở 1000 °C và 2500 °C', price: 150, owned: false, useful: true },
      { id: 'pressure', kind: 'lab', name: 'Buồng áp suất', opens: 'Mở 100 atm và 200 atm', price: 120, owned: false, useful: false },
      { id: 'cold', kind: 'lab', name: 'Phòng lạnh', opens: 'Mở −78 °C', price: 60, owned: false, useful: false },
      { id: 'electrolysis', kind: 'lab', name: 'Buồng điện phân', opens: 'Mở điện phân', price: 200, owned: false, useful: false },
      { id: 'catalyst:Fe', kind: 'catalyst', name: 'Xúc tác Fe', opens: 'Mở xúc tác Fe', price: 40, owned: false, useful: false },
      { id: 'catalyst:Pt', kind: 'catalyst', name: 'Xúc tác Pt', opens: 'Mở xúc tác Pt', price: 80, owned: false, useful: false },
      { id: 'catalyst:V2O5', kind: 'catalyst', name: 'Xúc tác V2O5', opens: 'Mở xúc tác V2O5', price: 60, owned: false, useful: false },
      { id: 'catalyst:MnO2', kind: 'catalyst', name: 'Xúc tác MnO2', opens: 'Mở xúc tác MnO2', price: 40, owned: false, useful: false },
    ]);
    await grantLab(db, p.id, 'cold');
    expect((await labs(p.cookie)).find((i) => i.id === 'cold')).toMatchObject({ owned: true, useful: false });
  });

  it('useful follows the server catalog: the Fe rule makes pressure and catalyst:Fe useful', async () => {
    const p = await register();
    const useful = (await labs(p.cookie, appFe)).filter((i) => i.useful).map((i) => i.id);
    expect(useful).toEqual(['furnace', 'pressure', 'catalyst:Fe']);
  });

  it('Review Focus 5: live content without drafts: furnace, pressure, Fe useful; electrolysis stays "Chưa dùng được"', async () => {
    const p = await register();
    const live = await labs(p.cookie, liveApp(false));
    expect(live.filter((i) => i.useful).map((i) => i.id)).toEqual(['furnace', 'pressure', 'catalyst:Fe']);
    expect(live.find((i) => i.id === 'electrolysis')).toMatchObject({ useful: false, opens: 'Mở điện phân', price: 200 });
    // The draft electrolysis rules count only when the server loaded drafts (CONTENT_INCLUDE_DRAFTS=1).
    const drafts = await labs(p.cookie, liveApp(true));
    expect(drafts.find((i) => i.id === 'electrolysis')!.useful).toBe(true);
    const res = await buy(p.cookie, 'electrolysis', liveApp(false));
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('LAB_USELESS');
  });
});

describe('POST /api/labs/buy', () => {
  it('requires auth', async () => {
    expect((await buy('', 'furnace')).status).toBe(401);
  });

  it('bad body -> 400 VALIDATION', async () => {
    const p = await register();
    expect((await errOf(await send(app, '/api/labs/buy', p.cookie, {}))).code).toBe('VALIDATION');
  });

  it.each(['nowhere', 'catalyst:none', 'catalyst:Xyz', 'Fe'])('unknown item %s -> 400 UNKNOWN_LAB, nothing charged', async (itemId) => {
    const p = await register();
    const res = await buy(p.cookie, itemId);
    expect(res.status).toBe(400);
    expect((await errOf(res)).code).toBe('UNKNOWN_LAB');
    expect(await coinsOf(p.id)).toBe(200);
  });

  it('buys the furnace: -150 Xu, one ledger row (lab, furnace), then LAB_OWNED with no second charge', async () => {
    const p = await register();
    const res = await buy(p.cookie, 'furnace');
    expect(res.status).toBe(200);
    expect(LabBuyResponseSchema.parse(await res.json())).toEqual({ itemId: 'furnace', coins: 50 });
    expect(await coinsOf(p.id)).toBe(50);
    const rows = await labRows(p.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ delta: -150, balanceAfter: 50, reason: 'lab', refId: 'furnace' });
    expect(await owned(p.id)).toEqual(['furnace']);
    expect((await labs(p.cookie)).find((i) => i.id === 'furnace')!.owned).toBe(true);

    const again = await buy(p.cookie, 'furnace');
    expect(again.status).toBe(409);
    expect((await errOf(again)).code).toBe('LAB_OWNED');
    expect(await coinsOf(p.id)).toBe(50);
    expect(await labRows(p.id)).toHaveLength(1);
  });

  it('a useless lab (cold) -> 409 LAB_USELESS, nothing charged', async () => {
    const p = await register();
    const res = await buy(p.cookie, 'cold');
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('LAB_USELESS');
    expect(await coinsOf(p.id)).toBe(200);
    expect(await owned(p.id)).toEqual([]);
  });

  it('check order: owned comes before useful (a backfilled cold lab -> LAB_OWNED)', async () => {
    const p = await register();
    await grantLab(db, p.id, 'cold');
    const res = await buy(p.cookie, 'cold');
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('LAB_OWNED');
  });

  it('check order: useful comes before Xu (0 Xu, cold -> LAB_USELESS)', async () => {
    const p = await register();
    await setCoins(p.id, 0);
    expect((await errOf(await buy(p.cookie, 'cold'))).code).toBe('LAB_USELESS');
  });

  it('short Xu -> 409 INSUFFICIENT_COINS with needed and have, nothing written', async () => {
    const p = await register();
    await setCoins(p.id, 149);
    const res = await buy(p.cookie, 'furnace');
    expect(res.status).toBe(409);
    expect(await errOf(res)).toMatchObject({ code: 'INSUFFICIENT_COINS', details: { needed: 150, have: 149 } });
    expect(await coinsOf(p.id)).toBe(149);
    expect(await owned(p.id)).toEqual([]);
    expect(await labRows(p.id)).toHaveLength(0);
  });

  it('buys catalyst Fe when a live rule needs it: -40 Xu, ledger ref catalyst:Fe', async () => {
    const p = await register();
    const res = await buy(p.cookie, 'catalyst:Fe', appFe);
    expect(res.status).toBe(200);
    expect(LabBuyResponseSchema.parse(await res.json())).toEqual({ itemId: 'catalyst:Fe', coins: 160 });
    expect((await labRows(p.id))[0]).toMatchObject({ delta: -40, refId: 'catalyst:Fe' });
    expect(await owned(p.id)).toEqual(['catalyst:Fe']);
  });

  it('Review Focus 3: concurrent double purchase -> one 200, one 409 LAB_OWNED, charged once', async () => {
    const p = await register();
    for (let round = 0; round < 5; round++) {
      await db.playerLab.deleteMany({ where: { playerId: p.id } });
      await db.coinLedger.deleteMany({ where: { playerId: p.id, reason: 'lab' } });
      await setCoins(p.id, 200 + round); // unique ref per round
      const res = await Promise.all([buy(p.cookie, 'furnace'), buy(p.cookie, 'furnace')]);
      const out = (await Promise.all(res.map(async (r) => [r.status, r.status >= 400 ? (await errOf(r)).code : null])))
        .sort((a, b) => Number(a[0]) - Number(b[0]));
      expect(out).toEqual([[200, null], [409, 'LAB_OWNED']]);
      expect(await coinsOf(p.id)).toBe(200 + round - 150);
      expect(await labRows(p.id)).toHaveLength(1);
      expect(await owned(p.id)).toEqual(['furnace']);
    }
  });
});

describe('breeding gate', () => {
  const hotWater = { ...water, conditions: { ...spark, temperatureC: 1000 } };

  it('1000 °C without the furnace -> 409 LAB_LOCKED { itemId: furnace }; with it -> 201', async () => {
    const p = await register();
    const res = await breed(p.cookie, hotWater);
    expect(res.status).toBe(409);
    const err = await errOf(res);
    expect(err.code).toBe('LAB_LOCKED');
    expect(err.details).toEqual({ itemId: 'furnace' });
    expect(await coinsOf(p.id)).toBe(200);
    expect(await db.breedingSession.count()).toBe(0);

    await grantLab(db, p.id, 'furnace');
    expect((await breed(p.cookie, hotWater)).status).toBe(201);
  });

  it('2500 °C also needs the furnace; -78 °C needs the cold room', async () => {
    const p = await register();
    expect((await errOf(await breed(p.cookie, { ...water, conditions: { ...spark, temperatureC: 2500 } }))).details).toEqual({ itemId: 'furnace' });
    expect((await errOf(await breed(p.cookie, { ...water, conditions: { ...spark, temperatureC: -78 } }))).details).toEqual({ itemId: 'cold' });
  });

  it('first missing item in the order temperature, pressure, activation, catalyst', async () => {
    const p = await register();
    const all = { ...water, conditions: { ...spark, temperatureC: 1000, pressureAtm: 100, catalyst: 'Fe', activation: 'electric' } };
    const missing = async () => (await errOf(await breed(p.cookie, all))).details;
    expect(await missing()).toEqual({ itemId: 'furnace' });
    await grantLab(db, p.id, 'furnace');
    expect(await missing()).toEqual({ itemId: 'pressure' });
    await grantLab(db, p.id, 'pressure');
    expect(await missing()).toEqual({ itemId: 'electrolysis' });
    await grantLab(db, p.id, 'electrolysis');
    expect(await missing()).toEqual({ itemId: 'catalyst:Fe' });
    await grantLab(db, p.id, 'catalyst:Fe');
    // Everything owned: the gate passes and resolve runs (r-water needs spark, so electric finds no reaction).
    const res = await breed(p.cookie, all);
    expect(res.status).toBe(200);
    expect(BreedingResponseSchema.parse(await res.json())).toEqual({ status: 'NO_REACTION' });
  });

  it('Fe catalyst gate: the Fe rule at 100 atm needs pressure then catalyst:Fe, bought through the API', async () => {
    const p = await register();
    await db.playerMonster.create({ data: { playerId: p.id, chemicalId: 'co', count: 2 } });
    const body = { inputs: [{ chemicalId: 'co', count: 2 }, { chemicalId: 'o2', count: 1 }], conditions: { ...spark, pressureAtm: 100, catalyst: 'Fe', activation: 'none' } };
    expect((await errOf(await breed(p.cookie, body, appFe))).details).toEqual({ itemId: 'pressure' });
    expect((await buy(p.cookie, 'pressure', appFe)).status).toBe(200);
    expect((await errOf(await breed(p.cookie, body, appFe))).details).toEqual({ itemId: 'catalyst:Fe' });
    expect((await buy(p.cookie, 'catalyst:Fe', appFe)).status).toBe(200);
    const res = await breed(p.cookie, body, appFe);
    expect(res.status).toBe(201);
    expect(BreedingResponseSchema.parse(await res.json())).toMatchObject({ status: 'STARTED' });
  });

  it('Review Focus 2: a locked condition with no-reaction inputs -> LAB_LOCKED (not NO_REACTION), nothing charged', async () => {
    const p = await register();
    const hotNoReaction = { ...water, conditions: { ...spark, temperatureC: 1000, environment: 'inert', activation: 'none' } };
    const ledgerBefore = await db.coinLedger.count({ where: { playerId: p.id } });
    const res = await breed(p.cookie, hotNoReaction);
    expect(res.status).toBe(409);
    expect(await errOf(res)).toMatchObject({ code: 'LAB_LOCKED', details: { itemId: 'furnace' } });
    expect(await coinsOf(p.id)).toBe(200);
    expect(await db.coinLedger.count({ where: { playerId: p.id } })).toBe(ledgerBefore);
    expect(await db.breedingSession.count()).toBe(0);
  });

  it('check order: free slot comes before the lab check', async () => {
    const p = await register();
    await db.breedingSession.createMany({
      data: Array.from({ length: BREEDING_SLOTS }, () => ({
        playerId: p.id, inputs: water.inputs, conditions: spark, status: 'running' as const, result: {}, startedAt: clock.now, readyAt: clock.now, fee: 0,
      })),
    });
    expect((await errOf(await breed(p.cookie, hotWater))).code).toBe('SLOTS_FULL');
  });
});

describe('labs_backfill migration', () => {
  const sqlPath = '../prisma/migrations/20261126130100_labs_backfill/migration.sql';

  it('Review Focus 1: an old account that ran 1000 °C keeps it without buying; idempotent', async () => {
    const p = await register();
    const q = await register2();
    const session = (playerId: string, conditions: Record<string, string | number>) => ({
      playerId, inputs: water.inputs, conditions, status: 'collected' as const, result: {}, startedAt: clock.now, readyAt: clock.now, fee: 0,
    });
    await db.breedingSession.createMany({
      data: [
        session(p.id, { ...spark, temperatureC: 1000 }),
        session(p.id, { ...spark, temperatureC: 2500 }),
        session(p.id, { ...spark, pressureAtm: 200, catalyst: 'Pt' }),
        session(p.id, { ...spark, temperatureC: -78, catalyst: 'Fe' }),
        session(q.id, { ...spark, pressureAtm: 10 }),
      ],
    });
    expect((await errOf(await breed(p.cookie, { ...water, conditions: { ...spark, temperatureC: 1000 } }))).code).toBe('LAB_LOCKED');

    const sql = readFileSync(fileURLToPath(new URL(sqlPath, import.meta.url)), 'utf8');
    const statements = sql.split(';').map((s) => s.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean);
    expect(statements).toHaveLength(1);
    for (let pass = 0; pass < 2; pass++) for (const s of statements) await db.$executeRawUnsafe(s);

    expect(await owned(p.id)).toEqual(['catalyst:Fe', 'catalyst:Pt', 'cold', 'furnace', 'pressure']);
    expect(await owned(q.id)).toEqual([]);
    expect(await db.coinLedger.count({ where: { reason: 'lab' } })).toBe(0);
    const res = await breed(p.cookie, { ...water, conditions: { ...spark, temperatureC: 1000 } });
    expect(res.status).toBe(201);
    expect(await coinsOf(p.id)).toBe(200 - 43);
  });
});

async function register2(): Promise<{ cookie: string; id: string }> {
  const cookie = cookieOf(await post('/api/auth/register', { email: 'b@example.com', password: 'password123', displayName: 'Bob_1' }));
  const me = MeResponseSchema.parse(await (await app.request('/api/me', { headers: { cookie } })).json());
  return { cookie, id: me.player.id };
}
