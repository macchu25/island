import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { validateEconomy } from '@chemimon/content';
import { EconomyResponseSchema, MeResponseSchema, STARTER_ELEMENTS } from '@chemimon/shared';
import { seedCatalog } from '../src/seed';
import { lockPlayer } from '../src/player/grant';
import { applyCoins, type LedgerReason } from '../src/wallet/ledger';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { fixtureEconomy } from './helpers/fixtureEconomy';
import { app, clock, cookieOf, db, post, reg } from './helpers/app';

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = new Date('2026-11-20T00:00:00Z');
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

async function register(): Promise<{ cookie: string; id: string }> {
  const cookie = cookieOf(await post('/api/auth/register', reg));
  const me = MeResponseSchema.parse(await (await app.request('/api/me', { headers: { cookie } })).json());
  return { cookie, id: me.player.id };
}
const apply = (playerId: string, delta: number, reason: LedgerReason, refId: string) =>
  db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    return applyCoins(tx, playerId, delta, reason, refId);
  });
const coins = async (id: string) => (await db.user.findUniqueOrThrow({ where: { id } })).coins;
const ledgerSum = async (id: string) =>
  (await db.coinLedger.aggregate({ where: { playerId: id }, _sum: { delta: true } }))._sum.delta ?? 0;

describe('wallet', () => {
  it('fixture economy passes validateEconomy', () => {
    expect(validateEconomy(fixtureCatalog, fixtureEconomy, STARTER_ELEMENTS)).toEqual([]);
  });

  it('register grants 200 Xu and one starter ledger row', async () => {
    const p = await register();
    expect(await coins(p.id)).toBe(200);
    const rows = await db.coinLedger.findMany({ where: { playerId: p.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ delta: 200, balanceAfter: 200, reason: 'starter', refId: 'starter' });
  });

  it('applyCoins refuses to go below 0 and writes no row', async () => {
    const p = await register();
    expect(await apply(p.id, -201, 'breeding_fee', 'x1')).toEqual({ ok: false, balance: 200 });
    expect(await coins(p.id)).toBe(200);
    expect(await db.coinLedger.count({ where: { playerId: p.id } })).toBe(1);
    expect(await apply(p.id, -200, 'breeding_fee', 'x2')).toEqual({ ok: true, balance: 0 });
    expect(await apply(p.id, -1, 'breeding_fee', 'x3')).toEqual({ ok: false, balance: 0 });
    expect(await coins(p.id)).toBe(0);
    expect(await db.coinLedger.count({ where: { playerId: p.id } })).toBe(2);
  });

  it('the database CHECK refuses a negative balance written outside applyCoins', async () => {
    const p = await register();
    await expect(db.user.update({ where: { id: p.id }, data: { coins: -1 } })).rejects.toThrow();
    expect(await coins(p.id)).toBe(200);
  });

  it('ledger sum equals users.coins after a mixed sequence', async () => {
    const p = await register();
    const steps: [number, LedgerReason, string][] = [
      [-43, 'breeding_fee', 's1'], [12, 'sell_floor', 'o1'], [-500, 'breeding_fee', 's2'],
      [-3, 'breeding_fee', 's3'], [0, 'breeding_fee', 's4'], [7, 'sell_floor', 'o2'],
    ];
    for (const [delta, reason, ref] of steps) await apply(p.id, delta, reason, ref);
    expect(await coins(p.id)).toBe(200 - 43 + 12 - 3 + 7);
    expect(await ledgerSum(p.id)).toBe(await coins(p.id));
    const last = await db.coinLedger.findFirstOrThrow({ where: { playerId: p.id, refId: 'o2' } });
    expect(last.balanceAfter).toBe(await coins(p.id));
  });

  it('the same (reason, ref_id) twice is refused and the balance is unchanged', async () => {
    const p = await register();
    await apply(p.id, -3, 'breeding_fee', 'dup');
    await expect(apply(p.id, -3, 'breeding_fee', 'dup')).rejects.toThrow();
    expect(await coins(p.id)).toBe(197);
    expect(await ledgerSum(p.id)).toBe(197);
  });
});

describe('GET /api/economy', () => {
  it('returns the fixture prices without auth', async () => {
    const res = await app.request('/api/economy');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(EconomyResponseSchema.parse(json)).toEqual({
      conditionPrices: fixtureEconomy.conditionPrices,
      floorPrices: fixtureEconomy.floorPrices,
    });
    expect(json).not.toHaveProperty('starterCoins');
  });
});
