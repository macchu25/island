import { expect, it } from 'vitest';
import { workshopError } from '../src/workshop/errors';

it('maps NOT_READY to its own text', () => {
  expect(workshopError({ code: 'NOT_READY' })).toBe('Chưa xong, chờ thêm chút.');
});
