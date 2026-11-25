import { describe, expect, it } from 'vitest';
import type { Conditions } from '@chemimon/shared';
import { ContentTieError, maxRunsPerStart, resolve } from '../src/resolve';
import { RULES, mkRule } from './fixture';

const base: Conditions = { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'none' };
const at = (c: Partial<Conditions>): Conditions => ({ ...base, ...c });
const s = (chemicalId: string, count: number) => ({ chemicalId, count });

describe('resolve', () => {
  it('c+o2 1:1 hot -> co2', () => {
    const r = resolve(RULES, [s('c', 1), s('o2', 1)], at({ temperatureC: 1000 }));
    expect(r).toMatchObject({ status: 'REACTION', ruleId: 'co2', products: [s('co2', 1)], returned: [] });
  });
  it('c2+o2 hot -> co', () => {
    const r = resolve(RULES, [s('c', 2), s('o2', 1)], at({ temperatureC: 1000 }));
    expect(r).toMatchObject({ status: 'REACTION', ruleId: 'co', products: [s('co', 2)] });
  });
  it('cold -> no reaction', () => {
    expect(resolve(RULES, [s('c', 1), s('o2', 1)], at({}))).toEqual({ status: 'NO_REACTION' });
  });
  it('h2:3 o2:1 spark -> returns leftover', () => {
    const r = resolve(RULES, [s('h2', 3), s('o2', 1)], at({ activation: 'spark' }));
    expect(r).toMatchObject({
      status: 'REACTION',
      products: [s('h2o', 2)],
      consumed: [s('h2', 2), s('o2', 1)],
      returned: [s('h2', 1)],
    });
  });
  it('wrong activation -> no reaction', () => {
    expect(resolve(RULES, [s('h2', 2), s('o2', 1)], at({}))).toEqual({ status: 'NO_REACTION' });
  });
  it('input order does not matter', () => {
    const c = at({ activation: 'spark' });
    expect(resolve(RULES, [s('o2', 1), s('h2', 2)], c)).toEqual(resolve(RULES, [s('h2', 2), s('o2', 1)], c));
  });
  it('single input decomposition, sorted products', () => {
    const r = resolve(RULES, [s('caco3', 1)], at({ temperatureC: 1000 }));
    expect(r).toMatchObject({ status: 'REACTION', products: [s('cao', 1), s('co2', 1)] });
  });
  it('single input does not match two-input rules', () => {
    expect(resolve(RULES, [s('c', 4)], at({ temperatureC: 1000 }))).toEqual({ status: 'NO_REACTION' });
  });
  it('too few monsters for coefficient -> no reaction', () => {
    expect(resolve(RULES, [s('h2', 1), s('o2', 1)], at({ activation: 'spark' }))).toEqual({ status: 'NO_REACTION' });
  });
  it('priority beats specificity', () => {
    const hi = mkRule({ id: 'hi', inputs: [{ chemicalId: 'x', coefficient: 1 }], outputs: [{ chemicalId: 'y', coefficient: 1 }], priority: 5 });
    const sp = mkRule({ id: 'sp', inputs: [{ chemicalId: 'x', coefficient: 1 }], outputs: [{ chemicalId: 'z', coefficient: 1 }], conditions: { activation: 'none' } });
    expect(resolve([sp, hi], [s('x', 1)], base)).toMatchObject({ ruleId: 'hi' });
  });
  it('tie throws ContentTieError', () => {
    const mk = (id: string) => mkRule({ id, inputs: [{ chemicalId: 'x', coefficient: 1 }], outputs: [{ chemicalId: 'y', coefficient: 1 }] });
    try {
      resolve([mk('a'), mk('b')], [s('x', 1)], base);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ContentTieError);
      expect((e as ContentTieError).ruleIds.sort()).toEqual(['a', 'b']);
    }
  });

  it('ratio uses sorted order even when rule inputs are written reversed', () => {
    const r = mkRule({ id: 'rev', inputs: [{ chemicalId: 'o2', coefficient: 1 }, { chemicalId: 'c', coefficient: 2 }], outputs: [{ chemicalId: 'co', coefficient: 2 }], ratio: { min: 2, max: 100 } });
    expect(resolve([r], [s('o2', 1), s('c', 2)], base)).toMatchObject({ ruleId: 'rev' });
    expect(resolve([r], [s('o2', 2), s('c', 2)], base)).toEqual({ status: 'NO_REACTION' });
  });
  it('activation none rejects spark', () => {
    const r = mkRule({ id: 'n', inputs: [{ chemicalId: 'x', coefficient: 1 }], outputs: [{ chemicalId: 'y', coefficient: 1 }], conditions: { activation: 'none' } });
    expect(resolve([r], [s('x', 1)], at({ activation: 'spark' }))).toEqual({ status: 'NO_REACTION' });
    expect(resolve([r], [s('x', 1)], base)).toMatchObject({ ruleId: 'n' });
  });
  it('two inputs against a one-input rule -> no reaction', () => {
    expect(resolve(RULES, [s('caco3', 1), s('c', 1)], at({ temperatureC: 1000 }))).toEqual({ status: 'NO_REACTION' });
  });
});

describe('maxRunsPerStart', () => {
  const byId = (id: string) => RULES.find((r) => r.id === id)!;
  it('takes the most runs over input counts 1..4 that pass the ratio', () => {
    expect(maxRunsPerStart(byId('co2'))).toBe(4); // 4 C + 4 O2, ratio 1 is inside 0..1
    expect(maxRunsPerStart(byId('co'))).toBe(2); // 4 C + 2 O2: coefficient 2 and ratio >= 2
    expect(maxRunsPerStart(byId('h2o'))).toBe(2); // 4 H2 + 4 O2: H2 coefficient 2
    expect(maxRunsPerStart(byId('caco3_dec'))).toBe(4); // one input, coefficient 1
  });
  it('is 0 when no legal count reaches one run', () => {
    expect(maxRunsPerStart(mkRule({ id: 'big', inputs: [{ chemicalId: 'a', coefficient: 5 }], outputs: [{ chemicalId: 'b', coefficient: 1 }] }))).toBe(0);
  });
  it('matches what resolve produces at the best counts', () => {
    const r = resolve([byId('co')], [s('c', 4), s('o2', 2)], at({ temperatureC: 450 }));
    expect(r).toMatchObject({ status: 'REACTION', products: [{ chemicalId: 'co', count: 2 * maxRunsPerStart(byId('co')) }] });
  });
});
