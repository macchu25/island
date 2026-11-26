import { z } from 'zod';
import { ACTIVATIONS, CATALYSTS, ENVIRONMENTS, PRESSURES_ATM, TEMPERATURES_C, ActivationSchema, PressureSchema, TemperatureSchema, type Catalyst, type Conditions } from './conditions';
import { ChemicalIdSchema, type StackCount } from './domain';
import { HABITAT_IDS, type HabitatId } from './habitat';

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

export const PlaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  drops: z.array(z.object({ chemicalId: ChemicalIdSchema, count: z.number().int().min(1) })).min(1),
  durationS: z.number().int().min(1),
  fee: price,
  permitPrice: price,
  bonusHabitat: z.enum(HABITAT_IDS),
});
export type Place = z.infer<typeof PlaceSchema>;

export const LabSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  unlocks: z.object({
    temperatureC: z.array(TemperatureSchema).optional(),
    pressureAtm: z.array(PressureSchema).optional(),
    activation: z.array(ActivationSchema).optional(),
  }),
  price: z.number().int().min(1),
});
export type Lab = z.infer<typeof LabSchema>;

const NON_FREE_CATALYSTS = CATALYSTS.filter((c): c is Exclude<Catalyst, 'none'> => c !== 'none');
export const CatalystPricesSchema = z.strictObject(
  Object.fromEntries(NON_FREE_CATALYSTS.map((k) => [k, z.number().int().min(1)])) as Record<Exclude<Catalyst, 'none'>, z.ZodNumber>,
);

export const EconomySchema = z.object({
  starterCoins: price,
  conditionPrices: ConditionPricesSchema,
  floorPrices: z.record(ChemicalIdSchema, z.number().int().min(1)),
  places: z.array(PlaceSchema),
  labs: z.array(LabSchema),
  catalystPrices: CatalystPricesSchema,
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

/** Drops of one trip, in the place's declared order. +50% (rounded down) when the monster's habitat matches. */
export function expeditionYield(place: Place, monsterHabitat: HabitatId): StackCount[] {
  const bonus = monsterHabitat === place.bonusHabitat;
  return place.drops.map((d) => ({ chemicalId: d.chemicalId, count: bonus ? Math.floor((d.count * 3) / 2) : d.count }));
}
