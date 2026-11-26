import { describe, expect, it } from 'vitest';
import type { Product } from '@chemimon/shared';
import { loadCatalog, loadEconomy, loadProducts, validateProducts } from '../src/index';

const catalog = loadCatalog();
const economy = loadEconomy();
const products = loadProducts();
const run = (p: Product[]) => validateProducts(catalog, economy, p);
const withProduct = (id: string, patch: object): Product[] => products.map((p) => (p.id === id ? { ...p, ...patch } : p));

describe('products.yaml', () => {
  it('has the 9 products of the plan table', () => {
    expect(products.map((p) => p.id)).toEqual(['can', 'wire', 'soap', 'glass', 'roof', 'steel', 'ring', 'solar', 'chip']);
    expect(products.find((p) => p.id === 'soap')).toMatchObject({
      name: 'Bánh xà phòng',
      ingredients: [{ chemicalId: 'naoh', count: 2 }, { chemicalId: 'h2o', count: 1 }],
      durationS: 300,
      blueprintPrice: 30,
      floorPrice: 4,
      line: 'rửa tay sạch',
    });
    expect(products.find((p) => p.id === 'chip')).toMatchObject({ durationS: 1800, blueprintPrice: 150, floorPrice: 10 });
    expect(products.filter((p) => p.blueprintPrice === 0).map((p) => p.id)).toEqual(['can', 'wire']);
  });
  it('real content has no issues', () => {
    expect(run(products)).toEqual([]);
  });
});

describe('validateProducts', () => {
  it('floor below the ingredient floors (can 3 < 2 x 2)', () => {
    expect(run(withProduct('can', { floorPrice: 3 })).map((i) => [i.code, i.ref])).toEqual([['PRODUCT_FLOOR_RANGE', 'can']]);
  });
  it('floor above ceil(1.5 x sum) (can 7 > 6)', () => {
    expect(run(withProduct('can', { floorPrice: 7 })).map((i) => [i.code, i.ref])).toEqual([['PRODUCT_FLOOR_RANGE', 'can']]);
  });
  it('unknown ingredient chemical', () => {
    expect(run(withProduct('can', { ingredients: [{ chemicalId: 'zzz', count: 2 }] })).map((i) => i.code)).toEqual(['PRODUCT_UNKNOWN_CHEMICAL']);
  });
  it('id equal to a chemical id', () => {
    expect(run(withProduct('can', { id: 'al' })).map((i) => i.code)).toEqual(['PRODUCT_DUPLICATE']);
  });
  it('id appearing twice', () => {
    expect(run([...products, products[0]!]).map((i) => i.code)).toEqual(['PRODUCT_DUPLICATE']);
  });
  it('digit in line', () => {
    expect(run(withProduct('can', { line: 'đựng 3 lon' })).map((i) => i.code)).toEqual(['PRODUCT_LINE_DIGITS']);
  });
});
