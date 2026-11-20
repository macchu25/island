import { describe, expect, it } from 'vitest';
import { HABITAT_IDS } from '../src/island/habitats';
import { LAYOUT } from '../src/island/layout';
import { habitatSignAnchor, signCovers } from '../src/island/signs';

describe('habitatSignAnchor', () => {
  it('hangs every habitat sign on its own rim without covering another plot or building', () => {
    for (const h of HABITAT_IDS) {
      const p = LAYOUT.habitats[h];
      const a = habitatSignAnchor(h);
      expect(Math.hypot(a.x - p.x, a.z - p.z), h).toBeCloseTo(p.r);
      expect(a.z, `${h} sign faces the camera side`).toBeGreaterThan(p.z);
      const others = [...HABITAT_IDS.filter((o) => o !== h).map((o) => LAYOUT.habitats[o]), ...Object.values(LAYOUT.buildings)];
      for (const o of others) expect(signCovers(a.x, a.z, o), `${h} over ${o.label}`).toBe(false);
    }
  });

  it('keeps the plain front-rim spot when nothing is in the way (metal, gas)', () => {
    expect(habitatSignAnchor('metal')).toEqual({ x: -11, z: -2 + 4.6 });
    expect(habitatSignAnchor('gas').x).toBeCloseTo(0);
  });

  it('tilts the back-corner signs (noble, halogen) towards the island edge', () => {
    expect(habitatSignAnchor('noble').x).toBeLessThan(LAYOUT.habitats.noble.x);
    expect(habitatSignAnchor('halogen').x).toBeGreaterThan(LAYOUT.habitats.halogen.x);
  });
});
