import { MapControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef, type ComponentRef } from 'react';
import type { PerspectiveCamera } from 'three';
import { CAMERA_LIMITS, clampTarget, startView, type NdcRect } from './camera';

/** Drag pans over the ground, wheel / pinch zooms towards the cursor, tilt is limited, the target stays on the island. */
export function IslandControls({ onStartDistance, avoid }: { onStartDistance?: (d: number) => void; avoid?: () => NdcRect[] }) {
  const ref = useRef<ComponentRef<typeof MapControls>>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const started = useRef(false);

  useEffect(() => {
    const c = ref.current;
    if (!c || started.current || size.width === 0 || size.height === 0) return;
    started.current = true;
    const v = startView(size.width / size.height, camera.fov, avoid?.() ?? []);
    camera.position.set(...v.position);
    c.target.set(...v.target);
    const d = camera.position.distanceTo(c.target);
    // Zooming out past the start view only shows sea.
    c.maxDistance = Math.min(CAMERA_LIMITS.maxDistance, d * 1.25);
    c.update();
    onStartDistance?.(d);
  }, [camera, size, onStartDistance, avoid]);

  const clamp = () => {
    const c = ref.current;
    if (!c) return;
    const t = c.target;
    const k = clampTarget(t.x, t.z);
    const dx = k.x - t.x;
    const dz = k.z - t.z;
    if (dx !== 0 || dz !== 0 || t.y !== 0) {
      // Move the camera by the same offset so the view angle and distance do not change.
      camera.position.x += dx;
      camera.position.z += dz;
      camera.position.y -= t.y;
      t.set(k.x, 0, k.z);
    }
  };

  return (
    <MapControls
      ref={ref}
      makeDefault
      minDistance={CAMERA_LIMITS.minDistance}
      maxDistance={CAMERA_LIMITS.maxDistance}
      minPolarAngle={CAMERA_LIMITS.minPolar}
      maxPolarAngle={CAMERA_LIMITS.maxPolar}
      zoomToCursor
      enableDamping
      dampingFactor={0.12}
      onChange={clamp}
    />
  );
}
