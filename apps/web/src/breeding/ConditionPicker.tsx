import {
  ACTIVATIONS,
  CATALYSTS,
  ENVIRONMENTS,
  PRESSURES_ATM,
  TEMPERATURES_C,
  type ConditionPrices,
  requiredItems,
  type Conditions,
  type Lab,
} from '@chemimon/shared';

export const DEFAULT_CONDITIONS: Conditions = {
  temperatureC: 25,
  pressureAtm: 1,
  catalyst: 'none',
  environment: 'air',
  activation: 'none',
};

const VI: Record<string, string> = {
  none: 'Không', air: 'Không khí', inert: 'Khí trơ', water: 'Nước', spark: 'Tia lửa', light: 'Ánh sáng', electric: 'Điện phân',
};
const vi = (v: string) => VI[v] ?? v;

function Group<T extends string | number>({
  label,
  values,
  value,
  fmt = String,
  price,
  lockedBy,
  onPick,
}: {
  label: string;
  values: readonly T[];
  value: T;
  fmt?: (v: T) => string;
  price?: (v: T) => number;
  /** Text for why this value is locked (lab name, or a loading note); undefined when selectable. */
  lockedBy?: (v: T) => string | undefined;
  onPick(v: T): void;
}) {
  return (
    <div role="group" aria-label={label} className="mb-1 flex flex-wrap items-center gap-1">
      <span className="w-24 text-xs opacity-80">{label}</span>
      {values.map((v) => {
        const lock = lockedBy?.(v);
        return (
        <button key={String(v)} type="button" aria-pressed={v === value} disabled={!!lock} onClick={() => onPick(v)}
          className={`rounded px-2 py-0.5 text-xs disabled:opacity-60 ${v === value ? 'bg-emerald-500 text-black' : 'bg-white/10'}`}>
          {lock && <span aria-hidden>🔒 </span>}
          {fmt(v)}
          {lock && <span className="ml-1 opacity-80">{lock}</span>}
          {price && price(v) > 0 && <span aria-hidden className="ml-1 opacity-70">· {price(v)}</span>}
        </button>
        );
      })}
    </div>
  );
}

/** The five condition rows. Until `owned` and `labs` have loaded, every non-default temperature, pressure, catalyst and activation is locked. */
export function ConditionPicker({ value, onChange, prices, labs, owned }: {
  value: Conditions;
  onChange(c: Conditions): void;
  prices?: ConditionPrices;
  labs?: Lab[];
  /** Item id to name for every lab and catalyst; owned ids are in `owned`. */
  owned?: { names: Record<string, string>; have: Set<string> };
}) {
  const lockedBy = <K extends keyof Conditions>(k: K) => (v: Conditions[K]): string | undefined => {
    if (!labs || !owned) return v === DEFAULT_CONDITIONS[k] || k === 'environment' ? undefined : 'Đang tải';
    const item = requiredItems({ ...DEFAULT_CONDITIONS, [k]: v }, labs)[0];
    return item && !owned.have.has(item) ? `Cần ${owned.names[item] ?? item}` : undefined;
  };
  const set = <K extends keyof Conditions>(k: K, v: Conditions[K]) => onChange({ ...value, [k]: v });
  return (
    <div>
      <Group label="Nhiệt độ" values={TEMPERATURES_C} value={value.temperatureC} fmt={(v) => `${v} °C`} price={prices && ((v) => prices.temperatureC[v])} lockedBy={lockedBy('temperatureC')} onPick={(v) => set('temperatureC', v)} />
      <Group label="Áp suất" values={PRESSURES_ATM} value={value.pressureAtm} fmt={(v) => `${v} atm`} price={prices && ((v) => prices.pressureAtm[v])} lockedBy={lockedBy('pressureAtm')} onPick={(v) => set('pressureAtm', v)} />
      <Group label="Xúc tác" values={CATALYSTS} value={value.catalyst} fmt={vi} price={prices && ((v) => prices.catalyst[v])} lockedBy={lockedBy('catalyst')} onPick={(v) => set('catalyst', v)} />
      <Group label="Môi trường" values={ENVIRONMENTS} value={value.environment} fmt={vi} price={prices && ((v) => prices.environment[v])} onPick={(v) => set('environment', v)} />
      <Group label="Kích hoạt" values={ACTIVATIONS} value={value.activation} fmt={vi} price={prices && ((v) => prices.activation[v])} lockedBy={lockedBy('activation')} onPick={(v) => set('activation', v)} />
    </div>
  );
}
