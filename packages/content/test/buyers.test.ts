import { describe, expect, it } from 'vitest';
import { EXTRACTOR_ELEMENTS, type Buyers } from '@chemimon/shared';
import { loadBuyers, loadCatalog, loadEconomy, loadProducts, validateBuyers } from '../src/index';

const catalog = loadCatalog();
const economy = loadEconomy();
const buyers = loadBuyers();
const products = loadProducts();
const run = (b: Buyers) => validateBuyers(catalog, economy, b, EXTRACTOR_ELEMENTS, products);
const withOrder = (id: string, patch: object): Buyers => ({
  ...buyers,
  orders: buyers.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
});

describe('buyers.yaml', () => {
  it('loads 4 stalls and 39 templates with the timing constants', () => {
    expect(buyers.stalls.map((s) => s.id)).toEqual(['food', 'factory', 'city', 'tech']);
    expect(buyers.orders).toHaveLength(39);
    expect(buyers.orders.some((o) => o.id === 'bakery-nahco3')).toBe(true);
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
  it('product order too cheap (phone-chip 69 < 1.5 x 46.46)', () => {
    expect(run(withOrder('phone-chip', { reward: 69 })).map((i) => [i.code, i.ref])).toEqual([['ORDER_UNDERPAID', 'phone-chip']]);
  });
  it('unknown product', () => {
    expect(run(withOrder('shop-can', { productId: 'zzz' })).map((i) => i.code)).toEqual(['BUYER_UNKNOWN_PRODUCT']);
  });
  it('both chemicalId and productId', () => {
    expect(run(withOrder('shop-can', { chemicalId: 'al' })).map((i) => i.code)).toEqual(['ORDER_ITEM_KIND']);
  });
  it('neither chemicalId nor productId', () => {
    expect(run(withOrder('shop-can', { productId: undefined })).map((i) => i.code)).toEqual(['ORDER_ITEM_KIND']);
  });
});
