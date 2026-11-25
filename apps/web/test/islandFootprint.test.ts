import { loadCatalog } from '@chemimon/content';
import { describe, expect, it } from 'vitest';
import { HABITAT_IDS, habitatMembers, habitatSlots } from '../src/island/habitats';
import { BUILDING_IDS, LAYOUT, type Plot } from '../src/island/layout';
import { MONSTER_ISLAND_SCALE } from '../src/island/placement';
import { SIGN_DEPTH } from '../src/island/signs';

/**
 * Widest horizontal extent (max of x and z, so any yaw is covered) of each real .glb, model units.
 * Measured from apps/web/public/assets/monsters on 2026-11-20 with GLTFLoader + Box3.
 */
const FOOTPRINT: Record<string, number> = { ag: 0.80, al: 0.92, al2o3: 1.36, ar: 0.73, au: 0.92, c: 1.14, ca: 1.14, cl2: 1.14, co: 0.92, co2: 1.23, cu: 0.85, cu2o: 1.11, cuo: 1.21, f2: 0.81, fe: 0.74, fe2o3: 1.21, fe3o4: 1.40, h2: 0.75, h2o: 0.98, hcl: 0.67, he: 0.68, hg: 1.42, i2: 0.68, k: 0.99, k2o2: 1.00, ko2: 0.92, mg: 0.78, mgo: 1.08, mgoh2: 0.93, n2: 1.25, na: 1.33, na2o: 1.22, na2o2: 0.95, nacl: 1.08, naoh: 1.09, ne: 1.17, nh3: 0.65, o2: 1.16, p4: 0.79, pb: 0.79, s8: 0.77, si: 1.38, sic: 1.48, sio2: 1.41, zn: 0.88 };
/** Air between two neighbours, world units. */
const GAP = 0.1;

it('at the island scale, no two monsters of a full habitat population overlap (real model widths)', () => {
  const catalog = loadCatalog();
  expect(MONSTER_ISLAND_SCALE).toBeGreaterThan(1);
  expect(MONSTER_ISLAND_SCALE).toBeLessThanOrEqual(1.5);
  for (const h of HABITAT_IDS) {
    const ids = habitatMembers(catalog.chemicals, h);
    const slots = habitatSlots(LAYOUT.habitats[h], ids.length);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const need = ((FOOTPRINT[ids[i]!]! + FOOTPRINT[ids[j]!]!) / 2) * MONSTER_ISLAND_SCALE + GAP;
        const got = Math.hypot(slots[i]!.x - slots[j]!.x, slots[i]!.z - slots[j]!.z);
        expect(got, `${h}: ${ids[i]} vs ${ids[j]}`).toBeGreaterThanOrEqual(need);
      }
    }
  }
});

describe('building plots', () => {
  const { cx, cz, rx, rz } = LAYOUT.island;
  const inIsland = (x: number, z: number) => ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1;
  // The nominal island ellipse, sampled every 0.1 degree (about 0.03 units apart).
  const outline = Array.from({ length: 3600 }, (_, i) => {
    const a = (i / 3600) * Math.PI * 2;
    return { x: cx + rx * Math.cos(a), z: cz + rz * Math.sin(a) };
  });
  const edgeDist = (x: number, z: number) => Math.min(...outline.map((o) => Math.hypot(o.x - x, o.z - z)));
  const allPlots = (): [string, Plot][] => [...Object.entries(LAYOUT.buildings), ...Object.entries(LAYOUT.habitats)];

  it('has four buildings, the market labelled "Chợ" with radius 2.2', () => {
    expect([...BUILDING_IDS].sort()).toEqual(['breeding', 'codex', 'extractor', 'market']);
    expect(Object.keys(LAYOUT.buildings).sort()).toEqual(['breeding', 'codex', 'extractor', 'market']);
    expect(LAYOUT.buildings.market).toMatchObject({ r: 2.2, label: 'Chợ' });
  });

  it('keeps at least 1.0 of open ground between the market plot and every other plot', () => {
    const m = LAYOUT.buildings.market;
    for (const [id, p] of allPlots()) {
      if (p === m) continue;
      expect(Math.hypot(m.x - p.x, m.z - p.z) - m.r - p.r, `market vs ${id}`).toBeGreaterThanOrEqual(1.0);
    }
  });

  it('keeps every building plot inside the island with at least 1.5 of land around it', () => {
    for (const id of BUILDING_IDS) {
      const b = LAYOUT.buildings[id];
      expect(inIsland(b.x, b.z), id).toBe(true);
      expect(edgeDist(b.x, b.z) - b.r, id).toBeGreaterThanOrEqual(1.5);
    }
  });

  it('hangs every building sign over land (front rim down to the bottom of the board)', () => {
    for (const id of BUILDING_IDS) {
      const b = LAYOUT.buildings[id];
      expect(inIsland(b.x, b.z + b.r), `${id} sign top`).toBe(true);
      expect(inIsland(b.x, b.z + b.r + SIGN_DEPTH), `${id} sign bottom`).toBe(true);
    }
  });
});
