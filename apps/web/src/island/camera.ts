import { PerspectiveCamera, Vector3 } from 'three';
import { LAYOUT } from './layout';

/**
 * Map-style camera limits. Polar angle is measured from straight down (0) towards the horizon (pi/2).
 * targetFraction: the pan target stays inside the island ellipse scaled by this factor, so the player cannot get lost.
 */
export const CAMERA_LIMITS = { minPolar: 0.35, maxPolar: 1.1, minDistance: 7, maxDistance: 120, targetFraction: 0.85 } as const;
/** Tilt of the start view (about 46 degrees from vertical). */
export const START_POLAR = 0.8;
/** Share of the screen (NDC half-extent) the island may fill in the start view; leaves room for the HUD. */
const FIT_MARGIN = 0.92;

const { cx, cz, rx, rz } = LAYOUT.island;

/** Nearest point inside the clamp ellipse (radial projection, exact enough for a pan limit). Writes into `out`. */
export function clampTargetInto(x: number, z: number, out: { x: number; z: number }): { x: number; z: number } {
  const ax = rx * CAMERA_LIMITS.targetFraction;
  const az = rz * CAMERA_LIMITS.targetFraction;
  const k = Math.hypot((x - cx) / ax, (z - cz) / az);
  out.x = k <= 1 ? x : cx + (x - cx) / k;
  out.z = k <= 1 ? z : cz + (z - cz) / k;
  return out;
}

/** Allocating form of clampTargetInto, for tests and one-off calls. */
export const clampTarget = (x: number, z: number) => clampTargetInto(x, z, { x: 0, z: 0 });

/** What the start view must show: every habitat plot and building, with room for monsters, signs and roofs. */
export function contentPoints(): Vector3[] {
  const pts: Vector3[] = [];
  const ring = (x: number, z: number, r: number, h: number) => {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      pts.push(new Vector3(x + Math.cos(a) * r, 0, z + Math.sin(a) * r), new Vector3(x + Math.cos(a) * r, h, z + Math.sin(a) * r));
    }
  };
  for (const p of Object.values(LAYOUT.habitats)) ring(p.x, p.z, p.r, 1.8);
  for (const p of Object.values(LAYOUT.buildings)) ring(p.x, p.z, p.r, 3.5);
  return pts;
}

/** A screen rectangle in normalised device coordinates (-1..1, y up) that content must stay out of (a HUD panel). */
export interface NdcRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const tmp = new Vector3();
const look = new Vector3();
function cameraAt(aspect: number, fov: number, polar: number, d: number, tx: number, tz: number): PerspectiveCamera {
  const cam = new PerspectiveCamera(fov, aspect, 0.1, 500);
  cam.position.set(tx, Math.cos(polar) * d, tz + Math.sin(polar) * d);
  cam.lookAt(look.set(tx, 0, tz));
  cam.updateMatrixWorld();
  return cam;
}

function fits(points: Vector3[], cam: PerspectiveCamera, avoid: readonly NdcRect[]): boolean {
  for (const p of points) {
    const n = tmp.copy(p).project(cam);
    if (n.z >= 1 || Math.abs(n.x) > FIT_MARGIN || Math.abs(n.y) > FIT_MARGIN) return false;
    for (const r of avoid) if (n.x > r.x0 && n.x < r.x1 && n.y > r.y0 && n.y < r.y1) return false;
  }
  return true;
}

/** Smallest distance at which `points` fit on screen around target (tx, tz), by binary search. Infinity if none. */
function fitAt(points: Vector3[], aspect: number, fov: number, polar: number, tx: number, tz: number, avoid: readonly NdcRect[]): number {
  let lo = 3;
  let hi = 2 * CAMERA_LIMITS.maxDistance;
  if (!fits(points, cameraAt(aspect, fov, polar, hi, tx, tz), avoid)) return Infinity;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (fits(points, cameraAt(aspect, fov, polar, mid, tx, tz), avoid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Smallest camera distance at which all island content fits on screen with the target at the island centre. */
export function fitDistance(aspect: number, fov: number, polar: number): number {
  return fitAt(contentPoints(), aspect, fov, polar, cx, cz, []);
}

export interface View {
  position: [number, number, number];
  target: [number, number, number];
}

/**
 * Start view: the closest camera that shows every plot and building, keeping them out of the HUD rectangles.
 * The target may slide off the island centre (2-unit grid inside the clamp area) when that lets the camera come closer.
 */
export function startView(aspect: number, fov: number, avoid: readonly NdcRect[] = []): View {
  const points = contentPoints();
  let best = { d: Infinity, tx: cx, tz: cz };
  for (let ox = -8; ox <= 8; ox += 2) {
    for (let oz = -6; oz <= 8; oz += 2) {
      const t = clampTarget(cx + ox, cz + oz);
      const d = fitAt(points, aspect, fov, START_POLAR, t.x, t.z, avoid);
      // Prefer the centred target on ties so the view stays symmetric when nothing is in the way.
      if (d < best.d - 0.25 || (Math.abs(d - best.d) <= 0.25 && Math.hypot(ox, oz) < Math.hypot(best.tx - cx, best.tz - cz))) best = { d, tx: t.x, tz: t.z };
    }
  }
  // Nothing fits (a HUD covering most of a small screen): ignore the HUD rather than show nothing.
  if (!Number.isFinite(best.d)) return avoid.length ? startView(aspect, fov) : centred(CAMERA_LIMITS.maxDistance);
  const d = Math.min(CAMERA_LIMITS.maxDistance, best.d);
  return { position: [best.tx, Math.cos(START_POLAR) * d, best.tz + Math.sin(START_POLAR) * d], target: [best.tx, 0, best.tz] };
}

function centred(d: number): View {
  return { position: [cx, Math.cos(START_POLAR) * d, cz + Math.sin(START_POLAR) * d], target: [cx, 0, cz] };
}

/** How far past the start view the player may zoom out (beyond it there is only sea). */
export const ZOOM_OUT_FACTOR = 1.25;

export interface ResizePlan {
  /** New zoom-out limit for this viewport. */
  maxDistance: number;
  /** Full start view to apply, only while the player has not touched the camera yet. */
  view: View | null;
}

/**
 * Run on every viewport size change (resize, phone rotation): the zoom-out limit always follows the new aspect,
 * so the whole island stays reachable; the camera itself is moved only before the first user input.
 */
export function resizePlan(aspect: number, fov: number, avoid: readonly NdcRect[], userMoved: boolean): ResizePlan {
  const view = startView(aspect, fov, avoid);
  const d = Math.hypot(view.position[0] - view.target[0], view.position[1] - view.target[1], view.position[2] - view.target[2]);
  return { maxDistance: Math.min(CAMERA_LIMITS.maxDistance, d * ZOOM_OUT_FACTOR), view: userMoved ? null : view };
}
