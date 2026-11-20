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
