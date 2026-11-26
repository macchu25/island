import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ProductsSchema, type Catalog, type Economy, type Product } from '@chemimon/shared';
import { ContentLoadError, DEFAULT_DATA_DIR, type ContentIssue } from './load';
import type { IssueCode, ValidationIssue } from './validate';

const FILE = 'products.yaml';

/** Loads data/products.yaml. Throws ContentLoadError like loadBuyers. */
export function loadProducts(opts: { dataDir?: string } = {}): Product[] {
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
  const r = ProductsSchema.safeParse(doc);
  if (r.success) return r.data.products;
  const issues: ContentIssue[] = r.error.issues.map((i) => ({
    file: FILE,
    path: i.path.length ? i.path.map(String).join('.') : '(root)',
    message: i.message,
  }));
  throw new ContentLoadError(issues);
}

/**
 * Product rules: every ingredient is a catalog chemical, floor price within
 * [sum(count x ingredient floor), ceil(1.5 x sum)], line has no digits, ids unique and not a chemical id.
 */
export function validateProducts(c: Catalog, e: Economy, products: readonly Product[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (code: IssueCode, ref: string, detail: string) => issues.push({ code, ref, detail });
  const chems = new Set(c.chemicals.map((x) => x.id));
  const seen = new Set<string>();
  for (const p of products) {
    if (seen.has(p.id)) add('PRODUCT_DUPLICATE', p.id, 'product id appears twice');
    else if (chems.has(p.id)) add('PRODUCT_DUPLICATE', p.id, 'product id is also a chemical id');
    seen.add(p.id);
    let known = true;
    let sum = 0;
    for (const ing of p.ingredients) {
      if (!chems.has(ing.chemicalId)) {
        known = false;
        add('PRODUCT_UNKNOWN_CHEMICAL', p.id, `ingredient "${ing.chemicalId}" is not in the catalog`);
      } else {
        sum += ing.count * (e.floorPrices[ing.chemicalId] ?? 0);
      }
    }
    if (known) {
      const max = Math.ceil(1.5 * sum);
      if (p.floorPrice < sum || p.floorPrice > max) {
        add('PRODUCT_FLOOR_RANGE', p.id, `floor ${p.floorPrice} not in ${sum}..${max} (sum of ingredient floors ${sum}, ceil(1.5 x sum) ${max})`);
      }
    }
    if (/[0-9]/.test(p.line)) add('PRODUCT_LINE_DIGITS', p.id, 'line contains a digit');
  }
  return issues;
}
