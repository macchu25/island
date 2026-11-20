import type { ChemicalDef, MonsterDef } from '@chemimon/shared';
import { formatFormula } from '../monsters/formatFormula';
import { HABITAT_IDS, habitatFor, habitatMembers, habitatSlots, type HabitatId } from './habitats';
import { LAYOUT } from './layout';

export interface Placed {
  monster: MonsterDef;
  habitat: HabitatId;
  x: number;
  z: number;
  /** Rotation about Y: towards the start camera plus a small per-monster variation. */
  yaw: number;
  /** Seconds added to the animation clock, so neighbours do not bob in sync. */
  phase: number;
  count: number;
  label: string | undefined;
}

/**
 * Monsters are drawn larger on the island than their 1-unit model so they read from the map view.
 * Bounded by slot spacing: islandFootprint.test checks the real model widths never overlap at this scale.
 */
export const MONSTER_ISLAND_SCALE = 1.3;
/** Height of the habitat floors in island.glb; monsters stand on it. */
export const FLOOR_Y = 0.025;

/** Ground point the monsters turn towards: below the start camera, in front of the island. */
export const FACE_POINT = { x: LAYOUT.island.cx, z: LAYOUT.island.cz + 30 } as const;
/** Largest yaw variation either side of facing the camera, radians (about 14 degrees). */
export const YAW_JITTER = 0.25;

/** FNV-1a string hash mapped to [0, 1). Deterministic per chemical id. */
export function hash01(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

type Catalog = { chemicals: Pick<ChemicalDef, 'id' | 'formula' | 'kind' | 'family' | 'phaseAt25C'>[]; monsters: MonsterDef[] };

/**
 * Every owned species (count > 0) that has a monster gets one spot in the habitat of its group.
 * A species' slot is its catalog index inside the habitat, so breeding something new never moves the others.
 */
export function placeOwned(catalog: Catalog, inventory: readonly { chemicalId: string; count: number }[]): Placed[] {
  const owned = new Map(inventory.filter((s) => s.count > 0).map((s) => [s.chemicalId, s.count]));
  const byChem = new Map(catalog.monsters.map((m) => [m.chemicalId, m]));
  const chemById = new Map(catalog.chemicals.map((c) => [c.id, c]));
  const out: Placed[] = [];
  for (const habitat of HABITAT_IDS) {
    const members = habitatMembers(catalog.chemicals, habitat);
    const slots = habitatSlots(LAYOUT.habitats[habitat], members.length);
    members.forEach((id, i) => {
      const count = owned.get(id);
      const monster = byChem.get(id);
      if (!count || !monster) return;
      const slot = slots[i]!;
      const h = hash01(id);
      const yaw = Math.atan2(FACE_POINT.x - slot.x, FACE_POINT.z - slot.z) + (h * 2 - 1) * YAW_JITTER;
      const formula = chemById.get(id)?.formula;
      out.push({ monster, habitat, x: slot.x, z: slot.z, yaw, phase: hash01(`${id}#phase`) * 10, count, label: formula ? formatFormula(formula) : undefined });
    });
  }
  return out;
}
