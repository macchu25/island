import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { expect, it, vi } from 'vitest';

const labels: Record<string, string | undefined> = {};
vi.mock('../src/monsters/MonsterModel', () => ({
  MonsterModel: ({ monster, label }: { monster: { id: string }; label?: string }) => {
    labels[monster.id] = label;
    return null;
  },
}));

import { HabitatShelf } from '../src/lab/HabitatShelf';

it('passes formula-derived subscript labels', async () => {
  const qc = new QueryClient();
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, inventory: [{ chemicalId: 'fe3o4', count: 2 }, { chemicalId: 'zz', count: 1 }], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], {
    chemicals: [{ id: 'fe3o4', formula: 'Fe3O4' }],
    monsters: [
      { id: 'm1', chemicalId: 'fe3o4', displayName: 'Magnetite', silhouette: 'block', color: '#112233', assetKey: 'k', rarity: 'common', blurb: '' },
      { id: 'm2', chemicalId: 'zz', displayName: 'Zed', silhouette: 'orb', color: '#112233', assetKey: 'z', rarity: 'common', blurb: '' },
    ],
  });
  await ReactThreeTestRenderer.create(<QueryClientProvider client={qc}><HabitatShelf /></QueryClientProvider>);
  expect(labels.m1).toBe('Fe₃O₄');
  expect(labels.m2).toBeUndefined();
});

it('shows newly bred compounds first even when 25 starter stacks outnumber them', async () => {
  for (const k of Object.keys(labels)) delete labels[k];
  const starters = ['h2', 'he', 'c', 'n2', 'o2', 'f2', 'ne', 'na', 'mg', 'al', 'si', 'p4', 's8', 'cl2', 'ar', 'k', 'ca', 'fe', 'cu', 'zn', 'ag', 'i2', 'au', 'hg', 'pb'];
  const inventory = [
    ...starters.map((id) => ({ chemicalId: id, count: id === 'h2' ? 2 : id === 'o2' ? 3 : 4 })),
    { chemicalId: 'h2o', count: 2 },
  ];
  const qc = new QueryClient();
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, inventory, sessions: [], extractor: { nextClaimAt: null } });
  const ids = [...starters, 'h2o'];
  qc.setQueryData(['catalog'], {
    chemicals: ids.map((id) => ({ id, formula: id === 'h2o' ? 'H2O' : 'X', kind: id === 'h2o' ? 'compound' : 'element' })),
    monsters: ids.map((id) => ({ id: `m-${id}`, chemicalId: id, displayName: id, silhouette: 'orb', color: '#112233', assetKey: id, rarity: 'common', blurb: '' })),
  });
  await ReactThreeTestRenderer.create(<QueryClientProvider client={qc}><HabitatShelf /></QueryClientProvider>);
  const shown = Object.keys(labels);
  expect(shown).toHaveLength(12);
  expect(shown[0]).toBe('m-h2o');
  expect(shown).not.toContain('m-h2');
  expect(shown).not.toContain('m-o2');
});
