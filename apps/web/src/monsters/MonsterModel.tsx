import type { MonsterDef } from '@chemimon/shared';
import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import { Box3, type Object3D } from 'three';
import { useCatalog } from '../api/queries';
import { fusedColorsFor } from './fusedColors';
import { useMonsterManifest } from './manifest';
import { ModelBoundary } from './ModelBoundary';
import type { MonsterAnimation, MotionStyle } from './motion';
import { LABEL_GAP, MonsterRig } from './MonsterRig';
import { PlaceholderMonster } from './PlaceholderMonster';

/** A .glb whose lowest point is above this is a floater (hover is baked into the model). */
const HOVER_EPSILON = 0.05;
/** Float bob for .glb floaters. No lift: the model already hovers. */
export const GLTF_FLOAT: MotionStyle = { lift: 0, bob: 0.06 };
const GLTF_STANDING: MotionStyle = { lift: 0, bob: 0 };

interface Measured {
  top: number;
  hovering: boolean;
}
// One bounding-box pass per loaded file, shared by every clone.
const measured = new WeakMap<Object3D, Measured>();
function measure(scene: Object3D): Measured {
  let m = measured.get(scene);
  if (!m) {
    const box = new Box3().setFromObject(scene);
    m = box.isEmpty() ? { top: 1, hovering: false } : { top: box.max.y, hovering: box.min.y > HOVER_EPSILON };
    measured.set(scene, m);
  }
  return m;
}

interface BodyProps {
  label?: string;
  badge?: string;
  animation?: MonsterAnimation;
  phase?: number;
}

function GltfMonster({ url, assetKey, ...rig }: BodyProps & { url: string; assetKey: string }) {
  const gltf = useGLTF(url);
  // clone(true) shares geometry and materials with the cached original: only the node tree is copied.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { top, hovering } = measure(gltf.scene);
  return (
    <MonsterRig name={`gltf-${assetKey}`} labelY={top + LABEL_GAP} style={hovering ? GLTF_FLOAT : GLTF_STANDING} {...rig}>
      <primitive object={scene} />
    </MonsterRig>
  );
}

export function MonsterModel({ monster, ...body }: BodyProps & { monster: MonsterDef }) {
  const manifest = useMonsterManifest();
  const catalog = useCatalog().data;
  const fusedColors = useMemo(() => fusedColorsFor(monster, catalog), [monster, catalog]);
  const placeholder = <PlaceholderMonster monster={monster} fusedColors={fusedColors} {...body} />;
  if (!manifest.data?.includes(monster.assetKey)) return placeholder;
  return (
    <ModelBoundary key={monster.assetKey} fallback={placeholder}>
      <Suspense fallback={placeholder}>
        <GltfMonster url={`/assets/monsters/${monster.assetKey}.glb`} assetKey={monster.assetKey} {...body} />
      </Suspense>
    </ModelBoundary>
  );
}
