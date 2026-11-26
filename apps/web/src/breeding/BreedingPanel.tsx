import { MAX_COUNT_PER_INPUT, conditionFee, type BreedingRequest, type Conditions } from '@chemimon/shared';
import { useEffect, useRef, useState } from 'react';
import { useCatalog, useEconomy, useLabs, useMe } from '../api/queries';
import { formatFormula } from '../monsters/formatFormula';
import { MonsterThumb } from '../monsters/MonsterThumb';
import { useUi } from '../state/ui';
import { ConditionPicker, DEFAULT_CONDITIONS } from './ConditionPicker';
import { labError } from '../labs/errors';
import { errorMessage, useStartBreeding } from './useBreeding';

interface Slot {
  id: string;
  count: number;
}

/** One owned species as the picker shows it. */
interface Owned {
  id: string;
  name: string;
  formula: string;
  color: string;
  assetKey: string;
  count: number;
}

function SlotCard({ name, slot, info, onChange }: {
  name: 'A' | 'B';
  slot: Slot | null;
  info: Owned | undefined;
  onChange(s: Slot | null): void;
}) {
  if (!slot || !info) {
    return (
      <div data-testid={`slot-${name}`}
        className="flex h-36 w-36 flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/30 text-center text-sm opacity-80">
        <span className="text-2xl font-bold">{name}</span>
        <span>{name === 'A' ? 'Chọn quái bên dưới' : '(không bắt buộc)'}</span>
      </div>
    );
  }
  const max = Math.min(MAX_COUNT_PER_INPUT, info.count);
  return (
    <div data-testid={`slot-${name}`} className="relative flex w-36 flex-col items-center rounded-lg bg-white/10 p-2">
      <button type="button" aria-label={`Bỏ ${name}`} onClick={() => onChange(null)} className="absolute right-1 top-0">✕</button>
      <MonsterThumb assetKey={info.assetKey} color={info.color} formula={info.formula} size={72} />
      <span className="text-sm font-bold">{info.name}</span>
      <span className="text-xs opacity-80">{formatFormula(info.formula)}</span>
      <span className="mt-1 flex items-center gap-2">
        <button type="button" aria-label={`Giảm ${name}`} disabled={slot.count <= 1}
          onClick={() => onChange({ ...slot, count: slot.count - 1 })} className="rounded bg-white/10 px-2">−</button>
        <span aria-label={`Số lượng ${name}`}>{slot.count}</span>
        <button type="button" aria-label={`Tăng ${name}`} disabled={slot.count >= max}
          onClick={() => onChange({ ...slot, count: slot.count + 1 })} className="rounded bg-white/10 px-2">+</button>
      </span>
    </div>
  );
}

