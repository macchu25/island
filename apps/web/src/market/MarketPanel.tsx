import type { SellResponse } from '@chemimon/shared';
import { useEffect, useRef, useState } from 'react';
import { useCatalog, useEconomy, useMe, useSell } from '../api/queries';
import { errorMessage } from '../breeding/useBreeding';
import { formatFormula } from '../monsters/formatFormula';
import { MonsterThumb } from '../monsters/MonsterThumb';
import { useUi } from '../state/ui';

const MAX_SELL = 99;

/** The market: opened by clicking the market building (or the header button). Sells owned chemicals at the floor price. */
export function MarketPanel() {
  const me = useMe().data;
  const catalog = useCatalog().data;
  const floor = useEconomy().data?.floorPrices ?? {};
  const close = useUi((s) => s.close);
  const sell = useSell();
  const inFlight = useRef(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const counts = new Map((me?.inventory ?? []).filter((s) => s.count > 0).map((s) => [s.chemicalId, s.count]));
  const owned = (catalog?.monsters ?? []).filter((m) => counts.has(m.chemicalId)).map((m) => ({
    id: m.chemicalId,
    name: m.displayName,
    formula: catalog?.chemicals.find((c) => c.id === m.chemicalId)?.formula ?? m.chemicalId,
    color: m.color,
    assetKey: m.assetKey,
    count: counts.get(m.chemicalId)!,
  }));

  const submit = (id: string, formula: string, count: number, price: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus(null);
    sell.mutate({ chemicalId: id, count }, {
      onSuccess: (_res: SellResponse) => {
        setQty((q) => ({ ...q, [id]: 1 }));
        setStatus(`Đã bán ${count} ${formatFormula(formula)}: +${count * price} Xu`);
      },
      onError: (e) => setStatus(errorMessage(e)),
      onSettled: () => { inFlight.current = false; },
    });
  };

  return (
    <div data-testid="market-backdrop" className="absolute inset-0 z-20 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div role="dialog" aria-modal="true" aria-label="Chợ"
      className="absolute inset-x-2 bottom-4 top-12 flex flex-col gap-3 overflow-auto rounded-xl bg-slate-900 p-4 text-white shadow-2xl md:inset-x-[12%]">
      <div className="flex items-center">
        <h2 className="flex-1 text-lg font-bold">Chợ</h2>
        <button type="button" aria-label="Đóng" onClick={close}>✕</button>
      </div>
      {status && <p role="status" className="text-sm text-amber-300">{status}</p>}
      <section aria-label="Thu mua" className="flex flex-col gap-2">
        {owned.length === 0 && <p className="text-sm opacity-80">Bạn chưa có gì để bán.</p>}
        {owned.map((o) => {
          const max = Math.min(MAX_SELL, o.count);
          const n = Math.max(1, Math.min(qty[o.id] ?? 1, max));
          const price = floor[o.id] ?? 0;
          return (
            <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white/5 p-2">
              <MonsterThumb assetKey={o.assetKey} color={o.color} formula={o.formula} size={56} />
              <span className="min-w-24 flex-1">
                <span className="block text-sm font-bold">{o.name}</span>
                <span className="text-xs opacity-80">{formatFormula(o.formula)} ×{o.count}</span>
              </span>
              <span className="text-sm">{price} Xu / con</span>
              <span className="flex items-center gap-2">
                <button type="button" aria-label={`Giảm ${o.id}`} disabled={n <= 1}
                  onClick={() => setQty((q) => ({ ...q, [o.id]: n - 1 }))} className="rounded bg-white/10 px-2">−</button>
                <span aria-label={`Số lượng ${o.id}`}>{n}</span>
                <button type="button" aria-label={`Tăng ${o.id}`} disabled={n >= max}
                  onClick={() => setQty((q) => ({ ...q, [o.id]: n + 1 }))} className="rounded bg-white/10 px-2">+</button>
              </span>
              <button type="button" data-testid={`sell-${o.id}`} disabled={sell.isPending || price < 1}
                onClick={() => submit(o.id, o.formula, n, price)}
                className="rounded bg-emerald-600 px-3 py-1 font-bold disabled:opacity-50">Bán</button>
            </div>
          );
        })}
      </section>
    </div>
    </div>
  );
}
