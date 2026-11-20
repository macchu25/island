import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { MonsterDef, Silhouette } from '@chemimon/shared';
import type { Object3D, Mesh } from 'three';
import { expect, it } from 'vitest';
import { PlaceholderMonster } from '../src/monsters/PlaceholderMonster';

const SILS: Silhouette[] = ['cloud', 'block', 'orb', 'spiky', 'crystal', 'fused'];
const mk = (silhouette: Silhouette): MonsterDef => ({
  id: `m-${silhouette}`, chemicalId: 'x', displayName: 'X', rarity: 'common',
  silhouette, color: '#44aa88', assetKey: `k-${silhouette}`, blurb: '',
});

function geoTypes(root: Object3D): string {
  const set = new Set<string>();
  root.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh) set.add(m.geometry.type);
  });
  return [...set].sort().join(',');
}

it('each silhouette renders a named root group with distinct geometry', async () => {
  const seen = new Map<string, Silhouette>();
  for (const s of SILS) {
    const r = await ReactThreeTestRenderer.create(<PlaceholderMonster monster={mk(s)} />);
    const root = r.scene.children[0]!.instance;
    expect(root.name).toBe(`placeholder-${s}`);
    const key = geoTypes(root);
    expect(seen.has(key), `${s} duplicates ${seen.get(key)} (${key})`).toBe(false);
    seen.set(key, s);
    await r.unmount();
  }
  expect(seen.size).toBe(6);
});

it('adds eyes and a symbol sprite', async () => {
  const r = await ReactThreeTestRenderer.create(<PlaceholderMonster monster={mk('orb')} />);
  const root = r.scene.children[0]!.instance;
  let sprites = 0;
  root.traverse((o) => { if ((o as { isSprite?: boolean }).isSprite) sprites++; });
  expect(sprites).toBe(1);
  expect(root.getObjectByName('eye-l')).toBeTruthy();
  expect(root.getObjectByName('eye-r')).toBeTruthy();
});
