import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Catalog, ChemicalDef, MonsterDef, ReactionDef } from '@chemimon/shared';
import { DEFAULT_DATA_DIR, loadCatalog } from '../src/index';
import { approveRules, conditionsVi, renderReview, validateCatalog } from '../src/index';
import type { ValidationIssue } from '../src/index';

const chem = (id: string, formula: string, kind: 'element' | 'compound'): ChemicalDef => ({
  id, formula, name: id, kind, phaseAt25C: 'gas', family: 'x',
});
const mon = (id: string): MonsterDef => ({
  id, chemicalId: id, displayName: id, rarity: 'common', silhouette: 'cloud', color: '#112233', assetKey: id, blurb: '',
});
const rule = (over: Partial<ReactionDef> = {}): ReactionDef => ({
  id: 'r1',
  inputs: [{ chemicalId: 'h2', coefficient: 2 }, { chemicalId: 'o2', coefficient: 1 }],
  outputs: [{ chemicalId: 'h2o', coefficient: 2 }],
  conditions: {},
  priority: 1,
  durationS: 10,
  source: 'https://example.org',
  reviewed: true,
  ...over,
});
function base(): Catalog {
  return {
    chemicals: [chem('h2', 'H2', 'element'), chem('o2', 'O2', 'element'), chem('h2o', 'H2O', 'compound')],
    monsters: [mon('h2'), mon('o2'), mon('h2o')],
    reactions: [rule()],
  };
}
const strict = { requireReviewed: true, minBranchingPairs: 0 };
const codes = (c: Catalog, o = strict): string[] => validateCatalog(c, o).map((i: ValidationIssue) => i.code);

