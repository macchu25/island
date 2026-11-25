import type { ExpeditionCollectResponse } from '@chemimon/shared';
import { useEffect, useRef, useState } from 'react';
import { useCatalog, useCollectExpedition, useExpeditions } from '../api/queries';
import { formatRemaining } from '../breeding/SessionList';
import { formatFormula } from '../monsters/formatFormula';
import { expeditionError } from './errors';

/**
 * Running expedition trips: countdown, then "Nhận". After a collect, a result line shows what came back
 * and which chemicals are new to the Codex. Used in the dock panel and the lab's bottom-left list.
 */
export function TripList({ label = 'Chuyến khai thác' }: { label?: string }) {
  const data = useExpeditions().data;
  const trips = data?.trips ?? [];
  const places = data?.places ?? [];
  const catalog = useCatalog().data;
  const collect = useCollectExpedition();
  const busy = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExpeditionCollectResponse | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const running = trips.filter((t) => t.status === 'running');
  // The collected trip leaves the list: keep the panel up while there is a result or an error to show.
  if (running.length === 0 && !result && !error) return null;
  const fmt = (id: string) => {
    const f = catalog?.chemicals.find((c) => c.id === id)?.formula;
    return f ? formatFormula(f) : id;
  };
  const monsterName = (id: string) => catalog?.monsters.find((m) => m.chemicalId === id)?.displayName ?? fmt(id);
  const doCollect = (id: string) => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    collect.mutate(id, {
      onSuccess: (body) => setResult(body),
      onError: (e) => { setResult(null); setError(expeditionError(e)); },
      onSettled: () => { busy.current = false; },
    });
  };
  return (
    <section aria-label={label} className="rounded bg-black/60 p-3 text-white">
      <ul>
        {running.map((t) => {
          const left = new Date(t.readyAt).getTime() - now;
          return (
            <li key={t.id} data-testid="trip" className="mb-1 flex items-center gap-2 text-sm">
              <span className="flex-1">{places.find((p) => p.id === t.placeId)?.name ?? t.placeId} · {fmt(t.chemicalId)}</span>
              {left > 0 ? <span>{formatRemaining(left)}</span> : (
                <button type="button" disabled={collect.isPending} onClick={() => doCollect(t.id)}>Nhận</button>
              )}
            </li>
          );
        })}
      </ul>
      {result && (
        <div data-testid="trip-result" className="mt-1 flex items-start gap-2 text-sm text-emerald-300">
          <div className="flex-1">
            <p>Nhận về: {[monsterName(result.returned.chemicalId), ...result.products.map((p) => `+${p.count} ${fmt(p.chemicalId)}`)].join(', ')}</p>
            {result.newDiscoveries.length > 0 && <p>Khám phá mới: {result.newDiscoveries.map(fmt).join(', ')}</p>}
          </div>
          <button type="button" aria-label="Ẩn kết quả" onClick={() => setResult(null)}>✕</button>
        </div>
      )}
      {error && <p role="status" className="text-sm text-amber-300">{error}</p>}
    </section>
  );
}
