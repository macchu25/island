import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { BuyersSchema, type Buyers, type Catalog, type Economy, type Product } from '@chemimon/shared';
import { ContentLoadError, DEFAULT_DATA_DIR, type ContentIssue } from './load';
import { productionCosts } from './economy';
import type { IssueCode, ValidationIssue } from './validate';

const FILE = 'buyers.yaml';

/** Loads data/buyers.yaml (a YAML mapping). Throws ContentLoadError like loadEconomy. */
export function loadBuyers(opts: { dataDir?: string } = {}): Buyers {
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
  const r = BuyersSchema.safeParse(doc);
  if (r.success) return r.data;
  const issues: ContentIssue[] = r.error.issues.map((i) => ({
    file: FILE,
    path: i.path.length ? i.path.map(String).join('.') : '(root)',
    message: i.message,
  }));
  throw new ContentLoadError(issues);
}

/** Order rules: known chemical and stall, unique id, reward covers cost and floor, line has no digits. */
export function validateBuyers(c: Catalog, e: Economy, b: Buyers, extractorIds: readonly string[], products: readonly Product[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (code: IssueCode, ref: string, detail: string) => issues.push({ code, ref, detail });
  const chems = new Set(c.chemicals.map((x) => x.id));
  const stalls = new Set(b.stalls.map((s) => s.id));
  const costs = productionCosts(c, e, extractorIds);
  const prodById = new Map(products.map((p) => [p.id, p]));
  const seen = new Set<string>();
  for (const o of b.orders) {
    if (seen.has(o.id)) add('BUYER_DUPLICATE', o.id, 'order template id appears twice');
    seen.add(o.id);
    if (!stalls.has(o.stallId)) add('BUYER_UNKNOWN_STALL', o.id, `stall "${o.stallId}" is not defined`);
    if ((o.chemicalId === undefined) === (o.productId === undefined)) {
      add('ORDER_ITEM_KIND', o.id, 'an order needs exactly one of chemicalId and productId');
    } else if (o.productId !== undefined) {
      const p = prodById.get(o.productId);
      if (!p) {
        add('BUYER_UNKNOWN_PRODUCT', o.id, `product "${o.productId}" is not defined`);
      } else {
        const cost = p.ingredients.reduce((sum, ing) => sum + ing.count * (costs.get(ing.chemicalId) ?? Infinity), 0);
        const need = Math.max(Number.isFinite(cost) ? 1.5 * o.count * cost : 0, 2 * o.count * p.floorPrice);
        if (o.reward < need) add('ORDER_UNDERPAID', o.id, `reward ${o.reward} < ${need} (1.5 x count x cost ${cost}, 2 x count x floor ${p.floorPrice})`);
      }
    } else if (!chems.has(o.chemicalId!)) {
      add('BUYER_UNKNOWN_CHEMICAL', o.id, `chemical "${o.chemicalId}" is not in the catalog`);
    } else {
      const cost = costs.get(o.chemicalId!) ?? Infinity;
      const floor = e.floorPrices[o.chemicalId!] ?? 0;
      const need = Math.max(Number.isFinite(cost) ? 1.5 * o.count * cost : 0, 2 * o.count * floor);
      if (o.reward < need) add('ORDER_UNDERPAID', o.id, `reward ${o.reward} < ${need} (1.5 x count x cost ${cost}, 2 x count x floor ${floor})`);
    }
    if (/[0-9]/.test(o.line)) add('ORDER_LINE_DIGITS', o.id, 'line contains a digit');
  }
  return issues;
}