describe('validateCatalog', () => {
  it('clean fixture has no issues', () => expect(validateCatalog(base(), strict)).toEqual([]));

  it('BAD_FORMULA', () => {
    const c = base();
    c.chemicals[2] = chem('h2o', 'H2(O', 'compound');
    expect(codes(c)).toContain('BAD_FORMULA');
  });
  it('UNBALANCED', () => {
    const c = base();
    c.reactions = [rule({ inputs: [{ chemicalId: 'h2', coefficient: 1 }, { chemicalId: 'o2', coefficient: 1 }] })];
    expect(codes(c)).toContain('UNBALANCED');
  });
  it('UNKNOWN_CHEMICAL', () => {
    const c = base();
    c.reactions = [rule({ outputs: [{ chemicalId: 'zzz', coefficient: 2 }] })];
    expect(codes(c)).toContain('UNKNOWN_CHEMICAL');
  });
  it('DUPLICATE_ID in a rule side', () => {
    const c = base();
    c.reactions = [rule({ inputs: [{ chemicalId: 'h2', coefficient: 1 }, { chemicalId: 'h2', coefficient: 1 }] })];
    expect(codes(c)).toContain('DUPLICATE_ID');
  });
  it('MISSING_MONSTER', () => {
    const c = base();
    c.monsters = c.monsters.filter((m) => m.chemicalId !== 'h2o');
    expect(codes(c)).toContain('MISSING_MONSTER');
  });
  it('TIE', () => {
    const c = base();
    c.reactions = [rule(), rule({ id: 'r2' })];
    expect(codes(c)).toContain('TIE');
  });
  it('UNREACHABLE compound', () => {
    const c = base();
    c.chemicals.push(chem('h2o2', 'H2O2', 'compound'));
    c.monsters.push(mon('h2o2'));
    const issues = validateCatalog(c, strict);
    expect(issues.some((i) => i.code === 'UNREACHABLE' && i.ref === 'h2o2')).toBe(true);
  });
  it('BANNED by formula (case-sensitive) and by id (case-insensitive)', () => {
    const mk = (id: string, formula: string) => {
      const c = base();
      c.chemicals.push(chem(id, formula, 'compound'));
      c.monsters.push(mon(id));
      return codes(c);
    };
    expect(mk('hcn_x', 'HCN')).toContain('BANNED');
    expect(mk('HCN', 'H2O2')).toContain('BANNED');
    expect(mk('nan3', 'N3Na')).toContain('BANNED');
    expect(mk('cocl2', 'H2O2')).toContain('BANNED');
    expect(mk('COCL2', 'H2O2')).toContain('BANNED');
    expect(mk('phos_x', 'COCl2')).toContain('BANNED');
    // CoCl2 (cobalt chloride) differs from COCl2 (phosgene) only by case: not banned.
    expect(mk('cobalt_chloride', 'CoCl2')).not.toContain('BANNED');
  });
  it('BANNED', () => {
    const c = base();
    c.chemicals.push(chem('hcn', 'HCN', 'compound'));
    c.monsters.push(mon('hcn'));
    expect(codes(c)).toContain('BANNED');
  });
  it('NOT_REVIEWED only when required', () => {
    const c = base();
    c.reactions = [rule({ reviewed: false })];
    expect(codes(c)).toContain('NOT_REVIEWED');
    expect(codes(c, { requireReviewed: false, minBranchingPairs: 0 })).not.toContain('NOT_REVIEWED');
  });
  it('TOO_FEW_BRANCHES', () => {
    expect(codes(base(), { requireReviewed: true, minBranchingPairs: 1 })).toContain('TOO_FEW_BRANCHES');
  });
  it('branching pair counts distinct product sets', () => {
    const c = base();
    c.chemicals.push(chem('h2o2', 'H2O2', 'compound'));
    c.monsters.push(mon('h2o2'));
    c.reactions = [
      rule({ conditions: { activation: 'spark' } }),
      rule({ id: 'r2', inputs: [{ chemicalId: 'h2', coefficient: 1 }, { chemicalId: 'o2', coefficient: 1 }], outputs: [{ chemicalId: 'h2o2', coefficient: 1 }], conditions: { activation: 'light' } }),
    ];
    expect(codes(c, { requireReviewed: true, minBranchingPairs: 1 })).toEqual([]);
  });
  it('BAD_DURATION', () => {
    const c = base();
    c.reactions = [rule({ durationS: 5 })];
    expect(codes(c)).toContain('BAD_DURATION');
    c.reactions = [rule({ durationS: 61 })];
    expect(codes(c)).toContain('BAD_DURATION');
  });
  it('BAD_RANGE: min>max, empty list, ratio on 1-input rule', () => {
    const c = base();
    c.reactions = [rule({ conditions: { temperatureC: { min: 450, max: 200 } } })];
    expect(codes(c)).toContain('BAD_RANGE');
    c.reactions = [rule({ conditions: { catalyst: [] } })];
    expect(codes(c)).toContain('BAD_RANGE');
    c.reactions = [rule({ conditions: { environment: [] } })];
    expect(codes(c)).toContain('BAD_RANGE');
    c.reactions = [rule({ inputs: [{ chemicalId: 'h2', coefficient: 2 }], outputs: [{ chemicalId: 'h2', coefficient: 2 }], ratio: { min: 1, max: 2 } })];
    expect(codes(c)).toContain('BAD_RANGE');
  });
  it('UNREACHABLE_RULE: never fires on the grid', () => {
    const c = base();
    c.reactions = [rule({ conditions: { pressureAtm: { min: 300, max: 400 } } })];
    expect(codes(c)).toContain('UNREACHABLE_RULE');
  });
  it('UNREACHABLE_RULE: shadowed by higher priority', () => {
    const c = base();
    c.reactions = [rule({ priority: 2 }), rule({ id: 'r2', priority: 1 })];
    const issues = validateCatalog(c, strict);
    expect(issues.some((i) => i.code === 'UNREACHABLE_RULE' && i.ref === 'r2')).toBe(true);
  });
});

