import { describe, expect, it } from 'vitest';
import { habitatFor, HABITAT_IDS } from '../src';

describe('habitatFor', () => {
  it('maps by rule', () => {
    expect(habitatFor({ kind: 'element', family: 'transition-metal', phaseAt25C: 'solid' })).toBe('metal');
    expect(habitatFor({ kind: 'compound', family: 'oxide', phaseAt25C: 'solid' })).toBe('quarry');
    expect(habitatFor({ kind: 'compound', family: 'salt', phaseAt25C: 'solid' })).toBe('quarry');
    expect(habitatFor({ kind: 'compound', family: 'oxide', phaseAt25C: 'liquid' })).toBe('spring');
    expect(habitatFor({ kind: 'element', family: 'noble-gas', phaseAt25C: 'gas' })).toBe('noble');
    expect(habitatFor({ kind: 'element', family: 'halogen', phaseAt25C: 'gas' })).toBe('halogen');
    expect(habitatFor({ kind: 'element', family: 'nonmetal', phaseAt25C: 'gas' })).toBe('gas');
    expect(habitatFor({ kind: 'element', family: 'nonmetal', phaseAt25C: 'solid' })).toBe('crystal');
  });
  it('has 7 habitats', () => expect(HABITAT_IDS.length).toBe(7));
});
