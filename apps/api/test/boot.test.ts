import { afterAll, describe, expect, it } from 'vitest';
import { loadCatalog } from '@chemimon/content';
import { bootCheck, parseHost, parsePort } from '../src/boot';
import { seedCatalog } from '../src/seed';
import { db } from './helpers/app';

afterAll(() => db.$disconnect());

const shipped = loadCatalog();

describe('bootCheck', () => {
  it('shipped reviewed catalog seeded into the DB -> no problems', async () => {
    await seedCatalog(db, shipped);
    expect(await bootCheck(shipped, db, false)).toEqual([]);
  });

  it('a catalog chemical missing from the chemicals table is reported', async () => {
    const extra = { id: 'zz_unseeded', formula: 'He', name: 'Unseeded', kind: 'element' as const, phaseAt25C: 'gas' as const, family: 'x' };
    const catalog = { ...shipped, chemicals: [...shipped.chemicals, extra] };
    const problems = await bootCheck(catalog, db, true);
    expect(problems.some((p) => p.startsWith('database: 1 catalog chemical(s) missing') && p.endsWith('zz_unseeded'))).toBe(true);
  });

  it('drafts off is strict: an unreviewed rule fails; drafts on accepts it', async () => {
    const allIds = { chemical: { findMany: async () => shipped.chemicals.map((c) => ({ id: c.id })) } } as unknown as typeof db;
    const catalog = { ...shipped, reactions: shipped.reactions.map((r, i) => (i === 0 ? { ...r, reviewed: false } : r)) };
    const strict = await bootCheck(catalog, allIds, false);
    expect(strict.some((p) => p.startsWith('content NOT_REVIEWED'))).toBe(true);
    expect(await bootCheck(catalog, allIds, true)).toEqual([]);
  });

  it('drafts off requires 8 branching pairs', async () => {
    const allIds = { chemical: { findMany: async () => shipped.chemicals.map((c) => ({ id: c.id })) } } as unknown as typeof db;
    const one = { ...shipped, reactions: shipped.reactions.filter((r) => r.id === 'h2_o2_spark') };
    expect((await bootCheck(one, allIds, false)).some((p) => p.startsWith('content TOO_FEW_BRANCHES'))).toBe(true);
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
