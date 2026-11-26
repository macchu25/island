import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ExtractorClaimResponseSchema } from '@chemimon/shared';
import { createApp } from '../src/app';
import { seedCatalog } from '../src/seed';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { fixtureBuyers } from './helpers/fixtureBuyers';
import { fixtureProducts } from './helpers/fixtureProducts';
import { fixtureEconomy } from './helpers/fixtureEconomy';
import { app as app0, clock, cookieOf, db, post, reg } from './helpers/app';

const app1 = createApp({ db, catalog: fixtureCatalog, economy: fixtureEconomy, buyers: fixtureBuyers, products: fixtureProducts, now: () => clock.now, timeScale: { breeding: 0, extractor: 1, expedition: 0, market: 1 } });
const claim = (a: typeof app0, cookie: string, chemicalId: unknown) =>
  a.request('/api/extractor/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ chemicalId }),
  });
type Err = { error: { code: string } };

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = new Date('2026-11-20T00:00:00Z');
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

describe('POST /api/extractor/claim', () => {
  it('requires auth and valid body', async () => {
    expect((await claim(app1, '', 'h2')).status).toBe(401);
    const cookie = cookieOf(await post('/api/auth/register', reg));
    expect((await claim(app1, cookie, 5)).status).toBe(400);
  });
  it('claim h2 -> 5, cooldown 429, ok after 61 s, no discoveries', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const r1 = await claim(app1, cookie, 'h2');
    expect(r1.status).toBe(200);
    const b1 = ExtractorClaimResponseSchema.parse(await r1.json());
    expect(b1.inventory).toEqual({ chemicalId: 'h2', count: 5 });
    expect(b1.nextClaimAt).toBe(new Date(clock.now.getTime() + 60_000).toISOString());
    const r2 = await claim(app1, cookie, 'h2');
    expect(r2.status).toBe(429);
    expect(((await r2.json()) as Err).error.code).toBe('EXTRACTOR_COOLDOWN');
    clock.now = new Date(clock.now.getTime() + 61_000);
    const r3 = await claim(app1, cookie, 'h2');
    expect(r3.status).toBe(200);
    expect(ExtractorClaimResponseSchema.parse(await r3.json()).inventory.count).toBe(6);
    expect(await db.playerDiscovery.count({ where: { source: { not: 'starter' } } })).toBe(0);
    expect(await db.firstDiscovery.count()).toBe(0);
  });
  it('cap 12 -> 409', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    await db.playerMonster.updateMany({ where: { chemicalId: 'h2' }, data: { count: 12 } });
    const r = await claim(app0, cookie, 'h2');
    expect(r.status).toBe(409);
    expect(((await r.json()) as Err).error.code).toBe('EXTRACTOR_CAP');
  });
  it('compound -> 400 not eligible', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const r = await claim(app0, cookie, 'h2o');
    expect(r.status).toBe(400);
    expect(((await r.json()) as Err).error.code).toBe('EXTRACTOR_NOT_ELIGIBLE');
  });
  it('fe, cu, he are refused; mg is granted, recorded as an extractor discovery and shown in the Codex', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    for (const id of ['fe', 'cu', 'he']) {
      const r = await claim(app0, cookie, id);
      expect(r.status).toBe(400);
      expect(((await r.json()) as Err).error.code).toBe('EXTRACTOR_NOT_ELIGIBLE');
    }
    expect((await claim(app0, cookie, 'mg')).status).toBe(200);
    const u = await db.user.findFirstOrThrow();
    expect(await db.playerDiscovery.findUnique({ where: { playerId_chemicalId: { playerId: u.id, chemicalId: 'mg' } } }))
      .toMatchObject({ source: 'extractor', bredAt: null });
    const codex = await (await app0.request('/api/codex', { headers: { cookie } })).json() as { entries: { chemicalId: string; state: string; count: number }[] };
    expect(codex.entries.find((e) => e.chemicalId === 'mg')).toMatchObject({ state: 'owned', count: 1 });
    // A starter claimed again keeps its first source.
    expect((await claim(app0, cookie, 'h2')).status).toBe(200);
    expect((await db.playerDiscovery.findUnique({ where: { playerId_chemicalId: { playerId: u.id, chemicalId: 'h2' } } }))!.source).toBe('starter');
  });
  it('scale 0 never cools down', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    expect((await claim(app0, cookie, 'h2')).status).toBe(200);
    expect((await claim(app0, cookie, 'h2')).status).toBe(200);
  });
});
