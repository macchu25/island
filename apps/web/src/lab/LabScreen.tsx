import type { CollectResponse } from '@chemimon/shared';
import { useCallback, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { NeutralToneMapping } from 'three';
import { useLogout, useMe } from '../api/queries';
import { useUi } from '../state/ui';
import { BreedingPanel } from '../breeding/BreedingPanel';
import { DiscoveryOverlay } from '../breeding/DiscoveryOverlay';
import { SessionList } from '../breeding/SessionList';
import { CodexPanel } from '../codex/CodexPanel';
import { MonsterDetail } from '../codex/MonsterDetail';
import { PeriodicTable } from '../codex/PeriodicTable';
import { ExtractorButton } from '../extractor/ExtractorButton';
import type { NdcRect } from '../island/camera';
import { IslandScene } from '../island/IslandScene';
import { QuestPanel } from '../quests/QuestPanel';

export function LabScreen() {
  const me = useMe().data;
  const logout = useLogout();
  const open = useUi((s) => s.open);
  const panel = useUi((s) => s.panel);
  const [result, setResult] = useState<CollectResponse | null>(null);
  const running = (me?.sessions ?? []).some((s) => s.status === 'running');
  const root = useRef<HTMLDivElement>(null);
  // Screen areas the HUD covers, in canvas NDC; the island start view keeps habitats out of them.
  const hudRects = useCallback((): NdcRect[] => {
    const box = root.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return [];
    return [...(root.current?.querySelectorAll('[data-hud]') ?? [])].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        x0: ((r.left - box.left) / box.width) * 2 - 1,
        x1: ((r.right - box.left) / box.width) * 2 - 1,
        y0: 1 - ((r.bottom - box.top) / box.height) * 2,
        y1: 1 - ((r.top - box.top) / box.height) * 2,
      };
    });
  }, []);
  return (
    <div ref={root} className="relative h-screen w-screen">
      <Canvas
        data-testid="island"
        shadows
        dpr={[1, 1.75]}
        // near 1 (the closest zoom is 7 away) doubles depth precision for the island's 0.003-apart surfaces.
        camera={{ position: [0, 30, 30], fov: 45, near: 1, far: 400 }}
        gl={{ toneMapping: NeutralToneMapping }}
        onCreated={({ gl }) => {
          // Static scenery and a fixed sun: render the shadow map only when an asset loads.
          gl.shadowMap.autoUpdate = false;
          gl.shadowMap.needsUpdate = true;
        }}
      >
        <IslandScene running={running} hudRects={hudRects} />
      </Canvas>
      <header data-hud className="absolute inset-x-0 top-0 flex items-center gap-3 bg-black/40 px-4 py-2 text-white">
        <h1 className="font-bold">CHEMIMON</h1>
        <span className="flex-1">{me?.player.displayName}</span>
        <button onClick={() => open('breeding')}>Lai tạo</button>
        <button onClick={() => open('codex')}>Codex</button>
        <button onClick={() => open('table')}>Bảng tuần hoàn</button>
        <button onClick={() => logout.mutate(undefined)}>Đăng xuất</button>
      </header>
      <div className="absolute right-4 top-14 flex flex-col items-end gap-2">
        <div data-hud><ExtractorButton /></div>
        <div data-hud><QuestPanel /></div>
      </div>
      <div data-hud className="absolute bottom-4 left-4 flex flex-col gap-2">
        <SessionList onCollected={setResult} />
      </div>
      {panel === 'codex' && <CodexPanel />}
      {panel === 'table' && <PeriodicTable />}
      {panel === 'monster' && <MonsterDetail />}
      {panel === 'breeding' && <BreedingPanel />}
      {result && <DiscoveryOverlay result={result} onClose={() => setResult(null)} />}
    </div>
  );
}
