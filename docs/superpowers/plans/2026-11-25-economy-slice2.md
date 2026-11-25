# Economy Lát 2 (expeditions, 6-element starter kit, unknown elements) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New players start with 6 elements; the other elements come from the Element Extractor (16 kinds) or from expeditions: the player sends one monster to a place, waits, and collects the monster plus a fixed yield. Codex shows every chemical as unknown until the player first owns it.

**Architecture:** Places live in `economy.yaml` (`places`). The API adds `expeditions` and `player_permits` tables; a trip removes one monster at send time and returns it with the yield at collect time, inside the existing `lockPlayer` transaction, with the collect body stored for replay (same pattern as breeding). `player_discoveries` gains `source` (first source) and `bred_at` (first time the player produced it by breeding). The production-cost validator treats places as priced sources.

**Tech Stack:** as Lát 1 (pnpm 10, Node 22, TS strict ESM, zod 4, Hono 4, Prisma 7 + PostgreSQL 16, React 19 + r3f 9, TanStack Query 5, Zustand 5, Tailwind 4, vitest 3, Playwright, Blender 4.5 headless).

**Spec:** `docs/specs/2026-11-25-economy-expeditions-design.md` §5, §7, §11, §12. Lát 1 plan: `docs/superpowers/plans/2026-11-25-economy-slice1.md`. Branch `economy-slice2` is stacked on `economy-slice1` (ccdcfa5), which is not merged into `main` yet.

## Global Constraints

- Starter kit: `h2, o2, c, n2, na, cl2`, 4 each, plus `starterCoins` (200) Xu. Old accounts keep every monster they own.
- Extractor gives exactly 16 kinds: the 6 starters plus `mg, al, k, ca, zn, hg, pb, f2, i2, p4`. It refuses `he, ne, ar, si, s8, fe, cu, ag, au` with `EXTRACTOR_NOT_ELIGIBLE`.
- Places (exact, in `economy.yaml`; base yield per trip):

  | id | name | drops | durationS | fee | permitPrice | bonusHabitat |
  |---|---|---|---|---|---|---|
  | sand | Bãi cát | sio2 4 | 600 | 0 | 0 | quarry |
  | salt | Hồ muối | nacl 4 | 600 | 0 | 0 | spring |
  | iron | Mỏ sắt | fe2o3 3, fe3o4 2 | 900 | 10 | 0 | metal |
  | copper | Mỏ đồng | cuo 4 | 900 | 10 | 0 | metal |
  | air | Tháp tách khí | n2 2, o2 2, ar 1, ne 1 | 1200 | 20 | 60 | gas |
  | well | Giếng khí tự nhiên | he 3 | 1200 | 20 | 80 | noble |
  | gold | Sông đãi vàng | au 2, ag 2 | 1800 | 30 | 150 | metal |
  | volcano | Miệng núi lửa | s8 4 | 1800 | 30 | 100 | crystal |

