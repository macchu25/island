import { MapControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import type { PerspectiveCamera } from 'three';
import { CAMERA_LIMITS, clampTargetInto, resizePlan, type NdcRect } from './camera';

/** Drag pans over the ground, wheel / pinch zooms towards the cursor, tilt is limited, the target stays on the island. */
export function IslandControls({ onStartDistance, avoid }: { onStartDistance?: (d: number) => void; avoid?: () => NdcRect[] }) {
  const ref = useRef<ComponentRef<typeof MapControls>>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  // Set on the first drag, wheel or pinch: from then on a resize keeps the player's view.
  const userMoved = useRef(false);
  const scratch = useMemo(() => ({ x: 0, z: 0 }), []);

  // Every size change (window resize, phone rotation) recomputes the zoom-out limit for the new aspect.
  useEffect(() => {
    const c = ref.current;
    if (!c || size.width === 0 || size.height === 0) return;
    const plan = resizePlan(size.width / size.height, camera.fov, avoid?.() ?? [], userMoved.current);
    c.maxDistance = plan.maxDistance;
    if (plan.view) {
      camera.position.set(...plan.view.position);
      c.target.set(...plan.view.target);
      onStartDistance?.(camera.position.distanceTo(c.target));
    }
    c.update();
  }, [camera, size, onStartDistance, avoid]);

  const clamp = () => {
    const c = ref.current;
    if (!c) return;
    const t = c.target;
    const k = clampTargetInto(t.x, t.z, scratch);
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
      onStart={() => {
        userMoved.current = true;
      }}
      onChange={clamp}
    />
  );
}
