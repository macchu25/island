import {
  ACTIVATIONS, CATALYSTS, ENVIRONMENTS, MAX_COUNT_PER_INPUT, PRESSURES_ATM, TEMPERATURES_C,
  type Conditions, type ReactionDef, type StackCount,
} from '@chemimon/shared';
import { topMatches } from './resolve';

export type Outcome = { inputs: StackCount[]; conditions: Conditions; winners: ReactionDef[] };

export function enumerateOutcomes(rules: ReactionDef[], inputIds: string[]): Outcome[] {
  if (inputIds.length < 1 || inputIds.length > 2) throw new Error('inputIds must have length 1 or 2');
  const ids = [...inputIds].sort();
  const counts = Array.from({ length: MAX_COUNT_PER_INPUT }, (_, i) => i + 1);
  const combos: StackCount[][] =
    ids.length === 1
      ? counts.map((a) => [{ chemicalId: ids[0]!, count: a }])
      : counts.flatMap((a) => counts.map((b) => [{ chemicalId: ids[0]!, count: a }, { chemicalId: ids[1]!, count: b }]));
  const out: Outcome[] = [];
  for (const inputs of combos)
    for (const temperatureC of TEMPERATURES_C)
      for (const pressureAtm of PRESSURES_ATM)
        for (const catalyst of CATALYSTS)
          for (const environment of ENVIRONMENTS)
            for (const activation of ACTIVATIONS) {
              const conditions: Conditions = { temperatureC, pressureAtm, catalyst, environment, activation };
              out.push({ inputs, conditions, winners: topMatches(rules, inputs, conditions) });
            }
  return out;
}
