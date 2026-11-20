import { HABITAT_IDS, SLOT_RADIUS_FRACTION, type HabitatId } from './habitats';
import { LAYOUT, type Plot } from './layout';

/**
 * Ground depth (z units, towards the camera) a hanging sign covers in the start view.
 * Signs keep a constant screen size, about 24 px on 1280x720, which is about 2 units of ground there.
 */
export const SIGN_DEPTH = 2.2;
/** Monster footprint plus tag height around a slot circle that a sign must not cover. */
const MONSTER_CLEARANCE = 1.2;
/** Outward tilts tried in order (radians from straight ahead): front rim first, then towards the island edge. */
const TILTS = [0, 0.35, 0.7, 1.0];

const { cx } = LAYOUT.island;

function covers(ax: number, az: number, other: Plot): boolean {
  // Closest point of the hanging segment [az, az + SIGN_DEPTH] to the other plot centre.
  const z = Math.min(Math.max(other.z, az), az + SIGN_DEPTH);
  return Math.hypot(other.x - ax, other.z - z) < SLOT_RADIUS_FRACTION * other.r + MONSTER_CLEARANCE;
}

/**
 * Where a habitat's name board hangs: on the front rim, tilted towards the island edge only when hanging straight
 * down would cover the monsters of another plot or building.
 */
export function habitatSignAnchor(id: HabitatId): { x: number; z: number } {
  const p = LAYOUT.habitats[id];
  const others: Plot[] = [
    ...HABITAT_IDS.filter((h) => h !== id).map((h) => LAYOUT.habitats[h]),
    ...Object.values(LAYOUT.buildings),
  ];
  const side = p.x >= cx ? 1 : -1;
  for (const t of TILTS) {
    const x = p.x + Math.sin(t * side) * p.r;
    const z = p.z + Math.cos(t) * p.r;
    if (!others.some((o) => covers(x, z, o))) return { x, z };
  }
  return { x: p.x, z: p.z + p.r };
}

export { covers as signCovers };
