/** Lab copy for a refused request. `names` maps an item id to its display name. */
export function labError(e: unknown, names: Record<string, string> = {}): string {
  const err = e as { code?: string; details?: Record<string, number | string> } | null;
  switch (err?.code) {
    case 'LAB_LOCKED': {
      const id = String(err.details?.itemId ?? '');
      return `Cần mua ${names[id] ?? id} trước.`;
    }
    case 'LAB_OWNED': return 'Đã có.';
    case 'LAB_USELESS': return 'Chưa có phản ứng nào dùng được.';
    case 'INSUFFICIENT_COINS': return `Thiếu Xu: cần ${err.details?.needed ?? '?'}, có ${err.details?.have ?? '?'}.`;
    default: return 'Có lỗi, thử lại.';
  }
}