- Yield: each drop count `n`, or `floor(n * 3 / 2)` when the sent monster's habitat equals `bonusHabitat`. Computed at send time, stored, never random.
- Habitat of a chemical: the existing island rule (compound: solid → quarry, else spring; element: noble-gas → noble, halogen → halogen, family word `metal` → metal, gas → gas, else crystal). Move it to `@chemimon/shared` so API and web use one copy.
- At most 2 running trips per player (`EXPEDITION_SLOTS = 2`), separate from the 2 breeding slots. A trip is running until collected.
- Send check order: known place (`UNKNOWN_PLACE` 400) → unlocked (`PLACE_LOCKED` 409) → owns ≥ 1 of the monster (`INSUFFICIENT_MONSTERS` 409) → free slot (`SLOTS_FULL` 409) → Xu ≥ fee (`INSUFFICIENT_COINS` 409, details `{ needed, have }`) → remove 1 monster, charge fee, create trip.
- Collect before `ready_at` → `NOT_READY` 409. Collect twice returns the same body and adds monster + yield once.
- Permit: `POST /api/permits` charges `permitPrice` once. Already owned, or `permitPrice` 0 → `PERMIT_OWNED` 409, no charge.
- Ledger reasons: `expedition_fee` (ref_id = trip id, only when fee > 0), `permit` (ref_id = place id). Unique (`player_id`, `reason`, `ref_id`) stays the guard.
- Floor changes: `sio2 5→2, fe2o3 2→1, cu 3→1, ne 3→2, ar 3→2`. All other floors stay.
- Cost model: extractor kinds and drops of fee-0 places cost 0 (floor must be 1..3). A drop of a paid place costs `fee / (sum of its bonus yields)`. Reactions relax from there as in Lát 1. Floor ≤ max(1, cost) for every chemical with cost > 0.
- Discoveries: every chemical gets a `player_discoveries` row the first time the player owns it. `source` ∈ `starter | extractor | expedition | breeding` is the first source and never changes. `bred_at` is set the first time breeding produces it (elements too). First Discovery unchanged: compounds only, breeding only.
- Quests that count compounds (`discover-3`, the codex quest, `make-water`) count compounds with `bred_at` set. New quests: `expedition-first` "Gửi quái đi khai thác lần đầu" (after `sell-first`) and `refine-iron` "Tinh luyện sắt từ quặng" (after `hot-1000`, done when `fe` has `bred_at`). 14 quests.
- Migration: old players get `player_discoveries` rows for all 25 elements (`source = starter`, no `bred_at`); existing compound rows get `source = breeding`, `bred_at = discovered_at`.
- Dock building: label "Bến khai thác", layout `(x -16, z 6, r 2.2)`, ≤ 8000 triangles, ≤ 1 MB, rules of `docs/specs/2026-11-20-island-and-models.md` §5.
- No price, time or yield literal in API or web code; all from `economy.yaml`.
- UI copy Vietnamese. Test DB `chemimon_test` is shared: one runner at a time. Do not migrate `chemimon_dev` (the user is play-testing Lát 1 on it).
- Commands: `pnpm exec vitest run`, `pnpm typecheck`, `pnpm e2e`, `pnpm --filter @chemimon/content validate`. After a schema change in a fresh worktree: `pnpm --filter @chemimon/api db:generate`.

## Review Focus

1. Two concurrent collects of one trip: one monster back and one yield, ledger unchanged → Task 4.
2. Sending the last monster of a kind: inventory 0, market cannot sell it, breeding refuses it, collect restores it → Task 4.
3. Concurrent double permit purchase: one 200, one 409 `PERMIT_OWNED`, Xu charged once → Task 4.
4. Old account after the migration: Codex shows 25 elements known, compound quests keep their progress → Task 3.
5. A new player with 0 Xu and an empty inventory still earns Xu: fee-0 trip to Bãi cát, collect, sell → Task 4.

---

### Task 1: Shared contracts

**Files:** Modify `packages/shared/src/config.ts`, `economy.ts`, `api.ts`, `errors.ts`, `index.ts`; Create `packages/shared/src/habitat.ts`; Modify `apps/web/src/island/habitats.ts` (re-export from shared). Test `packages/shared/test/{economy,api,habitat}.test.ts`.

**Interfaces (produces):**
- `STARTER_ELEMENTS` (the 6), `EXTRACTOR_ELEMENTS` (the 16), `EXPEDITION_SLOTS = 2`.
- `HABITAT_IDS`, `type HabitatId`, `habitatFor(c: Pick<ChemicalDef,'kind'|'family'|'phaseAt25C'>): HabitatId` (moved verbatim from web).
- `PlaceSchema = { id, name, drops: [{chemicalId, count: int≥1}] (≥1), durationS: int≥1, fee: int≥0, permitPrice: int≥0, bonusHabitat: HabitatId }`; `EconomySchema` gains `places: Place[]`.
- `expeditionYield(place: Place, monsterHabitat: HabitatId): StackCount[]`.
- `DiscoverySource = 'starter'|'extractor'|'expedition'|'breeding'`.
- `ExpeditionViewSchema = { id, placeId, chemicalId, status: 'running'|'collected', startedAt, readyAt, result: StackCount[] }`; `ExpeditionsResponseSchema = { places: (Place & { unlocked: boolean })[], trips: ExpeditionView[] }` (trips = running only); `ExpeditionStartRequestSchema = { placeId, chemicalId }`; `ExpeditionStartResponseSchema = { trip: ExpeditionView, coins }`; `ExpeditionCollectResponseSchema = { returned: StackCount, products: StackCount[], newDiscoveries: string[] }`; `PermitRequestSchema = { placeId }`; `PermitResponseSchema = { placeId, coins }`.
- `ERROR_CODES` gains `UNKNOWN_PLACE`, `PLACE_LOCKED`, `PERMIT_OWNED`.
- `CodexEntry.state` for elements may be `'unknown'` (schema already allows it: check).

