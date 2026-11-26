import { WORKSHOP_SLOTS } from '@chemimon/shared';
import { useEffect, useRef, useState } from 'react';
import { useBuyBlueprint, useCatalog, useMe, useStartJob, useWorkshop } from '../api/queries';
import { useUi } from '../state/ui';
import { workshopError } from './errors';
import { JobList } from './JobList';
import { ProductCard } from './ProductCard';

/** The workshop: opened by clicking the workshop building (or the header button). Crafts products, buys blueprints. */
export function WorkshopPanel() {
  const me = useMe().data;
  const catalog = useCatalog().data;
  const data = useWorkshop().data;
  const close = useUi((s) => s.close);
  const start = useStartJob();
  const buy = useBuyBlueprint();
  const inFlight = useRef(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const products = data?.products ?? [];
  const running = (data?.jobs ?? []).filter((j) => j.status === 'running').length;
  const counts = new Map((me?.inventory ?? []).map((s) => [s.chemicalId, s.count]));
  const formulas = new Map((catalog?.chemicals ?? []).map((c) => [c.id, c.formula]));

  const run = (fn: (done: () => void) => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus(null);
    fn(() => { inFlight.current = false; });
  };

  return (
    <div data-testid="workshop-backdrop" className="absolute inset-0 z-20 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div role="dialog" aria-modal="true" aria-label="Xưởng chế tạo"
        className="absolute inset-x-2 bottom-4 top-12 flex flex-col gap-3 overflow-auto rounded-xl bg-slate-900 p-4 text-white shadow-2xl md:inset-x-[12%]">
        <div className="flex items-center">
          <h2 className="flex-1 text-lg font-bold">Xưởng chế tạo</h2>
          <button type="button" aria-label="Đóng" onClick={close}>✕</button>
        </div>
        {status && <p role="status" className="text-sm text-amber-300">{status}</p>}
        <JobList />
        <section aria-label="Sản phẩm" className="flex flex-col gap-2">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} formulas={formulas}
              canCraft={p.ingredients.every((i) => (counts.get(i.chemicalId) ?? 0) >= i.count)}
              slotsFull={running >= WORKSHOP_SLOTS}
              busy={start.isPending || buy.isPending}
              onStart={() => run((done) => start.mutate(p.id, {
                onError: (e) => setStatus(workshopError(e)),
                onSettled: done,
              }))}
              onBuy={() => run((done) => buy.mutate(p.id, {
                onError: (e) => setStatus(workshopError(e, { needed: p.blueprintPrice, have: me?.coins ?? 0 })),
                onSettled: done,
              }))} />
          ))}
        </section>
      </div>
    </div>
  );
}
