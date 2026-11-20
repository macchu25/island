import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Group, type Object3D } from 'three';
import { afterEach, expect, it, vi } from 'vitest';

// Every island .glb is listed in the manifest; the loader either throws (broken file) or returns a scene with no mesh.
let mode: 'throw' | 'empty' = 'throw';
const emptyScene = new Group();
vi.mock('@react-three/drei', async (orig) => ({
  ...(await orig<typeof import('@react-three/drei')>()),
  useGLTF: () => {
    if (mode === 'throw') throw new Error('broken glb');
    return { scene: emptyScene };
  },
}));

import { Buildings } from '../src/island/Buildings';
import { Terrain } from '../src/island/Terrain';

afterEach(() => vi.unstubAllGlobals());

it('listed but broken island and building .glb files fall back to the primitive versions', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ available: ['island', 'breeding', 'extractor', 'codex'] }))));
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const swallow = (e: ErrorEvent) => e.preventDefault();
  window.addEventListener('error', swallow);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const r = await ReactThreeTestRenderer.create(
    <QueryClientProvider client={qc}><Terrain /><Buildings /></QueryClientProvider>,
  );
  const named = (n: string) => r.scene.findAll((x) => (x.instance as Object3D).name === n).length;
  await vi.waitFor(() => {
    expect(named('island-fallback')).toBe(1);
    expect(named('breeding-machine')).toBe(1);
    expect(named('extractor-fallback')).toBe(1);
    expect(named('codex-fallback')).toBe(1);
  });
  // The hit volume keeps the fallback height, never a -Infinity scale.
  const hit = r.scene.findAll((x) => (x.instance as Object3D).name === 'hit-codex')[0]!.instance as Object3D;
  expect(Number.isFinite(hit.scale.y)).toBe(true);
  window.removeEventListener('error', swallow);
  spy.mockRestore();
});

it('a .glb without meshes keeps the fallback building height for its hit volume', async () => {
  mode = 'empty';
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ available: ['codex'] }))));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const r = await ReactThreeTestRenderer.create(<QueryClientProvider client={qc}><Buildings /></QueryClientProvider>);
  await vi.waitFor(() => expect(r.scene.findAll((x) => (x.instance as Object3D).name === 'codex-fallback')).toHaveLength(0));
  const hit = r.scene.findAll((x) => (x.instance as Object3D).name === 'hit-codex')[0]!.instance as Object3D;
  expect(hit.scale.y).toBe(2.5);
});
