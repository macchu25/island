import { describe, expect, it } from 'vitest';
import type { Conditions } from '@chemimon/shared';
import { resolve } from '@chemimon/chem-engine';
import { loadCatalog } from '../src/index';

const water: Conditions = { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'water', activation: 'none' };
const s = (chemicalId: string, count: number) => ({ chemicalId, count });

describe('NaHCO3 rule (shipped data)', () => {
  const rules = loadCatalog().reactions;
  it('NaOH 1 + CO2 1 in water at 25 C gives NaHCO3 1', () => {
    expect(resolve(rules, [s('naoh', 1), s('co2', 1)], water)).toMatchObject({
      status: 'REACTION',
      ruleId: 'naoh_co2_nahco3',
      products: [s('nahco3', 1)],
    });
  });
  it('NaOH 2 + CO2 1 (ratio 2) has no rule', () => {
    expect(resolve(rules, [s('naoh', 2), s('co2', 1)], water)).toEqual({ status: 'NO_REACTION' });
  });
});
