# CHEMIMON Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A web 3D chemistry monster game where a player registers, gets starter element monsters, breeds them under chosen reaction conditions, and receives server-decided products recorded in a Codex with First Discovery. The full loop runs end to end on placeholder 3D monsters.

**Architecture:** This is a pnpm monorepo. `packages/shared` holds the zod contract and the domain types. `packages/chem-engine` is a pure deterministic resolver with no I/O. `packages/content` holds the YAML chemistry data, a loader and a validator. `apps/api` is a Hono server on Prisma + PostgreSQL that decides every result inside per-player transactions. `apps/web` is a Vite React client: a react-three-fiber lab scene with React overlays. It only sends requests and renders results.

**Tech Stack:** Node 22, pnpm 10, TypeScript 5 strict ESM, vitest 3, zod 4, Hono 4 with @hono/node-server, Prisma 7 with @prisma/adapter-pg, PostgreSQL 16 (docker), @node-rs/argon2, yaml 2, React 19, Vite 7, three + @react-three/fiber 9 + @react-three/drei 10, @react-three/test-renderer, TanStack Query 5, Zustand 5, Tailwind 4 (@tailwindcss/vite), Testing Library, Playwright.

**Spec:** `docs/specs/2026-11-20-chemimon-slice1-design.md` (Vietnamese). Background: `docs/reference/CHEMIMON_Project_Master_Plan.md`.

## Global Constraints

- Package names: `@chemimon/shared`, `@chemimon/chem-engine`, `@chemimon/content`, `@chemimon/api`, `@chemimon/web`.
- Ports: api `3101`, web dev `5173`, postgres `5433` (host). DBs: `chemimon_dev`, `chemimon_test`. Vite proxies `/api` → `http://localhost:3101`.
- All HTTP routes live under `/api`. Every request and response body is parsed with a schema from `@chemimon/shared`. Errors use the shape `{ error: { code: ErrorCode, message: string } }`.
- **Dependencies are installed only in Task 1.** Later tasks must not add packages and must not touch `pnpm-lock.yaml`. If a dependency is missing, stop and report it to the controller.
- **Parallel lanes run in separate git worktrees** (superpowers:using-git-worktrees). One lane edits only its own package directory, as listed in each task's Files block. The controller merges lanes.
- No RNG anywhere in result logic. The same inputs and the same conditions always give the same result.
- The client never decides products, counts, discoveries or resources.
- Condition values (spec 6.3): temperatures °C `[-78, 25, 200, 450, 1000, 2500]`; pressures atm `[1, 10, 100, 200]`; catalysts `none | Fe | Pt | V2O5 | MnO2`; environments `air | inert | water`; activations `none | spark | light`.
- Breeding limits: 1 or 2 distinct species, 1 to 4 monsters each, 2 concurrent breeding slots, rule duration 10 to 60 s.
- Starter kit: 4 of each of the 25 starter elements. Extractor: 1 monster per claim, 60 s cooldown, cap 12 per element. These numbers live in `packages/shared/src/config.ts`, never inline.
- Starter element chemical ids, in standard state (spec 6.1): `h2 he c n2 o2 f2 ne na mg al si p4 s8 cl2 ar k ca fe cu zn ag i2 au hg pb`.
- Discovery and First Discovery apply to compounds only. Starter and Extractor monsters never count as discoveries.
- The UI shows a player's `displayName`. The email never appears in any API response except the player's own `/api/me`.
- Banned content (validator-enforced): COCl2, HCN, ClF3, NCl3, NH4NO3, KClO3, NaClO3, KClO4, NaClO4, NaN3, Pb(N3)2, Hg(CNO)2, and any chemical whose id is in `BANNED_FORMULAS` in `packages/content/src/banned.ts`.
- `BREEDING_TIME_SCALE` env var (default `1`) multiplies rule durations. Tests and e2e set it to `0`. `EXTRACTOR_COOLDOWN_SCALE` works the same way.

## Review Focus

1. **Double submit of Start:** two concurrent `POST /api/breeding` when stock covers only one. Expect exactly one `STARTED`; the other gets `409 INSUFFICIENT_MONSTERS`; the count never goes negative. → Task 12.
2. **Third breeding while 2 slots run:** two concurrent requests when 1 slot is free. Expect one `STARTED` and one `409 SLOTS_FULL`. → Task 12.
3. **Collect early, twice, or someone else's session:** before `readyAt` → `409 NOT_READY`; a second collect → same body and no extra monsters; another player's id → `404 NOT_FOUND`. → Task 12.
4. **Malformed breeding input:** the same species in both slots, count 0 or 5, unknown chemical id, a value off the condition grid. Expect `400 VALIDATION` and nothing consumed. → Task 2 (schema) and Task 12 (route).
5. **Missing or broken .glb:** the manifest lists a key whose file 404s or fails to parse. Expect the placeholder to render and no crash of the canvas. → Task 10.

---

## Execution Waves

```
Wave 0 (serial)   T1 scaffold → T2 shared contract
Wave 1 (4 lanes)  E: T3 → T4        C: T5 → (wait T4 merged) → T6
                  A: T7 → T8        W: T9 → T10
GATE G1           user reviews drafted reactions (T6 CLI), approved rules move to data/reactions.yaml
Wave 2 (2 lanes)  A: T11 → T12      W: T13 → T14
Wave 3 (serial)   T15 e2e + dev runner
```

Waves 1 and 2 load drafts with `includeDrafts: true` until G1 is done, so G1 does not block coding.

---

