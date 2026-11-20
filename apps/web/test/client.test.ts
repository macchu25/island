import { afterEach, expect, it, vi } from 'vitest';
import { MeResponseSchema } from '@chemimon/shared';
import { ApiError, apiFetch } from '../src/api/client';

afterEach(() => vi.unstubAllGlobals());

function stub(status: number, body?: unknown) {
  const f = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', f);
  return f;
}

it('throws ApiError with code on 409', async () => {
  stub(409, { error: { code: 'EMAIL_TAKEN', message: 'x' } });
  const err = await apiFetch('/api/x', MeResponseSchema).catch((e) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err.code).toBe('EMAIL_TAKEN');
  expect(err.status).toBe(409);
});

it('throws zod error when 200 body fails schema', async () => {
  stub(200, { a: 1 });
  await expect(apiFetch('/api/x', MeResponseSchema)).rejects.toMatchObject({ name: 'ZodError' });
});

it('handles 204 without parsing and sends credentials', async () => {
  const f = stub(204);
  await expect(apiFetch('/api/auth/logout', { parse: (v: unknown) => v }, { method: 'POST' })).resolves.toBeUndefined();
  expect(f.mock.calls[0]![1].credentials).toBe('include');
});

it('unparseable error body maps to INTERNAL, not VALIDATION', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 })));
  const err = await apiFetch('/api/x', MeResponseSchema).catch((e) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err.code).toBe('INTERNAL');
  expect(err.status).toBe(502);
});
