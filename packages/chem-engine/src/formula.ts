export class FormulaError extends Error {
  constructor(public readonly formula: string, reason = 'invalid formula') {
    super(`${reason}: ${JSON.stringify(formula)}`);
    this.name = 'FormulaError';
  }
}

export function parseFormula(formula: string): Record<string, number> {
  let pos = 0;
  const fail = (r?: string): never => { throw new FormulaError(formula, r); };
  const num = (): number => {
    const m = /^\d+/.exec(formula.slice(pos));
    if (!m) return 1;
    pos += m[0].length;
    const n = Number(m[0]);
    if (n < 1) fail('zero count');
    return n;
  };
  const group = (nested: boolean): Record<string, number> => {
    const out: Record<string, number> = {};
    const add = (el: string, n: number) => { out[el] = (out[el] ?? 0) + n; };
    let any = false;
    while (pos < formula.length) {
      const c = formula[pos]!;
      if (c === '(') {
        pos++;
        const inner = group(true);
        if (formula[pos] !== ')') fail('unclosed parenthesis');
        pos++;
        const n = num();
        for (const [el, k] of Object.entries(inner)) add(el, k * n);
        any = true;
      } else if (c === ')') {
        if (!nested) fail('unmatched parenthesis');
        break;
      } else {
        const m = /^[A-Z][a-z]?/.exec(formula.slice(pos));
        if (!m) return fail('unexpected character');
        pos += m[0].length;
        add(m[0], num());
        any = true;
      }
    }
    if (!any) fail('empty group');
    return out;
  };
  return group(false);
}
