import { parseFormula, isBalanced, enumerateOutcomes } from '@chemimon/chem-engine';
import { type Catalog, type ReactionDef } from '@chemimon/shared';
import { EXTRACTOR_ELEMENTS } from '@chemimon/shared';
import { isBannedChemical } from './banned';

export type IssueCode =
  | 'BAD_FORMULA'
  | 'UNBALANCED'
  | 'UNKNOWN_CHEMICAL'
  | 'MISSING_MONSTER'
  | 'TIE'
  | 'UNREACHABLE'
  | 'BANNED'
  | 'NOT_REVIEWED'
  | 'TOO_FEW_BRANCHES'
  | 'BAD_DURATION'
  | 'BAD_RANGE' // min > max, empty catalyst/environment list, ratio on a 1-input rule
  | 'DUPLICATE_ID' // same chemical twice inside one rule's inputs or outputs
  | 'UNREACHABLE_RULE' // rule is never the sole winner anywhere on the condition grid
  | 'FLOOR_MISSING'
  | 'FLOOR_UNKNOWN'
  | 'FLOOR_FREE_RANGE'
  | 'FLOOR_ABOVE_COST'
  | 'PLACE_DROP_UNKNOWN'
  | 'LAB_UNLOCK_OVERLAP'
  | 'LAB_UNKNOWN_VALUE'
  | 'PLACE_DUPLICATE'
  | 'BUYER_UNKNOWN_CHEMICAL'
  | 'BUYER_UNKNOWN_STALL'
  | 'BUYER_DUPLICATE'
  | 'ORDER_UNDERPAID'
  | 'ORDER_LINE_DIGITS'
  | 'PRODUCT_UNKNOWN_CHEMICAL'
  | 'PRODUCT_DUPLICATE'
  | 'PRODUCT_FLOOR_RANGE'
  | 'PRODUCT_LINE_DIGITS'
  | 'BUYER_UNKNOWN_PRODUCT'
  | 'ORDER_ITEM_KIND';

export type ValidationIssue = { code: IssueCode; ref: string; detail: string };
export type ValidateOptions = { requireReviewed: boolean; minBranchingPairs: number };

/** Spec: the shipped rule set must offer at least this many branching input pairs. */
export const MIN_BRANCHING_PAIRS = 8;

/**
 * Options for `cli.ts validate`. Strict (no --drafts) is the release gate: every rule reviewed and
 * at least MIN_BRANCHING_PAIRS branching pairs. --drafts relaxes only the reviewed check.
 */
export function cliValidateOptions(includeDrafts: boolean): ValidateOptions {
  return { requireReviewed: !includeDrafts, minBranchingPairs: MIN_BRANCHING_PAIRS };
}

const MIN_DURATION_S = 10;
const MAX_DURATION_S = 60;

export const inputKey = (r: ReactionDef): string => r.inputs.map((i) => i.chemicalId).sort().join('+');

