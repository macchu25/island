import {
  MeResponseSchema,
  type LoginRequest,
  type MeResponse,
  type RegisterRequest,
} from '@chemimon/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

function usePost<B>(path: string, schema: Schema<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: B) =>
      apiFetch(path, schema, {
        method: 'POST',
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export const useRegister = () => usePost<RegisterRequest>('/api/auth/register', MeResponseSchema);
export const useLogin = () => usePost<LoginRequest>('/api/auth/login', MeResponseSchema);
export const useLogout = () => usePost<never>('/api/auth/logout', NoBody);
