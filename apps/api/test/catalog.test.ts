import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CatalogResponseSchema } from '@chemimon/shared';
import { seedCatalog } from '../src/seed';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { app, db } from './helpers/app';

beforeAll(() => seedCatalog(db, fixtureCatalog));
afterAll(() => db.$disconnect());

describe('GET /api/catalog', () => {
  it('is public and has no reactions key', async () => {
    const res = await app.request('/api/catalog');
    expect(res.status).toBe(200);
    const raw = await res.json();
    expect(raw).not.toHaveProperty('reactions');
    const body = CatalogResponseSchema.parse(raw);
    expect(body.chemicals).toHaveLength(30);
    expect(body.monsters).toHaveLength(30);
  });
});
