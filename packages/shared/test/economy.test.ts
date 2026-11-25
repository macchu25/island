import { describe, expect, it } from 'vitest';
import { ConditionPricesSchema, MeResponseSchema, SellRequestSchema, conditionFee, type ConditionPrices } from '../src';

const prices: ConditionPrices = {
  temperatureC: { '-78': 20, '25': 0, '200': 5, '450': 15, '1000': 40, '2500': 120 },
  pressureAtm: { '1': 0, '10': 10, '100': 40, '200': 80 },
  environment: { air: 0, water: 2, inert: 10 },
  activation: { none: 0, spark: 3, light: 3 },
  catalyst: { none: 0, Fe: 0, Pt: 0, V2O5: 0, MnO2: 0 },
};

describe('economy contracts', () => {
  it('conditionFee sums the five prices', () => {
    expect(conditionFee({ temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'none' }, prices)).toBe(0);
    expect(conditionFee({ temperatureC: 1000, pressureAtm: 100, catalyst: 'Fe', environment: 'inert', activation: 'spark' }, prices)).toBe(93);
  });

  it('ConditionPricesSchema rejects a missing or extra temperature key', () => {
    expect(ConditionPricesSchema.safeParse(prices).success).toBe(true);
    const { '2500': _omit, ...missing } = prices.temperatureC;
    expect(ConditionPricesSchema.safeParse({ ...prices, temperatureC: missing }).success).toBe(false);
    expect(ConditionPricesSchema.safeParse({ ...prices, temperatureC: { ...prices.temperatureC, '3000': 1 } }).success).toBe(false);
  });

  it('MeResponseSchema requires coins', () => {
    const me = {
      player: { id: 'p', email: 'a@b.co', displayName: 'abc' },
      inventory: [], sessions: [], extractor: { nextClaimAt: null },
    };
    expect(MeResponseSchema.safeParse(me).success).toBe(false);
    expect(MeResponseSchema.safeParse({ ...me, coins: 0 }).success).toBe(true);
  });

  it('SellRequestSchema rejects count 0, -1, 1.5, 100', () => {
    for (const count of [0, -1, 1.5, 100]) expect(SellRequestSchema.safeParse({ chemicalId: 'h2', count }).success).toBe(false);
    expect(SellRequestSchema.safeParse({ chemicalId: 'h2', count: 99 }).success).toBe(true);
  });
});
