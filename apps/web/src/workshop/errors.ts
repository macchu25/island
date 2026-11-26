import { WORKSHOP_SLOTS } from '@chemimon/shared';

/** Workshop copy for a refused request. `coins` fills "Thiếu Xu: cần N, có M." for a blueprint. */
export function workshopError(e: unknown, coins?: { needed: number; have: number }): string {
  switch ((e as { code?: string } | null)?.code) {
    case 'BLUEPRINT_LOCKED': return 'Chưa có bản vẽ.';
    case 'BLUEPRINT_OWNED': return 'Đã có bản vẽ này.';
    case 'INSUFFICIENT_MONSTERS': return 'Thiếu nguyên liệu.';
    case 'INSUFFICIENT_PRODUCTS': return 'Không đủ hàng.';
    case 'SLOTS_FULL': return `Xưởng đang bận cả ${WORKSHOP_SLOTS} chỗ.`;
    case 'INSUFFICIENT_COINS': return coins ? `Thiếu Xu: cần ${coins.needed}, có ${coins.have}.` : 'Thiếu Xu.';
    case 'NOT_READY': return 'Chưa xong, chờ thêm chút.';
    default: return 'Có lỗi, thử lại.';
  }
}
