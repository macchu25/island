import type { MonsterDef } from '@chemimon/shared';
import { RoundedBox } from '@react-three/drei';
import type { MonsterAnimation } from './motion';
import { LABEL_GAP, MonsterRig } from './MonsterRig';

export type { MonsterAnimation } from './motion';

interface Props {
  monster: MonsterDef;
  /** Floating label, usually the formatted chemical formula. */
  label?: string;
  /** Small count pill next to the label, for example "×4". */
  badge?: string;
  animation?: MonsterAnimation;
  /** Seconds added to the animation clock (per-monster phase). */
  phase?: number;
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

/** Placeholder floaters hover 0.2 above the ground and bob 0.08 (a .glb bakes its own hover in). */
export const PLACEHOLDER_FLOAT = { lift: 0.2, bob: 0.08 } as const;
const STANDING = { lift: 0, bob: 0 } as const;
/** Top of each placeholder body in model units, float lift and bob included. The label sits just above it. */
export const PLACEHOLDER_TOP: Record<MonsterDef['silhouette'], number> = {
  cloud: 0.98 + PLACEHOLDER_FLOAT.lift + PLACEHOLDER_FLOAT.bob,
  orb: 1.0 + PLACEHOLDER_FLOAT.lift + PLACEHOLDER_FLOAT.bob,
  block: 0.9,
  spiky: 1.3,
  crystal: 1.36,
  fused: 0.8,
};

export function PlaceholderMonster({ monster, label, badge, animation = 'idle', phase, fusedColors }: Props) {
  const floating = monster.silhouette === 'cloud' || monster.silhouette === 'orb';
  return (
    <MonsterRig
      name={`placeholder-${monster.silhouette}`}
      labelY={PLACEHOLDER_TOP[monster.silhouette] + LABEL_GAP}
      label={label ?? monster.displayName.slice(0, 3)}
      badge={badge}
      animation={animation}
      phase={phase}
      style={floating ? PLACEHOLDER_FLOAT : STANDING}
    >
      <Body monster={monster} fusedColors={fusedColors} />
      <mesh name="eye-l" position={[-0.17, 0.55, 0.52]}><circleGeometry args={[0.07, 12]} /><meshBasicMaterial color="#111111" /></mesh>
      <mesh name="eye-r" position={[0.17, 0.55, 0.52]}><circleGeometry args={[0.07, 12]} /><meshBasicMaterial color="#111111" /></mesh>
    </MonsterRig>
  );
}
