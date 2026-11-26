# Economy Lát 3 (market orders, NaHCO₃) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Chợ gains an "Đơn hàng" tab: 4 stalls, each with one open order for a chemical the player has discovered; delivering it pays a fixed reward. NaHCO₃ joins the game (chemical, reaction, monster, model, thumbnail) so the bakery order exists.

**Architecture:** Stalls and order templates live in a new content file `packages/content/data/buyers.yaml`. The API materialises orders lazily: `GET /api/market/orders` opens a missing order inside the `lockPlayer` transaction, choosing the template by a deterministic hash, and stores it in a new `market_orders` table (a snapshot of chemical, count, reward). Delivery removes the monsters and pays through `applyCoins` with reason `order` and `ref_id` = order id.

**Tech Stack:** as Lát 2 (pnpm 10, Node 22, TS strict ESM, zod 4, Hono 4, Prisma 7 + PostgreSQL 16, React 19 + r3f 9, TanStack Query 5, Zustand 5, Tailwind 4, vitest 3, Playwright, Blender 4.5 headless).

**Spec:** `docs/specs/2026-11-25-economy-expeditions-design.md` §8, §12, §14. Content gate approved by the user 2026-11-26 (table below is the approved text). Lát 2 plan: `docs/superpowers/plans/2026-11-25-economy-slice2.md`. Branch `economy-slice3` from `main` (c9c7d36), worktree `.worktrees/econ3`.

## Global Constraints

- Stalls (exact): `food` "Phố ẩm thực" 🍜, `factory` "Khu nhà máy" 🏭, `city` "Dịch vụ thành phố" 🏙️, `tech` "Kim hoàn và công nghệ" 💍. Order shown in this stall order.
- Order templates (exact; `id`, stall, buyer, chemical × count, line, reward Xu):

  | id | stall | buyer | need | line | reward |
  |---|---|---|---|---|---|
  | pho-nacl | food | Quán phở | nacl 4 | nêm món ăn | 15 |
  | soda-co2 | food | Xưởng nước ngọt | co2 3 | tạo ga cho nước ngọt | 25 |
  | snack-n2 | food | Xưởng bánh snack | n2 3 | bơm vào túi snack để bánh không ẩm, không nát | 15 |
  | cafe-h2o | food | Quán cà phê | h2o 5 | pha cà phê | 12 |
  | bakery-nahco3 | food | Tiệm bánh | nahco3 3 | bột nở giúp bánh xốp | 40 |
  | steel-fe | factory | Nhà máy thép | fe 2 | làm thép đúc dầm cầu | 30 |
  | can-al | factory | Xưởng lon | al 3 | làm vỏ lon nước ngọt | 15 |
  | rubber-s8 | factory | Nhà máy cao su | s8 2 | lưu hóa cao su cho lốp xe bền hơn | 25 |
  | glass-sio2 | factory | Xưởng kính | sio2 4 | làm kính cửa sổ | 20 |
  | roof-zn | factory | Xưởng tôn | zn 2 | mạ lên tôn để tôn không gỉ | 15 |
  | grind-sic | factory | Xưởng đá mài | sic 1 | làm đá mài và lưỡi cắt | 70 |
  | sandpaper-al2o3 | factory | Xưởng giấy nhám | al2o3 2 | phủ lên giấy nhám | 10 |
  | soap-naoh | factory | Xưởng xà phòng | naoh 3 | làm xà phòng | 10 |
  | farm-nh3 | factory | Hợp tác xã nông nghiệp | nh3 1 | làm phân bón cho ruộng lúa | 50 |
  | ship-cu2o | factory | Xưởng đóng tàu | cu2o 1 | pha sơn đáy tàu để hà không bám | 35 |
  | pool-cl2 | city | Hồ bơi | cl2 2 | khử trùng nước hồ bơi | 12 |
  | balloon-he | city | Tiệm bóng bay | he 2 | bơm bóng bay để bóng bay lên | 20 |
  | sign-ne | city | Tiệm biển hiệu | ne 2 | làm biển hiệu đèn neon màu đỏ cam | 15 |
  | bulb-ar | city | Xưởng bóng đèn | ar 2 | bơm vào bóng đèn sợi đốt để dây tóc lâu đứt | 15 |
  | hospital-o2 | city | Bệnh viện | o2 3 | bình thở oxy cho bệnh nhân | 15 |
  | bus-h2 | city | Bến xe buýt | h2 4 | nhiên liệu cho xe buýt chạy pin hydro | 10 |
  | rescue-ko2 | city | Đội cứu hộ mỏ | ko2 2 | bình tạo oxy cho thợ mỏ khi gặp nạn | 10 |
  | pharmacy-i2 | city | Nhà thuốc | i2 2 | làm cồn iốt sát trùng vết thương | 15 |
  | clinic-mgoh2 | city | Phòng khám | mgoh2 2 | thuốc giảm đau dạ dày do dư axit | 8 |
  | pencil-c | city | Văn phòng phẩm | c 3 | làm ruột bút chì | 15 |
  | ring-au | tech | Tiệm kim hoàn | au 2 | làm nhẫn vàng | 25 |
  | bracelet-ag | tech | Tiệm kim hoàn | ag 2 | làm vòng bạc | 25 |
  | wire-cu | tech | Xưởng dây điện | cu 3 | làm lõi dây điện | 15 |
  | solar-si | tech | Xưởng pin mặt trời | si 1 | làm tấm pin mặt trời | 40 |
  | toner-fe3o4 | tech | Xưởng mực in | fe3o4 2 | làm mực máy in laser | 10 |

