import { z } from 'zod';
import { ChemicalIdSchema } from './domain';

/** True when exactly one of chemicalId / productId is set. */
const exactlyOneItem = (o: { chemicalId?: unknown; productId?: unknown }) => (o.chemicalId !== undefined) !== (o.productId !== undefined);
const ONE_ITEM = { message: 'exactly one of chemicalId or productId', path: ['chemicalId'] };

export { exactlyOneItem, ONE_ITEM };

export const StallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
});
export type Stall = z.infer<typeof StallSchema>;

export const OrderTemplateSchema = z.object({
  id: z.string().min(1),
  stallId: z.string().min(1),
  buyer: z.string().min(1),
  chemicalId: ChemicalIdSchema.optional(),
  productId: z.string().min(1).optional(),
  count: z.number().int().min(1),
  reward: z.number().int().min(1),
  line: z.string().min(1).max(80),
}).refine(exactlyOneItem, ONE_ITEM);
export type OrderTemplate = z.infer<typeof OrderTemplateSchema>;

export const BuyersSchema = z.object({
  orderCooldownS: z.number().int().min(1),
  orderLifetimeS: z.number().int().min(1),
  stalls: z.array(StallSchema).min(1),
  orders: z.array(OrderTemplateSchema),
});
export type Buyers = z.infer<typeof BuyersSchema>;

/** FNV-1a 32-bit over UTF-8 bytes, unsigned. */
export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(s)) {
    h ^= b;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic pick: sort a copy by id, index = fnv1a32(key) % length. */
export function pickTemplate(eligible: readonly OrderTemplate[], key: string): OrderTemplate | null {
  if (eligible.length === 0) return null;
  const sorted = [...eligible].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return sorted[fnv1a32(key) % sorted.length]!;
}

export function orderKey(playerId: string, stallId: string, delivered: number, openedAt: Date, lifetimeS: number): string {
  return `${playerId}|${stallId}|${delivered}|${Math.floor(openedAt.getTime() / 1000 / lifetimeS)}`;
}
