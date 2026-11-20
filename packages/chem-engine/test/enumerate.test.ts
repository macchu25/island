import { describe, expect, it } from 'vitest';
import { enumerateOutcomes } from '../src/enumerate';
import { RULES } from './fixture';

describe('enumerateOutcomes', () => {
  it('covers c+o2 grid with unique winners', () => {
    const out = enumerateOutcomes(RULES, ['c', 'o2']);
    expect(out.length).toBe(4 * 4 * 1080);
    const sets = new Set(out.map((o) => o.winners.map((w) => w.id).sort().join(',')));
    expect(sets.has('co2')).toBe(true);
    expect(sets.has('co')).toBe(true);
    expect(out.every((o) => o.winners.length <= 1)).toBe(true);
  });
  it('single input', () => {
    expect(enumerateOutcomes(RULES, ['caco3']).length).toBe(4 * 1080);
  });
});
