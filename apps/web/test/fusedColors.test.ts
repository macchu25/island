import type { MonsterDef } from '@chemimon/shared';
import { expect, it } from 'vitest';
import { fusedColorsFor } from '../src/monsters/fusedColors';

const fused = (chemicalId: string): MonsterDef => ({
  id: `m-${chemicalId}`, chemicalId, displayName: chemicalId, rarity: 'common', silhouette: 'fused',
  color: '#999999', assetKey: chemicalId, blurb: '',
});
const catalog = {
  chemicals: [
    { id: 'c', formula: 'C', kind: 'element' as const },
    { id: 'ca', formula: 'Ca', kind: 'element' as const },
    { id: 'cl2', formula: 'Cl2', kind: 'element' as const },
    { id: 'o2', formula: 'O2', kind: 'element' as const },
    { id: 'h2', formula: 'H2', kind: 'element' as const },
    { id: 'co2', formula: 'CO2', kind: 'compound' as const },
    { id: 'mgoh2', formula: 'Mg(OH)2', kind: 'compound' as const },
    { id: 'bad', formula: 'Xx9', kind: 'compound' as const },
  ],
  monsters: [
    { chemicalId: 'c', color: '#111111' },
    { chemicalId: 'ca', color: '#222222' },
    { chemicalId: 'cl2', color: '#333333' },
    { chemicalId: 'o2', color: '#444444' },
    { chemicalId: 'h2', color: '#555555' },
  ],
};

it('maps each symbol to the element with exactly that symbol (C is not Ca or Cl2)', () => {
  expect(fusedColorsFor(fused('co2'), catalog)).toEqual(['#111111', '#444444']);
});

it('falls back to the monster colour for a missing element and for an unparseable formula', () => {
  expect(fusedColorsFor(fused('mgoh2'), catalog)).toEqual(['#999999', '#444444']);
  expect(fusedColorsFor(fused('bad'), catalog)).toEqual(['#999999', '#999999']);
});

it('returns undefined for non-fused silhouettes and a missing catalog', () => {
  expect(fusedColorsFor({ ...fused('co2'), silhouette: 'orb' }, catalog)).toBeUndefined();
  expect(fusedColorsFor(fused('co2'), undefined)).toBeUndefined();
});
