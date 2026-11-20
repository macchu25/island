import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ApiErrorBodySchema, BreedingResponseSchema, CollectResponseSchema, MeResponseSchema } from '@chemimon/shared';
import { seedCatalog } from '../src/seed';
import { resetPlayerData } from './helpers/db';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { app, clock, cookieOf, db, post } from './helpers/app';

const spark = { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'spark' };
const water = { inputs: [{ chemicalId: 'h2', count: 2 }, { chemicalId: 'o2', count: 1 }], conditions: spark };

const send = (path: string, cookie: string, body?: unknown) =>
  app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const start = (cookie: string) => send('/api/breeding', cookie, water);
const collect = (cookie: string, id: string) => send(`/api/breeding/${id}/collect`, cookie);

async function register(n: number): Promise<{ cookie: string; id: string }> {
  const cookie = cookieOf(
    await post('/api/auth/register', { email: `c${n}@example.com`, password: 'password123', displayName: `Racer_${n}` }),
  );
  const me = MeResponseSchema.parse(await (await app.request('/api/me', { headers: { cookie } })).json());
  return { cookie, id: me.player.id };
}
async function count(playerId: string, chemicalId: string): Promise<number> {
  const row = await db.playerMonster.findUnique({ where: { playerId_chemicalId: { playerId, chemicalId } } });
  return row?.count ?? 0;
}
async function setCount(playerId: string, chemicalId: string, n: number): Promise<void> {
  await db.playerMonster.updateMany({ where: { playerId, chemicalId }, data: { count: n } });
}
/** Statuses sorted ascending, plus the error code of each non-2xx response in the same order. */
async function outcome(responses: Response[]): Promise<[number, string | null][]> {
  const out = await Promise.all(
    responses.map(async (r) => [r.status, r.status >= 400 ? ApiErrorBodySchema.parse(await r.json()).error.code : null] as [number, string | null]),
  );
  return out.sort((a, b) => a[0] - b[0]);
}

beforeAll(() => seedCatalog(db, fixtureCatalog));
beforeEach(async () => {
  clock.now = new Date('2026-11-20T00:00:00Z');
  await resetPlayerData(db);
});
afterAll(() => db.$disconnect());

const ROUNDS = 5;

describe('breeding concurrency', () => {
  it('double submit with stock for one -> one 201, one 409 INSUFFICIENT_MONSTERS, never negative', async () => {
    const p = await register(1);
    for (let round = 0; round < ROUNDS; round++) {
      await db.breedingSession.deleteMany({ where: { playerId: p.id } });
      await setCount(p.id, 'h2', 2);
      await setCount(p.id, 'o2', 1);
      const res = await Promise.all([start(p.cookie), start(p.cookie)]);
      expect(await outcome(res)).toEqual([[201, null], [409, 'INSUFFICIENT_MONSTERS']]);
      expect(await count(p.id, 'h2')).toBe(0);
      expect(await count(p.id, 'o2')).toBe(0);
      expect(await db.breedingSession.count({ where: { playerId: p.id } })).toBe(1);
    }
  });

  it('one slot free, stock for two -> one 201, one 409 SLOTS_FULL', async () => {
    const p = await register(1);
    for (let round = 0; round < ROUNDS; round++) {
      await db.breedingSession.deleteMany({ where: { playerId: p.id } });
      await setCount(p.id, 'h2', 2);
      await setCount(p.id, 'o2', 1);
      expect((await start(p.cookie)).status).toBe(201);
      await setCount(p.id, 'h2', 4);
      await setCount(p.id, 'o2', 2);
      const res = await Promise.all([start(p.cookie), start(p.cookie)]);
      expect(await outcome(res)).toEqual([[201, null], [409, 'SLOTS_FULL']]);
      expect(await count(p.id, 'h2')).toBe(2);
      expect(await count(p.id, 'o2')).toBe(1);
      expect(await db.breedingSession.count({ where: { playerId: p.id, status: 'running' } })).toBe(2);
    }
  });

  it('two players collect the same new compound in parallel -> exactly one First Discovery', async () => {
    const a = await register(1);
    const b = await register(2);
    for (let round = 0; round < ROUNDS; round++) {
      await db.firstDiscovery.deleteMany();
      await db.playerDiscovery.deleteMany();
      await db.breedingSession.deleteMany();
      for (const p of [a, b]) {
        await setCount(p.id, 'h2', 2);
        await setCount(p.id, 'o2', 1);
      }
      const ids = await Promise.all(
        [a, b].map(async (p) => {
          const body = BreedingResponseSchema.parse(await (await start(p.cookie)).json());
          if (body.status !== 'STARTED') throw new Error('expected STARTED');
          return body.sessionId;
        }),
      );
      const res = await Promise.all([collect(a.cookie, ids[0]!), collect(b.cookie, ids[1]!)]);
      expect(res.map((r) => r.status)).toEqual([200, 200]);
      const bodies = await Promise.all(res.map(async (r) => CollectResponseSchema.parse(await r.json())));
      for (const body of bodies) expect(body.newDiscoveries).toEqual(['h2o']);
      expect(bodies.filter((body) => body.firstDiscoveries.includes('h2o'))).toHaveLength(1);
      const rows = await db.firstDiscovery.findMany();
      expect(rows).toHaveLength(1);
      const winner = bodies[0]!.firstDiscoveries.includes('h2o') ? a : b;
      expect(rows[0]!.playerId).toBe(winner.id);
      expect(await db.playerDiscovery.count({ where: { chemicalId: 'h2o' } })).toBe(2);
    }
  });
});
