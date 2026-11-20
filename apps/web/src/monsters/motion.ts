export type MonsterAnimation = 'idle' | 'happy' | 'sad' | 'interact' | 'discover';

export interface MotionStyle {
  /** Constant height added under the body (placeholder floaters only; a .glb bakes its hover in). */
  lift: number;
  /** Amplitude of the slow float bob, 0 for monsters that stand. */
  bob: number;
}

export interface Pose {
  y: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
}

export const newPose = (): Pose => ({ y: 0, ry: 0, rz: 0, sx: 1, sy: 1 });

/** Procedural motion shared by every monster body. Writes into `out` (no per-frame allocation). */
export function monsterPose(animation: MonsterAnimation, t: number, style: MotionStyle, out: Pose): Pose {
  let y = style.lift + Math.sin(t * 1.5) * style.bob;
  let rz = 0;
  let ry = 0;
  let s = 1;
  let sy = 1;
  switch (animation) {
    case 'idle': y += Math.sin(t * 2) * 0.03; break;
    case 'happy': y += Math.abs(Math.sin(t * 6)) * 0.3; break;
    case 'sad': s = 0.9; sy = 0.8; rz = 0.08; break;
    case 'interact': rz = Math.sin(t * 14) * 0.15; break;
    case 'discover': ry = t * 6; s = 1 + Math.abs(Math.sin(t * 3)) * 0.25; sy = s; break;
  }
  out.y = y;
  out.ry = ry;
  out.rz = rz;
  out.sx = s;
  out.sy = sy;
  return out;
}
