import { expect, it } from 'vitest';
import { formatFormula } from '../src/monsters/formatFormula';

it('subscripts digits', () => {
  expect(formatFormula('Fe3O4')).toBe('Fe₃O₄');
  expect(formatFormula('H2')).toBe('H₂');
  expect(formatFormula('Ca(OH)2')).toBe('Ca(OH)₂');
  expect(formatFormula('P4O10')).toBe('P₄O₁₀');
});
