import { describe, expect, it } from 'vitest';
import { ApiErrorBodySchema, BreedingRequestSchema, RegisterRequestSchema, STARTER_ELEMENTS } from '../src/index';

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
  it('has 25 unique starters', () => {
    expect(STARTER_ELEMENTS.length).toBe(25);
    expect(new Set(STARTER_ELEMENTS).size).toBe(25);
  });
  it('parses error body', () => {
    expect(ApiErrorBodySchema.safeParse({ error: { code: 'NOT_READY', message: 'x' } }).success).toBe(true);
    expect(ApiErrorBodySchema.safeParse({ error: { code: 'NOPE', message: 'x' } }).success).toBe(false);
  });
});
