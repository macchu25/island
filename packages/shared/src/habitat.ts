import type { ChemicalDef } from './domain';

export const HABITAT_IDS = ['noble', 'halogen', 'metal', 'gas', 'crystal', 'spring', 'quarry'] as const;
export type HabitatId = (typeof HABITAT_IDS)[number];

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
