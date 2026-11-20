import {
  ACTIVATIONS,
  CATALYSTS,
  ENVIRONMENTS,
  PRESSURES_ATM,
  TEMPERATURES_C,
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
  onPick,
}: {
  label: string;
  values: readonly T[];
  value: T;
  fmt?: (v: T) => string;
  onPick(v: T): void;
}) {
  return (
    <div role="group" aria-label={label} className="mb-1 flex flex-wrap items-center gap-1">
      <span className="w-24 text-xs opacity-80">{label}</span>
      {values.map((v) => (
        <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => onPick(v)}
          className={`rounded px-2 py-0.5 text-xs ${v === value ? 'bg-emerald-500 text-black' : 'bg-white/10'}`}>
          {fmt(v)}
        </button>
      ))}
    </div>
  );
}

export function ConditionPicker({ value, onChange }: { value: Conditions; onChange(c: Conditions): void }) {
  const set = <K extends keyof Conditions>(k: K, v: Conditions[K]) => onChange({ ...value, [k]: v });
  return (
    <div>
      <Group label="Nhiệt độ" values={TEMPERATURES_C} value={value.temperatureC} fmt={(v) => `${v} °C`} onPick={(v) => set('temperatureC', v)} />
      <Group label="Áp suất" values={PRESSURES_ATM} value={value.pressureAtm} fmt={(v) => `${v} atm`} onPick={(v) => set('pressureAtm', v)} />
      <Group label="Xúc tác" values={CATALYSTS} value={value.catalyst} fmt={vi} onPick={(v) => set('catalyst', v)} />
      <Group label="Môi trường" values={ENVIRONMENTS} value={value.environment} fmt={vi} onPick={(v) => set('environment', v)} />
      <Group label="Kích hoạt" values={ACTIVATIONS} value={value.activation} fmt={vi} onPick={(v) => set('activation', v)} />
    </div>
  );
}
