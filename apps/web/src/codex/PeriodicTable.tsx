import { useCatalog, useCodex } from '../api/queries';
import { useUi } from '../state/ui';
import { periodicLayout } from './periodicLayout';

export function PeriodicTable() {
  const catalog = useCatalog().data;
  const codex = useCodex().data;
  const { open, close } = useUi();
  const byZ = new Map((catalog?.chemicals ?? []).filter((c) => c.atomicNumber).map((c) => [c.atomicNumber!, c]));
  const entries = new Map((codex?.entries ?? []).map((e) => [e.chemicalId, e]));
  return (
    <div className="absolute inset-4 overflow-auto rounded bg-slate-900/95 p-4 text-white">
      <button aria-label="Đóng" onClick={close} className="float-right">✕</button>
      <h2 className="mb-2 font-bold">Bảng tuần hoàn</h2>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(18, minmax(2.5rem, 1fr))' }}>
        {Object.entries(periodicLayout).map(([z, { row, col, symbol }]) => {
          const chem = byZ.get(Number(z));
          const entry = chem ? entries.get(chem.id) : undefined;
          const monster = chem ? catalog?.monsters.find((m) => m.chemicalId === chem.id) : undefined;
          const live = !!chem && !!monster && !!entry && entry.state === 'owned';
          const style = { gridRow: row, gridColumn: col };
          if (!live) return <div key={z} data-testid="cell" style={style} className="rounded bg-white/10 p-1 text-center text-xs opacity-40">{symbol}</div>;
          return (
            <button key={z} data-testid="cell" aria-label={symbol} style={style} onClick={() => open('monster', chem.id)} className="rounded bg-white/20 p-1 text-center text-xs">
              <span className="mx-auto block h-4 w-4 rounded-full" style={{ background: monster.color }} />
              {symbol}
              <span className="block">×{entry.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
