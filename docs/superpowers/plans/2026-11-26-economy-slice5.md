# Economy Lát 5 (labs and catalysts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The harsh reaction conditions become one-time purchases: Lò cao (1000 °C, 2500 °C), Buồng áp suất (100, 200 atm), Phòng lạnh (−78 °C), Buồng điện phân (new activation "điện phân"), and each catalyst. Old accounts keep every condition they already used. Electrolysis reactions are added as drafts, off in the game until the user approves each one.

**Architecture:** Labs and catalyst prices live in `economy.yaml` (`labs`, `catalystPrices`). The API adds `player_labs` (owned item ids) with a backfill from past breeding sessions, a `GET /api/labs` + `POST /api/labs/buy` pair, and one new check in breeding start (`LAB_LOCKED`). An item can only be bought when at least one live (non-draft) reaction needs it.

**Tech Stack:** as Lát 4.

**Spec:** `docs/specs/2026-11-25-economy-expeditions-design.md` §10 (frame), §5 (catalysts bought once), §3 (old accounts lose nothing), §2 anti-goals (no unapproved chemistry). Open question in §10 ("players who already used 1000 °C keep it?") is answered by ruling R1 below. Branch `economy-slice5` stacked on `economy-slice4`, worktree `.worktrees/econ5`.

## Global Constraints

- Labs (exact, `economy.yaml`):

  | id | name | unlocks | price |
  |---|---|---|---|
  | furnace | Lò cao | temperatureC 1000, 2500 | 150 |
  | pressure | Buồng áp suất | pressureAtm 100, 200 | 120 |
  | cold | Phòng lạnh | temperatureC −78 | 60 |
  | electrolysis | Buồng điện phân | activation electric | 200 |

- Catalyst prices (exact): Fe 40, Pt 80, V2O5 60, MnO2 40. `none` is always free. Catalyst condition fee stays 0.
- New activation value `electric`, label "Điện phân", condition fee 10 Xu.
- Item ids in `player_labs.item_id`: lab id (`furnace`, ...) or `catalyst:<name>` (`catalyst:Fe`, ...).
- A condition value not listed in any lab is always open: temperatureC 25, 200, 450; pressureAtm 1, 10; all environments; activation none, spark, light; catalyst none.
- An item is **useful** when at least one live reaction rule (drafts excluded unless `CONTENT_INCLUDE_DRAFTS=1`) can only match with it: a rule whose allowed set for that condition lies entirely inside the item's unlocks (catalyst: the rule lists that catalyst). `POST /api/labs/buy` refuses a non-useful item with `LAB_USELESS` 409. Today's live content makes furnace, pressure and catalyst Fe useful; cold, electrolysis, Pt, V2O5, MnO2 are not (they show "Chưa dùng được").
- Buy check order: known item (`UNKNOWN_LAB` 400) → not owned (`LAB_OWNED` 409) → useful (`LAB_USELESS` 409) → Xu (`INSUFFICIENT_COINS` 409 `{ needed, have }`) → charge, insert. Ledger reason `lab`, `ref_id` = item id.
- Breeding start check order becomes: chemicals exist → enough monsters → free slot → **every chosen condition value is open or owned (`LAB_LOCKED` 409, details `{ itemId }` of the first missing item in the order temperature, pressure, activation, catalyst)** → resolve → NO_REACTION → Xu → start.
- Migration backfill (idempotent, own migration): for every player, insert the items their past `breeding_sessions` used (temperature 1000/2500 → furnace, −78 → cold, pressure 100/200 → pressure, catalyst ≠ none → `catalyst:<name>`).
- Electrolysis draft rules in `packages/content/data/drafts/reactions.yaml`, `reviewed: false`, each with a Wikipedia source and a note "Draft for the user's approval":
  1. `nacl_electrolysis`: NaCl 2 → Na 2 + Cl₂ 1; 1000 °C; environment inert; activation electric.
  2. `al2o3_c_electrolysis`: Al₂O₃ 2 + C 3 → Al 4 + CO₂ 3; 1000 °C; activation electric (Hall–Héroult, carbon anode).
  3. `h2o_electrolysis`: H₂O 2 → H₂ 2 + O₂ 1; 25 °C; environment water; activation electric.
  `pnpm --filter @chemimon/content validate --drafts` must pass with them; the live validate must not change (49 rules).
- New quest `lab-first` "Mua phòng thí nghiệm đầu tiên" right before `hot-1000`; `hot-1000` hint becomes "Mua Lò cao trong Phòng thí nghiệm, rồi chạy một phản ứng ở 1000 °C." 19 quests.
- Web: header button "Thí nghiệm" opens dialog "Phòng thí nghiệm": one card per lab and catalyst with name, what it opens ("Mở 1000 °C và 2500 °C", "Mở xúc tác Fe"), price, and a button "Mua (150 Xu)" / label "Đã có" / label "Chưa dùng được". Breeding room: locked option values are disabled with "🔒" and a hint "Cần Lò cao" (lab name); the room shows one line "Mở thêm điều kiện ở Phòng thí nghiệm." Errors: `LAB_LOCKED` "Cần mua {tên} trước.", `LAB_OWNED` "Đã có.", `LAB_USELESS` "Chưa có phản ứng nào dùng được.", `INSUFFICIENT_COINS` "Thiếu Xu: cần N, có M.".
- No price literal in API or web code. UI copy Vietnamese. One test runner on `chemimon_test` at a time; do not touch `chemimon_dev*`. Never read .env files.

