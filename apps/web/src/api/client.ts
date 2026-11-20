import { ApiErrorBodySchema, type ErrorCode } from '@chemimon/shared';

// zod is not a direct dependency of @chemimon/web (deps frozen), so the schema is typed structurally.
export interface Schema<T> {
  parse(data: unknown): T;
}

export class ApiError extends Error {
  status: number;
  code: ErrorCode;
  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<S extends Schema<unknown>>(
  path: string,
  schema: S,
  init: RequestInit = {},
): Promise<ReturnType<S['parse']>> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const res = await fetch(path, { ...init, headers, credentials: 'include' });
  if (!res.ok) {
    const parsed = ApiErrorBodySchema.safeParse(await res.json().catch(() => null));
    if (parsed.success) throw new ApiError(res.status, parsed.data.error.code, parsed.data.error.message);
    // No parseable error body (proxy error page, crash): not the client's fault.
    throw new ApiError(res.status, 'INTERNAL', `HTTP ${res.status}`);
  }
  if (res.status === 204) return schema.parse(undefined) as ReturnType<S['parse']>;
  return schema.parse(await res.json()) as ReturnType<S['parse']>;
}
