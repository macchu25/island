import type { Context } from 'hono';
import type { z } from 'zod';
import { apiError } from './errors';

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; res: Response };

/** Parse JSON body with a shared schema. Failure carries a ready 400 VALIDATION response. */
export async function parseBody<S extends z.ZodType>(c: Context, schema: S): Promise<ParsedBody<z.output<S>>> {
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
