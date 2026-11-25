import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MeResponseSchema } from '@chemimon/shared';
import { createApp } from '../src/app';
import { DISPLAY_NAME_CI_INDEX, takenFromP2002 } from '../src/auth/routes';
import { seedCatalog } from '../src/seed';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { fixtureEconomy } from './helpers/fixtureEconomy';
type ErrBody = { error: { code: string } };
import { app, clock, cookieOf, db, post, reg } from './helpers/app';

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = new Date('2026-11-20T00:00:00Z');
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

describe('register', () => {
  it('sets cookie, grants 25x4 starter kit, empty sessions', async () => {
    const res = await post('/api/auth/register', reg);
    expect(res.status).toBe(201);
    const sc = res.headers.get('set-cookie')!;
    expect(sc).toMatch(/^chm_session=[A-Za-z0-9_-]{43};/);
    expect(sc).toMatch(/HttpOnly/i);
    expect(sc).toMatch(/SameSite=Lax/i);
    expect(sc).toMatch(/Path=\//);
    expect(sc).toMatch(/Max-Age=2592000/);
    expect(sc).not.toMatch(/Secure/i);
    const body = MeResponseSchema.parse(await res.json());
    expect(body.player.email).toBe('a@example.com');
    expect(body.inventory).toHaveLength(25);
    expect(body.inventory.every((s) => s.count === 4)).toBe(true);
    expect(body.sessions).toEqual([]);
    expect(body.extractor.nextClaimAt).toBeNull();
  });
  it('stores argon2id hash', async () => {
    await post('/api/auth/register', reg);
    const u = await db.user.findFirstOrThrow();
    expect(u.passwordHash.startsWith('$argon2id$')).toBe(true);
  });
  it('duplicate email (case-insensitive) -> 409 EMAIL_TAKEN', async () => {
    await post('/api/auth/register', reg);
    const res = await post('/api/auth/register', { ...reg, email: 'a@example.com', displayName: 'Other' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as ErrBody).error.code).toBe('EMAIL_TAKEN');
  });
  it('duplicate displayName -> 409 DISPLAY_NAME_TAKEN', async () => {
    await post('/api/auth/register', reg);
    const res = await post('/api/auth/register', { ...reg, email: 'b@example.com' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as ErrBody).error.code).toBe('DISPLAY_NAME_TAKEN');
  });
  it('displayName is unique case-insensitively: "Alice_1" then "alice_1" -> 409 DISPLAY_NAME_TAKEN', async () => {
    await post('/api/auth/register', reg);
    const res = await post('/api/auth/register', { ...reg, email: 'b@example.com', displayName: 'alice_1' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as ErrBody).error.code).toBe('DISPLAY_NAME_TAKEN');
  });
  it('underscore in displayName is not a wildcard in the pre-check', async () => {
    await post('/api/auth/register', reg); // Alice_1
    const res = await post('/api/auth/register', { ...reg, email: 'b@example.com', displayName: 'AliceX1' });
    expect(res.status).toBe(201);
  });
  it('bad body -> 400 VALIDATION', async () => {
    const res = await post('/api/auth/register', { email: 'x', password: 'short' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as ErrBody).error.code).toBe('VALIDATION');
  });
});

describe('login/logout', () => {
  it('login ok', async () => {
    await post('/api/auth/register', reg);
    const res = await post('/api/auth/login', { email: 'a@EXAMPLE.com', password: reg.password });
    expect(res.status).toBe(200);
    expect(cookieOf(res)).toMatch(/^chm_session=/);
    MeResponseSchema.parse(await res.json());
  });
  it('wrong password and unknown email give same 401', async () => {
    await post('/api/auth/register', reg);
    const a = await post('/api/auth/login', { email: 'a@example.com', password: 'wrongwrong' });
    const b = await post('/api/auth/login', { email: 'nobody@example.com', password: 'wrongwrong' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    const aj = (await a.json()) as ErrBody;
    expect(aj).toEqual(await b.json());
    expect(aj.error.code).toBe('INVALID_CREDENTIALS');
  });
  it('logout -> 204 and old cookie is dead', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    const out = await post('/api/auth/logout', {}, cookie);
    expect(out.status).toBe(204);
    const me = await app.request('/api/me', { headers: { cookie } });
    expect(me.status).toBe(401);
  });
});

describe('session expiry', () => {
  it('31 days later -> 401', async () => {
    const cookie = cookieOf(await post('/api/auth/register', reg));
    clock.now = new Date(clock.now.getTime() + 31 * 86400_000);
    const me = await app.request('/api/me', { headers: { cookie } });
    expect(me.status).toBe(401);
    expect(((await me.json()) as ErrBody).error.code).toBe('UNAUTHORIZED');
  });
});

describe('P2002 mapping', () => {
  async function realError(data: { email: string; displayName: string }) {
    await db.user.create({ data: { email: 'a@example.com', displayName: 'Alice_1', passwordHash: 'x' } });
    try {
      await db.user.create({ data: { ...data, passwordHash: 'x' } });
    } catch (e) {
      return e;
    }
    throw new Error('expected unique violation');
  }
  it('classifies real duplicate email and displayName errors', async () => {
    expect(takenFromP2002(await realError({ email: 'a@example.com', displayName: 'Z1' }))?.code).toBe('EMAIL_TAKEN');
    await resetPlayerData(db);
    expect(takenFromP2002(await realError({ email: 'b@example.com', displayName: 'Alice_1' }))?.code).toBe('DISPLAY_NAME_TAKEN');
    await resetPlayerData(db);
    const ci = await realError({ email: 'b@example.com', displayName: 'alice_1' });
    expect(JSON.stringify((ci as { meta?: unknown }).meta)).toContain(DISPLAY_NAME_CI_INDEX);
    expect(takenFromP2002(ci)?.code).toBe('DISPLAY_NAME_TAKEN');
    expect(takenFromP2002(new Error('x'))).toBeNull();
  });

  // Race: pre-check sees nothing, the insert then hits the unique constraint.
  const blind = {
    ...db,
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      db.$transaction((tx) =>
        fn(new Proxy(tx, {
          get: (t, k) =>
            k === 'user'
              ? { ...t.user, findUnique: async () => null, create: t.user.create.bind(t.user) }
              : k === '$queryRaw'
                ? async () => [] // blind the case-insensitive display name pre-check too
                : (t as never)[k],
        }))),
  } as unknown as typeof db;
  const raceApp = createApp({ db: blind, catalog: fixtureCatalog, economy: fixtureEconomy, now: () => clock.now, timeScale: { breeding: 0, extractor: 0 } });
  const race = (body: object) =>
    raceApp.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  it('race on email -> 409 EMAIL_TAKEN via P2002', async () => {
    await post('/api/auth/register', reg);
    const res = await race({ ...reg, displayName: 'Other_2' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as ErrBody).error.code).toBe('EMAIL_TAKEN');
  });
  it('race on displayName differing only in case -> 409 DISPLAY_NAME_TAKEN via the lower() index', async () => {
    await post('/api/auth/register', reg);
    const res = await race({ ...reg, email: 'b@example.com', displayName: 'ALICE_1' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as ErrBody).error.code).toBe('DISPLAY_NAME_TAKEN');
  });
  it('race on displayName -> 409 DISPLAY_NAME_TAKEN via P2002', async () => {
    await post('/api/auth/register', reg);
    const res = await race({ ...reg, email: 'b@example.com' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as ErrBody).error.code).toBe('DISPLAY_NAME_TAKEN');
  });
});

describe('JSON body routes require Content-Type: application/json', () => {
  const raw = (contentType: string | undefined, body: string) =>
    app.request('/api/auth/register', { method: 'POST', headers: contentType ? { 'content-type': contentType } : {}, body });
  it('text/plain, form-urlencoded and missing Content-Type -> 415 VALIDATION', async () => {
    for (const ct of ['text/plain', 'application/x-www-form-urlencoded', undefined]) {
      const res = await raw(ct, JSON.stringify(reg));
      expect(res.status, String(ct)).toBe(415);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('VALIDATION');
      expect(body.error.message).toMatch(/application\/json/);
    }
    expect(await db.user.count()).toBe(0);
  });
  it('accepts parameters and any case', async () => {
    const res = await raw('Application/JSON; charset=utf-8', JSON.stringify(reg));
    expect(res.status).toBe(201);
  });
  it('JSON Content-Type with an invalid body is still 400 VALIDATION', async () => {
    const res = await raw('application/json', '{not json');
    expect(res.status).toBe(400);
  });
});
