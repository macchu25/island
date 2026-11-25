// ?raw (a string) instead of a JSON import: the composite tsconfig only lists .ts/.tsx files under src.
import raw from './layout.json?raw';

export interface Plot {
  x: number;
  z: number;
  r: number;
  label: string;
  /** Optional label-sign offset from the plot centre (default: front rim, x 0, z r). The dock's plot reaches over water. */
  sign?: { x: number; z: number };
}
export interface HabitatPlot extends Plot {
  theme: string;
}
export type BuildingId = 'breeding' | 'extractor' | 'codex' | 'market' | 'dock';

export interface IslandLayout {
  island: { cx: number; cz: number; rx: number; rz: number };
  buildings: Record<BuildingId, Plot>;
  habitats: Record<'noble' | 'halogen' | 'metal' | 'gas' | 'crystal' | 'spring' | 'quarry', HabitatPlot>;
}

/** layout.json is the single source of truth (shared with the Blender island recipe). */
export const LAYOUT: IslandLayout = JSON.parse(raw) as IslandLayout;
export const BUILDING_IDS: readonly BuildingId[] = ['breeding', 'extractor', 'codex', 'market', 'dock'];
