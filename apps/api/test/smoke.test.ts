import { expect, it } from 'vitest';
import * as pkg from '../src/index';

it('smoke: index imports', () => {
  expect(pkg).toBeDefined();
  expect(true).toBe(true);
});