### Task 1: Monorepo scaffold, all dependencies, Postgres

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.workspace.ts`, `docker-compose.yml`, `.env.example`, `.nvmrc`
- Create: `packages/{shared,chem-engine,content}/{package.json,tsconfig.json,src/index.ts,test/smoke.test.ts}`
- Create: `apps/api/{package.json,tsconfig.json,src/index.ts,test/smoke.test.ts}`, `apps/web/{package.json,tsconfig.json,vite.config.ts,index.html,src/main.tsx,test/smoke.test.tsx}`
- Create: `docker/postgres-init.sql` (creates `chemimon_dev` and `chemimon_test`)

**Interfaces:**
- Produces: root scripts `test` (vitest across the workspace), `typecheck` (`tsc -b` over all packages), `db:up` (`docker compose up -d postgres`). Workspace deps: web and api depend on `@chemimon/shared`, `@chemimon/chem-engine`, `@chemimon/content` via `workspace:*`. Content depends on shared + chem-engine. chem-engine depends on shared.
- Every dependency named in Tech Stack is installed in the package that uses it: `pg`, the prisma packages, argon2 and hono in api; `yaml` and `tsx` in content; three/r3f/drei/test-renderer/query/zustand/tailwind/testing-library/jsdom in web; `@playwright/test` at root.

- [ ] **Step 1:** Write each smoke test to import the package's `index.ts` and assert `true`. The web smoke test renders `<App/>` and finds the text `CHEMIMON`.
- [ ] **Step 2:** Run `pnpm install && pnpm test`. Expected: all 5 smoke tests PASS.
- [ ] **Step 3:** Run `pnpm db:up && docker compose exec postgres psql -U chemimon -lqt | cut -d'|' -f1 | grep chemimon_`. Expected: both DB names print.
- [ ] **Step 4:** Run `pnpm typecheck`. Expected: exit 0.
- [ ] **Step 5:** Commit `chore: scaffold monorepo, deps, postgres`.

---

### Task 2: `@chemimon/shared` contract

**Files:**
- Create: `packages/shared/src/{conditions.ts,domain.ts,api.ts,errors.ts,config.ts,index.ts}`
- Test: `packages/shared/test/{conditions.test.ts,api.test.ts}`

**Interfaces:**
- Produces (exact names, used by every later task):
  - `TEMPERATURES_C`, `PRESSURES_ATM`, `CATALYSTS`, `ENVIRONMENTS`, `ACTIVATIONS` (as const tuples). `ConditionsSchema` → `Conditions = { temperatureC, pressureAtm, catalyst, environment, activation }`, each restricted to its tuple.
  - `domain.ts`: `ChemicalId = string`; `ChemicalDef { id, formula, name, kind: 'element'|'compound', atomicNumber?, group?, period?, phaseAt25C: 'solid'|'liquid'|'gas', family: string }`; `Silhouette = 'cloud'|'block'|'orb'|'spiky'|'crystal'|'fused'`; `Rarity = 'common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic'`; `MonsterDef { id, chemicalId, displayName, rarity, silhouette, color: string /* #rrggbb */, assetKey, blurb }`; `Range { min: number; max: number }`; `RuleConditions { temperatureC?: Range; pressureAtm?: Range; catalyst?: Catalyst[]; environment?: Environment[]; activation?: Activation }`; `ReactionDef { id, inputs: {chemicalId, coefficient}[] /* 1 or 2 */, outputs: {chemicalId, coefficient}[], ratio?: Range /* count(first)/count(second), inputs sorted by chemicalId */, conditions: RuleConditions, priority: number, durationS: number, source: string, reviewed: boolean }`; `Catalog { chemicals: ChemicalDef[]; monsters: MonsterDef[]; reactions: ReactionDef[] }`; `StackCount { chemicalId; count }`.
  - `api.ts` schemas plus inferred types: `RegisterRequest {email, password (8..128), displayName (3..20, [A-Za-z0-9_])}`, `LoginRequest`, `MeResponse { player:{id,email,displayName}, inventory: StackCount[], sessions: SessionView[], extractor:{ nextClaimAt: string|null } }`, `SessionView { id, status:'running'|'ready'|'collected', inputs: StackCount[], conditions, readyAt }`, `BreedingRequest { inputs: StackCount[] (1..2 items, distinct ids, count int 1..4), conditions }`, `BreedingResponse = {status:'STARTED', sessionId, readyAt, consumed: StackCount[]} | {status:'NO_REACTION'}`, `CollectResponse { products: StackCount[], newDiscoveries: ChemicalId[], firstDiscoveries: ChemicalId[] }`, `CatalogResponse { chemicals, monsters }` (no reactions), `CodexEntry { chemicalId, state:'unknown'|'owned'|'discovered', count, firstDiscoverer: {displayName, at}|null }`, `CodexResponse { entries: CodexEntry[] }`, `ExtractorClaimRequest { chemicalId }`, `ExtractorClaimResponse { inventory: StackCount, nextClaimAt }`.
  - `errors.ts`: `ErrorCode = 'VALIDATION'|'UNAUTHORIZED'|'INVALID_CREDENTIALS'|'EMAIL_TAKEN'|'DISPLAY_NAME_TAKEN'|'UNKNOWN_CHEMICAL'|'INSUFFICIENT_MONSTERS'|'SLOTS_FULL'|'NOT_READY'|'NOT_FOUND'|'EXTRACTOR_COOLDOWN'|'EXTRACTOR_CAP'|'EXTRACTOR_NOT_ELIGIBLE'`; `ApiErrorBody` schema.
  - `config.ts`: `STARTER_ELEMENTS` (25 ids, Global Constraints order), `STARTER_COUNT = 4`, `EXTRACTOR_COOLDOWN_S = 60`, `EXTRACTOR_CAP = 12`, `BREEDING_SLOTS = 2`, `MAX_COUNT_PER_INPUT = 4`.

- [ ] **Step 1:** Write tests. `conditions.test.ts`: `ConditionsSchema` accepts `{temperatureC:25,pressureAtm:1,catalyst:'none',environment:'air',activation:'spark'}` and rejects `temperatureC: 30` and `catalyst:'Ni'`. `api.test.ts`: `BreedingRequest` rejects the same id twice, count `0`, count `5`, 3 inputs and empty inputs, and accepts `[{chemicalId:'h2',count:2},{chemicalId:'o2',count:1}]`. `RegisterRequest` rejects displayName `a b`. `STARTER_ELEMENTS.length === 25`, with no duplicates.
- [ ] **Step 2:** Run `pnpm --filter @chemimon/shared test`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement the files listed under Produces.
- [ ] **Step 4:** Run the tests again. Expected: PASS. Then run `pnpm typecheck`. Expected: exit 0.
- [ ] **Step 5:** Commit `feat(shared): domain types, api contract, game config`.

---

### Task 3: chem-engine formula parser and element balance (Lane E)

**Files:**
- Create: `packages/chem-engine/src/{formula.ts,balance.ts}`, export them from `src/index.ts`
- Test: `packages/chem-engine/test/{formula.test.ts,balance.test.ts}`

**Interfaces:**
- Consumes: `ReactionDef` from shared.
- Produces: `parseFormula(formula: string): Record<string, number>` (throws `FormulaError` with the offending formula). `isBalanced(r: ReactionDef, formulaOf: (id: string) => string): { ok: true } | { ok: false; diff: Record<string, number> }`. Here `diff` is element → (outputs − inputs) for non-zero entries.

- [ ] **Step 1:** Write tests. `parseFormula('H2O')` → `{H:2,O:1}`; `'Ca(OH)2'` → `{Ca:1,O:2,H:2}`; `'Fe3O4'` → `{Fe:3,O:4}`; `'S8'` → `{S:8}`; `'Pb3O4'`; `'Hg'` → `{Hg:1}`. `'h2o'`, `'H2)O'` and `''` throw `FormulaError`. `isBalanced` returns ok for 2H2 + O2 → 2H2O, and returns `{ok:false, diff:{O:-1}}` for H2 + O2 → H2O.
- [ ] **Step 2:** Run `pnpm --filter @chemimon/chem-engine test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Use a recursive-descent parser over `Element = [A-Z][a-z]?`, digits and parentheses. Hydrates (`·`) are not supported and throw.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(chem-engine): formula parser and balance check`.

---

### Task 4: chem-engine resolver and enumeration (Lane E)

**Files:**
- Create: `packages/chem-engine/src/{resolve.ts,enumerate.ts}`, export them from `src/index.ts`
- Test: `packages/chem-engine/test/{resolve.test.ts,enumerate.test.ts}`

**Interfaces:**
- Consumes: shared `ReactionDef`, `Conditions`, `StackCount`, condition tuples, `MAX_COUNT_PER_INPUT`.
- Produces:
  - `type ResolveResult = { status: 'REACTION'; ruleId: string; durationS: number; consumed: StackCount[]; products: StackCount[]; returned: StackCount[] } | { status: 'NO_REACTION' }`
  - `resolve(rules: ReactionDef[], inputs: StackCount[], conditions: Conditions): ResolveResult`
  - `specificity(r: ReactionDef): number` = number of defined keys in `conditions`, plus 1 if `ratio` is set.
  - `enumerateOutcomes(rules: ReactionDef[], inputIds: string[]): { inputs: StackCount[]; conditions: Conditions; winners: ReactionDef[] }[]`. It covers every count combination from 1 to `MAX_COUNT_PER_INPUT` per input and every point of the condition grid (1080 points). `winners` holds the matching rules tied at the top (priority, then specificity). An empty array means no reaction.

Resolver algorithm (spec 6.4, exact):
```
sort inputs by chemicalId; candidate = rules whose sorted input ids equal input ids
match(r): ratio (if 2 inputs and r.ratio) min <= a/b <= max
          temperatureC/pressureAtm: value within [min,max] inclusive
          catalyst/environment: value ∈ list;  activation: equal
          undefined axis matches anything
