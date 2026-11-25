#!/usr/bin/env bash
# Local dev runner: Postgres (docker) -> prisma generate + migrate deploy -> seed -> api + web.
# Only reviewed rules (data/reactions.yaml) are loaded. Set CONTENT_INCLUDE_DRAFTS=1 to opt in to
# the unreviewed rules in data/drafts/reactions.yaml (content review work only, never a release).
set -euo pipefail
cd "$(dirname "$0")/.."

export DATABASE_URL="${DATABASE_URL:-postgresql://chemimon:chemimon@localhost:5433/chemimon_dev}"
export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-3101}"
export BREEDING_TIME_SCALE="${BREEDING_TIME_SCALE:-1}"
export EXTRACTOR_COOLDOWN_SCALE="${EXTRACTOR_COOLDOWN_SCALE:-1}"
export EXPEDITION_TIME_SCALE="${EXPEDITION_TIME_SCALE:-1}"
export CONTENT_INCLUDE_DRAFTS="${CONTENT_INCLUDE_DRAFTS:-0}"
export CHEMIMON_API_URL="http://127.0.0.1:${PORT}"

# Refuse a DATABASE_URL that does not point at a chemimon_* database.
bash scripts/with-db.sh true

pnpm db:up
pnpm --filter @chemimon/api db:generate
pnpm --filter @chemimon/api db:deploy
pnpm --filter @chemimon/api db:seed

exec pnpm exec concurrently --kill-others --names api,web --prefix-colors blue,magenta \
  "pnpm --filter @chemimon/api dev" \
  "pnpm --filter @chemimon/web dev"
