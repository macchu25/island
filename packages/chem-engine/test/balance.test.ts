import { describe, expect, it } from 'vitest';
import type { ReactionDef } from '@chemimon/shared';
import { isBalanced } from '../src/balance';

const f: Record<string, string> = { h2: 'H2', o2: 'O2', h2o: 'H2O' };
const formulaOf = (id: string) => f[id]!;
const mk = (i: [string, number][], o: [string, number][]): ReactionDef => ({
  id: 'r',
  conditions: {},
  priority: 0,
  durationS: 0,
  source: 't',
  reviewed: true,
  inputs: i.map(([chemicalId, coefficient]) => ({ chemicalId, coefficient })),
  outputs: o.map(([chemicalId, coefficient]) => ({ chemicalId, coefficient })),
});

describe('isBalanced', () => {
  it('ok for 2H2 + O2 -> 2H2O', () => {
    expect(isBalanced(mk([['h2', 2], ['o2', 1]], [['h2o', 2]]), formulaOf)).toEqual({ ok: true });
  });
  it('diff for H2 + O2 -> H2O', () => {
    expect(isBalanced(mk([['h2', 1], ['o2', 1]], [['h2o', 1]]), formulaOf)).toEqual({ ok: false, diff: { O: -1 } });
  });
  it('positive diff when outputs exceed inputs', () => {
    expect(isBalanced(mk([['h2', 1]], [['h2o', 1]]), formulaOf)).toEqual({ ok: false, diff: { O: 1 } });
  });
});
