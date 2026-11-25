import { z } from 'zod';
import { ConditionsSchema } from './conditions';
import { MAX_COUNT_PER_INPUT } from './config';
import { ChemicalDefSchema, ChemicalIdSchema, MonsterDefSchema, StackCountSchema } from './domain';

const iso = z.iso.datetime();

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(3).max(20).regex(/^[A-Za-z0-9_]+$/),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const SessionViewSchema = z.object({
  id: z.string(),
  status: z.enum(['running', 'ready', 'collected']),
  inputs: z.array(StackCountSchema),
  conditions: ConditionsSchema,
  readyAt: iso,
});
export type SessionView = z.infer<typeof SessionViewSchema>;

export const MeResponseSchema = z.object({
  player: z.object({ id: z.string(), email: z.string(), displayName: z.string() }),
  inventory: z.array(StackCountSchema),
  sessions: z.array(SessionViewSchema),
  extractor: z.object({ nextClaimAt: iso.nullable() }),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const BreedingRequestSchema = z.object({
  inputs: z
    .array(StackCountSchema.extend({ count: z.number().int().min(1).max(MAX_COUNT_PER_INPUT) }))
    .min(1)
    .max(2),
  conditions: ConditionsSchema,
}).refine((r) => new Set(r.inputs.map((x) => x.chemicalId)).size === r.inputs.length, {
  message: 'inputs must be distinct chemicals',
  path: ['inputs'],
});
export type BreedingRequest = z.infer<typeof BreedingRequestSchema>;

export const BreedingResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('STARTED'),
    sessionId: z.string(),
    readyAt: iso,
    consumed: z.array(StackCountSchema),
  }),
  z.object({ status: z.literal('NO_REACTION') }),
]);
export type BreedingResponse = z.infer<typeof BreedingResponseSchema>;

export const CollectResponseSchema = z.object({
  products: z.array(StackCountSchema),
  newDiscoveries: z.array(ChemicalIdSchema),
  firstDiscoveries: z.array(ChemicalIdSchema),
});
export type CollectResponse = z.infer<typeof CollectResponseSchema>;

export const CatalogResponseSchema = z.object({
  chemicals: z.array(ChemicalDefSchema),
  monsters: z.array(MonsterDefSchema),
});
export type CatalogResponse = z.infer<typeof CatalogResponseSchema>;

export const CodexEntrySchema = z.object({
  chemicalId: ChemicalIdSchema,
  state: z.enum(['unknown', 'owned', 'discovered']),
  count: z.number().int().nonnegative(),
  firstDiscoverer: z.object({ displayName: z.string(), at: iso }).nullable(),
});
export type CodexEntry = z.infer<typeof CodexEntrySchema>;

export const CodexResponseSchema = z.object({ entries: z.array(CodexEntrySchema) });
export type CodexResponse = z.infer<typeof CodexResponseSchema>;

export const ExtractorClaimRequestSchema = z.object({ chemicalId: ChemicalIdSchema });
export type ExtractorClaimRequest = z.infer<typeof ExtractorClaimRequestSchema>;

export const ExtractorClaimResponseSchema = z.object({
  inventory: StackCountSchema,
  nextClaimAt: iso,
});
export type ExtractorClaimResponse = z.infer<typeof ExtractorClaimResponseSchema>;

/** One quest as the player sees it. Progress is derived on the server from existing player data. */
export const QuestViewSchema = z.object({
  id: z.string(),
  title: z.string(),
  hint: z.string(),
  progress: z.number().int().nonnegative(),
  goal: z.number().int().positive(),
  done: z.boolean(),
});
export type QuestView = z.infer<typeof QuestViewSchema>;

export const QuestsResponseSchema = z.object({ quests: z.array(QuestViewSchema) });
export type QuestsResponse = z.infer<typeof QuestsResponseSchema>;
