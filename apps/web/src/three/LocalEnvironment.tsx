import { Environment, Lightformer } from '@react-three/drei';

/** Local studio environment for PBR reflections: no HDR file, no network. Rendered once (frames=1). */
export function LocalEnvironment() {
  return (
    <Environment resolution={64} frames={1} environmentIntensity={0.7}>
      <color attach="background" args={['#9cc4e4']} />
      <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 12, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#fff1d6" position={[6, 2, 4]} rotation={[0, -Math.PI / 3, 0]} scale={[6, 3, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#cfe6ff" position={[-6, 2, 3]} rotation={[0, Math.PI / 3, 0]} scale={[6, 3, 1]} />
      <Lightformer form="rect" intensity={0.5} color="#a8d08a" position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[14, 14, 1]} />
    </Environment>
  );
}
