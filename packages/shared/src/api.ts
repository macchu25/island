import { z } from 'zod';
import { ConditionsSchema } from './conditions';
import { ConditionPricesSchema, PlaceSchema } from './economy';
import { MAX_COUNT_PER_INPUT } from './config';
import { ChemicalDefSchema, ChemicalIdSchema, MonsterDefSchema, StackCountSchema } from './domain';
import { ProductSchema } from './products';
import { exactlyOneItem, ONE_ITEM } from './orders';

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

export const ProductStackSchema = z.object({
  productId: z.string().min(1),
  count: z.number().int().nonnegative(),
});
export type ProductStack = z.infer<typeof ProductStackSchema>;

export const MeResponseSchema = z.object({
  player: z.object({ id: z.string(), email: z.string(), displayName: z.string() }),
  coins: z.number().int().nonnegative(),
  inventory: z.array(StackCountSchema),
  products: z.array(ProductStackSchema),
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
  chemicalId: ChemicalIdSchema.optional(),
  productId: z.string().min(1).optional(),
  count: z.number().int().min(1).max(99),
}).refine(exactlyOneItem, ONE_ITEM);
export type SellRequest = z.infer<typeof SellRequestSchema>;

export const SellResponseSchema = z.object({
  coins: z.number().int().nonnegative(),
  inventory: StackCountSchema.optional(),
  product: ProductStackSchema.optional(),
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
  chemicalId: ChemicalIdSchema.optional(),
  productId: z.string().min(1).optional(),
  count: z.number().int().min(1),
  reward: z.number().int().min(1),
  line: z.string(),
  expiresAt: iso,
}).refine(exactlyOneItem, ONE_ITEM);
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
  inventory: StackCountSchema.optional(),
  product: ProductStackSchema.optional(),
  stall: StallViewSchema,
}).refine((r) => (r.inventory !== undefined) !== (r.product !== undefined), {
  message: 'exactly one of inventory or product',
  path: ['inventory'],
});
export type DeliverResponse = z.infer<typeof DeliverResponseSchema>;

export const WorkshopJobViewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  status: z.enum(['running', 'collected']),
  startedAt: iso,
  readyAt: iso,
});
export type WorkshopJobView = z.infer<typeof WorkshopJobViewSchema>;

export const WorkshopResponseSchema = z.object({
  products: z.array(ProductSchema.extend({ unlocked: z.boolean() })),
  jobs: z.array(WorkshopJobViewSchema),
});
export type WorkshopResponse = z.infer<typeof WorkshopResponseSchema>;

export const WorkshopStartRequestSchema = z.object({ productId: z.string().min(1) });
export type WorkshopStartRequest = z.infer<typeof WorkshopStartRequestSchema>;

export const WorkshopStartResponseSchema = z.object({ job: WorkshopJobViewSchema });
export type WorkshopStartResponse = z.infer<typeof WorkshopStartResponseSchema>;

export const WorkshopCollectResponseSchema = z.object({ product: ProductStackSchema });
export type WorkshopCollectResponse = z.infer<typeof WorkshopCollectResponseSchema>;

export const BlueprintRequestSchema = z.object({ productId: z.string().min(1) });
export type BlueprintRequest = z.infer<typeof BlueprintRequestSchema>;

export const BlueprintResponseSchema = z.object({ productId: z.string(), coins: z.number().int().nonnegative() });
export type BlueprintResponse = z.infer<typeof BlueprintResponseSchema>;