runs(r) = min over inputs of floor(count_i / coefficient_i); require runs >= 1
pick max by (priority, specificity); if still >1 → throw ContentTieError(ruleIds)
consumed_i = coefficient_i * runs;  returned_i = count_i - consumed_i (omit zeros)
products_j = coefficient_j * runs
```

- [ ] **Step 1:** Write the resolve tests with a fixture of 4 rules. Rule `co2`: C + O2 → CO2, T ≥ 450, ratio max 1. Rule `co`: 2C + O2 → 2CO, T ≥ 450, ratio min 2. Rule `h2o`: 2H2 + O2 → 2H2O, activation spark. Rule `caco3_dec`: CaCO3 → CaO + CO2, T ≥ 1000. Assert:
  - `{c:1,o2:1}` at 1000 °C → `co2`, products `[{co2:1}]`.
  - `{c:2,o2:1}` at 1000 °C → `co`, products `[{co:2}]`.
  - `{c:1,o2:1}` at 25 °C → `NO_REACTION`.
  - `{h2:3,o2:1}` with spark → products `[{h2o:2}]`, consumed `{h2:2,o2:1}`, returned `[{h2:1}]`.
  - `{h2:2,o2:1}` with activation `none` → `NO_REACTION`.
  - Input order `[o2,h2]` gives the same result as `[h2,o2]`.
  - `{caco3:1}` at 1000 → `[{cao:1},{co2:1}]`.
  - Two equal-priority, equal-specificity rules that both match → throws `ContentTieError`.
- [ ] **Step 2:** Write the enumerate test. For `['c','o2']` on the fixture, the set of distinct winner-id sets includes `{co2}` and `{co}`, and every entry has `winners.length <= 1`.
- [ ] **Step 3:** Run `pnpm --filter @chemimon/chem-engine test`. Expected: FAIL.
- [ ] **Step 4:** Implement `resolve.ts` and `enumerate.ts`. `enumerateOutcomes` must collect ties into `winners` instead of throwing.
- [ ] **Step 5:** Run the tests. Expected: PASS.
- [ ] **Step 6:** Commit `feat(chem-engine): deterministic resolver and outcome enumeration`.

---

### Task 5: Content data drafts and loader (Lane C)

**Files:**
- Create: `packages/content/data/{chemicals.yaml,monsters.yaml,reactions.yaml}`, `packages/content/data/drafts/reactions.yaml`
- Create: `packages/content/src/{load.ts,banned.ts}`, export from `src/index.ts`
- Test: `packages/content/test/load.test.ts`

**Interfaces:**
- Consumes: shared domain types and `STARTER_ELEMENTS`.
- Produces: `loadCatalog(opts?: { includeDrafts?: boolean; dataDir?: string }): Catalog` (sync; parses with zod; throws `ContentLoadError` listing the file and the path of every issue). `BANNED_FORMULAS: readonly string[]`.

Content rules for the data:
- `chemicals.yaml`: the 25 starter elements, with correct atomic number, group, period and phase at 25 °C, and `formula` in standard state (`H2`, `P4`, `S8`, ...). Plus exactly **20 compounds**.
- `monsters.yaml`: one monster per chemical (45 total). `assetKey` equals the chemical id. Silhouette by family: gases → `cloud`, metals → `block`, noble gases → `orb`, halogens → `spiky`, metalloids and nonmetal solids → `crystal`, compounds → `fused`. Each monster has a distinct `color`. Names are original, never names from existing games.
- `drafts/reactions.yaml`: 40 to 60 rules, all `reviewed: false`, each with a `source` URL. At least 8 input pairs must give ≥ 2 different product sets depending on conditions or ratio. Use only reactions you can cite. Candidates known to branch: C + O2 (CO2 / CO by ratio); Cu + O2 (CuO / Cu2O at ≥ 1000 °C); Na + O2 (Na2O / Na2O2); Fe + O2 (Fe3O4 / Fe2O3); P4 + O2 (P4O6 / P4O10 by ratio); NH3 + O2 (NO + H2O with Pt / N2 + H2O without); C + H2O (CO + H2 / CO2 + H2); Pb + O2 (PbO / Pb3O4). Pick the 20 compounds so these chains and some single-branch reactions are reachable from the starters (for example H2O, HCl, NaCl, MgO, Al2O3, SiO2, SO2, NO, NH3).
- `reactions.yaml` starts as an empty list `[]`. Only G1 fills it.
- Nothing on the banned list. No reaction steps or real-world quantities in `blurb` or `name`.

- [ ] **Step 1:** Write tests. `loadCatalog()` returns 45 chemicals, 45 monsters and 0 reactions. `loadCatalog({includeDrafts:true}).reactions.length` is between 40 and 60. Every `STARTER_ELEMENTS` id is present with `kind:'element'`. A temp `dataDir` with a malformed rule makes `loadCatalog` throw `ContentLoadError`, and the message contains the rule's YAML path.
- [ ] **Step 2:** Run `pnpm --filter @chemimon/content test`. Expected: FAIL.
- [ ] **Step 3:** Implement `load.ts` and `banned.ts`, then write the data files.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(content): catalog data drafts and loader`.

