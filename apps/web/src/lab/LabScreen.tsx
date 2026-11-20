import type { CollectResponse } from '@chemimon/shared';
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useLogout, useMe } from '../api/queries';
import { useUi } from '../state/ui';
import { BreedingPanel } from '../breeding/BreedingPanel';
import { DiscoveryOverlay } from '../breeding/DiscoveryOverlay';
import { SessionList } from '../breeding/SessionList';
import { CodexPanel } from '../codex/CodexPanel';
import { MonsterDetail } from '../codex/MonsterDetail';
import { PeriodicTable } from '../codex/PeriodicTable';
import { ExtractorButton } from '../extractor/ExtractorButton';
import { LabScene } from './LabScene';

export function LabScreen() {
  const me = useMe().data;
  const logout = useLogout();
  const open = useUi((s) => s.open);
  const panel = useUi((s) => s.panel);
  const [result, setResult] = useState<CollectResponse | null>(null);
  const running = (me?.sessions ?? []).some((s) => s.status === 'running');
  return (
    <div className="relative h-screen w-screen">
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
        <LabScene running={running} />
      </Canvas>
      <header className="absolute inset-x-0 top-0 flex items-center gap-3 bg-black/40 px-4 py-2 text-white">
        <h1 className="font-bold">CHEMIMON</h1>
        <span className="flex-1">{me?.player.displayName}</span>
        <button onClick={() => open('codex')}>Codex</button>
        <button onClick={() => open('table')}>Bảng tuần hoàn</button>
        <button onClick={() => logout.mutate(undefined)}>Đăng xuất</button>
      </header>
      <div className="absolute right-4 top-14"><ExtractorButton /></div>
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <SessionList onCollected={setResult} />
        <BreedingPanel />
      </div>
      {panel === 'codex' && <CodexPanel />}
      {panel === 'table' && <PeriodicTable />}
      {panel === 'monster' && <MonsterDetail />}
      {result && <DiscoveryOverlay result={result} onClose={() => setResult(null)} />}
    </div>
  );
}
