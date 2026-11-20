import { z } from 'zod';
import { ActivationSchema, CatalystSchema, EnvironmentSchema } from './conditions';

export const ChemicalIdSchema = z.string().min(1);
export type ChemicalId = z.infer<typeof ChemicalIdSchema>;

export const ChemicalDefSchema = z.object({
  id: ChemicalIdSchema,
  formula: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['element', 'compound']),
  atomicNumber: z.number().int().positive().optional(),
  group: z.number().int().positive().optional(),
  period: z.number().int().positive().optional(),
  phaseAt25C: z.enum(['solid', 'liquid', 'gas']),
  family: z.string().min(1),
});
export type ChemicalDef = z.infer<typeof ChemicalDefSchema>;

export const SilhouetteSchema = z.enum(['cloud', 'block', 'orb', 'spiky', 'crystal', 'fused']);
export type Silhouette = z.infer<typeof SilhouetteSchema>;

export const RaritySchema = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']);
export type Rarity = z.infer<typeof RaritySchema>;

export const MonsterDefSchema = z.object({
  id: z.string().min(1),
  chemicalId: ChemicalIdSchema,
  displayName: z.string().min(1),
  rarity: RaritySchema,
  silhouette: SilhouetteSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  assetKey: z.string().min(1),
  blurb: z.string(),
});
export type MonsterDef = z.infer<typeof MonsterDefSchema>;

export const RangeSchema = z.object({ min: z.number(), max: z.number() });
export type Range = z.infer<typeof RangeSchema>;

export const RuleConditionsSchema = z.object({
  temperatureC: RangeSchema.optional(),
  pressureAtm: RangeSchema.optional(),
  catalyst: z.array(CatalystSchema).optional(),
  environment: z.array(EnvironmentSchema).optional(),
  activation: ActivationSchema.optional(),
});
export type RuleConditions = z.infer<typeof RuleConditionsSchema>;

const ReactionTermSchema = z.object({
  chemicalId: ChemicalIdSchema,
  coefficient: z.number().int().positive(),
});

export const ReactionDefSchema = z.object({
  id: z.string().min(1),
  inputs: z.array(ReactionTermSchema).min(1).max(2),
  outputs: z.array(ReactionTermSchema).min(1),
  ratio: RangeSchema.optional(),
  conditions: RuleConditionsSchema,
  priority: z.number(),
  durationS: z.number().nonnegative(),
  source: z.string(),
  reviewed: z.boolean(),
});
export type ReactionDef = z.infer<typeof ReactionDefSchema>;

export const CatalogSchema = z.object({
  chemicals: z.array(ChemicalDefSchema),
  monsters: z.array(MonsterDefSchema),
  reactions: z.array(ReactionDefSchema),
});
export type Catalog = z.infer<typeof CatalogSchema>;

export const StackCountSchema = z.object({
  chemicalId: ChemicalIdSchema,
  count: z.number().int().nonnegative(),
});
export type StackCount = z.infer<typeof StackCountSchema>;