/** The breeding room: opened by clicking the breeding building (or the header button). */
export function BreedingPanel() {
  const me = useMe().data;
  const catalog = useCatalog().data;
  const economy = useEconomy().data;
  const prices = economy?.conditionPrices;
  const labItems = useLabs().data?.items;
  const labsReady = !!economy && !!labItems;
  const lockInfo = labItems && { names: Object.fromEntries(labItems.map((i) => [i.id, i.name])), have: new Set(labItems.filter((i) => i.owned).map((i) => i.id)) };
  const close = useUi((s) => s.close);
  const start = useStartBreeding();
  const inFlight = useRef(false);
  const [a, setA] = useState<Slot | null>(null);
  const [b, setB] = useState<Slot | null>(null);
  const [conditions, setConditions] = useState<Conditions>(DEFAULT_CONDITIONS);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const counts = new Map((me?.inventory ?? []).filter((s) => s.count > 0).map((s) => [s.chemicalId, s.count]));
  // Catalog order (elements first, then compounds), only species the player owns now.
  const owned: Owned[] = (catalog?.monsters ?? [])
    .filter((m) => counts.has(m.chemicalId))
    .map((m) => ({
      id: m.chemicalId,
      name: m.displayName,
      formula: catalog?.chemicals.find((c) => c.id === m.chemicalId)?.formula ?? m.chemicalId,
      color: m.color,
      assetKey: m.assetKey,
      count: counts.get(m.chemicalId)!,
    }));
  const infoOf = (id: string | undefined) => owned.find((o) => o.id === id);

  const clampSlot = (s: Slot | null): Slot | null => {
    if (!s) return null;
    const max = Math.min(MAX_COUNT_PER_INPUT, counts.get(s.id) ?? 0);
    return max < 1 ? null : { id: s.id, count: Math.max(1, Math.min(s.count, max)) };
  };
  const ea = clampSlot(a);
  const eb = clampSlot(b);

  // Taking A out moves B up, so a single picked species always sits in A (the request needs A).
  const removeA = () => { setA(eb); setB(null); };

  // Tap a picture: it fills the first empty slot; tap a picked one again to take it out; with both full, it replaces B.
  const pick = (id: string) => {
    setToast(null);
    if (ea?.id === id) return removeA();
    if (eb?.id === id) return setB(null);
    if (!ea) return setA({ id, count: 1 });
    setB({ id, count: 1 });
  };

  const fee = prices ? conditionFee(conditions, prices) : 0;
  const coins = me?.coins ?? 0;
  const short = Math.max(0, fee - coins);

  const submit = () => {
    if (!ea || inFlight.current) return;
    inFlight.current = true;
    setToast(null);
    const inputs = [ea, ...(eb ? [eb] : [])].map((s) => ({ chemicalId: s.id, count: s.count }));
    const req: BreedingRequest = { inputs, conditions };
    start.mutate(req, {
      onSuccess: (res) => {
        if (res.status === 'NO_REACTION') setToast('Không có phản ứng. Thử đổi điều kiện hoặc tỷ lệ.');
        else { setA(null); setB(null); close(); }
      },
      onError: (e) => setToast((e as { code?: string })?.code === 'LAB_LOCKED' ? labError(e, lockInfo?.names) : errorMessage(e)),
      onSettled: () => { inFlight.current = false; },
    });
  };

  return (
    // Dark backdrop over the island; a click on it (outside the room) closes the room.
    <div data-testid="breeding-backdrop" className="absolute inset-0 z-20 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div role="dialog" aria-modal="true" aria-label="Phòng lai tạo"
      className="absolute inset-x-2 bottom-4 top-12 flex flex-col gap-3 overflow-auto rounded-xl bg-slate-900 p-4 text-white shadow-2xl md:inset-x-[12%]">
      <div className="flex items-center">
        <h2 className="flex-1 text-lg font-bold">Phòng lai tạo</h2>
        <button type="button" aria-label="Đóng" onClick={close}>✕</button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <SlotCard name="A" slot={ea} info={infoOf(ea?.id)} onChange={(s) => (s ? setA(s) : removeA())} />
        <span className="text-2xl">+</span>
        <SlotCard name="B" slot={eb} info={infoOf(eb?.id)} onChange={setB} />
      </div>

      <section aria-label="Quái của bạn">
        <h3 className="mb-2 font-bold">Quái của bạn ({owned.length})</h3>
        {owned.length === 0 ? (
          <p className="text-sm opacity-80">Bạn chưa có quái nào. Dùng Máy chiết nguyên tố để nhận quái.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
            {owned.map((o) => {
              const picked = o.id === ea?.id || o.id === eb?.id;
              return (
                <button key={o.id} type="button" data-testid={`pick-${o.id}`} aria-pressed={picked}
                  aria-label={`${o.name} ${formatFormula(o.formula)}, có ${o.count}`} onClick={() => pick(o.id)}
                  className={`relative flex flex-col items-center rounded-lg p-1 ${picked ? 'bg-emerald-600/40 ring-2 ring-emerald-400' : 'bg-white/5 hover:bg-white/15'}`}>
                  <span className="absolute right-1 top-0.5 text-xs font-bold">×{o.count}</span>
                  <MonsterThumb assetKey={o.assetKey} color={o.color} formula={o.formula} size={72} />
                  <span className="w-full truncate text-xs font-bold">{o.name}</span>
                  <span className="text-xs opacity-80">{formatFormula(o.formula)}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <ConditionPicker value={conditions} onChange={setConditions} prices={prices} labs={economy?.labs} owned={lockInfo} />
      <p className="text-xs opacity-70">Mở thêm điều kiện ở Phòng thí nghiệm.</p>
      <div className="flex items-center gap-3">
        {prices && <span data-testid="breeding-fee" className="text-sm">Chi phí: {fee} Xu</span>}
        {short > 0 && <span className="text-sm text-red-300">Thiếu {short} Xu</span>}
        <button type="button" disabled={!ea || !prices || !labsReady || start.isPending || short > 0} onClick={submit}
          className="rounded bg-emerald-600 px-4 py-1.5 font-bold disabled:opacity-50">
          Bắt đầu
        </button>
        {toast && <p role="status" className="text-sm text-amber-300">{toast}</p>}
      </div>
    </div>
    </div>
  );
}
