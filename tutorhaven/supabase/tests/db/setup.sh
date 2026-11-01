#!/usr/bin/env bash
# Creates a throwaway local Postgres 16 cluster, applies the Supabase shim and every migration.
# Usage: sudo tests/db/setup.sh   (prints the connection string on success)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MIG="$HERE/../../migrations"
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
DATA=${PGDATA_DIR:-/var/lib/postgresql/thtest}
PORT=${PGPORT:-5499}
as_pg() { runuser -u postgres -- "$@"; }
if [ -f "$DATA/postmaster.pid" ]; then as_pg "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null || true; fi
rm -rf "$DATA"
as_pg "$PGBIN/initdb" -D "$DATA" -A trust -U postgres >/dev/null
as_pg "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=localhost" -l "$DATA/log" start -w >/dev/null
PSQL=("$PGBIN/psql" -h localhost -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -d postgres -c 'create database tutorhaven' >/dev/null
"${PSQL[@]}" -d tutorhaven -f "$HERE/supabase_shim.sql" >/dev/null
for f in "$MIG"/*.sql; do
  echo "applying $(basename "$f")"
  "${PSQL[@]}" -d tutorhaven -f "$f" >/dev/null
done
echo "postgres://postgres@localhost:$PORT/tutorhaven"
