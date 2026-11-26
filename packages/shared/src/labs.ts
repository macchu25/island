import type { Conditions } from './conditions';
import { CATALYSTS, PRESSURES_ATM, TEMPERATURES_C } from './conditions';
import type { ReactionDef } from './domain';
import type { Lab } from './economy';

type Range = { min: number; max: number } | undefined;
const inRange = (v: number, r: Range) => !r || (v >= r.min && v <= r.max);

export const catalystItemId = (c: string): string => `catalyst:${c}`;

function labFor(labs: Lab[], key: 'temperatureC' | 'pressureAtm' | 'activation', v: number | string): string | undefined {
  return labs.find((l) => (l.unlocks[key] as (number | string)[] | undefined)?.includes(v))?.id;
}

/** Items a player must own to run these conditions, ordered: temperature, pressure, activation, catalyst. */
export function requiredItems(c: Conditions, labs: Lab[]): string[] {
  const out: string[] = [];
  for (const id of [labFor(labs, 'temperatureC', c.temperatureC), labFor(labs, 'pressureAtm', c.pressureAtm), labFor(labs, 'activation', c.activation)]) {
    if (id && !out.includes(id)) out.push(id);
  }
  if (c.catalyst !== 'none') out.push(catalystItemId(c.catalyst));
  return out;
}

/** Items that at least one rule can only match with (its allowed values all lie in one lab's unlocks, or it lists the catalyst). */
export function usefulItems(reactions: readonly ReactionDef[], labs: Lab[]): Set<string> {
  const useful = new Set<string>();
  for (const r of reactions) {
    const rc = r.conditions;
    const temps: readonly number[] = TEMPERATURES_C.filter((v) => inRange(v, rc.temperatureC));
    const press: readonly number[] = PRESSURES_ATM.filter((v) => inRange(v, rc.pressureAtm));
    for (const lab of labs) {
      const covers = (allowed: readonly (number | string)[], unlocks: readonly (number | string)[] | undefined) =>
        unlocks !== undefined && allowed.length > 0 && allowed.every((v) => unlocks.includes(v));
      if (
        (rc.temperatureC && covers(temps, lab.unlocks.temperatureC)) ||
        (rc.pressureAtm && covers(press, lab.unlocks.pressureAtm)) ||
        (rc.activation && covers([rc.activation], lab.unlocks.activation))
      ) useful.add(lab.id);
    }
    if (rc.catalyst && !rc.catalyst.includes('none')) for (const k of rc.catalyst) if (CATALYSTS.includes(k)) useful.add(catalystItemId(k));
  }
  return useful;
}
