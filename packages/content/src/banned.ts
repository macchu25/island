/**
 * Chemicals that must never appear in content (validator-enforced, by formula and by id).
 * Sources of the list: chemical-warfare agents and their simple inorganic precursors
 * (OPCW CWC schedules), primary/high explosives and explosive oxidizer salts.
 */
export const BANNED_FORMULAS: readonly string[] = [
  // Global constraints list
  'COCl2', // phosgene (CWC Schedule 3)
  'HCN', // hydrogen cyanide (CWC Schedule 3)
  'ClF3', // chlorine trifluoride
  'NCl3', // nitrogen trichloride (explosive)
  'NH4NO3', // ammonium nitrate (explosive precursor)
  'KClO3',
  'NaClO3',
  'KClO4',
  'NaClO4',
  'NaN3', // sodium azide
  'Pb(N3)2', // lead azide (primary explosive)
  'Hg(CNO)2', // mercury fulminate (primary explosive)
  // Extra: CWC Schedule 3 inorganic precursors reachable from the starter elements
  'CNCl', // cyanogen chloride
  'PCl3',
  'PCl5',
  'POCl3',
  'S2Cl2',
  'SCl2',
  'SOCl2',
  // Extra: contact/primary explosives reachable from the starter elements
  'NI3', // nitrogen triiodide
  'AgN3', // silver azide
  'Ag2C2', // silver acetylide
  'Cu2C2', // copper(I) acetylide
  'AgCNO', // silver fulminate
  'NH4ClO4', // ammonium perchlorate
];

const BANNED_KEYS = new Set(BANNED_FORMULAS.map((f) => f.toLowerCase()));

/** True when the chemical's id or formula (case-insensitive) is on the banned list. */
export function isBannedChemical(c: { id: string; formula: string }): boolean {
  return BANNED_KEYS.has(c.id.toLowerCase()) || BANNED_KEYS.has(c.formula.toLowerCase());
}
