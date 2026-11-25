# Economy Lát 1 (Xu wallet, condition fees, floor-price market) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players have a Xu balance; breeding charges a fee from the chosen conditions (free when there is no reaction); a new Market building buys any owned chemical at a floor price.

**Architecture:** Prices live in a new content file `packages/content/data/economy.yaml`, loaded beside the catalog and validated (including a cheapest-production-cost check). The API keeps the balance in `users.coins` and writes every change to an append-only `coin_ledger` inside the existing per-player locked transaction. The web reads prices from `GET /api/economy` and computes the displayed fee with the same shared function the server uses.

**Tech Stack:** pnpm 10 monorepo, Node 22, TypeScript strict ESM, zod 4, Hono 4, Prisma 7 + PostgreSQL 16, React 19 + react-three-fiber 9, TanStack Query 5, Zustand 5, Tailwind 4, vitest 3, Playwright, Blender 4.5 headless.

**Spec:** `docs/specs/2026-11-25-economy-expeditions-design.md` (sections 5, 6, 11, 12 are Lát 1). Earlier contracts: `docs/specs/2026-11-20-chemimon-slice1-design.md`, `docs/specs/2026-11-20-island-and-models.md`.

## Global Constraints

- Currency name in UI: "Xu". Integer, never negative.
- Starting balance: 200 Xu for every new player; existing accounts get 200 Xu once (migration), recorded as a `starter` ledger row.
- Condition prices (exact, per breeding start): temperature °C {-78: 20, 25: 0, 200: 5, 450: 15, 1000: 40, 2500: 120}; pressure atm {1: 0, 10: 10, 100: 40, 200: 80}; environment {air: 0, water: 2, inert: 10}; activation {none: 0, spark: 3, light: 3}; catalyst {none: 0, Fe: 0, Pt: 0, V2O5: 0, MnO2: 0}. Fee = sum over the five chosen values.
- Fee is charged only when the reaction starts (STARTED). NO_REACTION never charges and never writes a ledger row.
- Breeding check order (spec §6): known chemicals → enough monsters → free slot → resolve → NO_REACTION returns → INSUFFICIENT_COINS (409, details `{ needed, have }`) → consume monsters, charge Xu, write ledger, create session.
- Floor prices: one integer ≥ 1 per catalog chemical in `economy.yaml`. Chemicals the extractor can give (Lát 1: all 25 `STARTER_ELEMENTS`) must be 1 to 3. Every other chemical must be ≤ its cheapest production cost (validator error otherwise); author them near 50% of that cost.
- All prices come from `economy.yaml`; no price literal in API or web code (tests may use them).
- Every Xu change happens inside the transaction that holds `lockPlayer(tx, playerId)`, and writes one `coin_ledger` row with `balance_after`. Unique (`player_id`, `reason`, `ref_id`).
- Two identical concurrent requests follow the breeding rule: both succeed if stock and Xu cover both; otherwise the later one is refused. No client idempotency key.
- UI copy is Vietnamese. Market building label: "Chợ".
- The Market building model: ≤ 8000 triangles, ≤ 1 MB, origin at base centre, faces +Z (three.js), fits radius 2.2; island rules of `docs/specs/2026-11-20-island-and-models.md` §5 hold.
- Test DB `chemimon_test` is shared: only one worktree may run API tests or `pnpm e2e` at a time. Web unit tests do not touch the DB.
- Commands: unit `pnpm exec vitest run`, types `pnpm typecheck`, browser `pnpm e2e`, content `pnpm --filter @chemimon/content validate` (check the script name in `packages/content/package.json`).

## Review Focus

