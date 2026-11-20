import { describe, expect, it } from 'vitest';
import { FormulaError, parseFormula } from '../src/formula';

describe('parseFormula', () => {
  it.each([
    ['H2O', { H: 2, O: 1 }],
    ['Ca(OH)2', { Ca: 1, O: 2, H: 2 }],
    ['Fe3O4', { Fe: 3, O: 4 }],
    ['S8', { S: 8 }],
    ['Pb3O4', { Pb: 3, O: 4 }],
    ['Hg', { Hg: 1 }],
  ])('parses %s', (f, expected) => {
    expect(parseFormula(f)).toEqual(expected);
  });
  it.each(['h2o', 'H2)O', '', 'CuSO4·5H2O', '(OH'])('throws on %j', (f) => {
    expect(() => parseFormula(f)).toThrow(FormulaError);
  });
  it('carries the formula', () => {
    try { parseFormula('h2o'); } catch (e) { expect((e as FormulaError).formula).toBe('h2o'); }
  });
});