- `buyers.yaml` top level: `orderCooldownS: 1800` (wait after a delivery), `orderLifetimeS: 14400` (an order expires 4 h after it opens).
- Order rule (content check): `reward ≥ 1.5 × count × cheapestCost(chemical)` and `reward ≥ 2 × count × floor(chemical)`. Line: 1..80 chars, no digits (no real amounts).
- An order is offered only for a chemical with a `player_discoveries` row (any source). A stall with no eligible template shows "Chưa có đơn. Khám phá thêm chất nhé."
- Template choice, deterministic: eligible templates of the stall sorted by `id`; key `${playerId}|${stallId}|${deliveredCount}|${floor(openedAtEpochS / orderLifetimeS)}`; index = FNV-1a 32-bit (unsigned) of the key mod eligible count. `deliveredCount` = this player's delivered orders in this stall.
- Stall state from its latest row: none, or expired, or delivered with cooldown over → open a new order now (if eligible). Open and `now < expires_at` → show it. Delivered and `now < delivered_at + cooldown` → no order, `readyAt` = that time. An open row past `expires_at` is set to `expired` when next read.
- An open order is a snapshot (chemical, count, reward). It does not change when the player discovers more chemicals or when content changes. An open order whose template id is gone from content is set to `expired`.
- Deliver check order: order exists and belongs to the player (`UNKNOWN_ORDER` 404) → status open (`ORDER_CLOSED` 409) → `now < expires_at` (`ORDER_EXPIRED` 409) → owns `count` (`INSUFFICIENT_MONSTERS` 409) → remove monsters, pay reward, set `delivered`.
- Ledger reason `order`, `ref_id` = order id. Unique (`player_id`, `reason`, `ref_id`) stays the guard.
- `MARKET_TIME_SCALE` env (default 1) multiplies cooldown and lifetime, same as `EXPEDITION_TIME_SCALE`.
- NaHCO₃ (approved): chemical `nahco3` "Sodium bicarbonate", formula `NaHCO3`, compound, solid, family `salt`. Reaction `naoh_co2_nahco3`: NaOH 1 + CO₂ 1 → NaHCO₃ 1, ratio 1..1, 25 °C, 1 atm, environment `water`, `reviewed: true` (user approved 2026-11-26). Floor price 3. Monster: Blender recipe, ≤ 8000 triangles, ≤ 1 MB, thumbnail, rules of `docs/specs/2026-11-20-island-and-models.md`.
- New quests: `deliver-first` "Giao đơn hàng đầu tiên" (after `expedition-first`), `deliver-10` "Giao 10 đơn hàng" (after `breed-10`). Progress = coin_ledger rows with reason `order`. 16 quests.
- No price, count, time or line literal in API or web code; all from `buyers.yaml` / `economy.yaml`.
- UI copy Vietnamese. Test DB `chemimon_test` is shared: one runner at a time. Do not migrate `chemimon_dev` (the user plays on it from `main`).
- Commands: `pnpm exec vitest run`, `pnpm typecheck`, `pnpm e2e`, `pnpm --filter @chemimon/content validate`. After a schema change in a fresh worktree: `pnpm --filter @chemimon/api db:generate`.

