import type { ReactionDef } from '@chemimon/shared';
import { parseFormula } from './formula';

export type BalanceResult = { ok: true } | { ok: false; diff: Record<string, number> };

export function isBalanced(r: ReactionDef, formulaOf: (id: string) => string): BalanceResult {
  const diff: Record<string, number> = {};
  const tally = (side: ReactionDef['inputs'], sign: 1 | -1) => {
    for (const { chemicalId, coefficient } of side) {
      for (const [el, n] of Object.entries(parseFormula(formulaOf(chemicalId)))) {
        diff[el] = (diff[el] ?? 0) + sign * n * coefficient;
      }
    }
  };
  tally(r.outputs, 1);
  tally(r.inputs, -1);
  for (const el of Object.keys(diff)) if (diff[el] === 0) delete diff[el];
  return Object.keys(diff).length === 0 ? { ok: true } : { ok: false, diff };
}
