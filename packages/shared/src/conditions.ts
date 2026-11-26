import { z } from 'zod';

export const TEMPERATURES_C = [-78, 25, 200, 450, 1000, 2500] as const;
export const PRESSURES_ATM = [1, 10, 100, 200] as const;
export const CATALYSTS = ['none', 'Fe', 'Pt', 'V2O5', 'MnO2'] as const;
export const ENVIRONMENTS = ['air', 'inert', 'water'] as const;
export const ACTIVATIONS = ['none', 'spark', 'light', 'electric'] as const;

export type Temperature = (typeof TEMPERATURES_C)[number];
export type Pressure = (typeof PRESSURES_ATM)[number];
export type Catalyst = (typeof CATALYSTS)[number];
export type Environment = (typeof ENVIRONMENTS)[number];
export type Activation = (typeof ACTIVATIONS)[number];

const numLiterals = <T extends readonly [number, ...number[]]>(vals: T) =>
  z.union(vals.map((v) => z.literal(v)) as unknown as [z.ZodLiteral<number>, z.ZodLiteral<number>, ...z.ZodLiteral<number>[]]) as unknown as z.ZodType<T[number]>;

export const TemperatureSchema = numLiterals(TEMPERATURES_C);
export const PressureSchema = numLiterals(PRESSURES_ATM);
export const CatalystSchema = z.enum(CATALYSTS);
export const EnvironmentSchema = z.enum(ENVIRONMENTS);
export const ActivationSchema = z.enum(ACTIVATIONS);

export const ConditionsSchema = z.object({
  temperatureC: TemperatureSchema,
  pressureAtm: PressureSchema,
  catalyst: CatalystSchema,
  environment: EnvironmentSchema,
  activation: ActivationSchema,
});
export type Conditions = z.infer<typeof ConditionsSchema>;