## Review Focus

1. Two concurrent delivers of one order: one pays, the other gets 409 `ORDER_CLOSED`; monsters removed once, one ledger row → Task 4.
2. Two concurrent `GET /api/market/orders` for a fresh player: exactly one open row per stall (partial unique index on `(player_id, stall_id) WHERE status = 'open'`) → Task 4.
3. The player discovers a new chemical while an order is open: the open order stays the same until delivered or expired → Task 4.
4. Deliver at or after `expires_at`: 409 `ORDER_EXPIRED`, nothing changes; the next read opens a new order with a full 4 h → Task 4.
5. A fresh player (6 starters) sees orders only in `food` (n2) and `city` (cl2, o2, h2, c); `factory` and `tech` show the empty message; the old 25-element account sees all 4 → Task 4 and Task 6.

---

### Task 1: Shared contracts

**Files:** Modify `packages/shared/src/economy.ts`, `api.ts`, `errors.ts`, `index.ts`; Create `packages/shared/src/orders.ts`. Test `packages/shared/test/orders.test.ts`, `api.test.ts`.

**Interfaces (produces):**
- `StallSchema = { id, name, icon }`; `OrderTemplateSchema = { id, stallId, buyer, chemicalId, count: int≥1, reward: int≥1, line: string 1..80 }`; `BuyersSchema = { orderCooldownS: int≥1, orderLifetimeS: int≥1, stalls: Stall[] (≥1), orders: OrderTemplate[] }`; types `Stall`, `OrderTemplate`, `Buyers`.
- `fnv1a32(s: string): number` (unsigned); `pickTemplate(eligible: readonly OrderTemplate[], key: string): OrderTemplate | null` (sorts by id, null when empty); `orderKey(playerId: string, stallId: string, delivered: number, openedAt: Date, lifetimeS: number): string`.
- `MarketOrderViewSchema = { id, templateId, buyer, chemicalId, count, reward, line, expiresAt }`; `StallViewSchema = { id, name, icon, order: MarketOrderView | null, readyAt: string | null }`; `MarketOrdersResponseSchema = { stalls: StallView[] }`; `DeliverResponseSchema = { coins, inventory: StackCount, stall: StallView }`.
- `ERROR_CODES` gains `UNKNOWN_ORDER`, `ORDER_CLOSED`, `ORDER_EXPIRED`.

- [ ] **Step 1: Failing tests:** `fnv1a32('') === 2166136261`, `fnv1a32('a') === 0xe40c292c`; `pickTemplate` is order-independent (shuffled input gives the same pick), returns null for `[]`; `orderKey` uses `floor(epochS / lifetimeS)` (two dates in one 4 h window give one key); `BuyersSchema` rejects a line of 81 chars and count 0.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/shared` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm exec vitest run packages/shared && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(shared): market order contracts and deterministic template pick`.

### Task 2: Buyers content and order validator

**Files:** Create `packages/content/data/buyers.yaml`, `packages/content/src/buyers.ts`; Modify `src/cli.ts`, `src/index.ts` exports if used; `apps/api/src/boot.ts` (load and validate buyers, expose `deps.buyers`), `apps/api/src/app.ts` (`AppDeps.buyers: Buyers`), API test helpers (fixture buyers). Test `packages/content/test/buyers.test.ts`, `apps/api/test/boot.test.ts`.

**Interfaces:** `loadBuyers(opts?: { dataDir?: string }): Buyers`; `validateBuyers(c: Catalog, e: Economy, b: Buyers, extractorIds: readonly string[]): ValidationIssue[]` with codes `BUYER_UNKNOWN_CHEMICAL`, `BUYER_UNKNOWN_STALL`, `BUYER_DUPLICATE`, `ORDER_UNDERPAID`, `ORDER_LINE_DIGITS`.

