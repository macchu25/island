import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ExtractorClaimResponseSchema, MeResponseSchema, SellResponseSchema } from '@chemimon/shared';
import { lockPlayer } from '../src/player/grant';
import { seedCatalog } from '../src/seed';
import { applyCoins } from '../src/wallet/ledger';
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
const sell = (cookie: string, body: unknown) => post('/api/market/sell', body, cookie);
const state = async (id: string) => ({
  coins: (await db.user.findUniqueOrThrow({ where: { id } })).coins,
  h2: (await db.playerMonster.findUniqueOrThrow({ where: { playerId_chemicalId: { playerId: id, chemicalId: 'h2' } } })).count,
  rows: await db.coinLedger.count({ where: { playerId: id, reason: 'sell_floor' } }),
});

describe('POST /api/market/sell', () => {
  it('sell 2 h2 at floor f adds 2f Xu, decrements stock, writes one sell_floor row', async () => {
    const { cookie, id } = await register();
    const before = await state(id);
    const f = fixtureEconomy.floorPrices.h2!;
    const res = await sell(cookie, { chemicalId: 'h2', count: 2 });
    expect(res.status).toBe(200);
    const body = SellResponseSchema.parse(await res.json());
    const after = await state(id);
    expect(body.coins).toBe(before.coins + 2 * f);
    expect(body.inventory).toEqual({ chemicalId: 'h2', count: before.h2 - 2 });
    expect(after).toEqual({ coins: before.coins + 2 * f, h2: before.h2 - 2, rows: 1 });
    const row = await db.coinLedger.findFirstOrThrow({ where: { playerId: id, reason: 'sell_floor' } });
    expect(row).toMatchObject({ delta: 2 * f, balanceAfter: body.coins });
  });

  it.each([0, -1, 1.5, 100])('rejects count %s with 400 and changes nothing', async (count) => {
    const { cookie, id } = await register();
    const before = await state(id);
    expect((await sell(cookie, { chemicalId: 'h2', count })).status).toBe(400);
    expect(await state(id)).toEqual(before);
  });

  it('selling more than owned is 409 and changes nothing', async () => {
    const { cookie, id } = await register();
    const before = await state(id);
    const res = await sell(cookie, { chemicalId: 'h2', count: before.h2 + 1 });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('INSUFFICIENT_MONSTERS');
    expect(await state(id)).toEqual(before);
  });

  it('an unknown chemical is 400', async () => {
    const { cookie, id } = await register();
    const before = await state(id);
    const res = await sell(cookie, { chemicalId: 'unobtainium', count: 1 });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('UNKNOWN_CHEMICAL');
    expect(await state(id)).toEqual(before);
  });

  it('no dead end (spec 12): a player with 0 Xu and no stock can still earn Xu', async () => {
    const { cookie, id } = await register();
    // Spend every Xu through the ledger (as breeding fees would), so the ledger sum stays equal to coins.
    await db.$transaction(async (tx) => {
      await lockPlayer(tx, id);
      const { coins } = await tx.user.findUniqueOrThrow({ where: { id }, select: { coins: true } });
      const r = await applyCoins(tx, id, -coins, 'breeding_fee', 'test-broke');
      if (!r.ok) throw new Error('could not empty the wallet');
    });
    await db.playerMonster.updateMany({ where: { playerId: id }, data: { count: 0 } });
    const ledgerSum = async () => (await db.coinLedger.aggregate({ where: { playerId: id }, _sum: { delta: true } }))._sum.delta;
    expect((await db.user.findUniqueOrThrow({ where: { id } })).coins).toBe(0);
    expect(await db.playerMonster.count({ where: { playerId: id, count: { gt: 0 } } })).toBe(0);
    expect(await ledgerSum()).toBe(0);

    const claim = await post('/api/extractor/claim', { chemicalId: 'h2' }, cookie);
    expect(claim.status).toBe(200);
    expect(ExtractorClaimResponseSchema.parse(await claim.json()).inventory).toEqual({ chemicalId: 'h2', count: 1 });

    const res = await sell(cookie, { chemicalId: 'h2', count: 1 });
    expect(res.status).toBe(200);
    const body = SellResponseSchema.parse(await res.json());
    const coins = (await db.user.findUniqueOrThrow({ where: { id } })).coins;
    expect(body.coins).toBe(fixtureEconomy.floorPrices.h2);
    expect(coins).toBe(body.coins);
    expect(coins).toBeGreaterThan(0);
    expect(await ledgerSum()).toBe(coins);
  });

  it('requires auth', async () => {
    expect((await post('/api/market/sell', { chemicalId: 'h2', count: 1 })).status).toBe(401);
  });
});
