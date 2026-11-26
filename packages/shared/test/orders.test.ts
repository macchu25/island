import { describe, expect, it } from 'vitest';
import { BuyersSchema, fnv1a32, orderKey, pickTemplate, MarketOrdersResponseSchema, ERROR_CODES, type OrderTemplate } from '../src/index';

const t = (id: string): OrderTemplate => ({ id, stallId: 'food', buyer: 'B', chemicalId: 'nacl', count: 1, reward: 5, line: 'nêm món ăn' });
const stall = { id: 'food', name: 'Phố ẩm thực', icon: '🍜' };
const buyers = (o: Partial<OrderTemplate> = {}) => ({ orderCooldownS: 1800, orderLifetimeS: 14400, stalls: [stall], orders: [{ ...t('a'), ...o }] });

describe('fnv1a32', () => {
  it('matches standard vectors', () => {
    expect(fnv1a32('')).toBe(2166136261);
    expect(fnv1a32('a')).toBe(0xe40c292c);
  });
});

describe('pickTemplate', () => {
  it('is order independent and does not mutate input', () => {
    const list = ['c', 'a', 'd', 'b', 'e'].map(t);
    const copy = [...list];
    const rev = [...list].reverse();
    expect(pickTemplate(list, 'k1')!.id).toBe(pickTemplate(rev, 'k1')!.id);
    expect(list).toEqual(copy);
  });
  it('returns null when empty', () => expect(pickTemplate([], 'k')).toBeNull());
});

describe('orderKey', () => {
  it('uses floor(epochS / lifetimeS)', () => {
    const a = new Date(0 * 1000 + 14400 * 1000 * 5);
    const b = new Date(a.getTime() + 3 * 3600 * 1000);
    const c = new Date(a.getTime() + 4 * 3600 * 1000);
    expect(orderKey('p', 's', 2, a, 14400)).toBe('p|s|2|5');
    expect(orderKey('p', 's', 2, b, 14400)).toBe(orderKey('p', 's', 2, a, 14400));
    expect(orderKey('p', 's', 2, c, 14400)).toBe('p|s|2|6');
  });
});

describe('BuyersSchema', () => {
  it('accepts valid', () => expect(BuyersSchema.safeParse(buyers()).success).toBe(true));
  it('rejects 81 char line', () => expect(BuyersSchema.safeParse(buyers({ line: 'x'.repeat(81) })).success).toBe(false));
  it('rejects count 0', () => expect(BuyersSchema.safeParse(buyers({ count: 0 })).success).toBe(false));
});

describe('market views', () => {
  it('parses response and has error codes', () => {
    const r = MarketOrdersResponseSchema.safeParse({ stalls: [{ ...stall, order: null, readyAt: null }] });
    expect(r.success).toBe(true);
    for (const c of ['UNKNOWN_ORDER', 'ORDER_CLOSED', 'ORDER_EXPIRED']) expect(ERROR_CODES).toContain(c);
  });
});