1. A player with exactly the fee in Xu can start, ends at 0, never below → test in Task 3.
2. Two concurrent starts whose fees together exceed the balance: one 201, one 409 INSUFFICIENT_COINS, balance ≥ 0, ledger sum = balance → test in Task 3.
3. NO_REACTION with 0 Xu returns NO_REACTION (not INSUFFICIENT_COINS) and writes no ledger row → test in Task 3.
4. Sell with count 0, negative, non-integer, > owned, or an unknown chemical changes nothing (400 / 409) → test in Task 4.
5. The fee shown in the breeding room equals what the server charges: e2e asserts balance after start = balance before − displayed fee → Task 8.

---

### Task 1: Shared contracts

**Files:**
- Create: `packages/shared/src/economy.ts`
- Modify: `packages/shared/src/index.ts` (export it), `packages/shared/src/api.ts`, `packages/shared/src/errors.ts`
- Test: `packages/shared/test/economy.test.ts`

**Interfaces:**
- Produces:
  - `ConditionPricesSchema`: object `{ temperatureC: Record<'-78'|'25'|'200'|'450'|'1000'|'2500', int≥0>, pressureAtm: Record<'1'|'10'|'100'|'200', int≥0>, environment: Record<Environment, int≥0>, activation: Record<Activation, int≥0>, catalyst: Record<Catalyst, int≥0> }`. Keys must be exactly the values of `TEMPERATURES_C`, `PRESSURES_ATM`, `ENVIRONMENTS`, `ACTIVATIONS`, `CATALYSTS` (strict objects; missing or extra key fails).
  - `EconomySchema = { starterCoins: int≥0, conditionPrices: ConditionPrices, floorPrices: Record<chemicalId, int≥1> }`; `type Economy`.
  - `conditionFee(c: Conditions, p: ConditionPrices): number`.
  - `EconomyResponseSchema = { conditionPrices, floorPrices }`.
  - `MeResponseSchema` gains `coins: int≥0` (top level).
  - `SellRequestSchema = { chemicalId, count: int 1..99 }`; `SellResponseSchema = { coins: int≥0, inventory: StackCount }`.
  - `ERROR_CODES` gains `'INSUFFICIENT_COINS'`; `ApiErrorBodySchema.error` gains optional `details: Record<string, number>`.

