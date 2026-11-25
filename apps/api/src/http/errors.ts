import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiErrorBody, ErrorCode } from '@chemimon/shared';

export function apiError(
  c: Context,
  status: ContentfulStatusCode,
  code: ErrorCode,
  message: string,
  details?: Record<string, number>,
) {
  const body: ApiErrorBody = { error: details ? { code, message, details } : { code, message } };
  return c.json(body, status);
}
