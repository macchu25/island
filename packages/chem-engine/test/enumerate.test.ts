import { describe, expect, it } from 'vitest';
import { enumerateOutcomes } from '../src/enumerate';
import { RULES, mkRule } from './fixture';

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

  it('collects ties into winners without throwing', () => {
    const mk = (id: string) => mkRule({ id, inputs: [{ chemicalId: 'x', coefficient: 1 }], outputs: [{ chemicalId: 'y', coefficient: 1 }] });
    const out = enumerateOutcomes([mk('a'), mk('b')], ['x']);
    expect(out.length).toBe(4 * 1080);
    expect(out.every((o) => o.winners.length === 2)).toBe(true);
  });
  it('throws on duplicate ids', () => {
    expect(() => enumerateOutcomes(RULES, ['c', 'c'])).toThrow();
  });
  it('entries do not share inputs arrays', () => {
    const out = enumerateOutcomes(RULES, ['caco3']);
    expect(out[0]!.inputs).not.toBe(out[1]!.inputs);
  });
});
