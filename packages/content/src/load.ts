import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import {
  ChemicalDefSchema,
  MonsterDefSchema,
  ReactionDefSchema,
  type Catalog,
  type ChemicalDef,
  type MonsterDef,
  type ReactionDef,
} from '@chemimon/shared';

/** packages/content/data, resolved from this module file (not from process.cwd()). */
export const DEFAULT_DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

export type ContentIssue = { file: string; path: string; message: string };

export class ContentLoadError extends Error {
  readonly issues: ContentIssue[];
  constructor(issues: ContentIssue[]) {
    super(
      `Invalid content (${issues.length} issue${issues.length === 1 ? '' : 's'}):\n` +
        issues.map((i) => `  ${i.file}: ${i.path}: ${i.message}`).join('\n'),
    );
    this.name = 'ContentLoadError';
    this.issues = issues;
  }
}

export type LoadOptions = { includeDrafts?: boolean; dataDir?: string };

type SafeParser<T> = {
  safeParse(v: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
};

/** Formats a zod path as YAML-ish: [3].conditions.temperatureC.min */
function formatPath(segments: readonly PropertyKey[]): string {
  let out = '';
  for (const s of segments) {
    out += typeof s === 'number' ? `[${s}]` : `${out === '' ? '' : '.'}${String(s)}`;
  }
  return out === '' ? '(root)' : out;
}

function loadList<T>(dataDir: string, file: string, schema: SafeParser<T>, issues: ContentIssue[]): T[] {
  const full = join(dataDir, file);
  if (!existsSync(full)) {
    issues.push({ file, path: '(root)', message: 'file not found' });
    return [];
  }
  let doc: unknown;
  try {
    doc = parseYaml(readFileSync(full, 'utf8'));
  } catch (e) {
    issues.push({ file, path: '(root)', message: `YAML parse error: ${(e as Error).message}` });
    return [];
  }
  if (!Array.isArray(doc)) {
    issues.push({ file, path: '(root)', message: 'expected a YAML list' });
    return [];
  }
  const out: T[] = [];
  doc.forEach((item, i) => {
    const r = schema.safeParse(item);
    if (r.success) out.push(r.data);
    else for (const iss of r.error.issues) issues.push({ file, path: formatPath([i, ...iss.path]), message: iss.message });
  });
  return out;
}

/**
 * Loads the content catalog synchronously. Seeded reactions come from data/reactions.yaml;
 * with includeDrafts, data/drafts/reactions.yaml is appended. Throws ContentLoadError listing
 * every schema issue (file + YAML path). Cross-reference checks live in the validator.
 */
export function loadCatalog(opts: LoadOptions = {}): Catalog {
  const dataDir = opts.dataDir ?? DEFAULT_DATA_DIR;
  const issues: ContentIssue[] = [];
  const chemicals = loadList<ChemicalDef>(dataDir, 'chemicals.yaml', ChemicalDefSchema, issues);
  const monsters = loadList<MonsterDef>(dataDir, 'monsters.yaml', MonsterDefSchema, issues);
  const reactions = loadList<ReactionDef>(dataDir, 'reactions.yaml', ReactionDefSchema, issues);
  if (opts.includeDrafts) {
    reactions.push(...loadList<ReactionDef>(dataDir, 'drafts/reactions.yaml', ReactionDefSchema, issues));
  }
  if (issues.length > 0) throw new ContentLoadError(issues);
  return { chemicals, monsters, reactions };
}
