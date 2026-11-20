import type { Context } from 'hono';
import type { z } from 'zod';
import { apiError } from './errors';

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; res: Response };

/** True for `application/json`, with or without parameters such as `; charset=utf-8`, any case. */
export function isJsonContentType(header: string | undefined): boolean {
  return (header ?? '').split(';')[0]!.trim().toLowerCase() === 'application/json';
}

/**
 * Parse JSON body with a shared schema. A missing or non-JSON Content-Type gets 415 (code VALIDATION),
 * which also stops cross-site "simple" form posts (text/plain, form-urlencoded) from reaching handlers.
 * Any other failure carries a ready 400 VALIDATION response.
 */
export async function parseBody<S extends z.ZodType>(c: Context, schema: S): Promise<ParsedBody<z.output<S>>> {
  if (!isJsonContentType(c.req.header('content-type'))) {
    return { ok: false, res: apiError(c, 415, 'VALIDATION', 'Content-Type must be application/json') };
  }
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return { ok: false, res: apiError(c, 400, 'VALIDATION', 'body: invalid JSON') };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    return { ok: false, res: apiError(c, 400, 'VALIDATION', message) };
  }
  return { ok: true, data: parsed.data };
}
