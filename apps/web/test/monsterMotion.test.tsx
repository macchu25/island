import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { MonsterDef } from '@chemimon/shared';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Object3D, type Sprite } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

// A fake .glb: a 1.0 x 1.2 x 1.0 box standing on y = HOVER (hover baked in, as the export contract says).
let HOVER = 0;
const gltfScene = () => {
  const g = new Group();
  const m = new Mesh(new BoxGeometry(1, 1.2, 1), new MeshStandardMaterial());
  m.position.y = HOVER + 0.6;
  g.add(m);
  return g;
};
let scene = gltfScene();
vi.mock('@react-three/drei', async (orig) => ({
  ...(await orig<typeof import('@react-three/drei')>()),
  useGLTF: () => ({ scene }),
}));

import { MonsterModel } from '../src/monsters/MonsterModel';
import { monsterPose, newPose } from '../src/monsters/motion';
import { PLACEHOLDER_FLOAT } from '../src/monsters/PlaceholderMonster';

const cloud: MonsterDef = { id: 'm1', chemicalId: 'h2', displayName: 'Hydrollo', rarity: 'common', silhouette: 'cloud', color: '#aabbcc', assetKey: 'h2', blurb: '' };

async function render(available: string[], props: { label?: string; badge?: string; animation?: 'sad' | 'idle' } = {}) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ available }))));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const r = await ReactThreeTestRenderer.create(
    <QueryClientProvider client={qc}><MonsterModel monster={cloud} {...props} /></QueryClientProvider>,
  );
  return r;
}
const rootOf = async (r: Awaited<ReturnType<typeof render>>, name: string): Promise<Object3D> => {
  let root: Object3D | undefined;
  await vi.waitFor(() => {
    root = r.scene.findAll((n) => n.instance.name === name)[0]?.instance as Object3D | undefined;
    expect(root).toBeTruthy();
  });
  return root!;
};

afterEach(() => vi.unstubAllGlobals());

describe('monsterPose (shared by placeholder and .glb)', () => {
  it('adds lift and bob from the style, then the animation', () => {
    const p = newPose();
    expect(monsterPose('sad', 0, { lift: 0.2, bob: 0.08 }, p).y).toBeCloseTo(0.2);
    expect(monsterPose('sad', 0, { lift: 0, bob: 0.08 }, p).y).toBeCloseTo(0);
    expect(monsterPose('happy', Math.PI / 12, { lift: 0, bob: 0 }, p).y).toBeCloseTo(0.3);
    expect(monsterPose('discover', 1, { lift: 0, bob: 0 }, p).ry).toBeCloseTo(6);
    expect(monsterPose('interact', 0, { lift: 0, bob: 0 }, p).rz).toBeCloseTo(0);
  });
  it('a phase offset desynchronises two monsters', () => {
    const a = monsterPose('idle', 1, { lift: 0, bob: 0.06 }, newPose()).y;
    const b = monsterPose('idle', 1 + 0.7, { lift: 0, bob: 0.06 }, newPose()).y;
    expect(a).not.toBeCloseTo(b);
  });
});

describe('MonsterModel .glb path', () => {
  it('renders the .glb with the formula label above the model top and the count badge', async () => {
    HOVER = 0;
    scene = gltfScene();
    const r = await render(['h2'], { label: 'H₂', badge: '×4' });
    const root = await rootOf(r, 'gltf-h2');
    const label = root.getObjectByName('label') as Sprite;
    expect(label).toBeTruthy();
    expect(label.position.y).toBeGreaterThan(1.2);
    expect(label.position.y).toBeLessThan(1.8);
    expect(label.userData).toEqual({ label: 'H₂' });
    const badge = root.getObjectByName('badge') as Sprite;
    expect(badge.userData).toEqual({ badge: '×4' });
    expect(badge.position.y).toBe(label.position.y);
    expect(root.getObjectByName('placeholder-cloud')).toBeUndefined();
  });

  it('places the label above a hovering model too (the hover is part of its height)', async () => {
    HOVER = 0.2;
    scene = gltfScene();
    const r = await render(['h2'], { label: 'H₂' });
    const root = await rootOf(r, 'gltf-h2');
    expect((root.getObjectByName('label') as Sprite).position.y).toBeGreaterThan(1.4);
  });

  it('drives the .glb with the same named animations but adds no placeholder lift', async () => {
    HOVER = 0.2;
    scene = gltfScene();
    const glb = await render(['h2'], { animation: 'sad' });
    const glbRoot = await rootOf(glb, 'gltf-h2');
    await glb.advanceFrames(1, 0.016);
    const motion = glbRoot.getObjectByName('motion')!;
    // 'sad' squashes the body; at clock 0 the float bob is 0 and there is no lift.
    expect(motion.scale.y).toBeCloseTo(0.8);
    expect(motion.position.y).toBeCloseTo(0);

    const ph = await render([], { animation: 'sad' });
    const phRoot = await rootOf(ph, 'placeholder-cloud');
    await ph.advanceFrames(1, 0.016);
    const phMotion = phRoot.getObjectByName('motion')!;
    expect(phMotion.scale.y).toBeCloseTo(0.8);
    expect(phMotion.position.y).toBeCloseTo(PLACEHOLDER_FLOAT.lift);
  });

  it('no label prop: the .glb shows no label sprite (its shape identifies it)', async () => {
    HOVER = 0;
    scene = gltfScene();
    const r = await render(['h2']);
    const root = await rootOf(r, 'gltf-h2');
    expect(root.getObjectByName('label')).toBeUndefined();
  });
});

describe('label textures', () => {
  it('a count change reuses one shared texture per count; the formula texture is untouched', async () => {
    const { badgeTexture, labelTexture } = await import('../src/monsters/labelTextures');
    expect(badgeTexture('×4').texture).toBe(badgeTexture('×4').texture);
    expect(badgeTexture('×5').texture).not.toBe(badgeTexture('×4').texture);
    expect(labelTexture('Fe').texture).toBe(labelTexture('Fe').texture);
  });
});
