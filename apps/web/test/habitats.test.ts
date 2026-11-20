import { loadCatalog } from '@chemimon/content';
import type { ChemicalDef } from '@chemimon/shared';
import { describe, expect, it } from 'vitest';
import {
  HABITAT_IDS,
  MIN_SLOT_SPACING,
  SLOT_RADIUS_FRACTION,
  habitatFor,
  habitatMembers,
  habitatSlots,
  type HabitatId,
} from '../src/island/habitats';
import { LAYOUT } from '../src/island/layout';

const catalog = loadCatalog();

// Brief section 6, verbatim.
const TABLE: Record<HabitatId, string[]> = {
  noble: ['he', 'ne', 'ar'],
  halogen: ['f2', 'cl2', 'i2'],
  metal: ['na', 'mg', 'al', 'k', 'ca', 'fe', 'cu', 'zn', 'ag', 'au', 'hg', 'pb'],
  gas: ['h2', 'n2', 'o2'],
  crystal: ['c', 'si', 'p4', 's8'],
  spring: ['h2o', 'co', 'co2', 'hcl', 'nh3'],
  quarry: ['cuo', 'cu2o', 'na2o', 'na2o2', 'k2o2', 'ko2', 'fe3o4', 'fe2o3', 'mgo', 'mgoh2', 'naoh', 'al2o3', 'sio2', 'sic', 'nacl'],
};

const minGap = (pts: { x: number; z: number }[]) => {
  let best = Infinity;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) best = Math.min(best, Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.z - pts[j]!.z));
  return best;
};

describe('habitatFor', () => {
  it('maps all 45 real chemicals exactly as the brief table', () => {
    expect(catalog.chemicals).toHaveLength(45);
    const got: Record<string, string[]> = {};
    for (const c of catalog.chemicals) (got[habitatFor(c)] ??= []).push(c.id);
    for (const h of HABITAT_IDS) expect(new Set(got[h]), h).toEqual(new Set(TABLE[h]));
  });

  it('every habitat id exists in layout.json', () => {
    for (const h of HABITAT_IDS) expect(LAYOUT.habitats[h], h).toBeDefined();
  });

  it('routes chemicals added later by rule, never by id', () => {
    const mk = (p: Partial<ChemicalDef>): ChemicalDef => ({ id: 'new', formula: 'X', name: 'X', kind: 'element', phaseAt25C: 'solid', family: 'nonmetal', ...p });
    expect(habitatFor(mk({ family: 'noble-gas', phaseAt25C: 'gas' }))).toBe('noble');
    expect(habitatFor(mk({ family: 'halogen', phaseAt25C: 'liquid' }))).toBe('halogen');
    expect(habitatFor(mk({ family: 'lanthanide-metal' }))).toBe('metal');
    expect(habitatFor(mk({ family: 'metal' }))).toBe('metal');
    expect(habitatFor(mk({ family: 'metalloid' }))).toBe('crystal');
    expect(habitatFor(mk({ family: 'nonmetal', phaseAt25C: 'gas' }))).toBe('gas');
    expect(habitatFor(mk({ family: 'nonmetal', phaseAt25C: 'liquid' }))).toBe('crystal');
    expect(habitatFor(mk({ kind: 'compound', family: 'acid', phaseAt25C: 'liquid' }))).toBe('spring');
    expect(habitatFor(mk({ kind: 'compound', family: 'salt', phaseAt25C: 'solid' }))).toBe('quarry');
  });

  it('habitatMembers keeps catalog order so slots are stable when new species are owned', () => {
    expect(habitatMembers(catalog.chemicals, 'gas')).toEqual(['h2', 'n2', 'o2']);
  });
});

describe('habitatSlots', () => {
  it('gives each real habitat population distinct slots inside 0.82 r with >= 1.4 spacing', () => {
    for (const h of HABITAT_IDS) {
      const hab = LAYOUT.habitats[h];
      const n = habitatMembers(catalog.chemicals, h).length;
      const pts = habitatSlots(hab, n);
      expect(pts, h).toHaveLength(n);
      for (const p of pts) expect(Math.hypot(p.x - hab.x, p.z - hab.z), h).toBeLessThanOrEqual(SLOT_RADIUS_FRACTION * hab.r + 1e-9);
      if (n > 1) expect(minGap(pts), h).toBeGreaterThanOrEqual(MIN_SLOT_SPACING);
    }
  });

  it('is deterministic', () => {
    expect(habitatSlots(LAYOUT.habitats.metal, 12)).toEqual(habitatSlots(LAYOUT.habitats.metal, 12));
  });

  it('handles 0 and 1', () => {
    expect(habitatSlots({ x: 2, z: 3, r: 3 }, 0)).toEqual([]);
    expect(habitatSlots({ x: 2, z: 3, r: 3 }, 1)).toEqual([{ x: 2, z: 3 }]);
  });

  it('keeps >= 1.4 spacing for every n up to what each plot can hold', () => {
    for (const h of HABITAT_IDS) {
      const hab = LAYOUT.habitats[h];
      // capacity of the real plots: a hex lattice of 1.4 inside 0.82 r holds at least this many.
      const cap = hab.r >= 4.5 ? 19 : 7;
      for (let n = 2; n <= cap; n++) expect(minGap(habitatSlots(hab, n)), `${h} n=${n}`).toBeGreaterThanOrEqual(MIN_SLOT_SPACING);
    }
  });

  it('still returns n distinct in-radius slots when n outgrows the plot (spacing shrinks as last resort)', () => {
    const hab = { x: 0, z: 0, r: 2.8 };
    for (const n of [8, 20, 60, 200]) {
      const pts = habitatSlots(hab, n);
      expect(pts).toHaveLength(n);
      expect(new Set(pts.map((p) => `${p.x.toFixed(6)},${p.z.toFixed(6)}`)).size).toBe(n);
      for (const p of pts) expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(SLOT_RADIUS_FRACTION * hab.r + 1e-9);
      expect(minGap(pts)).toBeGreaterThan(0.05);
    }
  });
});