- [ ] **Step 1: Failing tests:** real `buyers.yaml` loads with 4 stalls and the 29 templates of the table except `bakery-nahco3` (it lands in Task 3); `validateBuyers` on real content → `[]`; a copy with `pool-cl2` reward 7 → `ORDER_UNDERPAID` (2 × 2 × floor 2 = 8); unknown chemical, unknown stall, duplicate id, a line with "3" each give their code; boot refuses an invalid buyers file.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/content apps/api/test/boot.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Reuse `productionCosts` for the cost side. CLI `validate` runs `validateBuyers` too.
- [ ] **Step 4: Run** the same plus `pnpm --filter @chemimon/content validate` → PASS, 0 issues.
- [ ] **Step 5: Commit** `feat(content): buyers.yaml with 4 stalls and 29 order templates`.

### Task 3: NaHCO₃ content round (lane: art + content)

**Files:** Modify `packages/content/data/{chemicals,reactions,monsters,economy,buyers}.yaml`; Create `art/blender/monsters/nahco3.py`, `apps/web/public/assets/monsters/nahco3.glb`, `apps/web/public/assets/monsters/thumbs/nahco3.png`; Modify the tests that count species/compounds (`apps/web/test/{habitats,islandPlacement,islandScene}.test.*`, `islandFootprint.test.ts` measured table, `apps/api/test/quests.test.ts` real-catalog compound count 20 → 21, `e2e/island.spec.ts`, `e2e/perf.spec.ts` 45 → 46) and any seed or catalog test that counts 45 chemicals.

- [ ] **Step 1: Content.** Add chemical, reaction, monster (pick an English pun name in the style of `Causticub`; blurb: harmless kitchen use), floor `nahco3: 3`, and template `bakery-nahco3` to `buyers.yaml`. Run `pnpm --filter @chemimon/content validate` → 0 issues, 49 rules, 46 chemicals. Check the reaction resolves: a resolver test for NaOH 1 + CO₂ 1 in water at 25 °C → NaHCO₃ 1, and NaOH 2 + CO₂ 1 (ratio 2) → no rule.
- [ ] **Step 2: Model.** Recipe in the style of `monsters/naoh.py` (a puffy cake or bun body, fizz bubbles; colours from the monster entry). Build with `~/tools/blender-4.5.16-linux-x64/blender -b -P art/blender/run.py -- nahco3`, thumbnail with `thumbs.py nahco3`. Check triangles ≤ 8000, file ≤ 1 MB. Open the thumbnail and look at it.
- [ ] **Step 3: Island.** NaHCO₃ is a solid compound → `quarry` habitat (now 16 species). Update the counts and the footprint table; `pnpm exec vitest run apps/web` must pass, including the plot-capacity check in `habitats.ts`. If 16 quarry species no longer fit, widen the quarry plot in `layout.json` and say so in the report.
- [ ] **Step 4: Run** `pnpm exec vitest run && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(content): NaHCO3 (chemical, NaOH + CO2 reaction, monster, model, bakery order)`.

### Task 4: Market orders API

**Files:** Modify `apps/api/prisma/schema.prisma`; Create migration `<ts>_market_orders` (table + partial unique index in raw SQL); Create `apps/api/src/market/orders.ts`; Modify `apps/api/src/market/routes.ts`, `wallet/ledger.ts` (`LedgerReason` + `order`), `server.ts` and `main.ts` (`MARKET_TIME_SCALE` → `timeScale.market`), `quests/quests.ts`, `quests/routes.ts`, `seedMain.ts` TRUNCATE list. Test `apps/api/test/market-orders.test.ts`, `quests.test.ts`.

**Table `market_orders`:** `id uuid pk`, `player_id → users`, `stall_id text`, `template_id text`, `chemical_id text`, `count int`, `reward int`, `status text` (`open | delivered | expired`), `opened_at`, `expires_at`, `delivered_at null`. Index `(player_id, stall_id, opened_at)`; partial unique `(player_id, stall_id) WHERE status = 'open'`.

**Endpoints:** `GET /api/market/orders` → `MarketOrdersResponse` (may write: opens or expires rows, inside `lockPlayer`). `POST /api/market/orders/:id/deliver` → `DeliverResponse`.

