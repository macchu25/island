import { describe, expect, it } from 'vitest';
import { STARTER_ELEMENTS, type Catalog, type ConditionPrices, type Economy, type ReactionDef } from '@chemimon/shared';
import { cheapestRuleFee, loadCatalog, loadEconomy, productionCosts, validateEconomy } from '../src/index';

const prices: ConditionPrices = {
  temperatureC: { '-78': 20, '25': 0, '200': 5, '450': 15, '1000': 40, '2500': 120 },
  pressureAtm: { '1': 0, '10': 10, '100': 40, '200': 80 },
  environment: { air: 0, water: 2, inert: 10 },
  activation: { none: 0, spark: 3, light: 3 },
  catalyst: { none: 0, Fe: 0, Pt: 0, V2O5: 0, MnO2: 0 },
};

const chem = (id: string) => ({ id, formula: id.toUpperCase(), name: id, kind: 'compound' as const, phaseAt25C: 'gas' as const, family: 'x' });
const rule = (id: string, inputs: [string, number][], outputs: [string, number][], conditions: ReactionDef['conditions']): ReactionDef => ({
  id,
  inputs: inputs.map(([chemicalId, coefficient]) => ({ chemicalId, coefficient })),
  outputs: outputs.map(([chemicalId, coefficient]) => ({ chemicalId, coefficient })),
  conditions,
  priority: 1,
  durationS: 10,
  source: 'x',
  reviewed: true,
} as ReactionDef);

describe('cheapestRuleFee', () => {
  it('picks the cheapest allowed value per dimension', () => {
    expect(cheapestRuleFee({ temperatureC: { min: 200, max: 450 } }, prices)).toBe(5);
    expect(cheapestRuleFee({ activation: 'spark' }, prices)).toBe(3);
    expect(cheapestRuleFee({}, prices)).toBe(0);
    expect(cheapestRuleFee({ environment: ['inert'] }, prices)).toBe(10);
  });
});

const cat: Catalog = {
  chemicals: ['a', 'b', 'c', 'd'].map(chem),
  monsters: [],
  reactions: [
    rule('r1', [['a', 1], ['b', 1]], [['c', 2]], { temperatureC: { min: 200, max: 200 } }),
    rule('r2', [['c', 1]], [['d', 1]], { temperatureC: { min: 450, max: 450 } }),
    rule('r3', [['a', 1], ['b', 1]], [['d', 1]], { temperatureC: { min: 1000, max: 1000 } }),
    rule('r4', [['a', 1]], [['d', 1]], { temperatureC: { min: -78, max: -78 } }),
  ],
};

// Every `cat` rule has coefficient-1 inputs and no ratio, so one start runs it 4 times (4 + 4 inputs) for one fee.
describe('productionCosts', () => {
  it('computes unit cost and picks the cheaper route', () => {
    const only12 = { ...cat, reactions: cat.reactions.slice(0, 2) };
    const m = productionCosts(only12, prices, ['a', 'b']);
    expect(m.get('a')).toBe(0);
    expect(m.get('c')).toBe(0.625); // (5 / 4 runs) / 2 outputs
    expect(m.get('d')).toBe(4.375); // 0.625 + 15 / 4 runs
    const all = productionCosts({ ...cat, reactions: cat.reactions.slice(0, 3) }, prices, ['a', 'b']);
    expect(all.get('d')).toBe(4.375); // route via c beats the 40 / 4 = 10 direct route
    expect(productionCosts(cat, prices, ['a', 'b']).get('d')).toBe(4.375); // 20 / 4 = 5 direct is worse
  });
  it('leaves unreachable chemicals at Infinity', () => {
    expect(productionCosts({ ...cat, reactions: [] }, prices, ['a', 'b']).get('c')).toBe(Infinity);
  });

  const one = (r: ReactionDef): Catalog => ({ ...cat, reactions: [r] });
  const hot = { temperatureC: { min: 1000, max: 1000 } };
  it('divides the fee by the runs one start allows: 40 Xu over 4 runs is 10 per unit', () => {
    // 4 a + 4 b at 1000 °C runs 4 times for one 40 Xu fee, so each d costs 10, not 40.
    expect(productionCosts(one(rule('x4', [['a', 1], ['b', 1]], [['d', 1]], hot)), prices, ['a', 'b']).get('d')).toBe(10);
  });
  it('counts fewer runs for bigger coefficients and drops rules that can never run', () => {
    expect(productionCosts(one(rule('x2', [['a', 2], ['b', 1]], [['d', 1]], hot)), prices, ['a', 'b']).get('d')).toBe(20); // 4 a / 2 = 2 runs
    expect(productionCosts(one(rule('x1', [['a', 3]], [['d', 1]], hot)), prices, ['a', 'b']).get('d')).toBe(40); // 4 a / 3 = 1 run
    expect(productionCosts(one(rule('x0', [['a', 5]], [['d', 1]], hot)), prices, ['a', 'b']).get('d')).toBe(Infinity); // 4 < 5: never runs
  });
  it('respects the ratio: a / b in 3..4 allows only 3 a + 1 b or 4 a + 1 b, so 1 run', () => {
    const r = { ...rule('xr', [['a', 1], ['b', 1]], [['d', 1]], hot), ratio: { min: 3, max: 4 } };
    expect(productionCosts(one(r), prices, ['a', 'b']).get('d')).toBe(40);
  });
  it('ignores unreviewed rules, even a cheaper one', () => {
    const free = { ...rule('draft', [['a', 1]], [['d', 1]], {}), reviewed: false };
    const m = productionCosts({ ...cat, reactions: [free, rule('x4', [['a', 1], ['b', 1]], [['d', 1]], hot)] }, prices, ['a', 'b']);
    expect(m.get('d')).toBe(10); // the 0 Xu draft route is not counted
    expect(productionCosts(one(free), prices, ['a', 'b']).get('d')).toBe(Infinity);
  });
});

describe('validateEconomy', () => {
  const good: Economy = { starterCoins: 200, conditionPrices: prices, floorPrices: { a: 1, b: 3, c: 1, d: 4 } };
  const codes = (e: Economy) => validateEconomy(cat, e, ['a', 'b']).map((i) => i.code);
  it('accepts a good economy', () => expect(codes(good)).toEqual([]));
  it('reports each code', () => {
    expect(codes({ ...good, floorPrices: { a: 1, b: 1, c: 1 } })).toEqual(['FLOOR_MISSING']);
    expect(codes({ ...good, floorPrices: { ...good.floorPrices, zz: 1 } })).toEqual(['FLOOR_UNKNOWN']);
    expect(codes({ ...good, floorPrices: { ...good.floorPrices, a: 4 } })).toEqual(['FLOOR_FREE_RANGE']);
    expect(codes({ ...good, floorPrices: { ...good.floorPrices, d: 5 } })).toEqual(['FLOOR_ABOVE_COST']); // cost 4.375
  });
});

describe('shipped data', () => {
  it('the shipped economy.yaml is valid against the shipped catalog', () => {
    const c = loadCatalog();
    const e = loadEconomy();
    expect(e.starterCoins).toBe(200);
    expect(validateEconomy(c, e, STARTER_ELEMENTS)).toEqual([]);
  });
});
