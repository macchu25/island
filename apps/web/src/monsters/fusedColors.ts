import { parseFormula } from '@chemimon/chem-engine';
import type { ChemicalDef, MonsterDef } from '@chemimon/shared';

export interface ColorCatalog {
  chemicals: Pick<ChemicalDef, 'id' | 'formula' | 'kind'>[];
  monsters: Pick<MonsterDef, 'chemicalId' | 'color'>[];
}

function symbolsOf(formula: string): string[] {
  try {
    return Object.keys(parseFormula(formula));
  } catch {
    return [];
  }
}

/**
 * Spec 8: a compound renders as two fused blocks coloured by its component elements.
 * Takes the first two distinct element symbols of the compound formula and maps each to the
 * monster colour of the element chemical with exactly that one symbol (H -> H2, O -> O2, C -> C).
 * Any lookup miss falls back to the compound monster's own colour for that half.
 */
export function fusedColorsFor(monster: MonsterDef, catalog: ColorCatalog | undefined): [string, string] | undefined {
  if (monster.silhouette !== 'fused' || !catalog) return undefined;
  const chem = catalog.chemicals.find((c) => c.id === monster.chemicalId);
  if (!chem) return undefined;
  const colorOfSymbol = (symbol: string | undefined): string => {
    if (!symbol) return monster.color;
    const element = catalog.chemicals.find((c) => {
      if (c.kind !== 'element') return false;
      const s = symbolsOf(c.formula);
      return s.length === 1 && s[0] === symbol;
    });
    return catalog.monsters.find((m) => m.chemicalId === element?.id)?.color ?? monster.color;
  };
  const [a, b] = symbolsOf(chem.formula);
  return [colorOfSymbol(a), colorOfSymbol(b)];
}