- [ ] **Step 1: Failing tests** (real DB, `deps.now` stubbed):
  - fresh player: `food` order is `snack-n2`, `city` order is one of `pool-cl2, hospital-o2, bus-h2, pencil-c`, `factory` and `tech` have `order: null, readyAt: null`.
  - determinism: same player and clock read twice → same order ids; a second player with the same state gets the order its own key picks (assert via `pickTemplate`).
  - deliver `snack-n2` (3 N₂ of 4): coins +15, inventory n2 1, ledger row (`order`, order id), stall `readyAt` = now + 1800 s; read at +1799 s → still no order; at +1800 s → a new order, `deliveredCount` 1 in its key.
  - Review Focus 1: two concurrent delivers → one 200, one 409 `ORDER_CLOSED`, one ledger row.
  - Review Focus 2: two concurrent first reads → one open row per stall.
  - Review Focus 3: discover `nacl` after the `food` order opened → order unchanged.
  - Review Focus 4: deliver at `expires_at` → 409 `ORDER_EXPIRED`, no change; next read sets it `expired` and opens a new order with `expiresAt = now + 14400 s`.
  - `INSUFFICIENT_MONSTERS` with 2 N₂; `UNKNOWN_ORDER` for another player's order id; `MARKET_TIME_SCALE` 0.5 halves cooldown and lifetime.
  - quests: `deliver-first` done after one delivery; real catalog shows 16 quests.
- [ ] **Step 2: Run** `pnpm exec vitest run apps/api/test/market-orders.test.ts apps/api/test/quests.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Eligibility from `player_discoveries`. On the partial-unique violation inside a read, the transaction already holds `lockPlayer`, so it cannot happen; keep the index as the last guard.
- [ ] **Step 4: Run** `pnpm exec vitest run apps/api && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(api): market orders (lazy open, deterministic pick, deliver, expiry, 2 quests)`.

### Task 5: Web: "Đơn hàng" tab

**Files:** Modify `apps/web/src/market/MarketPanel.tsx` (tabs "Thu mua" | "Đơn hàng"), `apps/web/src/api/queries.ts` (`useMarketOrders()`, `useDeliverOrder()`; deliver invalidates me, quests, market orders); Create `apps/web/src/market/OrdersSection.tsx`, `apps/web/src/market/orderErrors.ts`. Test `apps/web/test/ordersSection.test.tsx`.

Each stall card: icon + stall name; buyer; thumbnail + "Cần 3 NaHCO₃ (bạn có 1)"; the line in quotes; reward "+40 Xu"; time left "Còn 3 giờ 12 phút"; button "Giao" (disabled when the player has fewer than `count`). Cooling stall: "Đơn mới sau 25 phút". Empty stall: "Chưa có đơn. Khám phá thêm chất nhé." After delivery a status line "Đã giao 3 N₂ cho Xưởng bánh snack: +15 Xu". Errors: `ORDER_EXPIRED` "Đơn đã hết hạn.", `ORDER_CLOSED` "Đơn này đã giao rồi.", `INSUFFICIENT_MONSTERS` "Không đủ hàng để giao.", else "Có lỗi, thử lại.".

- [ ] **Step 1: Failing tests** (mocked queries): renders 4 stalls in order; disabled "Giao" when short; cooling and empty texts; a successful deliver shows the status line; each error code shows its text; a double click sends one request.
- [ ] **Step 2: Run** `pnpm exec vitest run apps/web/test/ordersSection.test.tsx` → FAIL.
- [ ] **Step 3: Implement** in the style of `MarketPanel` and the expedition panel.
- [ ] **Step 4: Run** `pnpm exec vitest run apps/web && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(web): market orders tab`.

### Task 6: End-to-end

**Files:** Modify `e2e/loop.spec.ts` (new test), `e2e/playwright.config.ts` only if a time scale is needed.

- [ ] **Step 1: Test** "deliver an order": register, open Chợ from the island, tab "Đơn hàng", the `food` card shows Xưởng bánh snack and 3 N₂; `factory` shows the empty text; click "Giao"; status line shows +15 Xu; header Xu 215; the card shows "Đơn mới sau 30 phút"; `/api/quests` has `deliver-first` done. Screenshot `market-orders.png`, open it and look at it.
- [ ] **Step 2: Run** `pnpm e2e` → all pass (7 tests).
- [ ] **Step 3: Commit** `test(e2e): market order delivery loop`.

**Lanes:** Task 1 → Task 2 on the main line, then three lanes forked from Task 2: API (Task 4), art + content (Task 3), web (Task 5). Task 6 after all three merge.
