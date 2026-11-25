import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CylinderGeometry, MeshBasicMaterial, type Mesh } from 'three';
import { useUi } from '../state/ui';
import { BreedingMachine } from './BreedingMachine';
import { IslandAsset, useShadowRefresh } from './IslandAsset';
import { BUILDING_IDS, LAYOUT, type BuildingId } from './layout';
import { Sign } from './Sign';

/** A drag (pan) that ends on an object still fires click; ignore releases this far (px) from the press. */
export const CLICK_SLOP_PX = 6;

// Shared invisible hit volume: raycasts hit one cylinder instead of every triangle of the model.
const HIT_GEO = new CylinderGeometry(1, 1, 1, 12);
const HIT_MAT = new MeshBasicMaterial({ visible: false });

export const setCursor = (c: 'pointer' | 'auto') => {
  if (typeof document !== 'undefined') document.body.style.cursor = c;
};

/**
 * Pointer-cursor handlers for one clickable object. If the object unmounts while hovered (a monster disappears,
 * the scene closes), the cleanup puts the cursor back, but only when this object was the one that set it.
 */
export function useHoverCursor() {
  const hovered = useRef(false);
  useEffect(
    () => () => {
      if (hovered.current) setCursor('auto');
    },
    [],
  );
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      hovered.current = true;
      setCursor('pointer');
    },
    onPointerOut: () => {
      hovered.current = false;
      setCursor('auto');
    },
  };
}

function FallbackExtractor() {
  return (
    <group name="extractor-fallback">
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow><boxGeometry args={[2.2, 1.2, 1.6]} /><meshStandardMaterial color="#c9d3dc" roughness={0.5} metalness={0.3} /></mesh>
      <mesh position={[-0.5, 1.75, 0]} castShadow><cylinderGeometry args={[0.45, 0.45, 1.1, 20]} /><meshStandardMaterial color="#7fd1c7" roughness={0.3} /></mesh>
      <mesh position={[0.55, 1.5, 0]} castShadow><cylinderGeometry args={[0.12, 0.12, 0.6, 10]} /><meshStandardMaterial color="#8a939b" /></mesh>
      <mesh position={[0.55, 1.85, 0]}><sphereGeometry args={[0.2, 16, 12]} /><meshStandardMaterial color="#ffe27a" emissive="#ffcc33" emissiveIntensity={0.8} /></mesh>
      <mesh position={[0, 0.7, 0.81]}><boxGeometry args={[0.9, 0.5, 0.04]} /><meshStandardMaterial color="#2c3e50" emissive="#3fd0ff" emissiveIntensity={0.4} /></mesh>
    </group>
  );
}

function FallbackCodex() {
  const books = ['#e76f51', '#2a9d8f', '#e9c46a', '#8e7dbe', '#f4a261'];
  return (
    <group name="codex-fallback">
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow><boxGeometry args={[2.4, 1.6, 1.8]} /><meshStandardMaterial color="#f3e9d2" roughness={0.8} /></mesh>
      <mesh position={[0, 2.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.95, 0.9, 4]} /><meshStandardMaterial color="#b5523b" roughness={0.7} /></mesh>
      {books.map((c, i) => (
        <mesh key={c} position={[-0.8 + i * 0.4, 0.75, 0.92]}><boxGeometry args={[0.3, 0.9, 0.06]} /><meshStandardMaterial color={c} /></mesh>
      ))}
    </group>
  );
}

/**
 * Running-session marker: a teal ring on the ground just outside the building base that breathes, plus a ripple
 * that expands and fades every 1.6 s. Separate primitives, so it works for the .glb and the fallback and never
 * touches the model's shared materials. Normal blending: an additive glow vanishes on the pale base.
 */
function RunningGlow({ r }: { r: number }) {
  const ring = useRef<Mesh>(null);
  const ripple = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring.current) (ring.current.material as MeshBasicMaterial).opacity = 0.7 + 0.2 * Math.sin(t * 3);
    if (ripple.current) {
      const k = (t / 1.6) % 1;
      ripple.current.scale.set(1 + 0.35 * k, 1 + 0.35 * k, 1);
      (ripple.current.material as MeshBasicMaterial).opacity = 0.7 * (1 - k);
    }
  });
  return (
    <group name="breeding-running" position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ring} renderOrder={2}>
        <ringGeometry args={[r * 1.0, r * 1.16, 64]} />
        <meshBasicMaterial color="#14b8a6" transparent opacity={0.7} depthWrite={false} />
      </mesh>
      <mesh ref={ripple} renderOrder={2}>
        <ringGeometry args={[r * 1.0, r * 1.06, 64]} />
        <meshBasicMaterial color="#5eead4" transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  );
}

// Heights of the primitive fallbacks (the breeding machine is drawn at 1.5x: dome top 2.2 * 1.5).
const FALLBACK_TOP: Record<BuildingId, number> = { breeding: 3.3, extractor: 2.1, codex: 2.5 };

function Building({ id, running }: { id: BuildingId; running: boolean }) {
  const plot = LAYOUT.buildings[id];
  const open = useUi((s) => s.open);
  const pulseHud = useUi((s) => s.pulseHud);
  const [top, setTop] = useState(FALLBACK_TOP[id]);
  const onTop = useCallback((t: number) => setTop(t), []);
  useShadowRefresh(id);
  const hover = useHoverCursor();
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > CLICK_SLOP_PX) return;
    if (id === 'codex') open('codex');
    else if (id === 'breeding') open('breeding');
    else pulseHud('extractor');
  };
  const fallback =
    id === 'breeding' ? (
      <group scale={1.5}><BreedingMachine running={running} /></group>
    ) : id === 'extractor' ? <FallbackExtractor /> : <FallbackCodex />;
  return (
    <group name={`building-${id}`} position={[plot.x, 0, plot.z]}>
      <IslandAsset assetKey={id} fallback={fallback} onTop={onTop} />
      {id === 'breeding' && running && <RunningGlow r={plot.r} />}
      {/* Hangs below the front edge of the plot, like the habitat boards: never collides with a tall roof. */}
      <Sign name={`sign-${id}`} text={plot.label} hang="below" position={[0, 0.1, plot.r]} />
      <mesh
        name={`hit-${id}`}
        geometry={HIT_GEO}
        material={HIT_MAT}
        position={[0, top / 2, 0]}
        scale={[plot.r * 0.85, top, plot.r * 0.85]}
        onClick={onClick}
        {...hover}
      />
    </group>
  );
}

export function Buildings({ running = false }: { running?: boolean }) {
  return (
    <group name="buildings">
      {BUILDING_IDS.map((id) => <Building key={id} id={id} running={running} />)}
    </group>
  );
}
