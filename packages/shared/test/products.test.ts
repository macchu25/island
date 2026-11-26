import { describe, expect, it } from 'vitest';
import { ProductSchema, ProductsSchema, WORKSHOP_SLOTS, ERROR_CODES, MeResponseSchema, SellRequestSchema, OrderTemplateSchema, MarketOrderViewSchema, DeliverResponseSchema, WorkshopResponseSchema, WorkshopStartRequestSchema, BlueprintResponseSchema } from '../src/index';

const product = { id: 'can', name: 'Lon nhôm', ingredients: [{ chemicalId: 'al', count: 2 }], durationS: 120, blueprintPrice: 0, floorPrice: 5, line: 'đựng nước ngọt', assetKey: 'can' };
const tpl = { id: 'x', stallId: 'food', buyer: 'B', count: 1, reward: 5, line: 'abc' };
const view = { id: 'o', templateId: 'x', buyer: 'B', count: 1, reward: 5, line: 'l', expiresAt: new Date().toISOString() };

describe('products contracts', () => {
  it('constants and codes', () => {
    expect(WORKSHOP_SLOTS).toBe(2);
    for (const c of ['UNKNOWN_PRODUCT', 'BLUEPRINT_LOCKED', 'BLUEPRINT_OWNED', 'INSUFFICIENT_PRODUCTS']) expect(ERROR_CODES).toContain(c);
  });
  it('ProductSchema', () => {
    expect(ProductSchema.safeParse(product).success).toBe(true);
    expect(ProductsSchema.safeParse({ products: [product] }).success).toBe(true);
    expect(ProductSchema.safeParse({ ...product, ingredients: [] }).success).toBe(false);
    expect(ProductSchema.safeParse({ ...product, floorPrice: 0 }).success).toBe(false);
  });
  it('order template and view: exactly one item id', () => {
    expect(OrderTemplateSchema.safeParse({ ...tpl, chemicalId: 'nacl' }).success).toBe(true);
    expect(OrderTemplateSchema.safeParse({ ...tpl, productId: 'can' }).success).toBe(true);
    expect(OrderTemplateSchema.safeParse(tpl).success).toBe(false);
    expect(OrderTemplateSchema.safeParse({ ...tpl, chemicalId: 'nacl', productId: 'can' }).success).toBe(false);
    expect(MarketOrderViewSchema.safeParse({ ...view, productId: 'can' }).success).toBe(true);
    expect(MarketOrderViewSchema.safeParse(view).success).toBe(false);
    expect(MarketOrderViewSchema.safeParse({ ...view, chemicalId: 'nacl', productId: 'can' }).success).toBe(false);
  });
  it('SellRequest exactly one', () => {
    expect(SellRequestSchema.safeParse({ chemicalId: 'h2', count: 1 }).success).toBe(true);
    expect(SellRequestSchema.safeParse({ productId: 'can', count: 1 }).success).toBe(true);
    expect(SellRequestSchema.safeParse({ count: 1 }).success).toBe(false);
    expect(SellRequestSchema.safeParse({ chemicalId: 'h2', productId: 'can', count: 1 }).success).toBe(false);
  });
  it('MeResponse requires products', () => {
    const me = { player: { id: 'a', email: 'e', displayName: 'd' }, coins: 0, inventory: [], sessions: [], extractor: { nextClaimAt: null } };
    expect(MeResponseSchema.safeParse(me).success).toBe(false);
    expect(MeResponseSchema.safeParse({ ...me, products: [{ productId: 'can', count: 0 }] }).success).toBe(true);
  });
  it('DeliverResponse exactly one of inventory/product', () => {
    const stall = { id: 's', name: 'n', icon: 'i', order: null, readyAt: null };
    const base = { coins: 1, stall };
    expect(DeliverResponseSchema.safeParse({ ...base, inventory: { chemicalId: 'h2', count: 1 } }).success).toBe(true);
    expect(DeliverResponseSchema.safeParse({ ...base, product: { productId: 'can', count: 1 } }).success).toBe(true);
    expect(DeliverResponseSchema.safeParse(base).success).toBe(false);
  });
  it('workshop shapes', () => {
    const job = { id: 'j', productId: 'can', status: 'running', startedAt: new Date().toISOString(), readyAt: new Date().toISOString() };
    expect(WorkshopResponseSchema.safeParse({ products: [{ ...product, unlocked: true }], jobs: [job] }).success).toBe(true);
    expect(WorkshopStartRequestSchema.safeParse({ productId: 'can' }).success).toBe(true);
    expect(BlueprintResponseSchema.safeParse({ productId: 'can', coins: 3 }).success).toBe(true);
  });
});