---

### Task 6: Content validator and review CLI (Lane C, after Task 4 is merged)

**Files:**
- Create: `packages/content/src/{validate.ts,cli.ts,review.ts}`
- Modify: `packages/content/package.json` (scripts `validate`, `review`, `approve`)
- Test: `packages/content/test/validate.test.ts`

**Interfaces:**
- Consumes: `loadCatalog`, chem-engine `parseFormula`, `isBalanced`, `enumerateOutcomes`.
- Produces: `validateCatalog(c: Catalog, opts: { requireReviewed: boolean; minBranchingPairs: number }): ValidationIssue[]` where `ValidationIssue = { code: 'BAD_FORMULA'|'UNBALANCED'|'UNKNOWN_CHEMICAL'|'MISSING_MONSTER'|'TIE'|'UNREACHABLE'|'BANNED'|'NOT_REVIEWED'|'TOO_FEW_BRANCHES'|'BAD_DURATION'; ref: string; detail: string }`.
- CLI (`tsx src/cli.ts`):
  - `validate [--drafts]` exits 1 on any issue. With `--drafts` it uses `requireReviewed:false` and `minBranchingPairs: 8`. Without it, it uses `requireReviewed:true` and `minBranchingPairs: 0`.
  - `review` writes `docs/content-review.md`: one row per draft rule with id, the equation in formulas, conditions in words, ratio, and source link.
  - `approve <id...>` moves those rules from drafts to `data/reactions.yaml`, sets `reviewed: true`, and keeps both files sorted by id.

Checks: every formula parses; every rule balances; all referenced ids exist; every chemical has a monster; `durationS` is in 10..60; no `TIE` from `enumerateOutcomes` for any input set present in rules; reachability is a fixed point from `STARTER_ELEMENTS` over rule inputs ⊆ reachable, and every compound must be reachable; banned ids and formulas are rejected; branching pairs = input sets whose enumerated winner sets give ≥ 2 distinct product sets.

