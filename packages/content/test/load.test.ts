import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { STARTER_ELEMENTS } from '@chemimon/shared';
import { BANNED_FORMULAS, ContentLoadError, loadCatalog } from '../src/index';

describe('loadCatalog (shipped data)', () => {
  it('loads 45 chemicals, 45 monsters and 0 seeded reactions by default', () => {
    const c = loadCatalog();
    expect(c.chemicals).toHaveLength(45);
    expect(c.monsters).toHaveLength(45);
    expect(c.reactions).toHaveLength(0);
  });

  it('includes 40 to 60 draft reactions with includeDrafts', () => {
    const n = loadCatalog({ includeDrafts: true }).reactions.length;
    expect(n).toBeGreaterThanOrEqual(40);
    expect(n).toBeLessThanOrEqual(60);
  });

  it('has every starter element with kind element, and exactly 20 compounds', () => {
    const c = loadCatalog();
    for (const id of STARTER_ELEMENTS) {
      expect(c.chemicals.find((x) => x.id === id)?.kind, id).toBe('element');
    }
    expect(c.chemicals.filter((x) => x.kind === 'compound')).toHaveLength(20);
  });

  it('exports a non-empty banned formula list', () => {
    expect(BANNED_FORMULAS).toContain('COCl2');
    expect(BANNED_FORMULAS).toContain('HCN');
  });
});

describe('loadCatalog (malformed data)', () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  function writeData(draftRules: string): string {
    const d = mkdtempSync(join(tmpdir(), 'chemimon-content-'));
    mkdirSync(join(d, 'drafts'));
    writeFileSync(join(d, 'chemicals.yaml'), '[]\n');
    writeFileSync(join(d, 'monsters.yaml'), '[]\n');
    writeFileSync(join(d, 'reactions.yaml'), '[]\n');
    writeFileSync(join(d, 'drafts', 'reactions.yaml'), draftRules);
    return d;
  }

  const goodRule = `
- id: ok
  inputs: [{ chemicalId: h2, coefficient: 2 }, { chemicalId: o2, coefficient: 1 }]
  outputs: [{ chemicalId: h2o, coefficient: 2 }]
  conditions: { activation: spark }
  priority: 1
  durationS: 10
  source: https://example.org
  reviewed: false
`;

  it('throws ContentLoadError naming the file and the YAML path of the bad field', () => {
    dir = writeData(
      goodRule +
        `
- id: bad
  inputs: [{ chemicalId: c, coefficient: 1 }, { chemicalId: o2, coefficient: 1 }]
  outputs: [{ chemicalId: co2, coefficient: 1 }]
  conditions: { temperatureC: { min: hot, max: 2500 } }
  priority: 1
  durationS: 10
  source: https://example.org
  reviewed: false
`,
    );
    let err: unknown;
    try {
      loadCatalog({ includeDrafts: true, dataDir: dir });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ContentLoadError);
    const msg = (err as Error).message;
    expect(msg).toContain('drafts/reactions.yaml');
    expect(msg).toContain('[1].conditions.temperatureC.min');
  });

  it('does not read drafts unless includeDrafts is set', () => {
    dir = writeData('- id: broken\n');
    expect(loadCatalog({ dataDir: dir }).reactions).toEqual([]);
    expect(() => loadCatalog({ includeDrafts: true, dataDir: dir })).toThrow(ContentLoadError);
  });

  it('reports a file whose top level is not a list', () => {
    dir = writeData('id: not-a-list\n');
    expect(() => loadCatalog({ includeDrafts: true, dataDir: dir })).toThrow(/drafts\/reactions\.yaml: \(root\)/);
  });
});

describe('isBannedChemical', () => {
  it('matches ids case-insensitively and formulas case-sensitively', async () => {
    const { isBannedChemical } = await import('../src/index');
    expect(isBannedChemical({ id: 'cocl2', formula: 'X' })).toBe(true);
    expect(isBannedChemical({ id: 'x', formula: 'COCl2' })).toBe(true);
    expect(isBannedChemical({ id: 'cocl2_cobalt', formula: 'CoCl2' })).toBe(false);
    expect(isBannedChemical({ id: 'x', formula: 'cocl2' })).toBe(false);
  });
});
