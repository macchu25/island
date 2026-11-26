import { describe, expect, it } from 'vitest';
import { requiredItems, usefulItems, type Economy } from '@chemimon/shared';
import { loadCatalog, loadEconomy, validateEconomy } from '../src/index';
import { EXTRACTOR_ELEMENTS } from '@chemimon/shared';

const eco = loadEconomy();
const base = { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'spark' } as const;

describe('requiredItems', () => {
  it('orders temperature, pressure, activation, catalyst', () => {
    expect(requiredItems({ ...base, temperatureC: 1000, pressureAtm: 100, catalyst: 'Fe' }, eco.labs)).toEqual(['furnace', 'pressure', 'catalyst:Fe']);
    expect(requiredItems({ ...base, activation: 'electric', temperatureC: 2500 }, eco.labs)).toEqual(['furnace', 'electrolysis']);
  });
  it('is empty for open values', () => {
    expect(requiredItems(base, eco.labs)).toEqual([]);
  });
});

describe('usefulItems', () => {
  it('live rules: furnace, pressure, Fe', () => {
    expect(usefulItems(loadCatalog().reactions, eco.labs)).toEqual(new Set(['furnace', 'pressure', 'catalyst:Fe']));
  });
  it('with drafts: electrolysis too', () => {
    expect(usefulItems(loadCatalog({ includeDrafts: true }).reactions, eco.labs).has('electrolysis')).toBe(true);
  });
});

describe('lab validation', () => {
  const cat = loadCatalog();
  const issues = (e: Economy) => validateEconomy(cat, e, EXTRACTOR_ELEMENTS).filter((i) => i.code.startsWith('LAB_'));
  it('shipped labs are clean', () => expect(issues(eco)).toEqual([]));
  it('flags a value in two labs', () => {
    const e = { ...eco, labs: [...eco.labs, { id: 'x', name: 'x', unlocks: { temperatureC: [1000] }, price: 1 }] } as Economy;
    expect(issues(e).map((i) => i.code)).toEqual(['LAB_UNLOCK_OVERLAP']);
  });
  it('flags an unknown value', () => {
    const e = { ...eco, labs: [{ id: 'x', name: 'x', unlocks: { temperatureC: [999] }, price: 1 }] } as unknown as Economy;
    expect(issues(e).map((i) => i.code)).toEqual(['LAB_UNKNOWN_VALUE']);
  });
});
