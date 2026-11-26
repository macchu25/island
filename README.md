# CHEMIMON

> **Tóm tắt (Tiếng Việt):** CHEMIMON là game web 3D: người chơi lai tạo quái vật hoá học trong phòng thí nghiệm.
> Server quyết định mọi kết quả phản ứng và ghi vào Codex, có danh hiệu "Người khám phá đầu tiên".
> Cài Node 22, pnpm 10, Docker. Chạy `pnpm install`, rồi `pnpm dev`.
> Kiểm thử: `pnpm test`, `pnpm typecheck`, `pnpm e2e`.
> Nội dung hoá học phải qua bước duyệt G1 (`validate --drafts`, `review`, `approve`) trước khi phát hành.

CHEMIMON is a web 3D chemistry-monster breeding game. A player registers and gets a starter kit of element
monsters. The player breeds them under chosen reaction conditions. The server decides every product and
records discoveries in the Codex, including the global First Discovery. Slice 1 uses placeholder 3D monsters.

Spec: `docs/specs/2026-11-20-chemimon-slice1-design.md` (Vietnamese).

## Layout

| Path | What it is |
| --- | --- |
| `packages/shared` | zod contract, domain types, game constants (`src/config.ts`) |
| `packages/chem-engine` | pure deterministic reaction resolver, no I/O |
| `packages/content` | YAML chemistry data, loader, validator, review/approve CLI |
| `apps/api` | Hono + Prisma 7 + PostgreSQL 16, port 3101 |
| `apps/web` | Vite + React + react-three-fiber client, port 5173, proxies `/api` to 3101 |
| `e2e` | Playwright specs (breeding loop, perf check) |

## Setup

Requirements: Node 22 (`.nvmrc`), pnpm 10, Docker with the compose plugin.

```sh
pnpm install
pnpm db:up          # Postgres 16 on 127.0.0.1:5433 (loopback only), creates chemimon_dev and chemimon_test
pnpm db:generate    # generates the Prisma client into apps/api/src/generated (gitignored)
```

There is no dotenv. Scripts pass env inline. `.env.example` lists every variable with its default.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm db:up` | Starts the Postgres container and waits until it is healthy. The compose project name is fixed to `chemimon`, so all git worktrees share one container. `--no-recreate` keeps a running container as it is; use `docker compose up -d --force-recreate postgres` after you change `docker-compose.yml`. |
| `pnpm db:generate` | `prisma generate` for the api. |
| `pnpm db:migrate` | `prisma migrate dev` on `chemimon_dev` (creates a new migration when the schema changed). Refuses a `DATABASE_URL` whose database name does not start with `chemimon_`. |
| `pnpm db:seed` | Upserts chemicals, monsters and the approved reactions from `packages/content` into `chemimon_dev`. Drafts are off by default; `CONTENT_INCLUDE_DRAFTS=1 pnpm db:seed` opts in. Same `chemimon_` name guard as `db:migrate`. |
| `pnpm dev` | `scripts/dev.sh`: db:up, generate, `prisma migrate deploy`, seed, then api (`tsx watch`) and web (`vite`) together. Approved rules only unless `CONTENT_INCLUDE_DRAFTS=1`. Ctrl+C stops both. |
| `pnpm test` | All vitest projects. The api tests use `chemimon_test` and truncate its player tables. |
| `pnpm typecheck` | `tsc -b` over every package and `e2e`. |
| `pnpm e2e` | Playwright on headless Chromium against its own stack (see below). |
| `pnpm --filter @chemimon/content validate` | Strict content validator (release gate): approved rules only, all reviewed, at least 8 branching pairs. |
| `pnpm --filter @chemimon/content validate --drafts` | Content validator, drafts included (review work). |

Do not run `pnpm test` and `pnpm e2e` at the same time: both use `chemimon_test`.

### Environment

| Variable | Default | Used by |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://chemimon:chemimon@localhost:5433/chemimon_dev` in `pnpm dev` | api, seed, prisma |
| `HOST` | `127.0.0.1` | api: bind address. |
| `PORT` | `3101` | api: an integer 1 to 65535, otherwise the api refuses to start. |
| `BREEDING_TIME_SCALE` | `1` | api: multiplies rule durations. `0` makes breeding instant. |
| `EXTRACTOR_COOLDOWN_SCALE` | `1` | api: multiplies the 60 s extractor cooldown. |
| `EXPEDITION_TIME_SCALE` | `1` | api: multiplies expedition trip durations. `0` makes trips return at once. |
| `MARKET_TIME_SCALE` | `1` | api: multiplies the market order cooldown and lifetime. Must be > 0. |
| `CONTENT_INCLUDE_DRAFTS` | `0` (off) in `pnpm dev`, `pnpm db:seed`, the api and e2e | api and seed: `1` is an explicit opt-in that also loads the unreviewed `packages/content/data/drafts/reactions.yaml`. Never set it for a release. |
| `CHEMIMON_API_URL` | `http://127.0.0.1:3101` | web: target of the Vite `/api` proxy (dev and preview). |

