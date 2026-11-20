import type { Conditions, ReactionDef, StackCount } from '@chemimon/shared';

export class ContentTieError extends Error {
  constructor(public readonly ruleIds: string[]) {
    super(`Rules tie on priority and specificity: ${ruleIds.join(', ')}`);
    this.name = 'ContentTieError';
  }
}

export type ResolveResult =
  | {
      status: 'REACTION';
      ruleId: string;
      durationS: number;
      consumed: StackCount[];
      products: StackCount[];
      returned: StackCount[];
    }
  | { status: 'NO_REACTION' };

const byId = <T extends { chemicalId: string }>(a: T, b: T) =>
  a.chemicalId < b.chemicalId ? -1 : a.chemicalId > b.chemicalId ? 1 : 0;

export function specificity(r: ReactionDef): number {
  const defined = Object.values(r.conditions).filter((v) => v !== undefined).length;
  return defined + (r.ratio ? 1 : 0);
}

const inRange = (v: number, r: { min: number; max: number }) => v >= r.min && v <= r.max;

/** Conditions + ratio match. `sorted` = inputs sorted by chemicalId, same length as rule inputs. */
export function matches(r: ReactionDef, sorted: StackCount[], c: Conditions): boolean {
  const rc = r.conditions;
  if (rc.temperatureC && !inRange(c.temperatureC, rc.temperatureC)) return false;
  if (rc.pressureAtm && !inRange(c.pressureAtm, rc.pressureAtm)) return false;
  if (rc.catalyst && !rc.catalyst.includes(c.catalyst)) return false;
  if (rc.environment && !rc.environment.includes(c.environment)) return false;
  if (rc.activation !== undefined && rc.activation !== c.activation) return false;
  if (r.ratio && sorted.length === 2) {
    const a = sorted[0]!.count;
    const b = sorted[1]!.count;
    if (b === 0) return false;
    const q = a / b;
    if (q < r.ratio.min || q > r.ratio.max) return false;
  }
  return true;
}

export function runsOf(r: ReactionDef, sorted: StackCount[]): number {
  const coef = new Map(r.inputs.map((t) => [t.chemicalId, t.coefficient]));
  let runs = Infinity;
  for (const s of sorted) runs = Math.min(runs, Math.floor(s.count / coef.get(s.chemicalId)!));
  return runs;
}

export function sameInputs(r: ReactionDef, ids: string[]): boolean {
  const rid = r.inputs.map((t) => t.chemicalId).sort();
  return rid.length === ids.length && rid.every((x, i) => x === ids[i]);
}

/** Matching rules with runs >= 1 tied at top (priority, specificity). */
export function topMatches(rules: ReactionDef[], inputs: StackCount[], c: Conditions): ReactionDef[] {
  const sorted = [...inputs].sort(byId);
  const ids = sorted.map((s) => s.chemicalId);
  return topOfCandidates(rules.filter((r) => sameInputs(r, ids)), sorted, c);
}

/** `cand` already filtered by input set; `sorted` sorted by chemicalId. */
export function topOfCandidates(cand0: ReactionDef[], sorted: StackCount[], c: Conditions): ReactionDef[] {
  const cand = cand0.filter((r) => matches(r, sorted, c) && runsOf(r, sorted) >= 1);
  if (cand.length === 0) return [];
  const key = (r: ReactionDef) => [r.priority, specificity(r)] as const;
  let best = key(cand[0]!);
  for (const r of cand) {
    const k = key(r);
    if (k[0] > best[0] || (k[0] === best[0] && k[1] > best[1])) best = k;
  }
  return cand.filter((r) => key(r)[0] === best[0] && key(r)[1] === best[1]);
}

export function resolve(rules: ReactionDef[], inputs: StackCount[], conditions: Conditions): ResolveResult {
  const sorted = [...inputs].sort(byId);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.chemicalId === sorted[i - 1]!.chemicalId) throw new Error('duplicate input chemicalId');
  }
  const winners = topMatches(rules, sorted, conditions);
  if (winners.length === 0) return { status: 'NO_REACTION' };
  if (winners.length > 1) throw new ContentTieError(winners.map((w) => w.id));
  const r = winners[0]!;
  const runs = runsOf(r, sorted);
  const coef = new Map(r.inputs.map((t) => [t.chemicalId, t.coefficient]));
  const consumed = sorted.map((s) => ({ chemicalId: s.chemicalId, count: coef.get(s.chemicalId)! * runs }));
  const returned = sorted
    .map((s, i) => ({ chemicalId: s.chemicalId, count: s.count - consumed[i]!.count }))
    .filter((s) => s.count > 0);
  const products = r.outputs.map((o) => ({ chemicalId: o.chemicalId, count: o.coefficient * runs })).sort(byId);
  return { status: 'REACTION', ruleId: r.id, durationS: r.durationS, consumed, products, returned };
}
