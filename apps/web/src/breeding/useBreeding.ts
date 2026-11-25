import {
  BreedingResponseSchema,
  CollectResponseSchema,
  type BreedingRequest,
} from '@chemimon/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { refreshPlayer } from '../api/queries';

function useInvalidate() {
  const qc = useQueryClient();
  return () => refreshPlayer(qc);
}

export function useStartBreeding() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (req: BreedingRequest) =>
      apiFetch('/api/breeding', BreedingResponseSchema, { method: 'POST', body: JSON.stringify(req) }),
    onSuccess: invalidate,
  });
}

export function useCollect() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch(`/api/breeding/${encodeURIComponent(sessionId)}/collect`, CollectResponseSchema, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

export function errorMessage(e: unknown, fallback = 'Có lỗi, thử lại.'): string {
  const code = (e as { code?: string } | null)?.code;
  if (code === 'SLOTS_FULL') return 'Cả 2 máy đang chạy. Chờ một máy xong nhé.';
  if (code === 'INSUFFICIENT_MONSTERS') return 'Không đủ quái để lai.';
  if (code === 'INSUFFICIENT_COINS') return 'Không đủ Xu.';
  if (code === 'NOT_READY') return 'Chưa xong, chờ thêm chút.';
  return fallback;
}
