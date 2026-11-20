const SUB = '₀₁₂₃₄₅₆₇₈₉';

/** Turns ASCII digits in a formula into Unicode subscripts: Ca(OH)2 -> Ca(OH)₂. */
export function formatFormula(formula: string): string {
  return formula.replace(/\d/g, (d) => SUB[Number(d)]!);
}
