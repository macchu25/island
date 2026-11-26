import { describe, expect, it } from 'vitest';
import { DeliverResponseSchema, MarketOrderViewSchema, StallViewSchema, ApiErrorBodySchema, BreedingRequestSchema, RegisterRequestSchema, STARTER_ELEMENTS, EXTRACTOR_ELEMENTS, EXPEDITION_SLOTS } from '../src/index';

const conditions = { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'none' };
const req = (inputs: unknown) => BreedingRequestSchema.safeParse({ inputs, conditions });

describe('BreedingRequestSchema', () => {
  it('accepts two distinct inputs', () => {
    expect(req([{ chemicalId: 'h2', count: 2 }, { chemicalId: 'o2', count: 1 }]).success).toBe(true);
  });
  it('rejects the same id twice', () => {
    const r = req([{ chemicalId: 'h2', count: 1 }, { chemicalId: 'h2', count: 1 }]);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]!.path).toEqual(['inputs']);
  });
  it('rejects count 0 and 5', () => {
    expect(req([{ chemicalId: 'h2', count: 0 }]).success).toBe(false);
    expect(req([{ chemicalId: 'h2', count: 5 }]).success).toBe(false);
  });
  it('rejects 3 inputs and empty inputs', () => {
    expect(req([{ chemicalId: 'a', count: 1 }, { chemicalId: 'b', count: 1 }, { chemicalId: 'c', count: 1 }]).success).toBe(false);
    expect(req([]).success).toBe(false);
  });
});

describe('RegisterRequestSchema', () => {
  const base = { email: 'a@b.co', password: 'password1', displayName: 'abc_1' };
  it('accepts valid', () => expect(RegisterRequestSchema.safeParse(base).success).toBe(true));
  it('rejects displayName with space', () =>
    expect(RegisterRequestSchema.safeParse({ ...base, displayName: 'a b' }).success).toBe(false));
});

describe('config and errors', () => {
  it('STARTER_ELEMENTS is the 6', () => {
    expect([...STARTER_ELEMENTS]).toEqual(['h2', 'o2', 'c', 'n2', 'na', 'cl2']);
  });
  it('EXTRACTOR_ELEMENTS has 16 and excludes he ne ar si s8 fe cu ag au', () => {
    expect(EXTRACTOR_ELEMENTS.length).toBe(16);
    expect(new Set(EXTRACTOR_ELEMENTS).size).toBe(16);
    for (const e of ['he', 'ne', 'ar', 'si', 's8', 'fe', 'cu', 'ag', 'au']) expect(EXTRACTOR_ELEMENTS as readonly string[]).not.toContain(e);
    expect(EXPEDITION_SLOTS).toBe(2);
  });
  it('new error codes parse', () => {
    for (const code of ['UNKNOWN_PLACE', 'PLACE_LOCKED', 'PERMIT_OWNED'])
      expect(ApiErrorBodySchema.safeParse({ error: { code, message: 'x' } }).success).toBe(true);
  });
  it('parses error body', () => {
    expect(ApiErrorBodySchema.safeParse({ error: { code: 'NOT_READY', message: 'x' } }).success).toBe(true);
    expect(ApiErrorBodySchema.safeParse({ error: { code: 'NOPE', message: 'x' } }).success).toBe(false);
  });
});

describe('market view schemas', () => {
  const order = { id: 'o1', templateId: 'pho-nacl', buyer: 'Quán phở', chemicalId: 'nacl', count: 4, reward: 15, line: 'nêm món ăn', expiresAt: '2026-11-26T12:00:00.000Z' };
  const stall = { id: 'food', name: 'Phố ẩm thực', icon: '🍜' };
  it('parses a stall with an order', () => {
    expect(StallViewSchema.safeParse({ ...stall, order, readyAt: null }).success).toBe(true);
  });
  it('parses a stall with no order and readyAt', () => {
    expect(StallViewSchema.safeParse({ ...stall, order: null, readyAt: '2026-11-26T12:30:00.000Z' }).success).toBe(true);
  });
  it('rejects order with count 0 or missing line', () => {
    expect(MarketOrderViewSchema.safeParse({ ...order, count: 0 }).success).toBe(false);
    const { line: _l, ...noLine } = order;
    expect(MarketOrderViewSchema.safeParse(noLine).success).toBe(false);
  });
  it('parses a deliver response', () => {
    const r = DeliverResponseSchema.safeParse({ coins: 40, inventory: { chemicalId: 'nacl', count: 2 }, stall: { ...stall, order: null, readyAt: '2026-11-26T12:30:00.000Z' } });
    expect(r.success).toBe(true);
  });
});
