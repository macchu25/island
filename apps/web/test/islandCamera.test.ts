import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAMERA_LIMITS, START_POLAR, clampTarget, contentPoints, fitDistance, startView, type NdcRect } from '../src/island/camera';
import { LAYOUT } from '../src/island/layout';

const { cx, cz, rx, rz } = LAYOUT.island;
const inEllipse = (x: number, z: number, f: number) => ((x - cx) / (rx * f)) ** 2 + ((z - cz) / (rz * f)) ** 2 <= 1 + 1e-9;

describe('CAMERA_LIMITS', () => {
  it('limits tilt to between a high oblique view and a top-down-ish one, never below the horizon', () => {
    expect(CAMERA_LIMITS).toEqual({ minPolar: 0.35, maxPolar: 1.1, minDistance: 7, maxDistance: 120, targetFraction: 0.85 });
    expect(CAMERA_LIMITS.maxPolar).toBeLessThan(Math.PI / 2);
    expect(START_POLAR).toBeGreaterThanOrEqual(CAMERA_LIMITS.minPolar);
    expect(START_POLAR).toBeLessThanOrEqual(CAMERA_LIMITS.maxPolar);
  });
});

describe('clampTarget', () => {
  it('keeps a target that is already on the island', () => {
    expect(clampTarget(0, 0)).toEqual({ x: 0, z: 0 });
    expect(clampTarget(-11, -2)).toEqual({ x: -11, z: -2 });
  });
  it('pulls a far-away target back onto the clamp ellipse edge', () => {
    for (const [x, z] of [[100, 0], [0, 100], [-80, -90], [30, 30]] as const) {
      const p = clampTarget(x, z);
      expect(inEllipse(p.x, p.z, CAMERA_LIMITS.targetFraction)).toBe(true);
      expect(inEllipse(p.x, p.z, CAMERA_LIMITS.targetFraction * 0.98)).toBe(false);
    }
  });
});

describe('startView', () => {
  const ndcOf = (aspect: number, avoid: NdcRect[] = []) => {
    const v = startView(aspect, 45, avoid);
    const cam = new PerspectiveCamera(45, aspect, 0.1, 500);
    cam.position.set(...v.position);
    cam.lookAt(new Vector3(...v.target));
    cam.updateMatrixWorld();
    return { v, pts: contentPoints().map((p) => p.clone().project(cam)) };
  };

  it('shows every habitat and building on a 16:9 desktop and a portrait phone', () => {
    for (const aspect of [1280 / 720, 390 / 844]) {
      const { v, pts } = ndcOf(aspect);
      const dist = new Vector3(...v.position).distanceTo(new Vector3(...v.target));
      expect(dist).toBeLessThanOrEqual(CAMERA_LIMITS.maxDistance);
      expect(dist).toBeGreaterThanOrEqual(CAMERA_LIMITS.minDistance);
      for (const n of pts) {
        expect(Math.abs(n.x), `aspect ${aspect}`).toBeLessThanOrEqual(1);
        expect(Math.abs(n.y), `aspect ${aspect}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps island content out of a HUD panel (bottom-left breeding panel on 1280x720)', () => {
    const panel: NdcRect = { x0: -1, y0: -1, x1: -1 + (2 * 340) / 1280, y1: 1 - (2 * 360) / 720 };
    const { pts } = ndcOf(1280 / 720, [panel]);
    for (const n of pts) expect(n.x > panel.x0 && n.x < panel.x1 && n.y > panel.y0 && n.y < panel.y1).toBe(false);
  });

  it('frames the island content tightly on desktop (monsters stay visible, not a tiny island in a big sea)', () => {
    const d = fitDistance(1280 / 720, 45, START_POLAR);
    expect(d).toBeGreaterThan(20);
    expect(d).toBeLessThan(45);
  });

  it('starts with the target inside the clamp area', () => {
    const { v } = ndcOf(16 / 9, [{ x0: -1, y0: -1, x1: -0.45, y1: 0 }]);
    expect(inEllipse(v.target[0], v.target[2], CAMERA_LIMITS.targetFraction)).toBe(true);
  });
});
