import { useEffect, useRef, useState } from 'react';
import { useBuyPermit, useCatalog, useExpeditions, useMe, useStartExpedition } from '../api/queries';
import { useUi } from '../state/ui';
import { expeditionError } from './errors';
import { PlaceCard, type OwnedMonster } from './PlaceCard';
import { TripList } from './TripList';

/** The dock: opened by clicking the dock building (or the header button). Sends monsters to places, buys permits, collects trips. */
export function ExpeditionPanel() {
  const me = useMe().data;
  const catalog = useCatalog().data;
  const places = useExpeditions().data?.places ?? [];
  const close = useUi((s) => s.close);
  const start = useStartExpedition();
  const permit = useBuyPermit();
  const inFlight = useRef(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const counts = new Map((me?.inventory ?? []).filter((s) => s.count > 0).map((s) => [s.chemicalId, s.count]));
  const owned: OwnedMonster[] = (catalog?.monsters ?? []).filter((m) => counts.has(m.chemicalId)).map((m) => ({
    id: m.chemicalId,
    name: m.displayName,
    formula: catalog?.chemicals.find((c) => c.id === m.chemicalId)?.formula ?? m.chemicalId,
    color: m.color,
    assetKey: m.assetKey,
    count: counts.get(m.chemicalId)!,
  }));

  const run = (fn: (done: () => void) => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus(null);
    fn(() => { inFlight.current = false; });
  };
  const send = (placeId: string, chemicalId: string) => run((done) =>
    start.mutate({ placeId, chemicalId }, {
      onSuccess: () => setPicking(null),
      onError: (e) => setStatus(expeditionError(e)),
      onSettled: done,
    }));
  const buy = (placeId: string) => run((done) =>
    permit.mutate({ placeId }, { onError: (e) => setStatus(expeditionError(e)), onSettled: done }));

  return (
    <div data-testid="expedition-backdrop" className="absolute inset-0 z-20 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div role="dialog" aria-modal="true" aria-label="Bến khai thác"
      className="absolute inset-x-2 bottom-4 top-12 flex flex-col gap-3 overflow-auto rounded-xl bg-slate-900 p-4 text-white shadow-2xl md:inset-x-[12%]">
      <div className="flex items-center">
        <h2 className="flex-1 text-lg font-bold">Bến khai thác</h2>
        <button type="button" aria-label="Đóng" onClick={close}>✕</button>
      </div>
      {status && <p role="status" className="text-sm text-amber-300">{status}</p>}
      <TripList />
      <section aria-label="Nơi khai thác" className="flex flex-col gap-2">
        {places.map((p) => (
          <PlaceCard key={p.id} place={p} unlocked={p.unlocked} picking={picking === p.id} owned={owned} catalog={catalog}
            busy={start.isPending || permit.isPending}
            onTogglePicker={() => setPicking(picking === p.id ? null : p.id)}
            onPick={(id) => send(p.id, id)} onBuyPermit={() => buy(p.id)} />
        ))}
      </section>
    </div>
    </div>
  );
}
