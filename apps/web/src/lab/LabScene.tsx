import { OrbitControls } from '@react-three/drei';
import { BreedingMachine } from './BreedingMachine';
import { HabitatShelf } from './HabitatShelf';

export const CAMERA_LIMITS = { minPolar: 0.6, maxPolar: 1.3, minDistance: 6, maxDistance: 14 } as const;

export function LabScene({ running = false }: { running?: boolean }) {
  return (
    <>
      <color attach="background" args={['#1b2233']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 4]} intensity={1.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} /><meshStandardMaterial color="#3a4256" />
      </mesh>
      <HabitatShelf />
      <BreedingMachine running={running} />
      <OrbitControls
        minPolarAngle={CAMERA_LIMITS.minPolar}
        maxPolarAngle={CAMERA_LIMITS.maxPolar}
        minDistance={CAMERA_LIMITS.minDistance}
        maxDistance={CAMERA_LIMITS.maxDistance}
        enablePan={false}
      />
    </>
  );
}
