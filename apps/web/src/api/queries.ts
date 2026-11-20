import {
  CatalogResponseSchema,
  CodexResponseSchema,
  ExtractorClaimResponseSchema,
  type CodexResponse,
  type ExtractorClaimRequest,
  MeResponseSchema,
  type CatalogResponse,
  type LoginRequest,
  type MeResponse,
  type RegisterRequest,
} from '@chemimon/shared';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch, type Schema } from './client';

const NoBody: Schema<undefined> = { parse: () => undefined };

export function useMe() {
  return useQuery<MeResponse | null>({
    queryKey: ['me'],
    retry: false,
    queryFn: async () => {
      try {
        return await apiFetch('/api/me', MeResponseSchema);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
  });
}

/**
 * Login, register and logout change who the player is: purge every cached query so no codex or
 * catalog-derived state of the previous player survives, then refetch /api/me.
 * Equivalent to queryClient.clear() + refetch, except that the `me` query is reset instead of removed:
 * a removed query does not notify its mounted observer (App), which would keep the old screen.
 */
export async function resetPlayerCache(qc: QueryClient): Promise<void> {
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
  await qc.resetQueries({ queryKey: ['me'] });
}

function usePost<B>(path: string, schema: Schema<unknown>, opts: { playerChange?: boolean } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: B) =>
      apiFetch(path, schema, {
        method: 'POST',
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    onSuccess: () => (opts.playerChange ? resetPlayerCache(qc) : qc.invalidateQueries({ queryKey: ['me'] })),
  });
}

export const useRegister = () => usePost<RegisterRequest>('/api/auth/register', MeResponseSchema, { playerChange: true });
export const useLogin = () => usePost<LoginRequest>('/api/auth/login', MeResponseSchema, { playerChange: true });
export const useLogout = () => usePost<never>('/api/auth/logout', NoBody, { playerChange: true });

export function useCatalog() {
  return useQuery<CatalogResponse>({
    queryKey: ['catalog'],
    staleTime: Infinity,
    queryFn: () => apiFetch('/api/catalog', CatalogResponseSchema),
  });
}

export function useCodex() {
  return useQuery<CodexResponse>({
    queryKey: ['codex'],
    queryFn: () => apiFetch('/api/codex', CodexResponseSchema),
  });
}

export function useClaimExtractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ExtractorClaimRequest) =>
      apiFetch('/api/extractor/claim', ExtractorClaimResponseSchema, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['me'] }), qc.invalidateQueries({ queryKey: ['codex'] })]),
  });
}
