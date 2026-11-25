import { z } from 'zod';
import { ACTIVATIONS, CATALYSTS, ENVIRONMENTS, PRESSURES_ATM, TEMPERATURES_C, type Conditions } from './conditions';
import { ChemicalIdSchema } from './domain';

const price = z.number().int().nonnegative();

/** Strict record: keys must be exactly `keys`, each an integer price >= 0. */
const priceMap = <K extends string>(keys: readonly K[]) =>
  z.strictObject(Object.fromEntries(keys.map((k) => [k, price])) as Record<K, typeof price>);

export const ConditionPricesSchema = z.strictObject({
  temperatureC: priceMap(TEMPERATURES_C.map(String) as `${(typeof TEMPERATURES_C)[number]}`[]),
  pressureAtm: priceMap(PRESSURES_ATM.map(String) as `${(typeof PRESSURES_ATM)[number]}`[]),
  environment: priceMap(ENVIRONMENTS),
  activation: priceMap(ACTIVATIONS),
  catalyst: priceMap(CATALYSTS),
});
export type ConditionPrices = z.infer<typeof ConditionPricesSchema>;

export const EconomySchema = z.object({
  starterCoins: price,
  conditionPrices: ConditionPricesSchema,
  floorPrices: z.record(ChemicalIdSchema, z.number().int().min(1)),
});
export type Economy = z.infer<typeof EconomySchema>;

export function conditionFee(c: Conditions, p: ConditionPrices): number {
  return (
    p.temperatureC[String(c.temperatureC) as keyof ConditionPrices['temperatureC']] +
    p.pressureAtm[String(c.pressureAtm) as keyof ConditionPrices['pressureAtm']] +
    p.environment[c.environment] +
    p.activation[c.activation] +
    p.catalyst[c.catalyst]
  );
}
