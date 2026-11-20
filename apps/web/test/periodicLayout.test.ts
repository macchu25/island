import { expect, it } from 'vitest';
import { periodicLayout } from '../src/codex/periodicLayout';

it('has 118 unique cells at known coordinates', () => {
  const all = Object.values(periodicLayout);
  expect(all).toHaveLength(118);
  expect(new Set(all.map((c) => `${c.row},${c.col}`)).size).toBe(118);
  expect(periodicLayout[1]).toEqual({ row: 1, col: 1, symbol: 'H' });
  expect(periodicLayout[2]).toMatchObject({ row: 1, col: 18, symbol: 'He' });
  expect(periodicLayout[26]).toMatchObject({ row: 4, col: 8, symbol: 'Fe' });
  expect(periodicLayout[57]).toMatchObject({ row: 9, col: 3, symbol: 'La' });
  expect(periodicLayout[92]).toMatchObject({ row: 10, col: 6, symbol: 'U' });
});
