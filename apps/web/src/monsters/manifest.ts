import { useQuery } from '@tanstack/react-query';

async function fetchManifest(folder: string): Promise<string[]> {
  try {
    const res = await fetch(`/assets/${folder}/manifest.json`);
    if (!res.ok) return [];
    const body = (await res.json()) as { available?: unknown };
    return Array.isArray(body.available) ? body.available.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

/** Keys of the .glb files present in /assets/<folder>/ (from its manifest.json). Any failure yields an empty list. */
export function useAssetManifest(folder: 'monsters' | 'island') {
  return useQuery<string[]>({
    queryKey: [`${folder === 'monsters' ? 'monster' : folder}-manifest`],
    queryFn: () => fetchManifest(folder),
    staleTime: Infinity,
    retry: false,
  });
}

/** Keys of available monster .glb models. */
export const useMonsterManifest = () => useAssetManifest('monsters');
