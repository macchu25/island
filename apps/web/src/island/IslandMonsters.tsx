import type { ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';
import { CanvasTexture, CircleGeometry, CylinderGeometry, MeshBasicMaterial } from 'three';
import { useCatalog, useMe } from '../api/queries';
import { MonsterModel } from '../monsters/MonsterModel';
import { useUi } from '../state/ui';
import { CLICK_SLOP_PX, setCursor } from './Buildings';
import { placeOwned, type Placed } from './placement';

function blobTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext?.('2d') ?? null;
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(c);
}

// Shared by all monsters: one geometry and one material each for the blob shadow and the hit volume.
const BLOB_GEO = new CircleGeometry(0.55, 24).rotateX(-Math.PI / 2);
let blobMat: MeshBasicMaterial | undefined;
const blobMaterial = () =>
  (blobMat ??= new MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
const HIT_GEO = new CylinderGeometry(0.55, 0.55, 1.3, 10).translate(0, 0.65, 0);
const HIT_MAT = new MeshBasicMaterial({ visible: false });

function IslandMonster({ p }: { p: Placed }) {
  const open = useUi((s) => s.open);
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > CLICK_SLOP_PX) return;
    open('monster', p.monster.chemicalId);
  };
  return (
    <group name={`island-monster-${p.monster.chemicalId}`} position={[p.x, 0, p.z]} rotation={[0, p.yaw, 0]}>
      <MonsterModel monster={p.monster} label={p.label} badge={`×${p.count}`} phase={p.phase} />
      <mesh geometry={BLOB_GEO} material={blobMaterial()} position={[0, 0.02, 0]} renderOrder={1} />
      <mesh
        name="hit"
        geometry={HIT_GEO}
        material={HIT_MAT}
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); setCursor('pointer'); }}
        onPointerOut={() => setCursor('auto')}
      />
    </group>
  );
}

/** Every owned species (count > 0) stands in its habitat slot. Nothing is capped or hidden. */
export function IslandMonsters() {
  const inventory = useMe().data?.inventory;
  const catalog = useCatalog().data;
  const placed = useMemo(() => (inventory && catalog ? placeOwned(catalog, inventory) : []), [inventory, catalog]);
  return (
    <group name="island-monsters">
      {placed.map((p) => <IslandMonster key={p.monster.id} p={p} />)}
    </group>
  );
}
