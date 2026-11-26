import type { MarketOrderView, StallView } from '@chemimon/shared';
import { useEffect, useRef, useState } from 'react';
import { useCatalog, useDeliverOrder, useMarketOrders, useMe, useWorkshop } from '../api/queries';
import { formatFormula } from '../monsters/formatFormula';
import { MonsterThumb } from '../monsters/MonsterThumb';
import { ProductThumb } from '../products/ProductThumb';
import { orderError } from './orderErrors';
import { span } from './span';

const MAX_TIMEOUT_MS = 2 ** 31 - 1;
const TICK_MS = 30_000;
const SLACK_MS = 250;
const RETRY_MS = 5_000;

/** Orders tab of the market: one card per stall (open order, cooling, or empty). */
export function OrdersSection() {
  const orders = useMarketOrders();
  const me = useMe().data;
  const catalog = useCatalog().data;
  const products = useWorkshop().data?.products ?? [];
  const deliver = useDeliverOrder();
  const busy = useRef(false);
  const [, setTick] = useState(0);
  const now = Date.now(); // fresh on every render, so new data never meets a stale clock
  const [status, setStatus] = useState<string | null>(null);
  const stalls = orders.data?.stalls ?? [];
  const refetch = orders.refetch;

  // Display tick, so "Còn N phút" stays current.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(t);
  }, []);

  // Refetch once when the next readyAt/expiresAt passes, so the card refreshes without a reload.
  const times = stalls.flatMap((s) => [s.readyAt, s.order?.expiresAt]).filter((x): x is string => !!x).map((x) => new Date(x).getTime());
  const key = times.join(',');
  useEffect(() => {
    const at = Date.now();
    const next = times.filter((t) => t > at).sort((a, b) => a - b)[0];
    // Only past times left (client clock ahead of server): retry shortly; each refetch re-arms via dataUpdatedAt.
    const wait = next === undefined ? (times.length > 0 ? RETRY_MS : null) : Math.min(next - at + SLACK_MS, MAX_TIMEOUT_MS);
    if (wait === null) return;
    const t = setTimeout(() => { setTick((n) => n + 1); void refetch(); }, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refetch, orders.dataUpdatedAt]);

  const counts = new Map((me?.inventory ?? []).map((s) => [s.chemicalId, s.count]));
  const productCounts = new Map((me?.products ?? []).map((s) => [s.productId, s.count]));
  const info = (id: string) => {
    const formula = catalog?.chemicals.find((c) => c.id === id)?.formula ?? id;
    const monster = catalog?.monsters.find((m) => m.chemicalId === id);
    return { formula, monster };
  };

  const give = (o: MarketOrderView) => {
    if (busy.current) return;
    busy.current = true;
    setStatus(null);
    const f = o.productId !== undefined
      ? (products.find((p) => p.id === o.productId)?.name ?? o.productId)
      : formatFormula(info(o.chemicalId ?? '').formula);
    deliver.mutate(o.id, {
      onSuccess: () => setStatus(`Đã giao ${o.count} ${f} cho ${o.buyer}: +${o.reward} Xu`),
      onError: (e) => setStatus(orderError(e)),
      onSettled: () => { busy.current = false; },
    });
  };

  const card = (s: StallView) => {
    const o = s.order;
    const ready = s.readyAt ? new Date(s.readyAt).getTime() : null;
    return (
      <div key={s.id} data-testid="stall" role="group" aria-label={s.name} className="flex flex-col gap-2 rounded-lg bg-white/5 p-3">
        <div className="flex items-center gap-2 font-bold"><span aria-hidden="true">{s.icon}</span><span>{s.name}</span></div>
        {o && o.productId !== undefined ? (() => {
          const product = products.find((p) => p.id === o.productId);
          const name = product?.name ?? o.productId!;
          const have = productCounts.get(o.productId!) ?? 0;
          const left = new Date(o.expiresAt).getTime() - now;
          return (
            <>
              <span className="text-sm opacity-80">{o.buyer}</span>
              <div className="flex items-center gap-3">
                <ProductThumb assetKey={product?.assetKey ?? o.productId!} name={name} size={56} />
                <span className="text-sm">Cần {o.count} {name} (bạn có {have})</span>
              </div>
              <p className="text-sm italic">“{o.line}”</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-amber-300">+{o.reward} Xu</span>
                <span className="flex-1 opacity-80">{left > 0 ? `Còn ${span(left)}` : 'Đã hết hạn'}</span>
                <button type="button" disabled={have < o.count || left <= 0 || deliver.isPending} onClick={() => give(o)}
                  className="rounded bg-emerald-600 px-3 py-1 font-bold disabled:opacity-50">Giao</button>
              </div>
            </>
          );
        })() : o && o.chemicalId !== undefined ? (() => {
          const chemicalId = o.chemicalId;
          const { formula, monster } = info(chemicalId);
          const have = counts.get(chemicalId) ?? 0;
          const left = new Date(o.expiresAt).getTime() - now;
          return (
            <>
              <span className="text-sm opacity-80">{o.buyer}</span>
              <div className="flex items-center gap-3">
                <MonsterThumb assetKey={monster?.assetKey ?? chemicalId} color={monster?.color ?? '#888888'} formula={formula} size={56} />
                <span className="text-sm">Cần {o.count} {formatFormula(formula)} (bạn có {have})</span>
              </div>
              <p className="text-sm italic">“{o.line}”</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-amber-300">+{o.reward} Xu</span>
                <span className="flex-1 opacity-80">{left > 0 ? `Còn ${span(left)}` : 'Đã hết hạn'}</span>
                <button type="button" disabled={have < o.count || left <= 0 || deliver.isPending} onClick={() => give(o)}
                  className="rounded bg-emerald-600 px-3 py-1 font-bold disabled:opacity-50">Giao</button>
              </div>
            </>
          );
        })() : ready !== null ? (
          <p className="text-sm opacity-80">Đơn mới sau {span(ready - now)}</p>
        ) : (
          <p className="text-sm opacity-80">Chưa có đơn. Khám phá thêm chất nhé.</p>
        )}
      </div>
    );
  };

  return (
    <section aria-label="Đơn hàng" className="flex flex-col gap-2">
      {status && <p role="status" className="text-sm text-amber-300">{status}</p>}
      {stalls.map(card)}
    </section>
  );
}
