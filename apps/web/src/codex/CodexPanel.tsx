import { parseFormula } from '@chemimon/chem-engine';
import { useState } from 'react';
import { useCatalog, useCodex } from '../api/queries';
import { formatFormula } from '../monsters/formatFormula';
import { useUi } from '../state/ui';

type Filter = 'all' | 'element' | 'compound';
const FILTERS: [Filter, string][] = [['all', 'Tất cả'], ['element', 'Nguyên tố'], ['compound', 'Hợp chất']];

export function CodexPanel() {
  const catalog = useCatalog().data;
  const codex = useCodex().data;
  const close = useUi((s) => s.close);
  const open = useUi((s) => s.open);
  const [filter, setFilter] = useState<Filter>('all');
  const chems = new Map((catalog?.chemicals ?? []).map((c) => [c.id, c]));
  const cards = (codex?.entries ?? []).flatMap((entry) => {
    const chem = chems.get(entry.chemicalId);
    return chem && (filter === 'all' || chem.kind === filter) ? [{ entry, chem }] : [];
  });
  return (
    <div className="absolute inset-4 overflow-auto rounded bg-slate-900/95 p-4 text-white">
      <button aria-label="Đóng" onClick={close} className="float-right">✕</button>
      <h2 className="mb-2 font-bold">Codex</h2>
      <div className="mb-3 flex gap-2">
        {FILTERS.map(([f, label]) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className={filter === f ? 'font-bold underline' : ''}>{label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {cards.map(({ entry, chem }) =>
          entry.state === 'unknown' ? (
            <div key={chem.id} className="rounded bg-white/10 p-2">
              <p className="text-lg">???</p>
              {/* An unknown compound hints at its elements. An unknown element shows nothing: its symbol would name it. */}
              {chem.kind === 'compound' && (
                <div className="flex flex-wrap gap-1">
                  {Object.keys(parseFormula(chem.formula)).map((sym) => <span key={sym} className="rounded bg-white/20 px-1 text-xs">{sym}</span>)}
                </div>
              )}
            </div>
          ) : (
            <div key={chem.id} className="rounded bg-white/20 p-2">
              <p className="font-bold">{chem.name}</p>
              <p>{formatFormula(chem.formula)}</p>
              {(entry.state === 'owned' || entry.count > 0) && <p className="text-xs">×{entry.count}</p>}
              {/* Mined but never bred: compound quests do not count it yet. */}
              {entry.state === 'discovered' && !entry.bred && <p className="text-xs text-amber-300">chưa lai tạo</p>}
              {entry.firstDiscoverer && <p className="text-xs">Khám phá bởi {entry.firstDiscoverer.displayName}</p>}
              {catalog?.monsters.some((m) => m.chemicalId === chem.id) && (
                <button className="text-xs underline" onClick={() => open('monster', chem.id)}>Xem</button>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