- [ ] **Step 1: Failing tests:** `STARTER_ELEMENTS is the 6`, `EXTRACTOR_ELEMENTS has 16 and excludes he ne ar si s8 fe cu ag au`, `habitatFor` cases (fe → metal, sio2 → quarry, nacl → quarry, h2o → spring, he → noble), `expeditionYield` (sand + quarry monster → sio2 6; sand + gas monster → sio2 4; gold + metal → au 3, ag 3), `PlaceSchema rejects empty drops and an unknown habitat`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/shared` → FAIL.
- [ ] **Step 3: Implement.** Web keeps its import paths by re-exporting from `apps/web/src/island/habitats.ts`.
- [ ] **Step 4: Run** `pnpm exec vitest run packages/shared && pnpm typecheck` → PASS. Typecheck flags fixtures without `places`: add `places: []` in test fixtures only.
- [ ] **Step 5: Commit** `feat(shared): expedition contracts, 6-element starter kit, shared habitat rule`.

### Task 2: Places content and cost model

**Files:** Modify `packages/content/data/economy.yaml`, `src/economy.ts`, `src/validate.ts`, `src/cli.ts`, `data/chemicals.yaml` (header comment only); `apps/api/src/boot.ts`. Test `packages/content/test/{economy,validate,load}.test.ts`.

**Interfaces:** `validateEconomy(c, e, extractorIds)`; `productionCosts(c, e, extractorIds)` (seeds: extractor 0, place drops `fee / sum of bonus yields`, minimum over places); `validateCatalog` reachability starts from `EXTRACTOR_ELEMENTS ∪ all place drops` (pass the drop ids in; keep its signature backward-compatible with an optional parameter).

- [ ] **Step 1: Failing tests:** `the shipped economy validates with 0 issues`; `fee-0 place drop with floor 5 → FLOOR_FREE_RANGE`; `paid place drop with floor above fee/yield → FLOOR_ABOVE_COST` (iron: 10 / 7 = 1.43, fe2o3 floor 2 flagged); `PLACE_DROP_UNKNOWN` for a drop not in the catalog; `PLACE_DUPLICATE` for a repeated id; `si cost = 20 via c_sio2_si`; `no compound is unreachable from extractor + place drops`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/content` → FAIL.
- [ ] **Step 3: Implement** the places table and floor changes from Global Constraints; new issue codes join `IssueCode`.
- [ ] **Step 4: Run** `pnpm exec vitest run packages/content && pnpm --filter @chemimon/content validate` → PASS, 0 issues.
- [ ] **Step 5: Commit** `feat(content): expedition places and priced sources in the cost model`.

### Task 3: Starter kit, discoveries, Codex, quests (API)

**Files:** Create migration `apps/api/prisma/migrations/<ts>_expeditions/`; Modify `schema.prisma`, `src/player/grant.ts`, `src/extractor/routes.ts`, `src/breeding/service.ts`, `src/codex/routes.ts`, `src/quests/{quests,routes}.ts`; tests `apps/api/test/{auth,me,codex,quests,extractor,seed,wallet}.test.ts`, `helpers/fixtureCatalog.ts`, `helpers/fixtureEconomy.ts`.

**Interfaces:** `recordDiscoveries(tx, playerId, chemicalIds, source, now): Promise<string[]>` (returns the ids that were new; `createMany skipDuplicates`; for `breeding` also sets `bred_at` where null). Migration creates `expeditions` and `player_permits` too (Task 4 uses them).

- [ ] **Step 1: Failing tests:** register → inventory 6 × 4, 200 Xu, Codex `owned` exactly the 6; extractor `fe` → 400 `EXTRACTOR_NOT_ELIGIBLE`, `mg` → 200 and Codex shows mg; breeding fe2o3 + h2 → fe gets `bred_at`, quest `refine-iron` done; a compound first got by another source then bred counts for `discover-3`; migration test: a user with old rows sees 25 elements known and keeps compound quest progress; quests list has 14 in the stated order.
- [ ] **Step 2: Run** `pnpm exec vitest run --project api` → FAIL.
- [ ] **Step 3: Implement.** Breeding records discoveries for every product (elements too) with source `breeding`; First Discovery stays compounds-only. Codex: an element is `owned` when it has a discovery row, else `unknown`.
- [ ] **Step 4: Run** `pnpm exec vitest run --project api && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(api): 6-element starter kit, discovery sources, unknown elements`.

### Task 4: Expeditions and permits (API)

