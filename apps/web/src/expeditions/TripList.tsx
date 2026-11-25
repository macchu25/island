import { useEffect, useRef, useState } from 'react';
import { useCatalog, useCollectExpedition, useExpeditions } from '../api/queries';
import { formatRemaining } from '../breeding/SessionList';
import { formatFormula } from '../monsters/formatFormula';
import { expeditionError } from './errors';

/** Running expedition trips: countdown, then "Nhận". Used in the dock panel and the lab's bottom-left list. */
export function TripList({ label = 'Chuyến khai thác' }: { label?: string }) {
  const trips = useExpeditions().data?.trips ?? [];
  const places = useExpeditions().data?.places ?? [];
  const catalog = useCatalog().data;
  const collect = useCollectExpedition();
  const busy = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const running = trips.filter((t) => t.status === 'running');
  if (running.length === 0) return null;
  const fmt = (id: string) => {
    const f = catalog?.chemicals.find((c) => c.id === id)?.formula;
    return f ? formatFormula(f) : id;
  };
  const doCollect = (id: string) => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    collect.mutate(id, {
      onError: (e) => setError(expeditionError(e)),
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
      {error && <p role="status" className="text-sm text-amber-300">{error}</p>}
    </section>
  );
}
