import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { approveRules } from './approve';
import { loadEconomy, validateEconomy } from './economy';
import { EXTRACTOR_ELEMENTS } from '@chemimon/shared';
import { ContentLoadError, DEFAULT_DATA_DIR, loadCatalog } from './load';
import { renderReview } from './review';
import { cliValidateOptions, validateCatalog } from './validate';

const REPO_ROOT = join(DEFAULT_DATA_DIR, '..', '..', '..');
const [cmd, ...args] = process.argv.slice(2);

try {
  if (cmd === 'validate') {
    const drafts = args.includes('--drafts');
    const catalog = loadCatalog({ includeDrafts: drafts });
    const issues = validateCatalog(catalog, cliValidateOptions(drafts));
    issues.push(...validateEconomy(catalog, loadEconomy(), EXTRACTOR_ELEMENTS));
    for (const i of issues) console.log(`${i.code}\t${i.ref}\t${i.detail}`);
    console.log(`${issues.length} issue(s), ${catalog.reactions.length} rule(s), ${catalog.chemicals.length} chemicals`);
    process.exit(issues.length ? 1 : 0);
  } else if (cmd === 'review') {
    const out = join(REPO_ROOT, 'docs', 'content-review.md');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderReview());
    console.log(`wrote ${out}`);
  } else if (cmd === 'approve') {
    const ids = args.filter((a) => !a.startsWith('--'));
    approveRules(DEFAULT_DATA_DIR, ids);
    console.log(`approved ${ids.length} rule(s): ${ids.join(', ')}`);
  } else {
    console.error('usage: cli.ts validate [--drafts] | review | approve <id...>');
    process.exit(2);
  }
} catch (e) {
  console.error(e instanceof ContentLoadError ? e.message : (e as Error).message);
  process.exit(2);
}
