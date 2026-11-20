import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { Box3, type Mesh, type Object3D } from 'three';
import { useAssetManifest } from '../monsters/manifest';
import { ModelBoundary } from '../monsters/ModelBoundary';

export type IslandAssetKey = 'island' | 'breeding' | 'extractor' | 'codex';

/** Shadow maps render on demand (static scenery, the sun never moves): ask for one refresh. */
export function useShadowRefresh(dep: unknown) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.shadowMap.needsUpdate = true;
  }, [gl, dep]);
}

function Gltf({ url, onTop }: { url: string; onTop?: (top: number) => void }) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => {
    gltf.scene.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return gltf.scene;
  }, [gltf.scene]);
  useShadowRefresh(scene);
  useEffect(() => {
    if (onTop) onTop(new Box3().setFromObject(scene as Object3D).max.y);
  }, [scene, onTop]);
  // Each island asset appears once, so the cached scene is used directly (no clone).
  return <primitive object={scene} />;
}

/**
 * /assets/island/<key>.glb when the manifest lists it, else `fallback` (also while loading and if the file is broken).
 * The scene works at every stage of the asset build: none, some or all files present.
 */
export function IslandAsset({ assetKey, fallback, onTop }: { assetKey: IslandAssetKey; fallback: ReactNode; onTop?: (top: number) => void }) {
  const manifest = useAssetManifest('island');
  if (!manifest.data?.includes(assetKey)) return <>{fallback}</>;
  return (
    <ModelBoundary key={assetKey} fallback={fallback}>
      <Suspense fallback={fallback}>
        <Gltf url={`/assets/island/${assetKey}.glb`} onTop={onTop} />
      </Suspense>
    </ModelBoundary>
  );
}
