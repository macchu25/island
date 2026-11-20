import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { MonsterDef } from '@chemimon/shared';
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
