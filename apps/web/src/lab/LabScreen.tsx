import { Canvas } from '@react-three/fiber';
import { useLogout, useMe } from '../api/queries';
import { useUi } from '../state/ui';
import { LabScene } from './LabScene';

export function LabScreen() {
  const me = useMe().data;
  const logout = useLogout();
  const open = useUi((s) => s.open);
  return (
    <div className="relative h-screen w-screen">
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
        <LabScene />
      </Canvas>
      <header className="absolute inset-x-0 top-0 flex items-center gap-3 bg-black/40 px-4 py-2 text-white">
        <h1 className="font-bold">CHEMIMON</h1>
        <span className="flex-1">{me?.player.displayName}</span>
        <button onClick={() => open('codex')}>Codex</button>
        <button onClick={() => open('table')}>Bảng tuần hoàn</button>
        <button onClick={() => logout.mutate(undefined)}>Đăng xuất</button>
      </header>
    </div>
  );
}
