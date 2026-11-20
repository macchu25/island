import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, MeshPhysicalMaterial } from 'three';

export function BreedingMachine({ running = false }: { running?: boolean }) {
  const dome = useRef<Group>(null);
  const mat = useRef<MeshPhysicalMaterial>(null);
  useFrame(({ clock }) => {
    if (!dome.current || !mat.current) return;
    const t = clock.elapsedTime;
    dome.current.rotation.y = running ? t * 1.5 : 0;
    dome.current.position.y = running ? Math.sin(t * 6) * 0.03 : 0;
    mat.current.emissiveIntensity = running ? 0.5 + 0.4 * Math.sin(t * 4) : 0.4;
  });
  return (
    <group name="breeding-machine">
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[1.4, 1.6, 0.4, 32]} /><meshStandardMaterial color="#556677" /></mesh>
      <group ref={dome} name="dome">
        <mesh position={[0, 1.1, 0]}>
          <sphereGeometry args={[1.1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial ref={mat} color="#aaddff" transparent opacity={0.35} emissive={running ? '#66ffcc' : '#000000'} emissiveIntensity={0.4} />
        </mesh>
      </group>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} name="slot-pad" position={[x, 0.42, 0]}><cylinderGeometry args={[0.35, 0.35, 0.06, 20]} /><meshStandardMaterial color="#ffcc55" /></mesh>
      ))}
    </group>
  );
}
