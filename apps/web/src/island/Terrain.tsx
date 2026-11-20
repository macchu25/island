import { HABITAT_IDS, type HabitatId } from './habitats';
import { IslandAsset } from './IslandAsset';
import { LAYOUT } from './layout';
import { Sign } from './Sign';
import { habitatSignAnchor } from './signs';

/** Plot floor colours of the primitive fallback, one per habitat theme. */
const PLOT_COLORS: Record<HabitatId, string> = {
  metal: '#6d6a6a',
  quarry: '#d8cdb6',
  crystal: '#5b4a5e',
  spring: '#7cc6e8',
  gas: '#a9dc8a',
  noble: '#8d7fb8',
  halogen: '#bfe6a0',
};

const { cx, cz, rx, rz } = LAYOUT.island;

/** Primitive island used until island.glb exists: ellipse of grass on a sand rim, one coloured disc per habitat. */
function FallbackIsland() {
  return (
    <group name="island-fallback">
      <mesh position={[cx, -0.6, cz]} scale={[rx, 1, rz]} receiveShadow>
        <cylinderGeometry args={[1, 1.04, 1.2, 64]} />
        <meshStandardMaterial color="#8ccf6a" roughness={0.95} />
      </mesh>
      <mesh position={[cx, -0.75, cz]} scale={[rx + 1.6, 1, rz + 1.6]} receiveShadow>
        <cylinderGeometry args={[1, 1.03, 1.2, 64]} />
        <meshStandardMaterial color="#f1dfae" roughness={1} />
      </mesh>
      {HABITAT_IDS.map((h) => {
        const p = LAYOUT.habitats[h];
        return (
          <mesh key={h} name={`plot-${h}`} position={[p.x, 0.0, p.z]} receiveShadow>
            <cylinderGeometry args={[p.r, p.r * 1.04, 0.06, 48]} />
            <meshStandardMaterial color={PLOT_COLORS[h]} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

export function Terrain() {
  return (
    <group name="terrain">
      <mesh name="sea" rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.9, cz]}>
        <circleGeometry args={[160, 48]} />
        <meshStandardMaterial color="#4fb3d9" roughness={0.35} metalness={0.05} />
      </mesh>
      <IslandAsset assetKey="island" fallback={<FallbackIsland />} />
      {HABITAT_IDS.map((h) => {
        const p = LAYOUT.habitats[h];
        // Hangs below the rim on the camera side, so the board never covers the monsters on the plot.
        const a = habitatSignAnchor(h);
        return <Sign key={h} name={`sign-${h}`} text={p.label} hang="below" position={[a.x, 0.1, a.z]} />;
      })}
    </group>
  );
}
