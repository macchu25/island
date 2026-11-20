import type { ChemicalDef } from '@chemimon/shared';
import type { IslandLayout } from './layout';

export type HabitatId = keyof IslandLayout['habitats'];
export const HABITAT_IDS: readonly HabitatId[] = ['noble', 'halogen', 'metal', 'gas', 'crystal', 'spring', 'quarry'];

/** Monsters stand within this fraction of the plot radius; the rim is for scenery. */
export const SLOT_RADIUS_FRACTION = 0.82;
/** Minimum distance between two monsters in one plot (monsters are about 1 unit wide). */
export const MIN_SLOT_SPACING = 1.4;
/** Spacing used when the plot has room for it. */
export const PREFERRED_SLOT_SPACING = 1.7;

type Chem = Pick<ChemicalDef, 'kind' | 'family' | 'phaseAt25C'>;

/** `metal` as a whole hyphen-separated word: alkali-metal, transition-metal, metal. Not nonmetal, not metalloid. */
const isMetalFamily = (family: string) => family.split('-').includes('metal');

/** Brief section 6. Every chemical maps to exactly one habitat, by rule (so later chemicals are covered too). */
export function habitatFor(c: Chem): HabitatId {
  if (c.kind === 'compound') return c.phaseAt25C === 'solid' ? 'quarry' : 'spring';
  if (c.family === 'noble-gas') return 'noble';
  if (c.family === 'halogen') return 'halogen';
  if (isMetalFamily(c.family)) return 'metal';
  if (c.phaseAt25C === 'gas') return 'gas';
  return 'crystal';
}

/** Chemical ids of a habitat in catalog order. A species' slot is its index here, so slots never move. */
export function habitatMembers(chemicals: readonly (Chem & { id: string })[], habitat: HabitatId): string[] {
  return chemicals.filter((c) => habitatFor(c) === habitat).map((c) => c.id);
}

export interface Point {
  x: number;
  z: number;
}

const SQRT3_2 = Math.sqrt(3) / 2;
const latticeCache = new Map<number, Point[]>();

/** Unit hex lattice points sorted by distance from the origin, ties by angle. Enough for `count` points. */
function unitLattice(count: number): Point[] {
  const cached = latticeCache.get(count);
  if (cached) return cached;
  const rings = Math.ceil(Math.sqrt(count)) + 2;
  const pts: (Point & { d: number; a: number })[] = [];
  for (let j = -rings; j <= rings; j++) {
    for (let i = -rings; i <= rings; i++) {
      const x = i + j / 2;
      const z = j * SQRT3_2;
      const d = Math.round(Math.hypot(x, z) * 1e6) / 1e6;
      // Angle measured from straight ahead (+Z, towards the camera) so near ties fill the front first.
      const a = (Math.atan2(x, z) + 2 * Math.PI) % (2 * Math.PI);
      pts.push({ x, z, d, a });
    }
  }
  pts.sort((p, q) => p.d - q.d || p.a - q.a);
  const out = pts.slice(0, count).map(({ x, z }) => ({ x, z }));
  latticeCache.set(count, out);
  return out;
}

/** n lattice points with spacing d, recentred on their centroid. Returns the farthest distance too. */
function cluster(n: number, d: number): { pts: Point[]; reach: number } {
  const unit = unitLattice(n);
  let cx = 0;
  let cz = 0;
  for (const p of unit) { cx += p.x; cz += p.z; }
  cx /= n;
  cz /= n;
  let reach = 0;
  const pts = unit.map((p) => {
    const x = (p.x - cx) * d;
    const z = (p.z - cz) * d;
    reach = Math.max(reach, Math.hypot(x, z));
    return { x, z };
  });
  return { pts, reach };
}

const slotCache = new Map<string, Point[]>();

/**
 * Deterministic positions for n monsters in a plot: a hexagonal lattice (spacing between neighbours is exactly d)
 * filled from the centre outwards. d is PREFERRED_SLOT_SPACING when it fits inside SLOT_RADIUS_FRACTION * r,
 * else the largest d that fits. Below MIN_SLOT_SPACING only when n outgrows the plot (last resort, never hides one).
 */
export function habitatSlots(plot: { x: number; z: number; r: number }, n: number): Point[] {
  if (n <= 0) return [];
  const key = `${plot.x},${plot.z},${plot.r},${n}`;
  const hit = slotCache.get(key);
  if (hit) return hit;
  const limit = SLOT_RADIUS_FRACTION * plot.r;
  let d = PREFERRED_SLOT_SPACING;
  let c = cluster(n, d);
  // The reach scales linearly with d, so the largest fitting spacing is one division away.
  if (c.reach > limit) {
    d = (d * limit) / c.reach;
    c = cluster(n, d);
  }
  const out = c.pts.map((p) => ({ x: plot.x + p.x, z: plot.z + p.z }));
  slotCache.set(key, out);
  return out;
}
