import { EXTRACTOR_ELEMENTS } from '@chemimon/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { validateBuyers, validateProducts, loadBuyers, loadCatalog, loadEconomy, loadProducts } from '@chemimon/content';
import { bootCheck, parseHost, parsePort } from '../src/boot';
import { seedCatalog } from '../src/seed';
import { db } from './helpers/app';
import { fixtureProducts } from './helpers/fixtureProducts';
import { fixtureBuyers } from './helpers/fixtureBuyers';
import { fixtureCatalog } from './helpers/fixtureCatalog';
import { fixtureEconomy } from './helpers/fixtureEconomy';

afterAll(() => db.$disconnect());

const shipped = loadCatalog();
const economy = loadEconomy();
const buyers = loadBuyers();
const products = loadProducts();

describe('bootCheck', () => {
  it('shipped reviewed catalog seeded into the DB -> no problems', async () => {
    await seedCatalog(db, shipped);
    expect(await bootCheck(shipped, economy, buyers, products, db, false)).toEqual([]);
  });

  it('a catalog chemical missing from the chemicals table is reported', async () => {
    const extra = { id: 'zz_unseeded', formula: 'He', name: 'Unseeded', kind: 'element' as const, phaseAt25C: 'gas' as const, family: 'x' };
    const catalog = { ...shipped, chemicals: [...shipped.chemicals, extra] };
    const problems = await bootCheck(catalog, economy, buyers, products, db, true);
    expect(problems.some((p) => p.startsWith('database: 1 catalog chemical(s) missing') && p.endsWith('zz_unseeded'))).toBe(true);
  });

  it('drafts off is strict: an unreviewed rule fails; drafts on accepts it', async () => {
    const allIds = { chemical: { findMany: async () => shipped.chemicals.map((c) => ({ id: c.id })) } } as unknown as typeof db;
    const catalog = { ...shipped, reactions: shipped.reactions.map((r, i) => (i === 0 ? { ...r, reviewed: false } : r)) };
    const strict = await bootCheck(catalog, economy, buyers, products, allIds, false);
    expect(strict.some((p) => p.startsWith('content NOT_REVIEWED'))).toBe(true);
    expect(await bootCheck(catalog, economy, buyers, products, allIds, true)).toEqual([]);
  });

  it('drafts off requires 8 branching pairs', async () => {
    const allIds = { chemical: { findMany: async () => shipped.chemicals.map((c) => ({ id: c.id })) } } as unknown as typeof db;
    const one = { ...shipped, reactions: shipped.reactions.filter((r) => r.id === 'h2_o2_spark') };
    expect((await bootCheck(one, economy, buyers, products, allIds, false)).some((p) => p.startsWith('content TOO_FEW_BRANCHES'))).toBe(true);
  });
});

describe('bootCheck economy', () => {
  const allIds = { chemical: { findMany: async () => shipped.chemicals.map((c) => ({ id: c.id })) } } as unknown as typeof db;
  it('a chemical without a floor price is reported', async () => {
    const { h2o: _drop, ...floorPrices } = economy.floorPrices;
    const problems = await bootCheck(shipped, { ...economy, floorPrices }, buyers, products, allIds, false);
    expect(problems).toContain('economy FLOOR_MISSING h2o: chemical has no floor price');
  });
  it('a floor above the cheapest production cost is reported', async () => {
    const problems = await bootCheck(shipped, { ...economy, floorPrices: { ...economy.floorPrices, nh3: 10_000 } }, buyers, products, allIds, false);
    expect(problems.some((p) => p.startsWith('economy FLOOR_ABOVE_COST nh3'))).toBe(true);
  });
});

describe('bootCheck buyers', () => {
  it('fixture buyers pass validateBuyers against the fixture catalog', () => {
    expect(validateBuyers(fixtureCatalog, fixtureEconomy, fixtureBuyers, EXTRACTOR_ELEMENTS, fixtureProducts)).toEqual([]);
  });
  const allIds = { chemical: { findMany: async () => shipped.chemicals.map((c) => ({ id: c.id })) } } as unknown as typeof db;
  it('an invalid buyers file is reported', async () => {
    const bad = { ...buyers, orders: buyers.orders.map((o) => (o.id === 'pool-cl2' ? { ...o, reward: 7 } : o)) };
    expect(await bootCheck(shipped, economy, bad, products, allIds, false)).toContain(
      'buyers ORDER_UNDERPAID pool-cl2: reward 7 < 8 (1.5 x count x cost 0, 2 x count x floor 2)',
    );
  });
});

describe('bootCheck products', () => {
  const allIds2 = { chemical: { findMany: async () => shipped.chemicals.map((c) => ({ id: c.id })) } } as unknown as typeof db;
  it('fixture products pass validateProducts against the fixture catalog', () => {
    expect(validateProducts(fixtureCatalog, fixtureEconomy, fixtureProducts)).toEqual([]);
  });
  it('an invalid product is reported', async () => {
    const bad = products.map((p) => (p.id === 'can' ? { ...p, floorPrice: 3 } : p));
    const problems = await bootCheck(shipped, economy, buyers, bad, allIds2, false);
    expect(problems.some((p) => p.startsWith('products PRODUCT_FLOOR_RANGE can:'))).toBe(true);
  });
});

describe('parsePort / parseHost', () => {
  it('defaults and accepts integers 1..65535', () => {
    expect(parsePort(undefined)).toBe(3101);
    expect(parsePort('1')).toBe(1);
    expect(parsePort('65535')).toBe(65535);
  });
  it('rejects non-integers and out-of-range values', () => {
    for (const bad of ['0', '65536', '-1', '3101.5', 'abc', '1e3', ' ']) {
      expect(() => parsePort(bad), bad).toThrow(/PORT must be an integer 1\.\.65535/);
    }
  });
  it('host defaults to loopback', () => {
    expect(parseHost(undefined)).toBe('127.0.0.1');
    expect(parseHost('0.0.0.0')).toBe('0.0.0.0');
  });
});