**Files:** Create `apps/api/src/expeditions/{routes,service}.ts`, `src/permits/routes.ts`; Modify `src/app.ts` (mount, `timeScale.expedition`), `src/server.ts` (`EXPEDITION_TIME_SCALE`, default 1). Test `apps/api/test/{expeditions,permits}.test.ts`.

**Interfaces:** `GET /api/expeditions`, `POST /api/expeditions`, `POST /api/expeditions/:id/collect`, `POST /api/permits` with the Task 1 schemas. Duration = `durationS * 1000 * timeScale.expedition`.

- [ ] **Step 1: Failing tests:** each error of the send order, in order (one test each); fee 0 writes no ledger row; fee 10 writes `expedition_fee`; sent monster leaves inventory and returns on collect; bonus yield with a matching habitat; `NOT_READY`; collect twice (sequential and concurrent) adds once and returns equal bodies; permit then send to `air`; concurrent double permit; collect records discoveries with source `expedition`; another player's trip id → `NOT_FOUND`; no-dead-end: 0 Xu, empty inventory → extractor h2 → sand trip with h2 → collect → sell sio2 → coins > 0.
- [ ] **Step 2: Run** `pnpm exec vitest run --project api` → FAIL.
- [ ] **Step 3: Implement** in the locked transaction, mirroring breeding start/collect.
- [ ] **Step 4: Run** `pnpm exec vitest run --project api && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(api): expeditions and permits`.

### Task 5: Dock building (Blender) and island layout

**Files:** Modify `art/blender/island.py` (`build_dock`, beside `build_market`), `apps/web/src/island/layout.json` (`buildings.dock`), `apps/web/src/island/Buildings.tsx` (fallback top + sign); outputs `apps/web/public/assets/island/dock.glb`, regenerated `island.glb`. Test `apps/web/test/islandPlacement.test.ts`.

- [ ] **Step 1: Failing test:** layout has `dock` at (-16, 6) r 2.2, inside the island ellipse, not overlapping any habitat or building.
- [ ] **Step 2: Build** a wooden pier with a cart and a signpost; run the Blender script headless; check ≤ 8000 tris, ≤ 1 MB.
- [ ] **Step 3: Run** `pnpm exec vitest run --project @chemimon/web` → PASS.
- [ ] **Step 4: Commit** `feat(art): expedition dock on the island`.

### Task 6: Web: expedition panel, extractor list, unknown elements

**Files:** Create `apps/web/src/expeditions/ExpeditionPanel.tsx`; Modify `src/state/ui.ts` (`Panel` gains `'expedition'`), `src/island/Buildings.tsx` (dock → open), `src/lab/LabScreen.tsx` (header button "Khai thác", running trips in the bottom-left list), `src/api/queries` (`useExpeditions`, `useStartExpedition`, `useCollectExpedition`, `useBuyPermit`), `src/extractor/ExtractorButton.tsx` (`EXTRACTOR_ELEMENTS`), `src/codex/*` (unknown elements). Tests in `apps/web/test/`.

Panel (modal, same style as "Phòng lai tạo", aria-label "Bến khai thác"): one card per place with drops, time, fee, and either "Gửi quái" or "Mua giấy phép · N Xu"; picking a monster shows owned monsters as pictures (reuse the breeding picture grid) and the yield it would bring, marking "+50%" when the habitat matches; running trips show a countdown and "Nhận" when ready. Errors in own words: "Không đủ Xu.", "Đã hết chỗ: tối đa 2 chuyến.", "Nơi này cần giấy phép.".

- [ ] **Step 1: Failing tests:** panel renders 8 places, locked ones show the permit price; send calls the API and closes the picker; ready trip shows "Nhận"; extractor list has 16 options; Codex shows an unknown element as "?".
- [ ] **Step 2–4:** implement, `pnpm exec vitest run --project @chemimon/web && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(web): expedition dock panel, 16-element extractor, unknown elements`.

### Task 7: End-to-end

**Files:** Modify `e2e/loop.spec.ts`, `e2e/island.spec.ts`, `e2e/env.ts` (`EXPEDITION_TIME_SCALE` small, as breeding).

- [ ] **Step 1:** loop: new player sees 6 kinds and 200 Xu; sends an H₂ to Bãi cát; collects; Codex shows SiO₂; sells SiO₂; quest `expedition-first` done; buys the `air` permit, balance drops by 60.
- [ ] **Step 2:** island: dock click opens the panel; screenshot `island-dock.png`.
- [ ] **Step 3: Run** `pnpm e2e` (alone on the test DB) → all pass. Commit `test(e2e): expedition loop`.