- [ ] **Step 1:** Write tests on in-memory catalogs. Each issue code is produced by a minimal bad fixture (one test per code). The shipped drafts (`includeDrafts:true`) give `[]` under `{requireReviewed:false, minBranchingPairs:8}`. `approve` on a temp dir moves one rule and flips `reviewed`.
- [ ] **Step 2:** Run `pnpm --filter @chemimon/content test`. Expected: FAIL.
- [ ] **Step 3:** Implement. If the shipped drafts fail a check, fix the data, not the check.
- [ ] **Step 4:** Run the tests, then `pnpm --filter @chemimon/content validate --drafts` and `pnpm --filter @chemimon/content review`. Expected: PASS, exit 0, and `docs/content-review.md` exists.
- [ ] **Step 5:** Commit `feat(content): validator and review/approve CLI`.

**GATE G1 (controller, after Task 6 is merged):** Send the user `docs/content-review.md` and pause the content lane only. When the user lists approved ids, run `approve <ids>` and `validate`, then commit `content: approve reviewed reactions`. Rejected rules stay in drafts with the user's note added as a YAML comment.

---

### Task 7: API database schema, Prisma client, catalog seed, test harness (Lane A)

**Files:**
- Create: `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, `apps/api/prisma/migrations/*` (generated, plus hand-added SQL `CHECK (count >= 0)` on `player_monsters`)
- Create: `apps/api/src/db.ts`, `apps/api/src/seed.ts`, `apps/api/test/helpers/db.ts`
- Modify: `apps/api/package.json` (scripts `db:migrate`, `db:seed`), `apps/api/vitest.config.ts` (`fileParallelism: false`, `env.DATABASE_URL` → `chemimon_test`)
- Test: `apps/api/test/seed.test.ts`

**Interfaces:**
- Consumes: shared `Catalog`; content `loadCatalog`.
- Produces: the tables from spec §9, with these exact columns: `users(id uuid, email unique, display_name unique, password_hash, created_at)`, `sessions(id text pk, user_id, expires_at)`, `chemicals`, `monsters`, `reactions(id, priority, duration_s, conditions jsonb, ratio jsonb null, source, reviewed)`, `reaction_inputs`, `reaction_outputs`, `player_monsters(player_id, chemical_id, count) pk(player_id, chemical_id)`, `breeding_sessions(id uuid, player_id, inputs jsonb, conditions jsonb, status 'running'|'collected', result jsonb, collect_outcome jsonb null, reaction_id, started_at, ready_at)`, `player_discoveries pk(player_id, chemical_id)`, `first_discoveries(chemical_id pk, player_id, discovered_at)`, `extractor_state(player_id pk, last_claim_at)`.
- `createDb(url: string): PrismaClient` (with `@prisma/adapter-pg`). `seedCatalog(db, catalog: Catalog): Promise<void>` upserts chemicals, monsters and reactions with their inputs and outputs in one transaction, and deletes reactions absent from the catalog. Test helper `resetPlayerData(db)` truncates the player tables and leaves catalog tables alone.

- [ ] **Step 1:** Write `seed.test.ts`. After `seedCatalog(db, loadCatalog({includeDrafts:true}))`, there are 45 chemicals and N reactions with inputs. Seeding twice leaves the counts unchanged. Seeding a catalog without rule X deletes X. Inserting `player_monsters.count = -1` raises the check-constraint error.
- [ ] **Step 2:** Run `pnpm --filter @chemimon/api test seed`. Expected: FAIL.
- [ ] **Step 3:** Write the schema, run `prisma migrate dev --name init` against `chemimon_dev`, add the CHECK constraint into the migration SQL, then implement `db.ts`, `seed.ts` and the helpers.
- [ ] **Step 4:** Run `pnpm --filter @chemimon/api exec prisma migrate deploy` with the test DB URL, then run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(api): prisma schema, migrations, catalog seed`.

---

### Task 8: API app, auth and `/api/me` (Lane A)

**Files:**
- Create: `apps/api/src/{app.ts,server.ts,auth/routes.ts,auth/session.ts,auth/password.ts,http/errors.ts,http/validate.ts,player/me.ts,player/grant.ts}`
- Test: `apps/api/test/{auth.test.ts,me.test.ts}`

**Interfaces:**
- Consumes: Task 7 `createDb`, shared schemas and config.
- Produces:
  - `createApp(deps: { db: PrismaClient; catalog: Catalog; now: () => Date; timeScale: { breeding: number; extractor: number } }): Hono`. Tests call `app.request(...)`. `server.ts` reads env and listens on 3101.
  - Middleware `requirePlayer` sets `c.var.playerId` and returns `401 UNAUTHORIZED` when there is no valid session.
  - Cookie `chm_session`: httpOnly, SameSite=Lax, Path=/, 30 days, value = 32 random bytes base64url.
  - `apiError(c, status, code, message)`. `parseBody(c, schema)` returns 400 VALIDATION with zod issue paths in `message`.
  - `grantStarterKit(tx, playerId)` inserts 4 of each `STARTER_ELEMENTS`. It runs inside the register transaction.
  - `lockPlayer(tx, playerId)` runs `SELECT id FROM users WHERE id = $1 FOR UPDATE`. It is exported for Tasks 11 and 12.
  - Routes: `POST /api/auth/register` → 201 `MeResponse`; `POST /api/auth/login` → 200 `MeResponse`; `POST /api/auth/logout` → 204; `GET /api/me` → `MeResponse` (session `status` is `ready` when `now >= readyAt` and not collected).

- [ ] **Step 1:** Write tests.
  - Register sets the cookie, the inventory has 25 entries each with count 4, and `sessions` is `[]`.
  - Duplicate email → 409 EMAIL_TAKEN. Duplicate displayName → 409 DISPLAY_NAME_TAKEN.
  - Wrong password → 401 INVALID_CREDENTIALS; the same code for an unknown email.
  - `/api/me` without a cookie → 401. After logout, the old cookie → 401. An expired session (`now` moved 31 days ahead) → 401.
  - The password is stored as an argon2id hash (starts with `$argon2id$`).
- [ ] **Step 2:** Run `pnpm --filter @chemimon/api test auth me`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(api): auth, sessions, starter kit, /me`.

---

### Task 9: Web shell, API client, auth screens (Lane W)

**Files:**
- Create: `apps/web/src/{App.tsx,api/client.ts,api/queries.ts,state/ui.ts,auth/LoginForm.tsx,auth/RegisterForm.tsx,styles.css}`
- Modify: `apps/web/vite.config.ts` (proxy, tailwind plugin), `apps/web/src/main.tsx`
- Test: `apps/web/test/{client.test.ts,auth.test.tsx}`

**Interfaces:**
- Consumes: shared schemas and types.
- Produces:
  - `class ApiError extends Error { status: number; code: ErrorCode }`.
  - `apiFetch<S extends z.ZodTypeAny>(path: string, schema: S, init?: RequestInit): Promise<z.infer<S>>`. It uses `credentials:'include'` and JSON. On a non-2xx response it parses `ApiErrorBody` and throws `ApiError`.
  - Hooks: `useMe()` (query key `['me']`; on a 401 it resolves `null` instead of throwing), `useRegister()`, `useLogin()`, `useLogout()` (each invalidates `['me']`).
  - Zustand `useUi`: `{ panel: 'none'|'codex'|'table'|'monster'; selectedChemicalId: string|null; open(panel, id?): void; close(): void }`.
  - `App`: `me === null` → auth screen (tabs login/register); otherwise `<LabScreen/>` (from Task 10; a stub component here, replaced in Task 10).
  - All UI copy is Vietnamese.

- [ ] **Step 1:** Write tests. `client.test.ts` mocks `fetch`: a 409 body `{error:{code:'EMAIL_TAKEN',message:'x'}}` throws `ApiError` with code `EMAIL_TAKEN`; a 200 body that fails the schema throws a zod error. `auth.test.tsx`: register submit posts `{email,password,displayName}` to `/api/auth/register`; a server `DISPLAY_NAME_TAKEN` error shows an inline error under the name field; success renders the lab stub.
- [ ] **Step 2:** Run `pnpm --filter @chemimon/web test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(web): app shell, api client, auth screens`.

---

### Task 10: 3D lab scene, placeholder monsters, model loader (Lane W)

**Files:**
- Create: `apps/web/src/lab/{LabScreen.tsx,LabScene.tsx,BreedingMachine.tsx,HabitatShelf.tsx}`, `apps/web/src/monsters/{PlaceholderMonster.tsx,MonsterModel.tsx,symbolTexture.ts,manifest.ts}`
- Create: `apps/web/public/assets/monsters/manifest.json` (`{"available": []}`)
- Test: `apps/web/test/{placeholder.test.tsx,monsterModel.test.tsx}`

**Interfaces:**
- Consumes: `MonsterDef`, `Silhouette`; `useMe`; the catalog (`useCatalog()` added here in `api/queries.ts`, query key `['catalog']`, `GET /api/catalog`).
- Produces:
  - `<PlaceholderMonster monster={MonsterDef} animation?: 'idle'|'happy'|'sad'|'interact'|'discover' />`. The body geometry is chosen by silhouette: cloud = 3 merged spheres floating; block = rounded box; orb = emissive sphere; spiky = icosahedron with cones; crystal = octahedron; fused = two spheres of the input colors (falls back to `color`). It always adds 2 eyes and a symbol sprite. Root group name `placeholder-${silhouette}`.
  - `symbolTexture(text, color): THREE.CanvasTexture`. It is drawn on a canvas and makes no network font load.
  - `<MonsterModel monster />`. It renders the `.glb` at `/assets/monsters/${assetKey}.glb` via `useGLTF` only when the key is listed in `manifest.json`. It is wrapped in an error boundary + Suspense, and both fall back to `PlaceholderMonster`.
  - `LabScene`: floor, `HabitatShelf` showing up to 12 owned species (largest counts first), `BreedingMachine` at the origin with 2 slot pads. `OrbitControls` with polar angle limits 0.6 to 1.3 rad and distance 6 to 14.
  - `LabScreen` = canvas + overlay header (displayName, buttons Codex / Bảng tuần hoàn). It replaces the Task 9 stub.

- [ ] **Step 1:** Write tests with `@react-three/test-renderer`. Each of the 6 silhouettes renders a group with name `placeholder-<silhouette>`, and no two silhouettes have the same geometry type set. `MonsterModel` with an empty manifest renders the placeholder. With the key in the manifest and a `useGLTF` mock that throws, it renders the placeholder and does not throw (Review Focus 5).
- [ ] **Step 2:** Run `pnpm --filter @chemimon/web test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Then run `pnpm --filter @chemimon/web build`. Expected: PASS, and the build exits 0.
- [ ] **Step 5:** Commit `feat(web): lab scene, placeholder monsters, glb loader with fallback`.

---

### Task 11: API catalog, codex, extractor (Lane A)

**Files:**
- Create: `apps/api/src/catalog/routes.ts`, `apps/api/src/codex/routes.ts`, `apps/api/src/extractor/routes.ts`
- Modify: `apps/api/src/app.ts` (mount routes)
- Test: `apps/api/test/{catalog.test.ts,codex.test.ts,extractor.test.ts}`

**Interfaces:**
- Consumes: `createApp` deps, `requirePlayer`, `lockPlayer`, shared schemas and config.
- Produces:
  - `GET /api/catalog` (public) → `CatalogResponse` from `deps.catalog`. It never includes reactions.
  - `GET /api/codex` → one `CodexEntry` per chemical. Elements: always `owned`, even at count 0 (spec 6.6: a starter element must never fall back to "???"). Compounds: `discovered` if a `player_discoveries` row exists, else `unknown`. `count` comes from inventory. `firstDiscoverer` uses the displayName for compounds with a first discovery, else null.
  - `POST /api/extractor/claim`. Inside a transaction with `lockPlayer`: id not in `STARTER_ELEMENTS` → 400 EXTRACTOR_NOT_ELIGIBLE; `now < last_claim_at + 60s × scale` → 429 EXTRACTOR_COOLDOWN; count ≥ 12 → 409 EXTRACTOR_CAP; otherwise +1 and set `last_claim_at`. It does not write `player_discoveries`.

- [ ] **Step 1:** Write tests. The catalog JSON has no `reactions` key. Codex after register: 25 `owned`, 20 `unknown`, and email is absent from the serialized JSON. After the player's h2 count is set to 0, h2 is still `owned` with count 0. Extractor: claim `h2` → count 5; an immediate second claim → 429; after `now` + 61 s → 200; at count 12 → 409; `h2o` → 400; claims add no discovery rows.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(api): catalog, codex, element extractor`.

---

### Task 12: API breeding and collect (Lane A)

**Files:**
- Create: `apps/api/src/breeding/{routes.ts,service.ts}`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/test/{breeding.test.ts,breeding-concurrency.test.ts}`

**Interfaces:**
- Consumes: chem-engine `resolve`; `lockPlayer`; shared schemas and config.
- Produces:
  - `POST /api/breeding` (body `BreedingRequest`), in one transaction:
    1. `lockPlayer`.
    2. Unknown chemical ids → 400 UNKNOWN_CHEMICAL.
    3. Running sessions ≥ `BREEDING_SLOTS` → 409 SLOTS_FULL.
    4. `resolve(deps.catalog.reactions, inputs, conditions)`. `NO_REACTION` → 200 `{status:'NO_REACTION'}` and nothing is consumed.
    5. For each `consumed`: `updateMany({where:{playerId, chemicalId, count:{gte:n}}, data:{count:{decrement:n}}})`. If any update returns count 0 → throw, roll back, and return 409 INSUFFICIENT_MONSTERS.
    6. Insert the session with `result` = the resolve result and `ready_at = now + durationS × timeScale.breeding`.
    7. Return 201 STARTED.
  - `POST /api/breeding/:id/collect`, in one transaction with `lockPlayer`:
    1. Session not found or not owned → 404.
    2. Already collected → 200 with the stored `collect_outcome`.
    3. `now < ready_at` → 409 NOT_READY.
    4. Upsert-increment products.
    5. For each product chemical of kind compound: `createMany(..., skipDuplicates:true)` into `player_discoveries` (count 1 → newDiscoveries) and `first_discoveries` (count 1 → firstDiscoveries).
    6. Store `collect_outcome`, set status collected.

- [ ] **Step 1:** Write `breeding.test.ts` (timeScale 0 unless noted).
  - h2×2 + o2×1, spark, 25 °C → STARTED; inventory h2 2, o2 3.
  - Collect → products `[{h2o:2}]`, newDiscoveries `['h2o']`, firstDiscoveries `['h2o']`; codex shows `discovered`.
  - A second player doing the same → newDiscoveries `['h2o']` and firstDiscoveries `[]`.
  - A second collect → identical body, and h2o is still 2 (Review Focus 3).
  - With timeScale 1, collect at once → 409 NOT_READY.
  - A foreign session id → 404.
  - `NO_REACTION` leaves the inventory unchanged.
  - A third start while 2 run → 409 SLOTS_FULL.
  - The same id twice, count 5, or temperature 30 → 400 VALIDATION with the inventory unchanged (Review Focus 4).
- [ ] **Step 2:** Write `breeding-concurrency.test.ts`.
  - The player has exactly h2 2 / o2 1. `Promise.all` of 2 identical starts → statuses `[201, 409]` (any order); no count below 0 (Review Focus 1).
  - With 1 slot free and stock for two → `[201, 409 SLOTS_FULL]` (Review Focus 2).
  - Two players collecting sessions that produce the same new compound in parallel → exactly one `first_discoveries` row, and exactly one response lists it.
- [ ] **Step 3:** Run `pnpm --filter @chemimon/api test breeding`. Expected: FAIL.
- [ ] **Step 4:** Implement.
- [ ] **Step 5:** Run the tests. Expected: PASS.
- [ ] **Step 6:** Commit `feat(api): breeding start and collect with discoveries`.

---

### Task 13: Web breeding panel, sessions, discovery overlay (Lane W)

**Files:**
- Create: `apps/web/src/breeding/{BreedingPanel.tsx,ConditionPicker.tsx,SessionList.tsx,DiscoveryOverlay.tsx,useBreeding.ts}`
- Modify: `apps/web/src/lab/LabScreen.tsx` (mount the panel and overlay), `apps/web/src/lab/BreedingMachine.tsx` (a `running` prop that animates)
- Test: `apps/web/test/{breedingPanel.test.tsx,sessionList.test.tsx,discovery.test.tsx}`

**Interfaces:**
- Consumes: `apiFetch`, `useMe`, `useCatalog`, shared schemas and condition tuples, `MonsterModel`.
- Produces:
  - `useStartBreeding()` and `useCollect()` mutations that invalidate `['me']` and `['codex']`.
  - `BreedingPanel`: slot A and B pickers list owned species with counts. Slot B can be empty. The same species cannot be in both slots. The count stepper runs from 1 to min(4, owned). `ConditionPicker` shows the 5 axes as button groups built from the shared tuples, with defaults `25 / 1 / none / air / none`. The Start button is disabled while submitting. `NO_REACTION` shows the toast "Không có phản ứng. Thử đổi điều kiện hoặc tỷ lệ." `SLOTS_FULL` and `INSUFFICIENT_MONSTERS` show their own messages.
  - `SessionList`: per session, a countdown to `readyAt` (1 s tick from the client clock), a Collect button enabled at 0, and `BreedingMachine running` while any session runs.
  - `DiscoveryOverlay`: after collect, a 3D viewer of each product with `animation='discover'`, the text "Khám phá mới!" for `newDiscoveries` and the badge "Người khám phá đầu tiên!" for `firstDiscoveries`.

- [ ] **Step 1:** Write tests with mocked `apiFetch`.
  - Selecting h2 in A removes h2 from B's options.
  - The stepper stops at 4, or at the owned count if lower.
  - Start posts the exact `BreedingRequest`, and double-clicking Start sends 1 request.
  - The `NO_REACTION` toast text matches.
  - SessionList: a session with readyAt in the past has Collect enabled.
  - The overlay shows the first-discovery badge only for ids in `firstDiscoveries`.
- [ ] **Step 2:** Run `pnpm --filter @chemimon/web test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(web): breeding panel, sessions, discovery overlay`.

---

### Task 14: Web codex, periodic table, extractor UI (Lane W)

**Files:**
- Create: `apps/web/src/codex/{CodexPanel.tsx,PeriodicTable.tsx,periodicLayout.ts,MonsterDetail.tsx}`, `apps/web/src/extractor/ExtractorButton.tsx`
- Modify: `apps/web/src/lab/LabScreen.tsx` (mount panels via `useUi`), `apps/web/src/api/queries.ts` (`useCodex`, `useClaimExtractor`)
- Test: `apps/web/test/{codex.test.tsx,periodicLayout.test.ts,extractor.test.tsx}`

**Interfaces:**
- Consumes: `useCodex` (`GET /api/codex`), `useCatalog`, `useUi`, `MonsterModel`.
- Produces:
  - `periodicLayout: Record<number /* atomic number 1..118 */, { row: number; col: number; symbol: string }>`. Standard 18-column layout. Lanthanides on row 9 and actinides on row 10, cols 3..17.
  - `PeriodicTable`: 118 cells. A starter element cell shows its monster thumbnail and count. Other cells are dimmed. Clicking an owned cell opens `MonsterDetail`.
  - `CodexPanel`: a card grid. `unknown` compounds show "???" plus element symbols from `parseFormula(formula)` (symbols only, no counts). `discovered` shows the name, formula and `firstDiscoverer.displayName`. Filters: Tất cả / Nguyên tố / Hợp chất.
  - `MonsterDetail`: a rotatable 3D viewer, name, formula, blurb, rarity and first discoverer.
  - `ExtractorButton`: an element picker plus Claim. It shows a cooldown countdown from `me.extractor.nextClaimAt`, and is disabled at cap with "Đã đủ 12".

- [ ] **Step 1:** Write tests. `periodicLayout` has 118 entries with unique (row,col); H at (1,1), He at (1,18), Fe (26) at (4,8), La (57) at (9,3), U (92) at (10,6). The codex renders "???" and `C`/`O` chips for unknown CO2, and never renders a formula for unknown entries. Extractor: cooldown text while `nextClaimAt` is in the future; the button is disabled when the selected element's count is 12.
- [ ] **Step 2:** Run `pnpm --filter @chemimon/web test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(web): codex, periodic table, extractor`.

---

### Task 15: End-to-end run, dev runner, README

**Files:**
- Create: `e2e/playwright.config.ts`, `e2e/loop.spec.ts`, `scripts/dev.sh`, `README.md`
- Modify: root `package.json` (scripts `dev`, `e2e`), `docker-compose.yml` (nothing else is containerized in Slice 1)

**Interfaces:**
- Consumes: everything.
- Produces: `pnpm dev` runs `db:up`, `prisma migrate deploy`, `db:seed` (drafts included until G1 is done; env `CONTENT_INCLUDE_DRAFTS=1`), then runs api and web concurrently. `pnpm e2e` starts the same stack with `BREEDING_TIME_SCALE=0`, `EXTRACTOR_COOLDOWN_SCALE=0` and `chemimon_test`, then runs Playwright on Chromium.

- [ ] **Step 1:** Write `loop.spec.ts`. Register a random user → the lab canvas is visible → choose h2 ×2 in A and o2 ×1 in B, activation spark → Start → Collect → the overlay shows "Khám phá mới!" and "Người khám phá đầu tiên!" → open Codex → the H2O card shows its name. Second test: reload the page and confirm the session persists (h2o count still shown in Codex).
- [ ] **Step 2:** Run `pnpm e2e`. Expected: FAIL until the wiring exists.
- [ ] **Step 3:** Write `scripts/dev.sh`, the scripts and the README (setup, commands, the G1 content workflow, how to add a `.glb` and list it in `manifest.json`).
- [ ] **Step 4:** Run `pnpm test && pnpm typecheck && pnpm --filter @chemimon/content validate --drafts && pnpm e2e`. Expected: everything passes.
- [ ] **Step 5 (perf check, spec §3):** Add `e2e/perf.spec.ts`. Grant the test player 12 species via the extractor, open the lab, and sample `requestAnimationFrame` for 5 s on desktop Chromium. Expected: mean ≥ 55 fps. Also record a manual check on a mid-range Android Chrome (≥ 30 fps target) in the README as a release checklist item.
- [ ] **Step 6:** Commit `test: end-to-end breeding loop, perf check, dev runner, readme`.
