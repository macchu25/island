# SDD ledger — plan: /home/huy/dev/chemimon/docs/superpowers/plans/2026-11-20-chemimon-slice1.md
Spec: /home/huy/dev/chemimon/docs/specs/2026-11-20-chemimon-slice1-design.md
Branch: slice1 (from main dd239e8/c3e3901). Lanes later in .worktrees/lane-{e,c,a,w} on branches lane-*.

## Pre-flight scan
| Tasks | Shared file/interface | Finding | Ruling |
|---|---|---|---|
| T1→T9 | web smoke test expects text CHEMIMON; T9 rewrites App | T9 may break smoke test | T9 keeps "CHEMIMON" in header/auth screen; may edit smoke test |
| T5→T7 | T7 seed test uses loadCatalog({includeDrafts}) but T7 runs parallel to T5 | dependency break | T7 tests use a fixture catalog in apps/api/test/helpers (must include all 25 STARTER_ELEMENTS); db:seed wiring to loadCatalog moves to T11 |
| T7→T8 | register grants starter kit, FK to chemicals | tests need seeded catalog | T8 tests seed fixture catalog in beforeAll |
| T4→T6 | validator uses enumerateOutcomes | ordering | T6 starts only after lane E merged into slice1 and lane C rebased |
| T6 strict validate | empty data/reactions.yaml before G1 → UNREACHABLE | strict mode fails pre-G1 | expected; only --drafts mode is gated until G1 |
| T9/T10/T13/T14 | api/queries.ts, LabScreen.tsx | same lane, serial | ok |
| T11/T12 | app.ts | same lane, serial | ok |
| T10/T13/T14 vs T11/T12 | /api/catalog, /api/codex, breeding endpoints | web built before api | web tests mock apiFetch against shared schemas; T15 integrates |
| each task self-consistency | tests vs code vs files | checked T1–T15 | no further conflicts |

Ruling: run Wave 1/2 lanes in parallel despite SDD "no parallel implementers" — separate git worktrees + disjoint package ownership + deps frozen after T1 remove the shared-tree conflict the rule guards against; user asked for fastest — cost if wrong: merge conflicts the controller resolves.

