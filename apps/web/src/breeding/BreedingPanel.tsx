import { MAX_COUNT_PER_INPUT, type BreedingRequest, type Conditions } from '@chemimon/shared';
import { useRef, useState } from 'react';
import { useCatalog, useMe } from '../api/queries';
import { formatFormula } from '../monsters/formatFormula';
import { ConditionPicker, DEFAULT_CONDITIONS } from './ConditionPicker';
import { errorMessage, useStartBreeding } from './useBreeding';

interface Slot {
  id: string;
  count: number;
}

function SlotPicker({
  name, slot, options, ownedOf, onChange,
}: {
  name: string;
  slot: Slot | null;
  options: { id: string; label: string }[];
  ownedOf(id: string): number;
  onChange(s: Slot | null): void;
}) {
  const max = slot ? Math.min(MAX_COUNT_PER_INPUT, ownedOf(slot.id)) : 0;
  return (
    <div className="mb-2 flex items-center gap-2">
      <select aria-label={`Chất ${name}`} value={slot?.id ?? ''} className="bg-black/40 text-white"
        onChange={(e) => onChange(e.target.value ? { id: e.target.value, count: 1 } : null)}>
        <option value="">{name === 'B' ? '(trống)' : '— chọn —'}</option>
        {options.map((o) => (<option key={o.id} value={o.id}>{o.label} ({ownedOf(o.id)})</option>))}
      </select>
      {slot && (
        <span className="flex items-center gap-1">
          <button type="button" aria-label={`Giảm ${name}`} disabled={slot.count <= 1} onClick={() => onChange({ ...slot, count: slot.count - 1 })}>−</button>
          <span aria-label={`Số lượng ${name}`}>{slot.count}</span>
          <button type="button" aria-label={`Tăng ${name}`} disabled={slot.count >= max} onClick={() => onChange({ ...slot, count: slot.count + 1 })}>+</button>
        </span>
      )}
    </div>
  );
}

export function BreedingPanel() {
  const me = useMe().data;
  const catalog = useCatalog().data;
  const start = useStartBreeding();
  const inFlight = useRef(false);
  const [a, setA] = useState<Slot | null>(null);
  const [b, setB] = useState<Slot | null>(null);
  const [conditions, setConditions] = useState<Conditions>(DEFAULT_CONDITIONS);
  const [toast, setToast] = useState<string | null>(null);

  const owned = new Map((me?.inventory ?? []).filter((s) => s.count > 0).map((s) => [s.chemicalId, s.count]));
  const ownedOf = (id: string) => owned.get(id) ?? 0;
  const options = [...owned.keys()]
    .filter((id) => catalog?.monsters.some((m) => m.chemicalId === id))
    .sort()
    .map((id) => {
      const f = catalog?.chemicals.find((c) => c.id === id)?.formula;
      return { id, label: f ? formatFormula(f) : id };
    });

  const clampSlot = (s: Slot | null): Slot | null => {
    if (!s) return null;
    const max = Math.min(MAX_COUNT_PER_INPUT, ownedOf(s.id));
    return max < 1 ? null : { id: s.id, count: Math.max(1, Math.min(s.count, max)) };
  };
  const ea = clampSlot(a);
  const eb = clampSlot(b);

  const submit = () => {
    if (!ea || inFlight.current) return;
    inFlight.current = true;
    setToast(null);
    const inputs = [ea, ...(eb ? [eb] : [])].map((s) => ({ chemicalId: s.id, count: s.count }));
    const req: BreedingRequest = { inputs, conditions };
    start.mutate(req, {
      onSuccess: (res) => {
        if (res.status === 'NO_REACTION') setToast('Không có phản ứng. Thử đổi điều kiện hoặc tỷ lệ.');
        else { setA(null); setB(null); }
      },
      onError: (e) => setToast(errorMessage(e)),
      onSettled: () => { inFlight.current = false; },
    });
  };

  return (
    <section aria-label="Lai tạo" className="w-80 rounded bg-black/60 p-3 text-white">
      <h2 className="mb-2 font-bold">Lai tạo</h2>
      <SlotPicker name="A" slot={ea} options={options.filter((o) => o.id !== eb?.id)} ownedOf={ownedOf}
        onChange={setA} />
      <SlotPicker name="B" slot={eb} options={options.filter((o) => o.id !== ea?.id)} ownedOf={ownedOf}
        onChange={setB} />
      <ConditionPicker value={conditions} onChange={setConditions} />
      <button type="button" disabled={!ea || start.isPending} onClick={submit} className="mt-2 rounded bg-emerald-600 px-3 py-1">
        Bắt đầu
      </button>
      {toast && <p role="status" className="mt-2 text-sm text-amber-300">{toast}</p>}
    </section>
  );
}
