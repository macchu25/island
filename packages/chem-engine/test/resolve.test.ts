import { describe, expect, it } from 'vitest';
import type { Conditions } from '@chemimon/shared';
import { ContentTieError, resolve } from '../src/resolve';
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
});
