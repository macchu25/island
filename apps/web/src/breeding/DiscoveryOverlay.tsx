import type { CollectResponse } from '@chemimon/shared';
import { Canvas } from '@react-three/fiber';
import { useCatalog } from '../api/queries';
import { formatFormula } from '../monsters/formatFormula';
import { MonsterModel } from '../monsters/MonsterModel';

export function DiscoveryOverlay({ result, onClose }: { result: CollectResponse; onClose(): void }) {
  const catalog = useCatalog().data;
  return (
    <div role="dialog" aria-label="Kết quả" className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
      <div className="rounded bg-slate-800 p-4">
        <ul className="flex gap-4">
          {result.products.map((p) => {
            const monster = catalog?.monsters.find((m) => m.chemicalId === p.chemicalId);
            const formula = catalog?.chemicals.find((c) => c.id === p.chemicalId)?.formula;
            const label = formula ? formatFormula(formula) : p.chemicalId;
            return (
              <li key={p.chemicalId} data-testid="product" className="w-40 text-center">
                <div className="h-32">
                  {monster && (
                    <Canvas camera={{ position: [0, 1, 3], fov: 40 }}>
                      <ambientLight intensity={0.9} />
                      <directionalLight position={[3, 4, 3]} />
                      <MonsterModel monster={monster} label={label} animation="discover" />
                    </Canvas>
                  )}
                </div>
                <div>{monster?.displayName ?? p.chemicalId} ×{p.count}</div>
                {result.newDiscoveries.includes(p.chemicalId) && <div>Khám phá mới!</div>}
                {result.firstDiscoveries.includes(p.chemicalId) && (
                  <div className="rounded bg-yellow-400 px-1 text-black">Người khám phá đầu tiên!</div>
                )}
              </li>
            );
          })}
        </ul>
        <button type="button" className="mt-3" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
}
