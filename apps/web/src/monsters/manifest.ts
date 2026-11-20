import { useQuery } from '@tanstack/react-query';

async function fetchManifest(): Promise<string[]> {
  try {
    const res = await fetch('/assets/monsters/manifest.json');
    if (!res.ok) return [];
    const body = (await res.json()) as { available?: unknown };
    return Array.isArray(body.available) ? body.available.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

/** Keys of available .glb models. Any failure yields an empty list. */
export function useMonsterManifest() {
  return useQuery<string[]>({
    queryKey: ['monster-manifest'],
    queryFn: fetchManifest,
    staleTime: Infinity,
    retry: false,
  });
}