## Review Focus

1. An old account that ran 1000 °C before the migration can still start a 1000 °C breeding without buying anything → Task 2.
2. A locked condition with otherwise NO_REACTION inputs returns `LAB_LOCKED`, not NO_REACTION, and charges nothing → Task 2.
3. Concurrent double purchase of one item: one 200, one `LAB_OWNED`, Xu charged once → Task 2.
4. The cheapest path to Fe still exists for a player who owns the furnace; quests before `lab-first` are all doable with no lab → Task 2 (quest order test) and Task 1 (content check).
5. Draft electrolysis rules never resolve in the live game (`CONTENT_INCLUDE_DRAFTS=0`), so the electrolysis chamber stays "Chưa dùng được" → Task 2.

---

### Task 1: Contracts and content

**Files:** Modify `packages/shared/src/{conditions,economy,api,errors,index}.ts`, `packages/content/data/economy.yaml`, `packages/content/data/drafts/reactions.yaml`, `packages/content/src/{economy,validate}.ts`, web label maps for activation if any. Test `packages/shared/test/*`, `packages/content/test/{economy,labs}.test.ts`.

**Interfaces:** `ACTIVATIONS` adds `'electric'`; `LabSchema = { id, name, unlocks: { temperatureC?: Temperature[], pressureAtm?: Pressure[], activation?: Activation[] }, price: int≥1 }`; `EconomySchema` gains `labs: Lab[]`, `catalystPrices: Record<Exclude<Catalyst,'none'>, int≥1>`; `requiredItems(c: Conditions, labs: Lab[]): string[]` (ordered: temperature, pressure, activation, catalyst); `usefulItems(reactions, labs): Set<string>`; `LabsResponseSchema = { items: { id, kind: 'lab'|'catalyst', name, opens: string, price, owned, useful }[] }`; `LabBuyRequestSchema = { itemId }`; `LabBuyResponseSchema = { itemId, coins }`; errors `UNKNOWN_LAB`, `LAB_OWNED`, `LAB_USELESS`, `LAB_LOCKED`. Validator codes `LAB_UNLOCK_OVERLAP` (a value in two labs), `LAB_UNKNOWN_VALUE`.

- [ ] Failing tests: `requiredItems` for 1000 °C + 100 atm + Fe → `['furnace','pressure','catalyst:Fe']`; 25 °C spark none → `[]`; `usefulItems(live rules)` = {furnace, pressure, catalyst:Fe}; with drafts it also has electrolysis; overlap and unknown-value codes; live validate still 49 rules, `--drafts` passes.
- [ ] Implement, run `pnpm exec vitest run packages && pnpm typecheck`, commit `feat(shared,content): labs, catalyst prices, electric activation, electrolysis drafts`.

### Task 2: Labs API and the breeding gate

**Files:** schema + migrations `<ts>_labs` (table `player_labs (player_id, item_id, bought_at)` PK both) and `<ts>_labs_backfill` (idempotent INSERT … SELECT DISTINCT … ON CONFLICT DO NOTHING from `breeding_sessions`); Create `apps/api/src/labs/routes.ts`; Modify breeding service/routes (gate), `wallet/ledger.ts` (`lab`), quests, `seedMain.ts`, existing breeding/quest tests that use 1000 °C or Fe catalyst (grant the item in their setup). Test `apps/api/test/labs.test.ts`, `breeding.test.ts`, `quests.test.ts`, `migrations` test like the Lát 2 backfill test (run the SQL twice).

- [ ] Failing tests: buy furnace −150, ledger (`lab`, `furnace`); again → `LAB_OWNED`; cold → `LAB_USELESS`; unknown → 400; short Xu → details; Review Focus 1–3 and 5; breeding 1000 °C without furnace → `LAB_LOCKED { itemId: 'furnace' }`, with furnace → STARTED; Fe catalyst gate; backfill test; 19 quests and `lab-first` position.
- [ ] Implement, run `pnpm exec vitest run --project api && pnpm typecheck`, commit `feat(api): labs, catalyst purchase, breeding gate, backfill`.

### Task 3: Web

**Files:** Create `apps/web/src/labs/{LabsPanel,errors}.tsx|ts`; Modify `state/ui.ts` (Panel `'labs'`), `lab/LabScreen.tsx` (header button), breeding condition controls (locked options), `api/queries.ts` (`useLabs`, `useBuyLab`; buying refreshes me, labs, quests). Test `apps/web/test/labsPanel.test.tsx`, the breeding panel test.

- [ ] Failing tests for every card state, the lock hint in the breeding room, each error text, double-click guard.
- [ ] Implement, run `pnpm exec vitest run --project @chemimon/web && pnpm typecheck`, commit `feat(web): labs panel and locked conditions`.

### Task 4: End-to-end

- [ ] Test "buy the furnace": register; the breeding room shows 1000 °C locked with "Cần Lò cao"; open "Thí nghiệm"; buy Lò cao (header 50 Xu); Buồng điện phân shows "Chưa dùng được"; the breeding room 1000 °C option is enabled; `/api/quests` has `lab-first` done. Screenshot `labs.png`, open and look at it.
- [ ] `pnpm e2e` → all pass (9 tests). Commit `test(e2e): buy the furnace`.

**Lanes:** Task 1 first; then API (Task 2) and web (Task 3) in parallel; Task 4 after both merge.
