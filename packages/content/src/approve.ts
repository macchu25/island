import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMap, isSeq, parseDocument, type Document, type YAMLMap, type YAMLSeq } from 'yaml';

function seqOf(doc: Document, file: string): YAMLSeq<YAMLMap> {
  if (!isSeq(doc.contents)) throw new Error(`${file}: expected a YAML list`);
  return doc.contents as YAMLSeq<YAMLMap>;
}
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
function writeAtomic(path: string, text: string): void {
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}
const idOf = (m: YAMLMap): string => String(m.get('id'));

/**
 * Moves rules from drafts/reactions.yaml to reactions.yaml, sets reviewed: true, and sorts
 * reactions.yaml by id. Uses the yaml Document API so comments attached to a rule move with it.
 * Drafts keep their original (section-grouped) order: only removals. Comments that are not attached
 * to a rule (a lone section banner followed by a removed rule's neighbour) stay where they were.
 * All-or-nothing: unknown or already-approved ids throw before any file is written.
 */
export function approveRules(dataDir: string, ids: string[]): void {
  if (ids.length === 0) throw new Error('no ids given');
  const dPath = join(dataDir, 'drafts', 'reactions.yaml');
  const rPath = join(dataDir, 'reactions.yaml');
  const drafts = parseDocument(readFileSync(dPath, 'utf8'));
  const approved = parseDocument(readFileSync(rPath, 'utf8'));
  for (const [doc, p] of [[drafts, dPath], [approved, rPath]] as const) {
    if (doc.errors.length) throw new Error(`${p}: YAML syntax error: ${doc.errors[0]!.message}`);
  }
  const dSeq = seqOf(drafts, dPath);
  const rSeq = seqOf(approved, rPath);
  const want = [...new Set(ids)];
  const dup = want.filter((id) => rSeq.items.some((m) => isMap(m) && idOf(m) === id));
  if (dup.length) throw new Error(`already approved: ${dup.join(', ')}`);
  const missing = want.filter((id) => !dSeq.items.some((m) => isMap(m) && idOf(m) === id));
  if (missing.length) throw new Error(`not found in drafts: ${missing.join(', ')}`);

  const moved: YAMLMap[] = [];
  dSeq.items = dSeq.items.filter((m) => {
    if (isMap(m) && want.includes(idOf(m))) {
      m.set('reviewed', true);
      moved.push(m);
      return false;
    }
    return true;
  });
  rSeq.items.push(...moved);
  rSeq.items.sort((a, b) => cmp(idOf(a), idOf(b)));
  rSeq.flow = false;
  if (dSeq.items.length === 0) dSeq.flow = true;
  writeAtomic(rPath, String(approved));
  writeAtomic(dPath, String(drafts));
}
