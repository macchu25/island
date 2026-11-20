#!/usr/bin/env bash
# Runs a command against a CHEMIMON database. DATABASE_URL defaults to chemimon_dev on the
# local docker Postgres. Refuses any database whose name does not start with "chemimon_",
# so a stray DATABASE_URL in the shell can never migrate or seed someone else's database.
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-postgresql://chemimon:chemimon@localhost:5433/chemimon_dev}"
db_name="${DATABASE_URL%%\?*}"
db_name="${db_name##*/}"
if [[ ! "$db_name" =~ ^chemimon_ ]]; then
  echo "refusing to run: DATABASE_URL database \"${db_name}\" does not match ^chemimon_ (expected chemimon_dev or chemimon_test)" >&2
  exit 1
fi

exec "$@"
