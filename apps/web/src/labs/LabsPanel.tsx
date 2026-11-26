import { useEffect, useRef, useState } from 'react';
import { useBuyLab, useLabs } from '../api/queries';
import { useUi } from '../state/ui';
import { labError } from './errors';

/** The experiment rooms: buy a lab or a catalyst once, to open breeding conditions. */
export function LabsPanel() {
  const items = useLabs().data?.items ?? [];
  const close = useUi((s) => s.close);
  const buy = useBuyLab();
  const inFlight = useRef(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const names = Object.fromEntries(items.map((i) => [i.id, i.name]));
  const purchase = (itemId: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus(null);
    buy.mutate({ itemId }, { onSuccess: () => setStatus(null), onError: (e) => setStatus(labError(e, names)), onSettled: () => { inFlight.current = false; } });
  };

  return (
    <div data-testid="labs-backdrop" className="absolute inset-0 z-20 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div role="dialog" aria-modal="true" aria-label="Phòng thí nghiệm"
        className="absolute inset-x-2 bottom-4 top-12 flex flex-col gap-3 overflow-auto rounded-xl bg-slate-900 p-4 text-white shadow-2xl md:inset-x-[12%]">
        <div className="flex items-center">
          <h2 className="flex-1 text-lg font-bold">Phòng thí nghiệm</h2>
          <button type="button" aria-label="Đóng" onClick={close}>✕</button>
        </div>
        {status && <p role="status" className="text-sm text-amber-300">{status}</p>}
        <section aria-label="Danh sách" className="flex flex-col gap-2">
          {items.map((i) => (
            <div key={i.id} data-testid="lab-item" className="flex flex-wrap items-center gap-3 rounded-lg bg-white/5 p-3">
              <span className="min-w-40 flex-1">
                <span className="block font-bold">{i.name}</span>
                <span className="text-xs opacity-80">{i.opens}</span>
              </span>
              {i.owned ? <span className="font-bold text-emerald-300">Đã có</span>
                : !i.useful ? <span className="opacity-70">Chưa dùng được</span>
                : <button type="button" disabled={buy.isPending} onClick={() => purchase(i.id)}
                    className="rounded bg-amber-600 px-3 py-1 font-bold disabled:opacity-50">Mua ({i.price} Xu)</button>}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
