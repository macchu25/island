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
