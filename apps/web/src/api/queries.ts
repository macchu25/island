import {
  CatalogResponseSchema,
  CodexResponseSchema,
  EconomyResponseSchema,
  type EconomyResponse,
  ExtractorClaimResponseSchema,
  type CodexResponse,
  QuestsResponseSchema,
  type QuestsResponse,
  type ExtractorClaimRequest,
  MeResponseSchema,
  type CatalogResponse,
  type LoginRequest,
  type MeResponse,
  type RegisterRequest,
  SellResponseSchema,
  MarketOrdersResponseSchema,
  DeliverResponseSchema,
  type MarketOrdersResponse,
  ExpeditionsResponseSchema,
  ExpeditionStartResponseSchema,
  ExpeditionCollectResponseSchema,
  PermitResponseSchema,
  type ExpeditionsResponse,
  type ExpeditionStartRequest,
  type PermitRequest,
  type SellRequest,
} from '@chemimon/shared';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUi } from '../state/ui';
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
  useUi.getState().close(); // an open panel (e.g. MonsterDetail) belongs to the previous player
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

export function useEconomy() {
  return useQuery<EconomyResponse>({
    queryKey: ['economy'],
    staleTime: Infinity,
    queryFn: () => apiFetch('/api/economy', EconomyResponseSchema),
  });
}

export function useCodex() {
  return useQuery<CodexResponse>({
    queryKey: ['codex'],
    queryFn: () => apiFetch('/api/codex', CodexResponseSchema),
  });
}

export function useQuests() {
  return useQuery<QuestsResponse>({
    queryKey: ['quests'],
    queryFn: () => apiFetch('/api/quests', QuestsResponseSchema),
  });
}

/** Every player action that can move a quest (claim, start, collect) refreshes these three. */
export function refreshPlayer(qc: QueryClient) {
  return Promise.all(['me', 'codex', 'quests', 'expeditions'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export function useClaimExtractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ExtractorClaimRequest) =>
      apiFetch('/api/extractor/claim', ExtractorClaimResponseSchema, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => refreshPlayer(qc),
  });
}

export function useSell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SellRequest) =>
      apiFetch('/api/market/sell', SellResponseSchema, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => refreshPlayer(qc),
  });
}

export function useMarketOrders() {
  return useQuery<MarketOrdersResponse>({
    queryKey: ['market-orders'],
    queryFn: () => apiFetch('/api/market/orders', MarketOrdersResponseSchema),
  });
}

export function useDeliverOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/market/orders/${encodeURIComponent(id)}/deliver`, DeliverResponseSchema, { method: 'POST' }),
    // Also on a refused deliver (409): the order may have closed or expired, so the screen must refetch.
    onSettled: () => Promise.all([refreshPlayer(qc), qc.invalidateQueries({ queryKey: ['market-orders'] })]),
  });
}

export function useExpeditions() {
  return useQuery<ExpeditionsResponse>({
    queryKey: ['expeditions'],
    queryFn: () => apiFetch('/api/expeditions', ExpeditionsResponseSchema),
  });
}

export function useStartExpedition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ExpeditionStartRequest) =>
      apiFetch('/api/expeditions', ExpeditionStartResponseSchema, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => refreshPlayer(qc),
  });
}

export function useCollectExpedition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/expeditions/${encodeURIComponent(id)}/collect`, ExpeditionCollectResponseSchema, { method: 'POST' }),
    onSuccess: () => refreshPlayer(qc),
  });
}

export function useBuyPermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PermitRequest) =>
      apiFetch('/api/permits', PermitResponseSchema, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => refreshPlayer(qc),
  });
}
