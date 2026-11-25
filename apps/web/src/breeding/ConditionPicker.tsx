import {
  ACTIVATIONS,
  CATALYSTS,
  ENVIRONMENTS,
  PRESSURES_ATM,
  TEMPERATURES_C,
  type ConditionPrices,
  type Conditions,
} from '@chemimon/shared';

export const DEFAULT_CONDITIONS: Conditions = {
  temperatureC: 25,
  pressureAtm: 1,
  catalyst: 'none',
  environment: 'air',
  activation: 'none',
};

const VI: Record<string, string> = {
  none: 'Không', air: 'Không khí', inert: 'Khí trơ', water: 'Nước', spark: 'Tia lửa', light: 'Ánh sáng',
};
const vi = (v: string) => VI[v] ?? v;

function Group<T extends string | number>({
  label,
  values,
  value,
  fmt = String,
  price,
  onPick,
}: {
  label: string;
  values: readonly T[];
  value: T;
  fmt?: (v: T) => string;
  price?: (v: T) => number;
  onPick(v: T): void;
}) {
  return (
    <div role="group" aria-label={label} className="mb-1 flex flex-wrap items-center gap-1">
      <span className="w-24 text-xs opacity-80">{label}</span>
      {values.map((v) => (
        <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => onPick(v)}
          className={`rounded px-2 py-0.5 text-xs ${v === value ? 'bg-emerald-500 text-black' : 'bg-white/10'}`}>
          {fmt(v)}
          {price && price(v) > 0 && <span aria-hidden className="ml-1 opacity-70">· {price(v)}</span>}
        </button>
      ))}
    </div>
  );
}

export function ConditionPicker({ value, onChange, prices }: { value: Conditions; onChange(c: Conditions): void; prices?: ConditionPrices }) {
  const set = <K extends keyof Conditions>(k: K, v: Conditions[K]) => onChange({ ...value, [k]: v });
  return (
    <div>
      <Group label="Nhiệt độ" values={TEMPERATURES_C} value={value.temperatureC} fmt={(v) => `${v} °C`} price={prices && ((v) => prices.temperatureC[`${v}` as keyof ConditionPrices['temperatureC']])} onPick={(v) => set('temperatureC', v)} />
      <Group label="Áp suất" values={PRESSURES_ATM} value={value.pressureAtm} fmt={(v) => `${v} atm`} price={prices && ((v) => prices.pressureAtm[`${v}` as keyof ConditionPrices['pressureAtm']])} onPick={(v) => set('pressureAtm', v)} />
      <Group label="Xúc tác" values={CATALYSTS} value={value.catalyst} fmt={vi} price={prices && ((v) => prices.catalyst[v])} onPick={(v) => set('catalyst', v)} />
      <Group label="Môi trường" values={ENVIRONMENTS} value={value.environment} fmt={vi} price={prices && ((v) => prices.environment[v])} onPick={(v) => set('environment', v)} />
      <Group label="Kích hoạt" values={ACTIVATIONS} value={value.activation} fmt={vi} price={prices && ((v) => prices.activation[v])} onPick={(v) => set('activation', v)} />
    </div>
  );
}
