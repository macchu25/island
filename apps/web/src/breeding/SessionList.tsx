import type { CollectResponse } from '@chemimon/shared';
import { useEffect, useState } from 'react';
import { useCatalog, useMe } from '../api/queries';
import { formatFormula } from '../monsters/formatFormula';
import { errorMessage, useCollect } from './useBreeding';

export function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function SessionList({ onCollected }: { onCollected(r: CollectResponse): void }) {
  const me = useMe().data;
  const catalog = useCatalog().data;
  const collect = useCollect();
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sessions = (me?.sessions ?? []).filter((s) => s.status !== 'collected');
  if (sessions.length === 0) return null;
  const label = (id: string) => {
    const f = catalog?.chemicals.find((c) => c.id === id)?.formula;
    return f ? formatFormula(f) : id;
  };
  const doCollect = async (id: string) => {
    setError(null);
    try {
      onCollected(await collect.mutateAsync(id));
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <section aria-label="Máy đang chạy" className="w-80 rounded bg-black/60 p-3 text-white">
      <ul>
        {sessions.map((s) => {
          const left = new Date(s.readyAt).getTime() - now;
          return (
            <li key={s.id} data-testid="session" className="mb-1 flex items-center gap-2 text-sm">
              <span className="flex-1">{s.inputs.map((i) => `${i.count}×${label(i.chemicalId)}`).join(' + ')}</span>
              <span>{left > 0 ? formatRemaining(left) : 'Xong'}</span>
              <button type="button" disabled={left > 0 || collect.isPending} onClick={() => doCollect(s.id)}>Thu hoạch</button>
            </li>
          );
        })}
      </ul>
      {error && <p role="status" className="text-sm text-amber-300">{error}</p>}
    </section>
  );
}
