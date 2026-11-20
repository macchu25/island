import { useEffect, useMemo, useState } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { LocalEnvironment } from '../three/LocalEnvironment';
import { Buildings } from './Buildings';
import { E2EProbe, e2eProbeEnabled } from './E2EProbe';
import type { NdcRect } from './camera';
import { IslandControls } from './IslandControls';
import { IslandMonsters } from './IslandMonsters';
import { LAYOUT } from './layout';
import { Terrain } from './Terrain';

/** Horizon colour: the bottom of the sky gradient and the fog colour, so the sea fades into the sky. */
export const HORIZON = '#cfe9f7';
const ZENITH = '#6fb6ea';

function skyTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext?.('2d') ?? null;
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, ZENITH);
    g.addColorStop(0.65, '#a9d7f3');
    g.addColorStop(1, HORIZON);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

const { rx, rz, cz } = LAYOUT.island;
/** Sun shadow box covers the whole island (the default box is only 10 units wide). */
const SHADOW_HALF = Math.max(rx, rz + Math.abs(cz)) + 4;

/** running: a breeding session is in progress. hudRects: screen areas covered by HUD panels (start view avoids them). */
export function IslandScene({ running = false, hudRects }: { running?: boolean; hudRects?: () => NdcRect[] }) {
  const sky = useMemo(skyTexture, []);
  useEffect(() => () => sky.dispose(), [sky]);
  const [startDistance, setStartDistance] = useState(40);
  return (
    <>
      <primitive attach="background" object={sky} />
      {/* Light fog starts past the start view, so only the far sea fades. */}
      <fog attach="fog" args={[HORIZON, startDistance * 1.3, startDistance * 3.2]} />
      <hemisphereLight args={['#e6f4ff', '#7c9a5c', 1.1]} />
      <directionalLight
        // Target stays at the origin (inside the island); the shadow box around it covers every plot.
        position={[16, 30, 18]}
        intensity={2.0}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={3}
        shadow-camera-left={-SHADOW_HALF}
        shadow-camera-right={SHADOW_HALF}
        shadow-camera-top={SHADOW_HALF}
        shadow-camera-bottom={-SHADOW_HALF}
        shadow-camera-near={5}
        shadow-camera-far={90}
      />
      <LocalEnvironment />
      <Terrain />
      <Buildings running={running} />
      <IslandMonsters />
      <IslandControls onStartDistance={setStartDistance} avoid={hudRects} />
      {e2eProbeEnabled() && <E2EProbe />}
    </>
  );
}
