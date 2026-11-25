import type { QuestView } from '@chemimon/shared';

/** Facts about one player that quest progress is computed from. All come from existing tables. */
export interface QuestStats {
  extractorUsed: boolean;
  breedingsStarted: number;
  breedingsCollected: number;
  /** Compounds this player has bred (player_discoveries.bred_at set). */
  discovered: ReadonlySet<string>;
  /** Every chemical this player has bred, elements too. */
  bred: ReadonlySet<string>;
  /** Expedition trips ever sent. */
  expeditions: number;
  firstDiscoveries: number;
  /** Floor-price sales (coin_ledger rows with reason sell_floor). */
  sold: number;
  /** Breedings started at 1000 °C or more. */
  hotBreedings: number;
  /** Number of compounds in the catalog. */
  compoundTotal: number;
}

interface QuestDef {
  id: string;
  title: string;
  hint: string;
  /** Goal; a function when it depends on the catalog. */
  goal: number | ((s: QuestStats) => number);
  progress(s: QuestStats): number;
  /** Chemicals the quest names; it is hidden when the catalog lacks one of them. */
  needs?: string[];
  /** Counts discovered compounds: hidden when the catalog has fewer compounds than the goal. */
  countsCompounds?: true;
}

/** Ordered: the first unfinished ones are the ones shown. Text is player-facing Vietnamese. */
export const QUESTS: readonly QuestDef[] = [
  {
    id: 'extract-first',
    title: 'Nhận quái từ Máy chiết',
    hint: 'Ở góc phải trên, chọn một nguyên tố trong Máy chiết rồi bấm Nhận.',
    goal: 1,
    progress: (s) => (s.extractorUsed ? 1 : 0),
  },
  {
    id: 'breed-first',
    title: 'Lai tạo lần đầu',
    hint: 'Bấm Phòng lai tạo ở giữa đảo, chọn quái, rồi bấm Bắt đầu.',
    goal: 1,
    progress: (s) => s.breedingsStarted,
  },
  {
    id: 'collect-first',
    title: 'Thu hoạch quái mới',
    hint: 'Khi máy lai xong, bấm Thu hoạch ở góc trái dưới.',
    goal: 1,
    progress: (s) => s.breedingsCollected,
  },
  {
    id: 'sell-first',
    title: 'Bán món hàng đầu tiên',
    hint: 'Bấm Chợ trên đảo, chọn một chất rồi bấm Bán.',
    goal: 1,
    progress: (s) => s.sold,
  },
  {
    id: 'expedition-first',
    title: 'Gửi quái đi khai thác lần đầu',
    hint: 'Bấm Bến khai thác ở mép trái đảo, chọn một nơi rồi gửi một quái.',
    goal: 1,
    progress: (s) => s.expeditions,
  },
  {
    id: 'make-water',
    title: 'Tạo ra nước',
    hint: 'Lai 2 H₂ với 1 O₂, chọn kích hoạt Tia lửa.',
    goal: 1,
    needs: ['h2o'],
    progress: (s) => (s.discovered.has('h2o') ? 1 : 0),
  },
  {
    id: 'discover-3',
    countsCompounds: true,
    title: 'Lai tạo ra 3 hợp chất',
    hint: 'Thử cặp nguyên tố khác. Đổi nhiệt độ, môi trường hoặc kích hoạt.',
    goal: 3,
    progress: (s) => s.discovered.size,
  },
  {
    id: 'one-pair-two-results',
    title: 'Một cặp, hai kết quả',
    hint: 'Na + O₂ ở 200 °C. Đổi tỷ lệ số lượng sẽ ra hai chất khác nhau.',
    goal: 2,
    needs: ['na2o', 'na2o2'],
    progress: (s) => ['na2o', 'na2o2'].filter((id) => s.discovered.has(id)).length,
  },
  {
    id: 'hot-1000',
    title: 'Chạy một phản ứng ở 1000 °C',
    hint: 'Chọn nhiệt độ 1000 °C trong Phòng lai tạo. Nhiệt cao tốn nhiều Xu hơn.',
    goal: 1,
    progress: (s) => s.hotBreedings,
  },
  {
    id: 'refine-iron',
    title: 'Tinh luyện sắt từ quặng',
    hint: 'Đào quặng ở Mỏ sắt, rồi lai Fe₂O₃ với H₂ ở 1000 °C.',
    goal: 1,
    needs: ['fe'],
    progress: (s) => (s.bred.has('fe') ? 1 : 0),
  },
  {
    id: 'breed-10',
    title: 'Lai tạo 10 lần',
    hint: 'Mỗi lần bấm Bắt đầu có phản ứng đều được tính.',
    goal: 10,
    progress: (s) => s.breedingsStarted,
  },
  {
    id: 'first-discovery',
    title: 'Người khám phá đầu tiên',
    hint: 'Tạo ra một hợp chất mà chưa người chơi nào tạo ra.',
    goal: 1,
    progress: (s) => s.firstDiscoveries,
  },
  {
    id: 'discover-10',
    countsCompounds: true,
    title: 'Lai tạo ra 10 hợp chất',
    hint: 'Xem Codex: chất còn ẩn và thẻ ghi "chưa lai tạo" đều chưa được tính.',
    goal: 10,
    progress: (s) => s.discovered.size,
  },
  {
    id: 'complete-codex',
    countsCompounds: true,
    title: 'Lai tạo đủ mọi hợp chất',
    hint: 'Lai tạo ra mọi hợp chất trong Codex. Thẻ ghi "chưa lai tạo" chưa được tính.',
    goal: (s) => s.compoundTotal,
    progress: (s) => s.discovered.size,
  },
];

export function questViews(stats: QuestStats, catalogIds: ReadonlySet<string>): QuestView[] {
  return QUESTS.flatMap((q) => {
    const goal = typeof q.goal === 'function' ? q.goal(stats) : q.goal;
    // Skip quests the catalog cannot satisfy: a missing chemical, or more compounds than exist.
    if (goal < 1) return [];
    if (q.countsCompounds && goal > stats.compoundTotal) return [];
    if (q.needs?.some((id) => !catalogIds.has(id))) return [];
    const progress = Math.min(goal, q.progress(stats));
    return [{ id: q.id, title: q.title, hint: q.hint, progress, goal, done: progress >= goal }];
  });
}
