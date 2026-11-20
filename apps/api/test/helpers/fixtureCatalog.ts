import { type Catalog, type ChemicalDef, type MonsterDef } from '@chemimon/shared';

const ELEMENTS: ChemicalDef[] = [
  { id: 'h2', formula: 'H₂', name: 'Hydrogen', kind: 'element', atomicNumber: 1, group: 1, period: 1, phaseAt25C: 'gas', family: 'element' },
  { id: 'he', formula: 'He', name: 'Helium', kind: 'element', atomicNumber: 2, group: 18, period: 1, phaseAt25C: 'gas', family: 'element' },
  { id: 'c', formula: 'C', name: 'Carbon', kind: 'element', atomicNumber: 6, group: 14, period: 2, phaseAt25C: 'solid', family: 'element' },
  { id: 'n2', formula: 'N₂', name: 'Nitrogen', kind: 'element', atomicNumber: 7, group: 15, period: 2, phaseAt25C: 'gas', family: 'element' },
  { id: 'o2', formula: 'O₂', name: 'Oxygen', kind: 'element', atomicNumber: 8, group: 16, period: 2, phaseAt25C: 'gas', family: 'element' },
  { id: 'f2', formula: 'F₂', name: 'Fluorine', kind: 'element', atomicNumber: 9, group: 17, period: 2, phaseAt25C: 'gas', family: 'element' },
  { id: 'ne', formula: 'Ne', name: 'Neon', kind: 'element', atomicNumber: 10, group: 18, period: 2, phaseAt25C: 'gas', family: 'element' },
  { id: 'na', formula: 'Na', name: 'Sodium', kind: 'element', atomicNumber: 11, group: 1, period: 3, phaseAt25C: 'solid', family: 'element' },
  { id: 'mg', formula: 'Mg', name: 'Magnesium', kind: 'element', atomicNumber: 12, group: 2, period: 3, phaseAt25C: 'solid', family: 'element' },
  { id: 'al', formula: 'Al', name: 'Aluminium', kind: 'element', atomicNumber: 13, group: 13, period: 3, phaseAt25C: 'solid', family: 'element' },
  { id: 'si', formula: 'Si', name: 'Silicon', kind: 'element', atomicNumber: 14, group: 14, period: 3, phaseAt25C: 'solid', family: 'element' },
  { id: 'p4', formula: 'P₄', name: 'Phosphorus', kind: 'element', atomicNumber: 15, group: 15, period: 3, phaseAt25C: 'solid', family: 'element' },
  { id: 's8', formula: 'S₈', name: 'Sulfur', kind: 'element', atomicNumber: 16, group: 16, period: 3, phaseAt25C: 'solid', family: 'element' },
  { id: 'cl2', formula: 'Cl₂', name: 'Chlorine', kind: 'element', atomicNumber: 17, group: 17, period: 3, phaseAt25C: 'gas', family: 'element' },
  { id: 'ar', formula: 'Ar', name: 'Argon', kind: 'element', atomicNumber: 18, group: 18, period: 3, phaseAt25C: 'gas', family: 'element' },
  { id: 'k', formula: 'K', name: 'Potassium', kind: 'element', atomicNumber: 19, group: 1, period: 4, phaseAt25C: 'solid', family: 'element' },
  { id: 'ca', formula: 'Ca', name: 'Calcium', kind: 'element', atomicNumber: 20, group: 2, period: 4, phaseAt25C: 'solid', family: 'element' },
  { id: 'fe', formula: 'Fe', name: 'Iron', kind: 'element', atomicNumber: 26, group: 8, period: 4, phaseAt25C: 'solid', family: 'element' },
  { id: 'cu', formula: 'Cu', name: 'Copper', kind: 'element', atomicNumber: 29, group: 11, period: 4, phaseAt25C: 'solid', family: 'element' },
  { id: 'zn', formula: 'Zn', name: 'Zinc', kind: 'element', atomicNumber: 30, group: 12, period: 4, phaseAt25C: 'solid', family: 'element' },
  { id: 'ag', formula: 'Ag', name: 'Silver', kind: 'element', atomicNumber: 47, group: 11, period: 5, phaseAt25C: 'solid', family: 'element' },
  { id: 'i2', formula: 'I₂', name: 'Iodine', kind: 'element', atomicNumber: 53, group: 17, period: 5, phaseAt25C: 'solid', family: 'element' },
  { id: 'au', formula: 'Au', name: 'Gold', kind: 'element', atomicNumber: 79, group: 11, period: 6, phaseAt25C: 'solid', family: 'element' },
  { id: 'hg', formula: 'Hg', name: 'Mercury', kind: 'element', atomicNumber: 80, group: 12, period: 6, phaseAt25C: 'liquid', family: 'element' },
  { id: 'pb', formula: 'Pb', name: 'Lead', kind: 'element', atomicNumber: 82, group: 14, period: 6, phaseAt25C: 'solid', family: 'element' },
];

