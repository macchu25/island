import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ApiErrorBodySchema, ExpeditionsResponseSchema, MeResponseSchema, PermitResponseSchema } from '@chemimon/shared';
import { seedCatalog } from '../src/seed';
import { lockPlayer } from '../src/player/grant';
import { applyCoins } from '../src/wallet/ledger';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { app, clock, cookieOf, db, post, reg } from './helpers/app';

const buy = (cookie: string, placeId: string) => post('/api/permits', { placeId }, cookie);
const errOf = async (res: Response) => ApiErrorBodySchema.parse(await res.json()).error;

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
const permitRows = (id: string) => db.coinLedger.findMany({ where: { playerId: id, reason: 'permit' } });

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = new Date('2026-11-20T00:00:00Z');
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

describe('POST /api/permits', () => {
  it('requires auth', async () => {
    expect((await buy('', 'air')).status).toBe(401);
  });

  it('bad body -> 400 VALIDATION', async () => {
    const p = await register();
    expect((await errOf(await post('/api/permits', {}, p.cookie))).code).toBe('VALIDATION');
  });

  it('unknown place -> 400 UNKNOWN_PLACE', async () => {
    const p = await register();
    const res = await buy(p.cookie, 'nowhere');
    expect(res.status).toBe(400);
    expect((await errOf(res)).code).toBe('UNKNOWN_PLACE');
  });

  it('buys air once: charges permitPrice, one permit ledger row (ref_id = place id), place unlocked', async () => {
    const p = await register();
    const res = await buy(p.cookie, 'air');
    expect(res.status).toBe(200);
    expect(PermitResponseSchema.parse(await res.json())).toEqual({ placeId: 'air', coins: 140 });
    expect(await coinsOf(p.id)).toBe(140);
    const rows = await permitRows(p.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ delta: -60, balanceAfter: 140, refId: 'air' });
    expect(await db.playerPermit.count({ where: { playerId: p.id, placeId: 'air' } })).toBe(1);
    const list = ExpeditionsResponseSchema.parse(await (await app.request('/api/expeditions', { headers: { cookie: p.cookie } })).json());
    expect(list.places.find((pl) => pl.id === 'air')!.unlocked).toBe(true);
  });

  it('second purchase -> 409 PERMIT_OWNED, no charge', async () => {
    const p = await register();
    expect((await buy(p.cookie, 'air')).status).toBe(200);
    const res = await buy(p.cookie, 'air');
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('PERMIT_OWNED');
    expect(await coinsOf(p.id)).toBe(140);
    expect(await permitRows(p.id)).toHaveLength(1);
  });

  it('permitPrice 0 -> 409 PERMIT_OWNED, no charge, no permit row', async () => {
    const p = await register();
    const res = await buy(p.cookie, 'sand');
    expect(res.status).toBe(409);
    expect((await errOf(res)).code).toBe('PERMIT_OWNED');
    expect(await coinsOf(p.id)).toBe(200);
    expect(await db.playerPermit.count({ where: { playerId: p.id } })).toBe(0);
  });

  it('Xu below price -> 409 INSUFFICIENT_COINS { needed, have }, no permit row', async () => {
    const p = await register();
    await setCoins(p.id, 59);
    const res = await buy(p.cookie, 'air');
    expect(res.status).toBe(409);
    expect(await errOf(res)).toMatchObject({ code: 'INSUFFICIENT_COINS', details: { needed: 60, have: 59 } });
    expect(await coinsOf(p.id)).toBe(59);
    expect(await db.playerPermit.count({ where: { playerId: p.id } })).toBe(0);
  });

  it('concurrent double purchase -> one 200, one 409 PERMIT_OWNED, charged once', async () => {
    const p = await register();
    for (let round = 0; round < 5; round++) {
      await db.playerPermit.deleteMany({ where: { playerId: p.id } });
      await db.coinLedger.deleteMany({ where: { playerId: p.id, reason: 'permit' } });
      const before = await coinsOf(p.id);
      const res = await Promise.all([buy(p.cookie, 'air'), buy(p.cookie, 'air')]);
      const out = (await Promise.all(res.map(async (r) => [r.status, r.status >= 400 ? (await errOf(r)).code : null])))
        .sort((a, b) => Number(a[0]) - Number(b[0]));
      expect(out).toEqual([[200, null], [409, 'PERMIT_OWNED']]);
      expect(await coinsOf(p.id)).toBe(before - 60);
      expect(await permitRows(p.id)).toHaveLength(1);
      await setCoins(p.id, 200 + round); // refill (unique ref per round)
    }
  });
});
