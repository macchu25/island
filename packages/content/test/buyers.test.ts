import { describe, expect, it } from 'vitest';
import { EXTRACTOR_ELEMENTS, type Buyers } from '@chemimon/shared';
import { loadBuyers, loadCatalog, loadEconomy, validateBuyers } from '../src/index';

const catalog = loadCatalog();
const economy = loadEconomy();
const buyers = loadBuyers();
const run = (b: Buyers) => validateBuyers(catalog, economy, b, EXTRACTOR_ELEMENTS);
const withOrder = (id: string, patch: object): Buyers => ({
  ...buyers,
  orders: buyers.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
});

describe('buyers.yaml', () => {
  it('loads 4 stalls and 29 templates with the timing constants', () => {
    expect(buyers.stalls.map((s) => s.id)).toEqual(['food', 'factory', 'city', 'tech']);
    expect(buyers.orders).toHaveLength(29);
    expect(buyers.orders.some((o) => o.id === 'bakery-nahco3')).toBe(false);
    expect(buyers.orderCooldownS).toBe(1800);
    expect(buyers.orderLifetimeS).toBe(14400);
    expect(buyers.orders.find((o) => o.id === 'pool-cl2')).toMatchObject({ stallId: 'city', chemicalId: 'cl2', count: 2, reward: 12 });
  });
  it('real content has no issues', () => {
    expect(run(buyers)).toEqual([]);
  });
});

describe('validateBuyers', () => {
  it('underpaid order (pool-cl2 reward 7 < 2 x 2 x floor 2)', () => {
    expect(run(withOrder('pool-cl2', { reward: 7 })).map((i) => [i.code, i.ref])).toEqual([['ORDER_UNDERPAID', 'pool-cl2']]);
  });
  it('unknown chemical', () => {
    expect(run(withOrder('pool-cl2', { chemicalId: 'zzz' })).map((i) => i.code)).toEqual(['BUYER_UNKNOWN_CHEMICAL']);
  });
  it('unknown stall', () => {
    expect(run(withOrder('pool-cl2', { stallId: 'nope' })).map((i) => i.code)).toEqual(['BUYER_UNKNOWN_STALL']);
  });
  it('duplicate id', () => {
    expect(run({ ...buyers, orders: [...buyers.orders, buyers.orders[0]!] }).map((i) => i.code)).toEqual(['BUYER_DUPLICATE']);
  });
  it('digit in line', () => {
    expect(run(withOrder('pool-cl2', { line: 'khử trùng 3 lần' })).map((i) => i.code)).toEqual(['ORDER_LINE_DIGITS']);
  });
});
