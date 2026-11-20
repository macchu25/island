import { describe, expect, it } from 'vitest';
import { ConditionsSchema } from '../src/conditions';

const ok = { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'spark' };
describe('ConditionsSchema', () => {
  it('accepts a valid grid value', () => {
    expect(ConditionsSchema.safeParse(ok).success).toBe(true);
  });
  it('rejects off-grid temperature', () => {
    expect(ConditionsSchema.safeParse({ ...ok, temperatureC: 30 }).success).toBe(false);
  });
  it('rejects unknown catalyst', () => {
    expect(ConditionsSchema.safeParse({ ...ok, catalyst: 'Ni' }).success).toBe(false);
  });
});
