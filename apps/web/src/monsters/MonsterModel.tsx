import type { MonsterDef } from '@chemimon/shared';
import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useMonsterManifest } from './manifest';
import { PlaceholderMonster, type MonsterAnimation } from './PlaceholderMonster';

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* fall back to the placeholder; nothing else to do */
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function GltfBody({ url }: { url: string }) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return <primitive object={scene} />;
}

export function MonsterModel({ monster, animation }: { monster: MonsterDef; animation?: MonsterAnimation }) {
  const manifest = useMonsterManifest();
  const placeholder = <PlaceholderMonster monster={monster} animation={animation} />;
  if (!manifest.data?.includes(monster.assetKey)) return placeholder;
  return (
    <ModelBoundary key={monster.assetKey} fallback={placeholder}>
      <Suspense fallback={placeholder}>
        <GltfBody url={`/assets/monsters/${monster.assetKey}.glb`} />
      </Suspense>
    </ModelBoundary>
  );
}
