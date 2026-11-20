import { useProgress } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Vector3, type Object3D } from 'three';
import { CAMERA_LIMITS } from './camera';
import { LAYOUT } from './layout';
import { MONSTER_ISLAND_SCALE } from './placement';

/** Read-only view of the island scene for end-to-end tests. Exists only when the page URL has `?e2e`. */
export interface IslandProbe {
  /** Chemical ids of the monsters standing on the island. */
  monsters(): string[];
  /** How many of them render their .glb model (not the placeholder). */
  gltfMonsters(): number;
  /** True while any model file is still downloading or parsing. */
  loading(): boolean;
  hasNode(name: string): boolean;
  /** CSS pixels, relative to the canvas, of a node's world position raised by `lift` units. Null if absent. */
  screenOf(name: string, lift?: number): { x: number; y: number } | null;
  camera(): { target: { x: number; z: number }; distance: number; maxDistance: number };
  limits: { island: typeof LAYOUT.island; targetFraction: number; maxDistance: number; monsterScale: number };
}

declare global {
  interface Window {
    __island?: IslandProbe;
  }
}

/** Test hook gate: nothing is exposed to players, only to a page opened with `?e2e`. */
export const e2eProbeEnabled = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e');

interface OrbitLike {
  target: Vector3;
  maxDistance: number;
}

export function E2EProbe() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  useEffect(() => {
    const islandMonsters = (): Object3D[] => scene.getObjectByName('island-monsters')?.children ?? [];
    const v = new Vector3();
    window.__island = {
      monsters: () => islandMonsters().map((o) => o.name.replace('island-monster-', '')),
      gltfMonsters: () => islandMonsters().filter(hasGltf).length,
      loading: () => useProgress.getState().active,
      hasNode: (name) => scene.getObjectByName(name) !== undefined,
      screenOf: (name, lift = 0) => {
        const o = scene.getObjectByName(name);
        if (!o) return null;
        o.getWorldPosition(v);
        v.y += lift;
        v.project(camera);
        return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
      },
      camera: () => {
        const t = controls?.target ?? new Vector3();
        return { target: { x: t.x, z: t.z }, distance: camera.position.distanceTo(t), maxDistance: controls?.maxDistance ?? NaN };
      },
      limits: { island: LAYOUT.island, targetFraction: CAMERA_LIMITS.targetFraction, maxDistance: CAMERA_LIMITS.maxDistance, monsterScale: MONSTER_ISLAND_SCALE },
    };
    return () => {
      delete window.__island;
    };
  }, [scene, camera, size, controls]);
  return null;
}

function hasGltf(o: Object3D): boolean {
  let found = false;
  o.traverse((c) => {
    if (c.name.startsWith('gltf-')) found = true;
  });
  return found;
}