Keep `CONTENT_INCLUDE_DRAFTS` the same for the seed and the api. The api resolves reactions from the
catalog it loads at start, and the seed must have written every chemical that catalog can produce. At boot the
api validates its catalog (strict when drafts are off) and checks that every catalog chemical exists in the
database `chemicals` table; on failure it logs the issues and exits non-zero.

If port 5173 is busy, Vite picks the next free port and prints it. The api port is fixed.

### How `pnpm e2e` runs

1. `pnpm db:up`.
2. Playwright starts two web servers on their own ports, so a running `pnpm dev` is never tested by mistake:
   - api on **3111**: `prisma migrate deploy` on `chemimon_test`, then `db:seed -- --reset-players`
     (truncates all player tables; it refuses any database except `chemimon_test`), then the server with
     `BREEDING_TIME_SCALE=0`, `EXTRACTOR_COOLDOWN_SCALE=0`, `CONTENT_INCLUDE_DRAFTS=0` (approved rules only).
   - web on **5183**: `vite build`, then `vite preview` with the `/api` proxy pointed at 3111.
3. Specs run in one worker with no retries. The loop spec expects "Người khám phá đầu tiên!", which only the
   first player to make H2O in the database gets. The reset makes that deterministic; a retry would not be.

Headless Chromium has no GPU. The config launches it with SwiftShader (`--use-angle=swiftshader
--enable-unsafe-swiftshader`), so the WebGL canvas renders in software.

The perf spec (`e2e/perf.spec.ts`) registers a player (the starter kit already fills the 12-slot shelf), opens the lab and
samples `requestAnimationFrame` for 5 s. Target: mean ≥ 55 fps. In headless SwiftShader the mean sits at
54 to 57 fps, so by default the check is soft: it logs the number and adds an annotation, and it does not fail.
Run `PERF_STRICT=1 pnpm e2e` on a machine with a real GPU to make it a hard assertion.

## Content workflow (gate G1)

New reaction rules start in `packages/content/data/drafts/reactions.yaml` with `reviewed: false`. Approved rules
live in `packages/content/data/reactions.yaml` (all 48 Slice 1 rules passed G1 on 2026-11-20; the drafts file is
empty until the next content round). Production must run with approved rules only (`CONTENT_INCLUDE_DRAFTS`
unset or `0`, the default everywhere).

1. Validate the drafts:
   ```sh
   pnpm --filter @chemimon/content validate --drafts
   ```
   It must print `0 issue(s)` and exit 0. It checks the schema, references, missing monsters, banned
   chemicals, element balance, ties, durations (10 to 60 s), ranges, unreachable rules and the minimum of
   8 branching input pairs.
2. Write the review document:
   ```sh
   pnpm --filter @chemimon/content review
   ```
   This writes `docs/content-review.md` (Vietnamese): one table per input pair with conditions, ratio, source
   and status. A chemistry reviewer reads it and lists the rule ids that are correct.
3. Approve those rules:
   ```sh
   pnpm --filter @chemimon/content approve <ruleId> [<ruleId> ...]
   ```
   This moves them from the drafts file into `reactions.yaml` and sets `reviewed: true`. It is all-or-nothing:
   an unknown or already approved id changes nothing.
4. Run `pnpm --filter @chemimon/content validate` (no `--drafts`). It must pass before a release.
5. Run `pnpm db:seed` (or restart `pnpm dev`) to write the new rules into the database, then restart the api.
   The api loads the catalog once at boot, and `tsx watch` does not watch YAML files, so a running api keeps the
   old rules until it restarts.

## Adding a 3D model (.glb)

Every monster renders as a procedural placeholder until a model exists. To add one:

1. Export the model as glTF binary and name it after the monster's `assetKey` from
   `packages/content/data/monsters.yaml` (the `assetKey` equals the chemical id, for example `h2o`).
2. Put it at `apps/web/public/assets/monsters/<assetKey>.glb`. It is served as `/assets/monsters/<assetKey>.glb`.
3. Add the key to `apps/web/public/assets/monsters/manifest.json`:
   ```json
   { "available": ["h2o"] }
   ```
   The client only requests models listed here. A listed file that 404s or fails to parse falls back to the
   placeholder, and the canvas keeps running.

## Release checklist

- [ ] `pnpm test && pnpm typecheck` pass.
- [ ] `pnpm --filter @chemimon/content validate` (strict, no drafts) passes, and every shipped rule went through G1.
- [ ] The api runs without `CONTENT_INCLUDE_DRAFTS`, and the seed ran the same way.
- [ ] `pnpm e2e` passes. On a machine with a GPU, `PERF_STRICT=1 pnpm e2e` passes (desktop Chromium mean ≥ 55 fps).
- [ ] Manual check on a mid-range Android phone in Chrome: open the lab with 12 species on the shelf,
      measure with Chrome remote DevTools (Performance panel or the FPS meter). Target: ≥ 30 fps. Record the
      device model and the number in the release notes.
- [ ] `BREEDING_TIME_SCALE`, `EXTRACTOR_COOLDOWN_SCALE`, `EXPEDITION_TIME_SCALE` and `MARKET_TIME_SCALE` are unset (or `1`) in production.
