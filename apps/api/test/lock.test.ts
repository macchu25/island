import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { lockPlayer } from '../src/player/grant';
import { seedCatalog } from '../src/seed';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { db, post, reg } from './helpers/app';

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(() => resetPlayerData(db));
afterAll(() => db.$disconnect());

it('a held player lock does not block foreign-key inserts that reference the player (FOR NO KEY UPDATE)', async () => {
  await post('/api/auth/register', reg);
  const u = await db.user.findFirstOrThrow();
  await db.$transaction(async (tx) => {
    await lockPlayer(tx, u.id);
    // Second connection: the FK check on sessions.user_id takes FOR KEY SHARE on users.
    // Under FOR UPDATE this insert would wait for the transaction and hit the 1 s guard below.
    const insert = db.session.create({ data: { id: 'fk-probe', userId: u.id, expiresAt: new Date('2030-01-01T00:00:00Z') } });
    const outcome = await Promise.race([
      insert.then(() => 'inserted'),
      new Promise((r) => setTimeout(() => r('blocked'), 1_000)),
    ]);
    expect(outcome).toBe('inserted');
  }, { timeout: 10_000 });
});

it('the player lock still excludes a second locker until the first commits', async () => {
  await post('/api/auth/register', reg);
  const u = await db.user.findFirstOrThrow();
  const order: string[] = [];
  let release!: () => void;
  const held = new Promise<void>((r) => { release = r; });
  const first = db.$transaction(async (tx) => {
    await lockPlayer(tx, u.id);
    order.push('first-locked');
    await held;
    order.push('first-done');
  }, { timeout: 10_000 });
  await new Promise((r) => setTimeout(r, 200));
  const second = db.$transaction(async (tx) => {
    await lockPlayer(tx, u.id);
    order.push('second-locked');
  }, { timeout: 10_000 });
  await new Promise((r) => setTimeout(r, 300));
  expect(order).toEqual(['first-locked']);
  release();
  await Promise.all([first, second]);
  expect(order).toEqual(['first-locked', 'first-done', 'second-locked']);
});
