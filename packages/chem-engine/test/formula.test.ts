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
    ['Mg3(PO4)2', { Mg: 3, P: 2, O: 8 }],
    ['C12H22O11', { C: 12, H: 22, O: 11 }],
  ])('parses %s', (f, expected) => {
    expect(parseFormula(f)).toEqual(expected);
  });
  it.each(['h2o', 'H2)O', '', 'CuSO4·5H2O', '(OH', 'H0', '()', 'Xx', 'Zz', 'Hx'])('throws on %j', (f) => {
    expect(() => parseFormula(f)).toThrow(FormulaError);
  });
  it('carries the formula', () => {
    expect(() => parseFormula('Xx')).toThrowError(expect.objectContaining({ formula: 'Xx' }));
  });
});
