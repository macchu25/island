import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { tagTexture } from './labelTextures';
import { monsterPose, newPose, type MonsterAnimation, type MotionStyle } from './motion';

export interface RigProps {
  name: string;
  /** Height in model units where the label sits (just above the top of the body). */
  labelY: number;
  label?: string;
  /** Count pill drawn to the right of the label in the same sprite, for example "×4". */
  badge?: string;
  animation?: MonsterAnimation;
  /** Seconds added to the clock so neighbours do not move in sync. */
  phase?: number;
  style: MotionStyle;
  children: ReactNode;
}

/** World height of the formula tag; its width follows the text. */
export const LABEL_HEIGHT = 0.42;
/** Gap between the top of a body and the bottom of its tag. */
export const LABEL_GAP = 0.18;

/**
 * Shared wrapper for every monster body (placeholder or .glb): one useFrame drives the inner "motion" group;
 * label and badge stay still above the body so they read cleanly.
 */
export function MonsterRig({ name, labelY, label, badge, animation = 'idle', phase = 0, style, children }: RigProps) {
  const ref = useRef<Group>(null);
  const pose = useMemo(newPose, []);
  const tag = label ? tagTexture(label, badge) : undefined;
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    monsterPose(animation, state.clock.elapsedTime + phase, style, pose);
    g.position.y = pose.y;
    g.rotation.y = pose.ry;
    g.rotation.z = pose.rz;
    g.scale.set(pose.sx, pose.sy, pose.sx);
  });
  return (
    <group name={name}>
      <group ref={ref} name="motion">{children}</group>
      {tag && (
        // Anchored at its bottom centre, so it never sinks into the body whatever its width.
        <sprite name="label" renderOrder={5} userData={{ label, badge }} position={[0, labelY, 0]} center={[0.5, 0]} scale={[LABEL_HEIGHT * tag.aspect, LABEL_HEIGHT, 1]}>
          <spriteMaterial map={tag.texture} transparent depthWrite={false} depthTest={false} />
        </sprite>
      )}
    </group>
  );
}
