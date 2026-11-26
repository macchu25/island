import { z } from 'zod';
import { ConditionsSchema } from './conditions';
import { ConditionPricesSchema, PlaceSchema } from './economy';
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
  coins: z.number().int().nonnegative(),
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
  /** True when the player has produced this chemical by breeding (player_discoveries.bred_at is set). */
  bred: z.boolean(),
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

export const EconomyResponseSchema = z.object({
  conditionPrices: ConditionPricesSchema,
  floorPrices: z.record(ChemicalIdSchema, z.number().int().min(1)),
});
export type EconomyResponse = z.infer<typeof EconomyResponseSchema>;

export const SellRequestSchema = z.object({
  chemicalId: ChemicalIdSchema,
  count: z.number().int().min(1).max(99),
});
export type SellRequest = z.infer<typeof SellRequestSchema>;

export const SellResponseSchema = z.object({
  coins: z.number().int().nonnegative(),
  inventory: StackCountSchema,
});
export type SellResponse = z.infer<typeof SellResponseSchema>;

export const DISCOVERY_SOURCES = ['starter', 'extractor', 'expedition', 'breeding'] as const;
export type DiscoverySource = (typeof DISCOVERY_SOURCES)[number];

export const ExpeditionViewSchema = z.object({
  id: z.string(),
  placeId: z.string(),
  chemicalId: ChemicalIdSchema,
  status: z.enum(['running', 'collected']),
  startedAt: iso,
  readyAt: iso,
  result: z.array(StackCountSchema),
});
export type ExpeditionView = z.infer<typeof ExpeditionViewSchema>;

export const ExpeditionsResponseSchema = z.object({
  places: z.array(PlaceSchema.extend({ unlocked: z.boolean() })),
  trips: z.array(ExpeditionViewSchema),
});
export type ExpeditionsResponse = z.infer<typeof ExpeditionsResponseSchema>;

export const ExpeditionStartRequestSchema = z.object({ placeId: z.string().min(1), chemicalId: ChemicalIdSchema });
export type ExpeditionStartRequest = z.infer<typeof ExpeditionStartRequestSchema>;

export const ExpeditionStartResponseSchema = z.object({
  trip: ExpeditionViewSchema,
  coins: z.number().int().nonnegative(),
});
export type ExpeditionStartResponse = z.infer<typeof ExpeditionStartResponseSchema>;

export const ExpeditionCollectResponseSchema = z.object({
  returned: StackCountSchema,
  products: z.array(StackCountSchema),
  newDiscoveries: z.array(ChemicalIdSchema),
});
export type ExpeditionCollectResponse = z.infer<typeof ExpeditionCollectResponseSchema>;

export const PermitRequestSchema = z.object({ placeId: z.string().min(1) });
export type PermitRequest = z.infer<typeof PermitRequestSchema>;

export const PermitResponseSchema = z.object({ placeId: z.string(), coins: z.number().int().nonnegative() });
export type PermitResponse = z.infer<typeof PermitResponseSchema>;

export const MarketOrderViewSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  buyer: z.string(),
  chemicalId: ChemicalIdSchema,
  count: z.number().int().min(1),
  reward: z.number().int().min(1),
  line: z.string(),
  expiresAt: iso,
});
export type MarketOrderView = z.infer<typeof MarketOrderViewSchema>;

export const StallViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  order: MarketOrderViewSchema.nullable(),
  readyAt: iso.nullable(),
});
export type StallView = z.infer<typeof StallViewSchema>;

export const MarketOrdersResponseSchema = z.object({ stalls: z.array(StallViewSchema) });
export type MarketOrdersResponse = z.infer<typeof MarketOrdersResponseSchema>;

export const DeliverResponseSchema = z.object({
  coins: z.number().int().nonnegative(),
  inventory: StackCountSchema,
  stall: StallViewSchema,
});
export type DeliverResponse = z.infer<typeof DeliverResponseSchema>;