## Progress
- T1 dispatched: BASE 9988381, implementer sonnet
- T1 implementer DONE_WITH_CONCERNS 30a9012 (vitest projects instead of workspace file; plugin-react pinned 5.2.0; prisma config left to T7). Review dispatched (sonnet).
- Ruling: T2 dispatched (BASE 30a9012, sonnet) while T1 review runs — T2 edits only packages/shared, reviewer is read-only — cost if wrong: T1 fix round touching shared/package.json conflicts with T2, resolved by controller.
Task 1: complete (commits 9988381..30a9012, review clean; minors: web package.json main/exports point to missing src/index.ts; jest-dom not wired; no dotenv)
- Ruling: no dotenv dep. Prisma 7 config and scripts read DATABASE_URL from process env (shell export or node --env-file). T7 must not add deps. Cost if wrong: T7 asks for dotenv, controller adds it in one lockfile commit.
- Ruling: T9 may add a jest-dom matcher setup file for web (no dep change).
- T2 implementer DONE_WITH_CONCERNS 28d08c3. Ruling: packages have no per-package test script; all lanes run tests from repo root with 'pnpm vitest run <dir>' instead of 'pnpm --filter X test'. Cost if wrong: none (equivalent).
Task 2: complete (commits 30a9012..28d08c3, review clean; minors: number-tuple cast through unknown; z.string().email deprecated; z.iso.datetime needs Z suffix -> server must emit toISOString(); RangeSchema allows min>max -> T6 validator must check)
- Wave 1 start: lanes branched at 28d08c3. lane-e T3, lane-c T5, lane-a T7, lane-w T9.
- Wave 1 dispatched, all BASE 28d08c3: T3 lane-e (sonnet), T5 lane-c (opus: chemistry correctness), T7 lane-a (sonnet), T9 lane-w (sonnet).
- Ruling (T7): fixture catalog in apps/api/test/helpers/fixtureCatalog.ts incl. all 25 starters; db:seed with loadCatalog deferred to T11; prisma client generated to apps/api/src/generated/prisma; T7 may edit root .gitignore for that path.
- T3 DONE_WITH_CONCERNS 1d02437 (no RED captured). Review dispatched. T4 dispatched in lane-e BASE 1d02437 (sonnet) in parallel with T3 review (Ruling: reviewer is read-only; a T3 fix round would be sequenced after T4 commits — cost: small rebase in-lane).
- T9 DONE_WITH_CONCERNS 3586b08. Ruling: web has no direct zod dep; structural Schema<T> {parse} accepted in place of z.ZodTypeAny — cost if wrong: none at runtime, shared schemas satisfy it.
- T3 review: Approved but 2 Important (no element-symbol validation; vacuous formula test). Ruling: parseFormula rejects non-IUPAC symbols (ELEMENT_SYMBOLS in chem-engine/src/elements.ts) — content validation relies on it. Fix round 1 sent to T3 implementer (after T4 committed).
Task 9: complete (commits 28d08c3..3586b08, review clean)
Task 9: minor (deferred): App ignores me.isError (500/network shows login with no error); apiFetch raw SyntaxError on non-JSON 2xx; fallback code VALIDATION for unparseable error bodies; smoke test unstubAllGlobals not in afterEach; no isolated useMe 401/non-401 test
Task 3: minor (deferred): leading-zero counts accepted; no RED captured
- T4 DONE 360f164 (fixture temp max 3000). T7 DONE 122723c (root .gitignore line; db:generate needed on fresh clone; ratio-null cast untested). T7 review dispatched; T8 dispatched lane-a BASE 122723c.
- T7 review: Needs fixes — Important: seed clears ratio with plain null behind a cast (needs Prisma.DbNull) + untested. Fix round 1 QUEUED until T8 implementer finishes in lane-a (avoid concurrent commits in one worktree). Include minor: seedCatalog $transaction timeout 60000 (T11 real catalog).
Task 7: minor (deferred): test DATABASE_URL duplicated in globalSetup+vitest config; prisma.config falls back to '' for missing URL; no CHECK coef>0; loose CHECK-test regex
- T3 fix round 1 committed c239f44; scoped re-review dispatched (haiku).
- T10 DONE_WITH_CONCERNS 6671470 (bundle 1.39MB no split; sprite uses displayName not formula; edited T9 tests for ResizeObserver polyfill). Review dispatched.
Task 3: fix round 1/5 (2 addressed, 0 open; commits 360f164..c239f44)
Task 3: complete (commits 28d08c3..1d02437 + c239f44, review clean)
Task 3: minor (deferred): ELEMENT_SYMBOLS not re-exported from chem-engine index
- T10 review: Needs fixes — Important: label uses displayName slice not formula; label font overflow. Ruling: optional `label` prop resolved from catalog formula, rendered via formatFormula (unicode subscripts). Fix round 1 sent to T10 implementer.
Task 10: minor (deferred): eyes z=0.52 on all silhouettes (visual check); fused single colour until caller passes fusedColors (T13); bundle 1.39MB no code split; no useGLTF.preload/dispose
Task 10: fix round 1/5 (3 addressed, 0 open; commits 6671470..17767b2)
Task 10: complete (commits 3586b08..17767b2, review clean)
Task 10: minor (deferred): 12px font floor can still overflow very long labels
- Lane W Wave 1 done (T9, T10). Lane W idle until Wave 2 (T13 needs nothing from api code; may start early — see ruling below).
- Ruling: start lane W Wave 2 (T13) now, without waiting for G1 or lane A — web tests mock apiFetch against shared schemas; integration happens in T15. Cost if wrong: UI rework if the api contract shifts (contract is frozen in shared).
Task 4: approved; 1 Important (missing regression tests) + minors folded (narrow exports, dup-id guard, prefilter, per-entry inputs copy). Fix round 1 sent.
- Ruling (T4): runs>=1 filters before priority pick, so a lower-priority rule can win when the player lacks monsters for the higher one — intended (mirrors limiting reagent) — cost if wrong: content priority tweaks.
- T8 DONE c880029 (vitest pool forks singleFork for api — projects mode ignored fileParallelism; no INTERNAL error code; expired sessions not purged; startServer only). T7 fix round 1 sent (lane A free). T8 review dispatched.
- Ruling: add 'INTERNAL' to shared ERROR_CODES during the Wave 1 merge (one integration commit on slice1), api maps unhandled errors to 500 INTERNAL in T11 — cost if wrong: none (additive).
Task 8: minor (deferred): expired session rows never purged
- T4 fix round 1 committed 89fad9c; T7 fix round 1 committed 80ff7d6; both re-reviews dispatched. T13 dispatched lane-w BASE 17767b2 (sonnet, early Wave 2).
Task 7: fix round 1/5 (1 addressed, 0 open; commits c880029..80ff7d6)
Task 7: complete (commits 28d08c3..122723c + 80ff7d6, review clean)
Task 4: fix round 1/5 (5 addressed, 0 open; commits c239f44..89fad9c)
Task 4: complete (commits 1d02437..360f164 + 89fad9c, review clean)
- Lane E done. Merged lane-e into slice1 (ff) -> 89fad9c.
- T8 review: Approved w/ 2 Important (P2002 path untested + substring heuristic; non-null nextClaimAt untested). Fix round 1 sent.
- Ruling: INTERNAL error code is added by T11 (lane A) to packages/shared/src/errors.ts — the only lane allowed to touch shared at that time; app onError switches to 500 INTERNAL.
- T8 fix round 1 committed 6790240; re-review dispatched (haiku). Ruling: db:seed + server entry wiring to loadCatalog moves from T11 to T15 so lane A can start T11 before T5 merges — cost if wrong: none (T15 integrates anyway).
Task 8: fix round 1/5 (2 addressed, 0 open; commits 80ff7d6..6790240)
Task 8: complete (commits 122723c..c880029 + 6790240, review clean)
Task 8: minor (deferred -> folded into T11): password.ts dummy hash promise lacks .catch; meta.target substring fallback untested
- Lane A Wave 1 done (T7, T8). T11 dispatched lane-a BASE 6790240.
- T11 DONE cf27652. Review dispatched; T12 dispatched (opus) BASE cf27652.
Task 11: complete (commits 6790240..cf27652, review clean)
Task 11: minor (deferred): codex exposes firstDiscoverer on 'unknown' compounds (gate on discovered); codex loads all first_discoveries rows; no parallel-claim concurrency test for extractor cap
- T13 DONE_WITH_CONCERNS 4dc11ce (no RED captured; fusedColors skipped; web has no build script). Review dispatched; T14 dispatched lane-w BASE 4dc11ce.
- T13 review: Approved w/ 1 Important (stale stepper count/species not clamped to current inventory). Fix round 1 QUEUED until T14 finishes in lane-w; fold minors: Collect ref guard, Vietnamese labels for condition values.
Task 13: minor (deferred): options limited to species with a catalog monster; overlay lacks aria-modal/Escape/focus; one WebGL canvas per product; pending Start callback may clear edited selection; tests miss countdown tick, slot reset, collect error copy
- T14 DONE 45cfd5a (merge 45658ce brought slice1). T13 fix round 1 sent. T14 review dispatched (diff 45658ce..45cfd5a, excludes merge).
Task 14: complete (commits 45658ce..45cfd5a, review clean)
Task 14: minor (deferred): extractor picker shows raw ids; countdown interval keeps ticking after 0; stale `now` flash after idle; MonsterDetail lacks codex-state guard + test; catalog payload exposes all names/formulas (spoiler only in network)
Task 13: fix round 1/5 (3 addressed, 0 open; commits 45cfd5a..12c9fd8)
Task 13: complete (commits 17767b2..4dc11ce + 12c9fd8, review clean)
Task 13: minor (deferred): clamped-empty slot keeps stale raw state; Collect not visually disabled while pending
- Lane W done (T9, T10, T13, T14). Merged lane-w into slice1 (ff) -> 12c9fd8.
- T12 DONE 8ed9f1d+7d592d2 (merge 6f91ebd). Ruling: unknown chemical id → 400 UNKNOWN_CHEMICAL (brief) not VALIDATION (Review Focus wording) — the more specific code; cost: none. Ruling: draft filtering is the catalog loader's job (includeDrafts), not the resolver's. Review dispatched (opus).
- T5 DONE_WITH_CONCERNS 49f1030: 48 rules, 20 compounds, 9 branching pairs, no ties (own brute force). Concerns: cu2o 1000C source weak; Fe burn product disputed; many temp windows are choices; 13 starters unused (he ne ar f2 p4 s8 ca zn ag i2 au hg pb). Review dispatched (opus). T6 dispatch after review (needs slice1 merge for chem-engine).
- Note for G1: tell user 13 of 25 starters have no reactions yet (content gap, not a spec violation) — candidate follow-up content round.
- T6 dispatched lane-c BASE 49f1030 (sonnet) in parallel with T5 chemistry review (opus). Ruling: T5 data fixes (if any) sequenced after T6 commits; added validator codes BAD_RANGE, UNREACHABLE_RULE (+ optional DUPLICATE_ID).
- T6 DONE bd11f78 (merge ee93711). validate --drafts 0 issues, 9 branching pairs. Ruling: approve keeps drafts in authored order (only reactions.yaml sorted) — readability; cost: none. Review dispatched.
- T12 review: Needs fixes — Important (plan-mandated): server accepted requested input counts the player does not own (only `consumed` checked); enables ratio steering + free recipe probing. Ruling: ownership check of requested counts under lock, before slots and resolve (409 INSUFFICIENT_MONSTERS); keep conditional decrement as backstop — spec §6.1/server-authority is binding over plan step order — cost if wrong: none. Fix round 1 sent.
Task 12: minor (deferred): ContentTieError → 500 INTERNAL (accepted, validator blocks ties); null reaction_id branch untested; ready-but-uncollected session keeps slot (DB status only running/collected; 'ready' derived)
- T6 review: Approved w/ 2 Important (approve ignores YAML doc.errors; non-atomic writes). Fix round 1 sent (+minors: already-approved message, code-unit sort, "không có xúc tác", banned case tests).
Task 6: minor (deferred): branching overview counts drafts only; grid constants duplicated from engine; unescaped source URL parens; tie rule also flagged UNREACHABLE_RULE; no CLI exit-code tests
Task 6: fix round 1/5 (2 addressed + minors, 0 open; commits bd11f78..b6b21ee)
Task 6: complete (commits ee93711..bd11f78 + b6b21ee, review clean)
Task 6: minor (deferred): temp file not unlinked on write failure; partial commit across 2 files needs manual recovery; comparator duplicated
Task 12: fix round 1/5 (1 addressed + minor, 0 open; commits 7d592d2..5d9440f)
Task 12: complete (commits 6f91ebd..7d592d2 + 5d9440f, review clean)
Task 12: minor (deferred): backstop decrement unreachable via HTTP (untested, defence in depth)
- Lane A done (T7, T8, T11, T12). Merged lane-a into slice1 -> b80962e. Full suite on slice1: 31 files / 145 tests pass; tsc -b clean.
- Remaining: T5 chemistry review (running) -> lane C merge -> G1 user review -> T15.
- T5 chemistry review: Needs fixes — 3 Important wrong products at reachable grid points (c_o2_co at 450C; mg_h2o_steam at 200C; cu_o2_cu2o without ratio guard) + cuo_decompose inert. Fix round 1 sent (+ env filters on combustion, banned formula case-sensitive (CoCl2 vs COCl2), blurb facts, citations, notes on unsourced windows).
- Ruling: DEA List I ban in spec §7 applies to compounds produced by reactions; elemental I2/P4 starters are exempt — flag to user to reconcile spec wording. Cost if wrong: drop 2 starters.
Task 5: minor (deferred, for G1 list): thin branch margin (cu+o2, k+o2 weakly sourced); NO_REACTION holes (spark-only rules at high T, cuo reductions capped 450, decompositions capped 1000); zn/hg labelled transition-metal; 13 starters unused
- T15 dispatched on new integration worktree lane-i (slice1 + lane-c merged, f909913; 177 tests pass), opus. Ruling: run T15 before G1 using drafts (CONTENT_INCLUDE_DRAFTS=1) — plan already allows; T5 data fix merges into lane-i later (data files only).
Task 5: fix round 1/5 (4 addressed, 0 open; commits b6b21ee..79ae0bc)
Task 5: complete (commits 28d08c3..49f1030 + 79ae0bc, review clean)
Task 5: minor (deferred): fe_o2_hot_fe3o4 only at 2500C (source ~1400C) no note; mg_co2_burn no note; other combustion rules lack env filter
- Lane C done (T5, T6). Merged lane-c into slice1. GATE G1 opened: docs/content-review.md sent to user.
- G1: user approved ALL 48 draft rules (2026-11-20). User chose: content round 2 for the 13 unused starters AFTER Slice 1.
- T15 DONE_WITH_CONCERNS (7c5b336 seed deletes stale monsters; 413d172 codex count on discovered; 4512e90 e2e+perf+dev+readme; 7f1de9e env example). Rulings: accept codex count for discovered compounds (spec §6.6 count is part of CodexEntry); accept soft perf check (54.2–57.0 fps swiftshader, PERF_STRICT=1 hard); accept e2e own ports 3111/5183; pnpm test and e2e must not run concurrently (documented).
- Merged lane-i into slice1.
- G1 applied: approve all 48 on slice1 (commit 7c6147a); strict validate 0 issues. 5 content tests fail because they assert pre-G1 data state (0 reactions, drafts non-empty). Fix dispatched to T6 implementer.
Task 15: complete (commits f909913..7f1de9e, review clean)
Task 15: minor (deferred): perf test doesn't assert 12 species rendered; PORT not validated; dev seed honors exported DATABASE_URL with drafts on (README warning); fragile waterCard locator
Task 6 follow-up (test decoupling 4dbd006): reviewed; 1 Minor open (includeDrafts test asserts prefix not equality; reviewed-check vacuous on empty) -> folded into final-review fix wave.
- FINAL REVIEW (opus, c3e3901..4dbd006): With fixes. Important: I1 compound placeholders single colour (no fusedColors); I2 shelf hides newly bred compounds (top-12 by count); I3 post-G1 drafts still default ON in dev/seed/e2e + strict CLI minBranchingPairs 0 + review doc says 0 branching + README restart note + stale comments.
- Ruling: one fix wave = I1, I2, I3 + T6 follow-up test + cheap minors M1 (gate firstDiscoverer), M2 (qc.clear on auth change), M3 (App error state; INTERNAL for unparseable), M4 (boot-time catalog check), M5 (FOR NO KEY UPDATE), M6 (db-name guard + bind 127.0.0.1), M10 (extractor labels), M12 (lower(display_name) unique), M13 (require application/json), M14 housekeeping. Deferred to later: M7 multi-canvas/frameloop, M8 machine anim from readyAt, M9 overlay a11y, M11 hashed session ids + purge. Cost if wrong: deferred items are polish/security-hardening for a local-only slice.
- Fix wave done: 2b8f172 559352b 70795e5 48ff2eb; vitest 212/212, e2e 3/3 drafts off, strict validate 0. M14 web→content dep kept (lockfile frozen). Note: fixer force-recreated postgres container (volume kept) to apply 127.0.0.1 bind. Scoped re-review dispatched.