const COMPOUNDS: ChemicalDef[] = [
  { id: 'h2o', formula: 'H₂O', name: 'Water', kind: 'compound', phaseAt25C: 'liquid', family: 'oxide' },
  { id: 'co2', formula: 'CO₂', name: 'Carbon dioxide', kind: 'compound', phaseAt25C: 'gas', family: 'oxide' },
  { id: 'co', formula: 'CO', name: 'Carbon monoxide', kind: 'compound', phaseAt25C: 'gas', family: 'oxide' },
];

export const FIXTURE_CHEMICALS: ChemicalDef[] = [...ELEMENTS, ...COMPOUNDS];

export const FIXTURE_MONSTERS: MonsterDef[] = FIXTURE_CHEMICALS.map((c) => ({
  id: `m-${c.id}`,
  chemicalId: c.id,
  displayName: `${c.name} Mon`,
  rarity: 'common',
  silhouette: 'orb',
  color: '#88aaff',
  assetKey: `monster-${c.id}`,
  blurb: `A fixture monster of ${c.name}.`,
}));

/** Fixture catalog for API tests: 25 starter elements, 3 compounds, 5 reactions. */
export const fixtureCatalog: Catalog = {
  chemicals: FIXTURE_CHEMICALS,
  monsters: FIXTURE_MONSTERS,
  reactions: [
    {
      id: 'r-water', inputs: [{ chemicalId: 'h2', coefficient: 2 }, { chemicalId: 'o2', coefficient: 1 }],
      outputs: [{ chemicalId: 'h2o', coefficient: 2 }], conditions: { activation: 'spark' },
      priority: 10, durationS: 10, source: 'fixture', reviewed: true,
    },
    {
      id: 'r-co2', inputs: [{ chemicalId: 'c', coefficient: 1 }, { chemicalId: 'o2', coefficient: 1 }],
      outputs: [{ chemicalId: 'co2', coefficient: 1 }], conditions: { temperatureC: { min: 450, max: 2500 } },
      ratio: { min: 1, max: 4 }, priority: 20, durationS: 10, source: 'fixture', reviewed: true,
    },
    {
      id: 'r-co', inputs: [{ chemicalId: 'c', coefficient: 2 }, { chemicalId: 'o2', coefficient: 1 }],
      outputs: [{ chemicalId: 'co', coefficient: 2 }],
      conditions: { temperatureC: { min: 450, max: 2500 }, environment: ['inert'] },
      priority: 15, durationS: 12, source: 'fixture', reviewed: true,
    },
    {
      id: 'r-split', inputs: [{ chemicalId: 'co2', coefficient: 2 }],
      outputs: [{ chemicalId: 'co', coefficient: 2 }, { chemicalId: 'o2', coefficient: 1 }],
      conditions: { temperatureC: { min: 1000, max: 2500 } },
      priority: 5, durationS: 10, source: 'fixture', reviewed: true,
    },
    {
      id: 'r-draft', inputs: [{ chemicalId: 'h2', coefficient: 1 }, { chemicalId: 'c', coefficient: 1 }],
      outputs: [{ chemicalId: 'co', coefficient: 1 }], conditions: {},
      priority: 1, durationS: 10, source: 'fixture', reviewed: false,
    },
  ],
};

