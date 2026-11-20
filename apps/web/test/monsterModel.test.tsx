import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { MonsterDef } from '@chemimon/shared';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@react-three/drei', async (orig) => ({
  ...(await orig<typeof import('@react-three/drei')>()),
  useGLTF: () => { throw new Error('parse failed'); },
}));

import { MonsterModel } from '../src/monsters/MonsterModel';

const monster: MonsterDef = {
  id: 'm1', chemicalId: 'h2', displayName: 'H', rarity: 'common', silhouette: 'cloud',
  color: '#aabbcc', assetKey: 'h2', blurb: '',
};

function wrap(available: string[]) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ available }))));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MonsterModel monster={monster} />
    </QueryClientProvider>
  );
}

afterEach(() => vi.unstubAllGlobals());

it('empty manifest renders the placeholder', async () => {
  const r = await ReactThreeTestRenderer.create(wrap([]));
  await vi.waitFor(() => expect(r.scene.findAll((n) => n.instance.name === 'placeholder-cloud').length).toBe(1));
});

it('listed key whose load throws falls back to placeholder without crashing', async () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  // React dev re-dispatches caught render errors as window error events; the boundary already handled it.
  const swallow = (e: ErrorEvent) => e.preventDefault();
  window.addEventListener('error', swallow);
  const r = await ReactThreeTestRenderer.create(wrap(['h2']));
  await vi.waitFor(() => expect(r.scene.findAll((n) => n.instance.name === 'placeholder-cloud').length).toBe(1));
  window.removeEventListener('error', swallow);
  spy.mockRestore();
});

it('compound placeholder colours its two fused halves by its component elements (spec 8)', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ available: [] }))));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const water: MonsterDef = {
    id: 'm-h2o', chemicalId: 'h2o', displayName: 'Water', rarity: 'common', silhouette: 'fused',
    color: '#0000ff', assetKey: 'h2o', blurb: '',
  };
  const mon = (chemicalId: string, color: string): MonsterDef => ({
    id: `m-${chemicalId}`, chemicalId, displayName: chemicalId, rarity: 'common', silhouette: 'cloud', color, assetKey: chemicalId, blurb: '',
  });
  qc.setQueryData(['catalog'], {
    chemicals: [
      { id: 'h2', formula: 'H2', name: 'Hydrogen', kind: 'element', phaseAt25C: 'gas', family: 'nonmetal' },
      { id: 'he', formula: 'He', name: 'Helium', kind: 'element', phaseAt25C: 'gas', family: 'noble-gas' },
      { id: 'o2', formula: 'O2', name: 'Oxygen', kind: 'element', phaseAt25C: 'gas', family: 'nonmetal' },
      { id: 'h2o', formula: 'H2O', name: 'Water', kind: 'compound', phaseAt25C: 'liquid', family: 'oxide' },
    ],
    monsters: [mon('h2', '#ff0000'), mon('he', '#ffff00'), mon('o2', '#00ff00'), water],
  });
  const r = await ReactThreeTestRenderer.create(
    <QueryClientProvider client={qc}>
      <MonsterModel monster={water} />
    </QueryClientProvider>,
  );
  let halves: string[] = [];
  await vi.waitFor(() => {
    const root = r.scene.findAll((n) => n.instance.name === 'placeholder-fused')[0];
    expect(root).toBeTruthy();
    halves = (root!.instance as Group)
      .children[0]!.children.filter((o) => (o as Mesh).geometry?.type === 'SphereGeometry')
      .map((o) => `#${((o as Mesh).material as MeshStandardMaterial).color.getHexString()}`);
    expect(halves).toHaveLength(2);
  });
  expect(halves).toEqual(['#ff0000', '#00ff00']);
});
