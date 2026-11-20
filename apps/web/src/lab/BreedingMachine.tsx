export function BreedingMachine({ running = false }: { running?: boolean }) {
  return (
    <group name="breeding-machine">
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[1.4, 1.6, 0.4, 32]} /><meshStandardMaterial color="#556677" /></mesh>
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[1.1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#aaddff" transparent opacity={0.35} emissive={running ? '#66ffcc' : '#000000'} emissiveIntensity={0.4} />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} name="slot-pad" position={[x, 0.42, 0]}><cylinderGeometry args={[0.35, 0.35, 0.06, 20]} /><meshStandardMaterial color="#ffcc55" /></mesh>
      ))}
    </group>
  );
}
