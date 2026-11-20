import { loadCatalog } from '@chemimon/content';
import { describe, expect, it } from 'vitest';
import { SLOT_RADIUS_FRACTION, habitatFor } from '../src/island/habitats';
import { LAYOUT } from '../src/island/layout';
import { FACE_POINT, YAW_JITTER, placeOwned } from '../src/island/placement';

const catalog = loadCatalog();
const all = catalog.chemicals.map((c) => ({ chemicalId: c.id, count: 3 }));

describe('placeOwned', () => {
  it('places every one of the 45 owned species once, in its own habitat, at a distinct spot', () => {
    const placed = placeOwned(catalog, all);
    expect(placed).toHaveLength(45);
    expect(new Set(placed.map((p) => p.monster.chemicalId)).size).toBe(45);
    expect(new Set(placed.map((p) => `${p.x.toFixed(4)},${p.z.toFixed(4)}`)).size).toBe(45);
    for (const p of placed) {
      const chem = catalog.chemicals.find((c) => c.id === p.monster.chemicalId)!;
      expect(p.habitat).toBe(habitatFor(chem));
      const hab = LAYOUT.habitats[p.habitat];
      expect(Math.hypot(p.x - hab.x, p.z - hab.z)).toBeLessThanOrEqual(SLOT_RADIUS_FRACTION * hab.r + 1e-9);
    }
  });

  it('skips zero counts and ids without a monster', () => {
    const placed = placeOwned(catalog, [{ chemicalId: 'h2o', count: 0 }, { chemicalId: 'fe', count: 2 }, { chemicalId: 'nope', count: 5 }]);
    expect(placed.map((p) => p.monster.chemicalId)).toEqual(['fe']);
    expect(placed[0]!.count).toBe(2);
    expect(placed[0]!.label).toBe('Fe');
  });

  it('a newly bred compound does not move the starter monsters', () => {
    const starters = catalog.chemicals.filter((c) => c.kind === 'element').map((c) => ({ chemicalId: c.id, count: 4 }));
    const before = placeOwned(catalog, starters);
    const after = placeOwned(catalog, [...starters, { chemicalId: 'h2o', count: 2 }]);
    for (const b of before) {
      const a = after.find((p) => p.monster.chemicalId === b.monster.chemicalId)!;
      expect([a.x, a.z]).toEqual([b.x, b.z]);
    }
    expect(after.find((p) => p.monster.chemicalId === 'h2o')!.label).toBe('H₂O');
  });

  it('turns each monster roughly towards the camera, with variation, and desynchronises phases', () => {
    const placed = placeOwned(catalog, all);
    for (const p of placed) {
      const facing = Math.atan2(FACE_POINT.x - p.x, FACE_POINT.z - p.z);
      expect(Math.abs(p.yaw - facing)).toBeLessThanOrEqual(YAW_JITTER);
    }
    expect(new Set(placed.map((p) => p.yaw.toFixed(3))).size).toBeGreaterThan(40);
    expect(new Set(placed.map((p) => p.phase.toFixed(3))).size).toBeGreaterThan(40);
  });
});
