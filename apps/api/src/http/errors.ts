import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiErrorBody, ErrorCode } from '@chemimon/shared';

export function apiError(c: Context, status: ContentfulStatusCode, code: ErrorCode, message: string) {
  const body: ApiErrorBody = { error: { code, message } };
  return c.json(body, status);
}