describe('shipped drafts', () => {
  it('pass the drafts gate', () => {
    const issues = validateCatalog(loadCatalog({ includeDrafts: true }), { requireReviewed: false, minBranchingPairs: 8 });
    expect(issues).toEqual([]);
  });
  it('renders one review row per draft rule', () => {
    const md = renderReview(DEFAULT_DATA_DIR);
    const n = loadCatalog({ includeDrafts: true }).reactions.length;
    expect(md.split('\n').filter((l) => l.startsWith('| `')).length).toBe(n);
    expect(md).toContain('H₂O');
  });
});

describe('approveRules', () => {
  let dir = '';
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));
  it('moves one rule to reactions.yaml with reviewed true, keeps comments', () => {
    dir = mkdtempSync(join(tmpdir(), 'chemimon-approve-'));
    cpSync(DEFAULT_DATA_DIR, dir, { recursive: true });
    const before = loadCatalog({ includeDrafts: true, dataDir: dir }).reactions.length;
    approveRules(dir, ['h2_o2_hot']);
    expect(loadCatalog({ dataDir: dir }).reactions.map((r) => [r.id, r.reviewed])).toEqual([['h2_o2_hot', true]]);
    const all = loadCatalog({ includeDrafts: true, dataDir: dir }).reactions;
    expect(all).toHaveLength(before);
    expect(all.filter((r) => r.id === 'h2_o2_hot')).toHaveLength(1);
    expect(readFileSync(join(dir, 'reactions.yaml'), 'utf8')).toContain('Oxyhydrogen autoignition');
  });
  it('rejects unknown ids and changes nothing', () => {
    dir = mkdtempSync(join(tmpdir(), 'chemimon-approve-'));
    cpSync(DEFAULT_DATA_DIR, dir, { recursive: true });
    expect(() => approveRules(dir, ['h2_o2_hot', 'nope'])).toThrow(/nope/);
    expect(loadCatalog({ dataDir: dir }).reactions).toHaveLength(0);
  });
  it('malformed reactions.yaml throws and leaves both files byte-identical', () => {
    dir = mkdtempSync(join(tmpdir(), 'chemimon-approve-'));
    cpSync(DEFAULT_DATA_DIR, dir, { recursive: true });
    writeFileSync(join(dir, 'reactions.yaml'), '- id: [unclosed\n  x: : :\n');
    const r0 = readFileSync(join(dir, 'reactions.yaml'), 'utf8');
    const d0 = readFileSync(join(dir, 'drafts', 'reactions.yaml'), 'utf8');
    expect(() => approveRules(dir, ['h2_o2_hot'])).toThrow(/YAML/);
    expect(readFileSync(join(dir, 'reactions.yaml'), 'utf8')).toBe(r0);
    expect(readFileSync(join(dir, 'drafts', 'reactions.yaml'), 'utf8')).toBe(d0);
  });
  it('drafts unchanged after a failed approve', () => {
    dir = mkdtempSync(join(tmpdir(), 'chemimon-approve-'));
    cpSync(DEFAULT_DATA_DIR, dir, { recursive: true });
    const d0 = readFileSync(join(dir, 'drafts', 'reactions.yaml'), 'utf8');
    expect(() => approveRules(dir, ['h2_o2_hot', 'nope'])).toThrow();
    expect(readFileSync(join(dir, 'drafts', 'reactions.yaml'), 'utf8')).toBe(d0);
  });
  it('second approve says already approved', () => {
    dir = mkdtempSync(join(tmpdir(), 'chemimon-approve-'));
    cpSync(DEFAULT_DATA_DIR, dir, { recursive: true });
    approveRules(dir, ['h2_o2_hot']);
    expect(() => approveRules(dir, ['h2_o2_hot'])).toThrow(/already approved/);
  });
  it('renders catalyst none as "không có xúc tác"', () => {
    expect(conditionsVi({ catalyst: ['none'] })).toBe('không có xúc tác');
    expect(conditionsVi({ catalyst: ['Pt', 'none'] })).toBe('xúc tác Pt hoặc không có xúc tác');
  });
});
