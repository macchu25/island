import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MeResponseSchema } from '@chemimon/shared';
import { seedCatalog } from '../src/seed';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
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
    expect(body.inventory).toHaveLength(25);
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