- [ ] **Step 1: Write failing tests** `conditionFee sums the five prices` (25 °C, 1 atm, none, air, none → 0; 1000 °C, 100 atm, Fe, inert, spark with the Global Constraints prices → 40+40+0+10+3 = 93); `ConditionPricesSchema rejects a missing or extra temperature key`; `MeResponseSchema requires coins`; `SellRequestSchema rejects count 0, -1, 1.5, 100`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/shared` → FAIL.
- [ ] **Step 3: Implement** the schemas and `conditionFee` (index the price maps with `String(value)` for numeric keys).
- [ ] **Step 4: Run** `pnpm exec vitest run packages/shared && pnpm typecheck` → PASS. Typecheck will flag `buildMe` and web fixtures that lack `coins`: add `coins: 0` to test fixtures only; the real value comes in Task 3.
- [ ] **Step 5: Commit** `feat(shared): economy contracts (prices, fee, coins, sell, INSUFFICIENT_COINS)`.

### Task 2: Economy content and production-cost validator

**Files:**
- Create: `packages/content/data/economy.yaml`, `packages/content/src/economy.ts`
- Modify: `packages/content/src/index.ts`, `packages/content/src/cli.ts` (the `validate` command also loads and checks the economy)
- Test: `packages/content/test/economy.test.ts`

**Interfaces:**
- Consumes: Task 1 `EconomySchema`, `ConditionPrices`, `conditionFee`; existing `Catalog`, `RuleConditions`, `STARTER_ELEMENTS`.
- Produces:
  - `loadEconomy(opts?: { dataDir?: string }): Economy` (throws `ContentLoadError` like `loadCatalog`).
  - `cheapestRuleFee(rc: RuleConditions, p: ConditionPrices): number`: per dimension the minimum price among allowed values (temperature/pressure: values of the shared lists inside `[min, max]`; catalyst/environment: listed values; activation: the given value; absent constraint: all values).
  - `productionCosts(c: Catalog, p: ConditionPrices, freeIds: readonly string[]): Map<string, number>`: free ids cost 0, others start at `Infinity`; repeat over reviewed reactions until no value drops: `unit = (Σ coefficient × cost(input) + cheapestRuleFee) / Σ output coefficients`, `cost(product) = min(cost(product), unit)`.
  - `validateEconomy(c: Catalog, e: Economy, freeIds: readonly string[]): ValidationIssue[]` with codes `FLOOR_MISSING` (catalog chemical without a floor), `FLOOR_UNKNOWN` (floor for a chemical not in the catalog), `FLOOR_FREE_RANGE` (free chemical not in 1..3), `FLOOR_ABOVE_COST` (floor > production cost). Unreachable chemicals (cost `Infinity`) skip the cost check.
- `economy.yaml`: `starterCoins: 200`, the Global Constraints condition prices, and a floor for each of the 45 catalog chemicals: 1 to 3 for the 25 elements; for compounds, run `productionCosts` and write `max(1, floor(cost × 0.5))`.

- [ ] **Step 1: Write failing tests:** `cheapestRuleFee` (rule `{ temperatureC: {min: 200, max: 450} }` → 5; `{ activation: 'spark' }` → 3; `{}` → 0; `{ environment: ['inert'] }` → 10); `productionCosts` on a 3-chemical fixture (A, B free; rule A+B→2C at 200 °C → cost(C) = 2.5; a rule chaining C→D picks the cheaper of two routes); `validateEconomy` returns each of the 4 codes on a crafted bad economy and `[]` on a good one; `the shipped economy.yaml is valid against the shipped catalog` (load both with real data, expect no issues).
- [ ] **Step 2: Run** `pnpm exec vitest run packages/content` → FAIL.
- [ ] **Step 3: Implement** `economy.ts` and author `economy.yaml`.
- [ ] **Step 4: Run** `pnpm exec vitest run packages/content` and the content validate CLI → PASS, 0 issues.
- [ ] **Step 5: Commit** `feat(content): economy.yaml with condition prices, floor prices and production-cost validation`.

### Task 3: Wallet, ledger, breeding fee

**Files:**
- Create: `apps/api/prisma/migrations/<timestamp>_coins_ledger/migration.sql`, `apps/api/src/wallet/ledger.ts`, `apps/api/src/economy/routes.ts`
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/src/app.ts` (`AppDeps.economy: Economy`; route `/api/economy`), `apps/api/src/main.ts`, `apps/api/src/server.ts`, `apps/api/src/boot.ts` (run `validateEconomy`, refuse to start on issues), `apps/api/src/player/grant.ts`, `apps/api/src/player/me.ts`, `apps/api/src/breeding/service.ts`, `apps/api/src/breeding/routes.ts`, `apps/api/src/http/errors.ts` (optional `details`), `apps/api/test/helpers/{app,db}.ts` (fixture economy; truncate `coin_ledger`)
- Test: `apps/api/test/wallet.test.ts`, additions to `apps/api/test/breeding.test.ts`, `apps/api/test/breeding-concurrency.test.ts`, `apps/api/test/me.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 2 `loadEconomy`, `validateEconomy`.
- Produces:
  - Schema: `users.coins Int @default(0)`; model `CoinLedger` → table `coin_ledger` (`id uuid pk`, `player_id uuid fk users cascade`, `delta int`, `balance_after int`, `reason text`, `ref_id text`, `created_at timestamptz(3) default now()`, unique (`player_id`, `reason`, `ref_id`), index (`player_id`, `created_at`)); `breeding_sessions.fee Int @default(0)`; DB check constraint `users.coins >= 0`.
  - Migration SQL also: `UPDATE users SET coins = 200` and inserts one `starter` ledger row (`ref_id = 'starter'`, `delta 200`, `balance_after 200`) per existing user.
  - `applyCoins(tx, playerId, delta: number, reason: LedgerReason, refId: string): Promise<{ ok: true; balance: number } | { ok: false; balance: number }>`: one guarded `UPDATE users SET coins = coins + delta WHERE id = $1 AND coins + delta >= 0 RETURNING coins`; on success inserts the ledger row; `ok: false` when the guard fails (no row written). `type LedgerReason = 'starter' | 'breeding_fee' | 'sell_floor'`.
  - `grantStarterKit` also calls `applyCoins(tx, id, economy.starterCoins, 'starter', 'starter')` (pass the economy in).
  - `buildMe` returns `coins`.
  - `startBreeding` follows the Global Constraints order; generates the session id with `crypto.randomUUID()` so the ledger `ref_id` is the session id; stores `fee`; new outcome `{ kind: 'INSUFFICIENT_COINS'; needed: number; have: number }` → route `409 INSUFFICIENT_COINS` with `details: { needed, have }`.
  - `GET /api/economy` (no auth) → `EconomyResponse`.

- [ ] **Step 1: Write failing tests:**
  - `wallet.test.ts`: `register grants 200 Xu and one starter ledger row`; `applyCoins refuses to go below 0 and writes no row`; `ledger sum equals users.coins after a mixed sequence`.
  - `breeding.test.ts`: `start at 1000 °C + spark charges 43 and stores fee 43` (use a fixture rule that allows it, or the 25 °C spark water rule → 3); `NO_REACTION with 0 Xu returns NO_REACTION and writes no ledger row`; `exactly the fee in Xu starts and leaves 0`; `fee − 1 Xu → 409 INSUFFICIENT_COINS with details {needed, have} and no monsters consumed`.
  - `breeding-concurrency.test.ts`: `two parallel starts whose fees exceed the balance → one 201, one 409 INSUFFICIENT_COINS, coins ≥ 0, ledger sum = coins`.
  - `me.test.ts`: `/api/me includes coins`.
  - `economy route`: `GET /api/economy returns the fixture prices without auth`.
- [ ] **Step 2: Run** `pnpm exec vitest run --project api` → FAIL.
- [ ] **Step 3: Implement.** Generate the migration with `pnpm --filter @chemimon/api exec prisma migrate dev --create-only --name coins_ledger`, then hand-add the CHECK constraint and the backfill SQL.
- [ ] **Step 4: Run** `pnpm exec vitest run --project api && pnpm typecheck` → PASS, including all pre-existing API tests.
- [ ] **Step 5: Commit** `feat(api): Xu wallet with ledger, starter coins, breeding condition fee`.

### Task 4: Floor-price selling API and quests

**Files:**
- Create: `apps/api/src/market/routes.ts`
- Modify: `apps/api/src/app.ts` (route `/api/market`), `apps/api/src/quests/quests.ts`, `apps/api/src/quests/routes.ts`
- Test: `apps/api/test/market.test.ts`, `apps/api/test/quests.test.ts`

**Interfaces:**
- Consumes: Task 3 `applyCoins`, `lockPlayer`, `deps.economy.floorPrices`.
- Produces:
  - `POST /api/market/sell` (auth) body `SellRequest` → 200 `SellResponse`. Under the player lock: unknown chemical → 400 `UNKNOWN_CHEMICAL`; owned < count → 409 `INSUFFICIENT_MONSTERS`; else decrement, `applyCoins(+floor × count, 'sell_floor', randomUUID())`.
  - `QuestStats` gains `sold: number` (ledger rows with reason `sell_floor`) and `hotBreedings: number` (breeding sessions with `conditions.temperatureC >= 1000`; Prisma JSON path filter).
  - Two new quests, inserted in this order in `QUESTS`: after `collect-first` → `sell-first` "Bán món hàng đầu tiên", hint "Bấm Chợ trên đảo, chọn một chất rồi bấm Bán.", goal 1; after `one-pair-two-results` → `hot-1000` "Chạy một phản ứng ở 1000 °C", hint "Chọn nhiệt độ 1000 °C trong Phòng lai tạo. Nhiệt cao tốn nhiều Xu hơn.", goal 1. Real catalog total becomes 12.

- [ ] **Step 1: Write failing tests:** `sell 2 h2 at floor f adds 2f Xu, decrements stock, writes one sell_floor row`; `sell rejects count 0, -1, 1.5, 100 with 400 and changes nothing`; `sell more than owned → 409, nothing changes`; `unknown chemical → 400`; `requires auth`; quests: `fixture list now includes sell-first after collect-first`, `selling once completes sell-first`, `a 1000 °C breeding completes hot-1000` (needs a fixture rule reachable at 1000 °C; add one to `fixtureCatalog` if none, and update the expected fixture quest order in the existing test).
- [ ] **Step 2: Run** `pnpm exec vitest run --project api` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm exec vitest run --project api && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(api): floor-price selling and economy quests`.

