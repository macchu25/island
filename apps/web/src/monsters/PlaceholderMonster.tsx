import type { MonsterDef } from '@chemimon/shared';
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { symbolTexture } from './symbolTexture';

export type MonsterAnimation = 'idle' | 'happy' | 'sad' | 'interact' | 'discover';

interface Props {
  monster: MonsterDef;
  animation?: MonsterAnimation;
  /** Optional input colors for the fused silhouette. */
  fusedColors?: [string, string];
}

const SPIKES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0.62, 0], [0.6, 0.2, 0], [-0.6, 0.2, 0], [0, 0.2, 0.6], [0, 0.2, -0.6],
];

function Body({ monster, fusedColors }: { monster: MonsterDef; fusedColors?: [string, string] }) {
  const c = monster.color;
  switch (monster.silhouette) {
    case 'cloud':
      return (
        <group position={[0, 0.3, 0]}>
          <mesh position={[-0.3, 0, 0]}><sphereGeometry args={[0.4, 16, 12]} /><meshStandardMaterial color={c} /></mesh>
          <mesh position={[0.3, 0.05, 0]}><sphereGeometry args={[0.35, 16, 12]} /><meshStandardMaterial color={c} /></mesh>
          <mesh position={[0, 0.3, 0]}><sphereGeometry args={[0.38, 16, 12]} /><meshStandardMaterial color={c} /></mesh>
        </group>
      );
    case 'block':
      return (
        <RoundedBox args={[0.9, 0.9, 0.9]} radius={0.15} position={[0, 0.45, 0]}>
          <meshStandardMaterial color={c} />
        </RoundedBox>
      );
    case 'orb':
      return (
        <group position={[0, 0.5, 0]}>
          <mesh><sphereGeometry args={[0.5, 24, 16]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.8} /></mesh>
          <mesh rotation={[Math.PI / 2.4, 0, 0]}><torusGeometry args={[0.7, 0.04, 8, 32]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.5} /></mesh>
        </group>
      );
    case 'spiky':
      return (
        <group position={[0, 0.5, 0]}>
          <mesh><icosahedronGeometry args={[0.5, 0]} /><meshStandardMaterial color={c} flatShading /></mesh>
          {SPIKES.map((p, i) => (
            <mesh key={i} position={[p[0], p[1], p[2]]} rotation={[p[2] * 1.5, 0, -p[0] * 1.5]}>
              <coneGeometry args={[0.12, 0.35, 6]} /><meshStandardMaterial color={c} />
            </mesh>
          ))}
        </group>
      );
    case 'crystal':
      return (
        <mesh position={[0, 0.7, 0]} scale={[0.7, 1.1, 0.7]}>
          <octahedronGeometry args={[0.6, 0]} /><meshStandardMaterial color={c} flatShading metalness={0.3} roughness={0.2} />
        </mesh>
      );
    case 'fused': {
      const [a, b] = fusedColors ?? [c, c];
      return (
        <group position={[0, 0.4, 0]}>
          <mesh position={[-0.3, 0, 0]}><sphereGeometry args={[0.4, 16, 12]} /><meshStandardMaterial color={a} /></mesh>
          <mesh position={[0.3, 0, 0]}><sphereGeometry args={[0.4, 16, 12]} /><meshStandardMaterial color={b} /></mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.15, 0.4, 4, 8]} /><meshStandardMaterial color={a} /></mesh>
        </group>
      );
    }
  }
}

export function PlaceholderMonster({ monster, animation = 'idle', fusedColors }: Props) {
  const ref = useRef<Group>(null);
  const tex = useMemo(() => symbolTexture(monster.displayName.slice(0, 3), '#222222'), [monster.displayName]);
  useEffect(() => () => tex.dispose(), [tex]);
  const floating = monster.silhouette === 'cloud' || monster.silhouette === 'orb';

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    let y = floating ? 0.2 + Math.sin(t * 1.5) * 0.08 : 0;
    let rz = 0;
    let ry = 0;
    let s = 1;
    switch (animation) {
      case 'idle': y += Math.sin(t * 2) * 0.03; break;
      case 'happy': y += Math.abs(Math.sin(t * 6)) * 0.3; break;
      case 'sad': s = 0.9; rz = 0.08; break;
      case 'interact': rz = Math.sin(t * 14) * 0.15; break;
      case 'discover': ry = t * 6; s = 1 + Math.abs(Math.sin(t * 3)) * 0.25; break;
    }
    g.position.y = y;
    g.rotation.z = rz;
    g.rotation.y = ry;
    g.scale.set(s, animation === 'sad' ? 0.8 : s, s);
  });

  return (
    <group ref={ref} name={`placeholder-${monster.silhouette}`}>
      <Body monster={monster} fusedColors={fusedColors} />
      <mesh name="eye-l" position={[-0.17, 0.55, 0.52]}><circleGeometry args={[0.07, 12]} /><meshBasicMaterial color="#111111" /></mesh>
      <mesh name="eye-r" position={[0.17, 0.55, 0.52]}><circleGeometry args={[0.07, 12]} /><meshBasicMaterial color="#111111" /></mesh>
      <sprite position={[0, 1.5, 0]} scale={[0.5, 0.5, 1]}>
        <spriteMaterial map={tex} transparent />
      </sprite>
    </group>
  );
}
