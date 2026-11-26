import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MeResponseSchema } from '@chemimon/shared';
import { createApp } from '../src/app';
import { seedCatalog } from '../src/seed';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { fixtureBuyers } from './helpers/fixtureBuyers';
import { fixtureProducts } from './helpers/fixtureProducts';
import { fixtureEconomy } from './helpers/fixtureEconomy';
type ErrBody = { error: { code: string } };
import { app, clock, cookieOf, db, post, reg } from './helpers/app';

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = new Date('2026-11-20T00:00:00Z');
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

const conditions = { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'none' };

describe('GET /api/me', () => {
  it('no cookie -> 401', async () => {
    const res = await app.request('/api/me');
    expect(res.status).toBe(401);
    expect(((await res.json()) as ErrBody).error.code).toBe('UNAUTHORIZED');
  });
  it('returns own profile', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const res = await app.request('/api/me', { headers: { cookie } });
    expect(res.status).toBe(200);
    const body = MeResponseSchema.parse(await res.json());
    expect(body.player.displayName).toBe('Alice_1');
    expect(body.inventory).toHaveLength(6);
  });
  it('/api/me includes coins', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const body = MeResponseSchema.parse(await (await app.request('/api/me', { headers: { cookie } })).json());
    expect(body.coins).toBe(200);
    const u = await db.user.findFirstOrThrow();
    await db.user.update({ where: { id: u.id }, data: { coins: 7 } });
    expect(MeResponseSchema.parse(await (await app.request('/api/me', { headers: { cookie } })).json()).coins).toBe(7);
  });
  it('session is running before readyAt, ready after; extractor nextClaimAt', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const u = await db.user.findFirstOrThrow();
    const readyAt = new Date(clock.now.getTime() + 30_000);
    await db.breedingSession.create({
      data: {
        playerId: u.id, inputs: [{ chemicalId: 'h2', count: 2 }], conditions,
        status: 'running', result: {}, startedAt: clock.now, readyAt,
      },
    });
    await db.breedingSession.create({
      data: { playerId: u.id, inputs: [{ chemicalId: 'o2', count: 1 }], conditions, status: 'collected', result: {}, startedAt: clock.now, readyAt },
    });
    await db.extractorState.create({ data: { playerId: u.id, lastClaimAt: clock.now } });
    let body = MeResponseSchema.parse(await (await app.request('/api/me', { headers: { cookie } })).json());
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0]!.status).toBe('running');
    expect(body.sessions[0]!.readyAt).toBe(readyAt.toISOString());
    expect(body.extractor.nextClaimAt).toBeNull(); // extractor scale 0
    clock.now = new Date(readyAt.getTime() + 1);
    body = MeResponseSchema.parse(await (await app.request('/api/me', { headers: { cookie } })).json());
    expect(body.sessions[0]!.status).toBe('ready');
  });
});

describe('extractor nextClaimAt', () => {
  it('last_claim_at + 60s while cooling, null after', async () => {
    const app1 = createApp({ db, catalog: fixtureCatalog, economy: fixtureEconomy, buyers: fixtureBuyers, products: fixtureProducts, now: () => clock.now, timeScale: { breeding: 0, extractor: 1, expedition: 0, market: 1 } });
    const res = await app1.request('/api/auth/register', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(reg),
    });
    const cookie = cookieOf(res);
    const u = await db.user.findFirstOrThrow();
    const last = new Date(clock.now.getTime() - 10_000);
    await db.extractorState.create({ data: { playerId: u.id, lastClaimAt: last } });
    const get = async () => MeResponseSchema.parse(await (await app1.request('/api/me', { headers: { cookie } })).json());
    expect((await get()).extractor.nextClaimAt).toBe(new Date(last.getTime() + 60_000).toISOString());
    clock.now = new Date(last.getTime() + 60_000);
    expect((await get()).extractor.nextClaimAt).toBeNull();
  });
});
