/** Market order copy for a refused delivery. */
export function orderError(e: unknown): string {
  switch ((e as { code?: string } | null)?.code) {
    case 'ORDER_EXPIRED': return 'Đơn đã hết hạn.';
    case 'ORDER_CLOSED': return 'Đơn này đã giao rồi.';
    case 'INSUFFICIENT_MONSTERS': return 'Không đủ hàng để giao.';
    default: return 'Có lỗi, thử lại.';
  }
}
