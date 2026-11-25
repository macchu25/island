import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { maxRunsPerStart } from '@chemimon/chem-engine';
import {
  EconomySchema,
  PRESSURES_ATM,
  TEMPERATURES_C,
  ACTIVATIONS,
  CATALYSTS,
  ENVIRONMENTS,
  type Catalog,
  type ConditionPrices,
  type Economy,
  type RuleConditions,
} from '@chemimon/shared';
import { ContentLoadError, DEFAULT_DATA_DIR, type ContentIssue } from './load';
import type { IssueCode, ValidationIssue } from './validate';

const FILE = 'economy.yaml';

/** Loads data/economy.yaml (a YAML mapping). Throws ContentLoadError like loadCatalog. */
export function loadEconomy(opts: { dataDir?: string } = {}): Economy {
  const full = join(opts.dataDir ?? DEFAULT_DATA_DIR, FILE);
  const fail = (path: string, message: string): never => {
    throw new ContentLoadError([{ file: FILE, path, message }]);
  };
  if (!existsSync(full)) return fail('(root)', 'file not found');
  let doc: unknown;
  try {
    doc = parseYaml(readFileSync(full, 'utf8'));
  } catch (e) {
    return fail('(root)', `YAML parse error: ${(e as Error).message}`);
  }
  const r = EconomySchema.safeParse(doc);
  if (r.success) return r.data;
  const issues: ContentIssue[] = r.error.issues.map((i) => ({
    file: FILE,
    path: i.path.length ? i.path.map(String).join('.') : '(root)',
    message: i.message,
  }));
  throw new ContentLoadError(issues);
}

const minOf = (xs: number[]): number => Math.min(...xs);

/** Cheapest fee over every condition combination the rule accepts (dimensions are independent). */
export function cheapestRuleFee(rc: RuleConditions, p: ConditionPrices): number {
  const inRange = (v: number, r?: { min: number; max: number }) => !r || (v >= r.min && v <= r.max);
  const temp = minOf(
    TEMPERATURES_C.filter((v) => inRange(v, rc.temperatureC)).map((v) => p.temperatureC[`${v}`]),
  );
  const pres = minOf(
    PRESSURES_ATM.filter((v) => inRange(v, rc.pressureAtm)).map((v) => p.pressureAtm[`${v}`]),
  );
  const env = minOf((rc.environment ?? ENVIRONMENTS).map((v) => p.environment[v]));
  const cat = minOf((rc.catalyst ?? CATALYSTS).map((v) => p.catalyst[v]));
  const act = rc.activation !== undefined ? p.activation[rc.activation] : minOf(ACTIVATIONS.map((v) => p.activation[v]));
  return temp + pres + env + cat + act;
}

/**
 * Cheapest production cost per chemical (Bellman-Ford style relaxation over reviewed reactions).
 * The fee is paid once per breeding start, and one start can run the rule several times
 * (maxRunsPerStart), so each run carries fee / maxRuns. Rules that can never run are skipped.
 */
export function productionCosts(c: Catalog, p: ConditionPrices, freeIds: readonly string[]): Map<string, number> {
  const free = new Set(freeIds);
  const cost = new Map<string, number>(c.chemicals.map((x) => [x.id, free.has(x.id) ? 0 : Infinity]));
  const rules = c.reactions
    .filter((r) => r.reviewed)
    .map((r) => ({ r, runs: maxRunsPerStart(r) }))
    .filter(({ runs }) => runs > 0)
    .map(({ r, runs }) => ({
      r,
      feePerRun: cheapestRuleFee(r.conditions, p) / runs,
      outSum: r.outputs.reduce((s, o) => s + o.coefficient, 0),
    }));
  let changed = true;
  while (changed) {
    changed = false;
    for (const { r, feePerRun, outSum } of rules) {
      const unit = (r.inputs.reduce((s, i) => s + i.coefficient * (cost.get(i.chemicalId) ?? Infinity), 0) + feePerRun) / outSum;
      for (const o of r.outputs) {
        if (unit < (cost.get(o.chemicalId) ?? Infinity)) {
          cost.set(o.chemicalId, unit);
          changed = true;
        }
      }
    }
  }
  return cost;
}

export function validateEconomy(c: Catalog, e: Economy, freeIds: readonly string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (code: IssueCode, ref: string, detail: string) => issues.push({ code, ref, detail });
  const ids = new Set(c.chemicals.map((x) => x.id));
  const free = new Set(freeIds);
  const costs = productionCosts(c, e.conditionPrices, freeIds);
  for (const id of ids) {
    const f = e.floorPrices[id];
    if (f === undefined) {
      add('FLOOR_MISSING', id, 'chemical has no floor price');
      continue;
    }
    if (free.has(id)) {
      if (f < 1 || f > 3) add('FLOOR_FREE_RANGE', id, `free chemical floor ${f} is not in 1..3`);
    } else {
      const cost = costs.get(id) ?? Infinity;
      // A floor is an integer >= 1, so a cost under 1 (naoh = 0.75) cannot be met; the bound is max(1, cost).
      if (Number.isFinite(cost) && f > Math.max(1, cost)) add('FLOOR_ABOVE_COST', id, `floor ${f} > cheapest production cost ${cost}`);
    }
  }
  for (const id of Object.keys(e.floorPrices)) {
    if (!ids.has(id)) add('FLOOR_UNKNOWN', id, 'floor price for a chemical not in the catalog');
  }
  return issues;
}