/** `seedIds`: chemicals obtainable without breeding (extractor kinds plus place drops). Defaults to the extractor kinds. */
export function validateCatalog(c: Catalog, opts: ValidateOptions, seedIds: readonly string[] = EXTRACTOR_ELEMENTS): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (code: IssueCode, ref: string, detail: string) => issues.push({ code, ref, detail });
  const chemById = new Map(c.chemicals.map((x) => [x.id, x]));
  const parsable = new Set<string>();

  for (const ch of c.chemicals) {
    try {
      parseFormula(ch.formula);
      parsable.add(ch.id);
    } catch (e) {
      add('BAD_FORMULA', ch.id, `formula "${ch.formula}": ${(e as Error).message}`);
    }
    if (isBannedChemical(ch)) add('BANNED', ch.id, `banned chemical (${ch.formula})`);
    if (!c.monsters.some((m) => m.chemicalId === ch.id)) add('MISSING_MONSTER', ch.id, 'chemical has no monster');
  }

  const sound = new Set<string>(); // rules safe to feed to the engine
  for (const r of c.reactions) {
    let ok = true;
    const ids = [...r.inputs, ...r.outputs].map((t) => t.chemicalId);
    for (const id of ids) {
      if (!chemById.has(id)) {
        add('UNKNOWN_CHEMICAL', r.id, `unknown chemical "${id}"`);
        ok = false;
      }
    }
    for (const [side, terms] of [['inputs', r.inputs], ['outputs', r.outputs]] as const) {
      const seen = new Set<string>();
      for (const t of terms) {
        if (seen.has(t.chemicalId)) {
          add('DUPLICATE_ID', r.id, `"${t.chemicalId}" appears twice in ${side}`);
          if (side === 'inputs') ok = false;
        }
        seen.add(t.chemicalId);
      }
    }
    if (ok && ids.every((id) => parsable.has(id))) {
      const b = isBalanced(r, (id) => chemById.get(id)!.formula);
      if (!b.ok) add('UNBALANCED', r.id, `element difference (outputs minus inputs): ${JSON.stringify(b.diff)}`);
    }
    if (r.durationS < MIN_DURATION_S || r.durationS > MAX_DURATION_S) {
      add('BAD_DURATION', r.id, `durationS ${r.durationS} not in ${MIN_DURATION_S}..${MAX_DURATION_S}`);
    }
    if (opts.requireReviewed && !r.reviewed) add('NOT_REVIEWED', r.id, 'reviewed is false');
    const rangeBad = (name: string, rg?: { min: number; max: number }) => {
      if (rg && rg.min > rg.max) add('BAD_RANGE', r.id, `${name} min ${rg.min} > max ${rg.max}`);
    };
    rangeBad('temperatureC', r.conditions.temperatureC);
    rangeBad('pressureAtm', r.conditions.pressureAtm);
    rangeBad('ratio', r.ratio);
    if (r.conditions.catalyst?.length === 0) add('BAD_RANGE', r.id, 'empty catalyst list matches nothing');
    if (r.conditions.environment?.length === 0) add('BAD_RANGE', r.id, 'empty environment list matches nothing');
    if (r.inputs.length === 1 && r.ratio) add('BAD_RANGE', r.id, 'ratio set on a 1-input rule');
    if (ok) sound.add(r.id);
  }

  // Grid enumeration per input set: ties, never-firing rules, branching pairs.
  const soundRules = c.reactions.filter((r) => sound.has(r.id));
  const groups = new Map<string, ReactionDef[]>();
  for (const r of soundRules) groups.set(inputKey(r), [...(groups.get(inputKey(r)) ?? []), r]);
  let branching = 0;
  for (const [key, rules] of groups) {
    const outcomes = enumerateOutcomes(rules, key.split('+'));
    const won = new Set<string>();
    const products = new Set<string>();
    let tie: string[] | null = null;
    for (const o of outcomes) {
      if (o.winners.length >= 2) tie ??= o.winners.map((w) => w.id);
      if (o.winners.length === 1) {
        won.add(o.winners[0]!.id);
        products.add(o.winners[0]!.outputs.map((t) => t.chemicalId).sort().join('+'));
      }
    }
    if (tie) add('TIE', key, `rules ${tie.join(', ')} tie on the same conditions`);
    if (products.size >= 2) branching++;
    for (const r of rules) {
      if (!won.has(r.id)) add('UNREACHABLE_RULE', r.id, 'never the sole winner for any counts 1..4 and any condition on the grid');
    }
  }
  if (branching < opts.minBranchingPairs) {
    add('TOO_FEW_BRANCHES', 'catalog', `${branching} branching input pairs, need at least ${opts.minBranchingPairs}`);
  }

  // Reachability: fixed point from the extractor kinds and the place drops.
  const reach = new Set<string>(seedIds);
  for (let grew = true; grew; ) {
    grew = false;
    for (const r of c.reactions) {
      if (r.inputs.every((i) => reach.has(i.chemicalId))) {
        for (const o of r.outputs) if (!reach.has(o.chemicalId)) (reach.add(o.chemicalId), (grew = true));
      }
    }
  }
  for (const ch of c.chemicals) {
    if (ch.kind === 'compound' && !reach.has(ch.id)) add('UNREACHABLE', ch.id, 'compound cannot be produced from the extractor elements and place drops');
  }
  return issues;
}

/** Input sets (sorted ids joined by "+") whose sole-winner outcomes give at least 2 distinct product sets. */
export function branchingPairs(c: Catalog): string[] {
  const groups = new Map<string, ReactionDef[]>();
  for (const r of c.reactions) {
    const ids = r.inputs.map((i) => i.chemicalId);
    if (new Set(ids).size !== ids.length) continue;
    groups.set(inputKey(r), [...(groups.get(inputKey(r)) ?? []), r]);
  }
  const out: string[] = [];
  for (const [key, rules] of groups) {
    const products = new Set<string>();
    for (const o of enumerateOutcomes(rules, key.split('+'))) {
      if (o.winners.length === 1) products.add(o.winners[0]!.outputs.map((t) => t.chemicalId).sort().join('+'));
    }
    if (products.size >= 2) out.push(key);
  }
  return out.sort();
}
