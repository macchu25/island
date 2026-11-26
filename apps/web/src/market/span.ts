/** "25 phút", or "3 giờ 12 phút" from 60 minutes up. Rounds up to whole minutes, never below 1. */
export function span(ms: number): string {
  const total = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}
