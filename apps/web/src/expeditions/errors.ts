import { EXPEDITION_SLOTS } from '@chemimon/shared';

/** Expedition copy for a refused request. */
export function expeditionError(e: unknown): string {
  switch ((e as { code?: string } | null)?.code) {
    case 'INSUFFICIENT_COINS': return 'Không đủ Xu.';
    case 'SLOTS_FULL': return `Đã hết chỗ: tối đa ${EXPEDITION_SLOTS} chuyến.`;
    case 'PLACE_LOCKED': return 'Nơi này cần giấy phép.';
    case 'PERMIT_OWNED': return 'Bạn đã có giấy phép này.';
    case 'INSUFFICIENT_MONSTERS': return 'Không đủ quái để gửi.';
    case 'NOT_READY': return 'Chuyến chưa xong.';
    case 'UNKNOWN_PLACE': return 'Không có nơi này.';
    default: return 'Có lỗi, thử lại.';
  }
}
