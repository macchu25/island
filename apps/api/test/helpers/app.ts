import { createApp } from '../../src/app';
import { createDb } from '../../src/db';
import { fixtureCatalog } from './fixtureCatalog';
import { fixtureEconomy } from './fixtureEconomy';

export const db = createDb(process.env.DATABASE_URL!);
export const clock = { now: new Date('2026-11-20T00:00:00Z') };
export const app = createApp({
  db,
  catalog: fixtureCatalog,
  economy: fixtureEconomy,
  now: () => clock.now,
  timeScale: { breeding: 0, extractor: 0 },
});

export const reg = { email: 'A@Example.com', password: 'password123', displayName: 'Alice_1' };

export function post(path: string, body: unknown, cookie?: string) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

export function cookieOf(res: Response): string {
  const sc = res.headers.get('set-cookie') ?? '';
  return sc.split(';')[0]!;
}
