import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { NeutralToneMapping } from 'three';
import { useCatalog, useCodex } from '../api/queries';
import { formatFormula } from '../monsters/formatFormula';
import { MonsterModel } from '../monsters/MonsterModel';
import { useUi } from '../state/ui';
import { LocalEnvironment } from '../three/LocalEnvironment';

export function MonsterDetail() {
  const id = useUi((s) => s.selectedChemicalId);
  const close = useUi((s) => s.close);
  const catalog = useCatalog().data;
  const codex = useCodex().data;
  const chem = catalog?.chemicals.find((c) => c.id === id);
  const monster = catalog?.monsters.find((m) => m.chemicalId === id);
  const first = codex?.entries.find((e) => e.chemicalId === id)?.firstDiscoverer;
  if (!chem || !monster) return null;
  return (
    <div className="absolute inset-x-4 inset-y-8 flex flex-col gap-2 overflow-auto rounded bg-slate-900/95 p-4 text-white md:inset-x-1/4">
      <button aria-label="Đóng" onClick={close} className="self-end">✕</button>
      <div className="h-64">
        <Canvas camera={{ position: [0, 1.1, 3.2], fov: 45 }} gl={{ toneMapping: NeutralToneMapping }}>
          {/* Same light recipe as the island so .glb (Principled) materials look the same in both views. */}
          <hemisphereLight args={['#e6f4ff', '#7c9a5c', 1.1]} />
          <directionalLight position={[3, 5, 2]} intensity={1.6} />
          <LocalEnvironment />
          <MonsterModel monster={monster} />
          <OrbitControls enablePan={false} target={[0, 0.5, 0]} />
        </Canvas>
      </div>
      <h2 className="font-bold">{monster.displayName}</h2>
      <p>{formatFormula(chem.formula)} · {chem.name}</p>
      <p>{monster.blurb}</p>
      <p className="text-sm">Độ hiếm: {monster.rarity}</p>
      {first && <p className="text-sm">Khám phá bởi {first.displayName}</p>}
    </div>
  );
}
