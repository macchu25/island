#!/usr/bin/env bash
# Local dev runner: Postgres (docker) -> prisma generate + migrate deploy -> seed -> api + web.
# Drafts stay included until the G1 content review approves rules (CONTENT_INCLUDE_DRAFTS=1).
set -euo pipefail
cd "$(dirname "$0")/.."

export DATABASE_URL="${DATABASE_URL:-postgresql://chemimon:chemimon@localhost:5433/chemimon_dev}"
export PORT="${PORT:-3101}"
export BREEDING_TIME_SCALE="${BREEDING_TIME_SCALE:-1}"
export EXTRACTOR_COOLDOWN_SCALE="${EXTRACTOR_COOLDOWN_SCALE:-1}"
export CONTENT_INCLUDE_DRAFTS="${CONTENT_INCLUDE_DRAFTS:-1}"
export CHEMIMON_API_URL="http://localhost:${PORT}"

pnpm db:up
pnpm --filter @chemimon/api db:generate
pnpm --filter @chemimon/api db:deploy
pnpm --filter @chemimon/api db:seed

exec pnpm exec concurrently --kill-others --names api,web --prefix-colors blue,magenta \
  "pnpm --filter @chemimon/api dev" \
  "pnpm --filter @chemimon/web dev"