### Task 5: Market building (Blender) and island layout

**Files:**
- Modify: `art/blender/island.py` (add `build_market`, register in `BUILDING_BUILDERS` and the default target list), `apps/web/src/island/layout.json` (add `buildings.market` with label "Chợ"), `apps/web/src/island/layout.ts` (`BuildingId` adds `'market'`, `BUILDING_IDS` adds it), regenerate `apps/web/public/assets/island/{island,market}.glb` and both manifests (`node scripts/monster-manifest.mjs`)
- Test: `apps/web/test/islandFootprint.test.ts` (and any layout test that enumerates buildings)

**Interfaces:**
- Produces: `buildings.market = { x, z, r: 2.2, label: 'Chợ' }`. Suggested spot `(0, 9.5)`; any spot works if: plot gap ≥ 1.0 to every other plot, plot fully inside the island ellipse with ≥ 1.5 margin, the hanging sign stays on land. `market.glb` faces +Z.
- Look: an open market stall: striped awning on 4 posts, a counter with a few crates of colourful round "goods", a small hanging balance scale. Baby-friendly, rounded, pastel; no text on the model.

- [ ] **Step 1: Write failing test:** extend the footprint/layout test so it expects 4 buildings including `market` and checks the gap and margin rules above.
- [ ] **Step 2: Run** `pnpm exec vitest run apps/web/test/islandFootprint.test.ts` → FAIL.
- [ ] **Step 3: Implement**: layout entry, `build_market`, then `~/tools/blender-4.5.16-linux-x64/blender -b -P art/blender/island.py -- --render island market`; open the renders with the Read tool and judge them by eye; run the manifest script.
- [ ] **Step 4: Run** `pnpm exec vitest run --project web` → PASS (island.py's own pre-export checks must also pass).
- [ ] **Step 5: Commit** `feat(art): market stall building on the island`.

### Task 6: Web: coins, prices in the breeding room

**Files:**
- Modify: `apps/web/src/api/queries.ts` (`useEconomy`), `apps/web/src/lab/LabScreen.tsx` (header coin counter), `apps/web/src/breeding/ConditionPicker.tsx` (price per option), `apps/web/src/breeding/BreedingPanel.tsx` (fee line, insufficient state), `apps/web/src/breeding/useBreeding.ts` (`errorMessage` for `INSUFFICIENT_COINS`)
- Test: `apps/web/test/breedingPanel.test.tsx`, `apps/web/test/economyHud.test.tsx`

**Interfaces:**
- Consumes: Task 1 schemas and `conditionFee`; `GET /api/economy`; `me.coins`.
- Produces:
  - `useEconomy()`: query key `['economy']`, `staleTime: Infinity`.
  - Header element `aria-label="Số Xu"` showing `{coins} Xu`.
  - `ConditionPicker` prop `prices?: ConditionPrices`; a non-zero price renders as a separate `<span aria-hidden>` "· N" after the label, so button accessible names stay exactly the current labels.
  - Breeding room: `data-testid="breeding-fee"` text `Chi phí: N Xu` (N = `conditionFee`); when `coins < N` the Bắt đầu button is disabled and a line reads `Thiếu M Xu`; `errorMessage` maps `INSUFFICIENT_COINS` → `Không đủ Xu.`

- [ ] **Step 1: Write failing tests:** `header shows the balance`; `fee line updates when 1000 °C and Tia lửa are picked (0 → 43)`; `Bắt đầu is disabled with "Thiếu 3 Xu" when coins = 40 and fee = 43`; `condition buttons keep their accessible names ("1000 °C") and show "· 40"`; `INSUFFICIENT_COINS maps to "Không đủ Xu."`.
- [ ] **Step 2: Run** `pnpm exec vitest run --project web` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm exec vitest run --project web && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(web): Xu balance and condition prices in the breeding room`.

### Task 7: Web: Market panel and building click

**Files:**
- Create: `apps/web/src/market/MarketPanel.tsx`
- Modify: `apps/web/src/state/ui.ts` (`Panel` adds `'market'`), `apps/web/src/island/Buildings.tsx` (market click → `open('market')`; primitive fallback stall; `FALLBACK_TOP.market`), `apps/web/src/lab/LabScreen.tsx` (header button "Chợ"; render panel), `apps/web/src/api/queries.ts` (`useSell` → `POST /api/market/sell`, `onSuccess: refreshPlayer`)
- Test: `apps/web/test/marketPanel.test.tsx`, `apps/web/test/islandScene.test.tsx`

**Interfaces:**
- Consumes: Task 5 `BuildingId 'market'`; Task 6 `useEconomy`; `MonsterThumb`.
- Produces: `MarketPanel`: modal `role="dialog"` `aria-label="Chợ"` with the same backdrop, Escape and ✕ behaviour as the breeding room. Section `aria-label="Thu mua"`: one row per owned species (count > 0) in catalog order: thumbnail, name, formula, `×count`, `N Xu / con`, a stepper (aria `Giảm <id>`, `Số lượng <id>`, `Tăng <id>`, range 1..min(99, owned)), and a button `Bán` (`data-testid="sell-<id>"`). After a sale: status line `Đã bán {count} {formula}: +{Xu} Xu`. Empty stock: `Bạn chưa có gì để bán.`

- [ ] **Step 1: Write failing tests:** `lists owned species with floor price`; `stepper stops at owned`; `Bán posts {chemicalId, count} once on double click and shows the status line`; `Escape closes`; islandScene: `market building opens the market panel`.
- [ ] **Step 2: Run** `pnpm exec vitest run --project web` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm exec vitest run --project web && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(web): market panel with floor-price selling`.

### Task 8: End-to-end and integration

**Files:**
- Modify: `e2e/loop.spec.ts`, `e2e/island.spec.ts` (building count if asserted), `e2e/ownAll.ts` (add `coins` to the rewritten `/api/me`)

- [ ] **Step 1: Extend `loop.spec.ts`:** after register the header shows `200 Xu`; quest total is `0/12`; in the breeding room read `breeding-fee` (3 with Tia lửa), start, then the header shows `197 Xu` (= 200 − displayed fee); after collecting, open Chợ from the header, sell 1 H₂O, header rises by its floor price, quest `sell-first` done (`5/12`). Update the existing `4/10` assertion accordingly.
- [ ] **Step 2: Extend `island.spec.ts`:** click the market building (probe `building-market`) → dialog "Chợ" visible → close.
- [ ] **Step 3: Run** `pnpm exec vitest run && pnpm typecheck && pnpm e2e` → all PASS (one worktree at a time on the test DB).
- [ ] **Step 4: Commit** `test(e2e): economy loop (fee, balance, floor sale) and market building`.
