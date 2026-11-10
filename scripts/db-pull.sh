#!/bin/sh
# Copy the live database into the local Docker database.
#
#   pnpm db:pull                 dump the live database, then load it locally
#   pnpm db:pull --file <dump>   load a dump you already have (e.g. a nightly backup from R2)
#   add --yes to skip the "replace local data?" question
#
# The live connection string comes from LIVE_DATABASE_URL, or from a git-ignored .env.live file.
# The live database is only read (pg_dump). Only a database on localhost is ever written.
set -eu

cd "$(dirname "$0")/.."

FILE=""
YES=0
while [ $# -gt 0 ]; do
  case "$1" in
    --file) FILE="${2:?--file needs a path}"; shift 2 ;;
    --yes|-y) YES=1; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# Postgres 18 tools: pg_dump must be at least the live server's version; pg_restore 18 also loads into the local 17.
PG_IMAGE="postgres:18-alpine"
# Runs as you, so the dump files in backups/ are yours to delete.
pg() { docker run --rm -i --network host --user "$(id -u):$(id -g)" -e PGOPTIONS="-c client_min_messages=warning" -v "$PWD/backups:/backups" "$PG_IMAGE" "$@"; }

# Local target: DATABASE_URL from .env, and it must point at this machine.
LOCAL_URL="$(grep -E '^DATABASE_URL=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' || true)"
LOCAL_URL="${LOCAL_URL:-postgresql://svadba:svadba@localhost:5434/svadba}"
case "$LOCAL_URL" in
  *@localhost:*|*@127.0.0.1:*|*@localhost/*|*@127.0.0.1/*) ;;
  *) echo "Refusing: local DATABASE_URL in .env does not point at localhost." >&2; exit 1 ;;
esac

mkdir -p backups

if [ -z "$FILE" ]; then
  if [ -z "${LIVE_DATABASE_URL:-}" ] && [ -f .env.live ]; then
    LIVE_DATABASE_URL="$(grep -E '^LIVE_DATABASE_URL=' .env.live | head -1 | cut -d= -f2- | tr -d '"')"
  fi
  if [ -z "${LIVE_DATABASE_URL:-}" ]; then
    echo "Set LIVE_DATABASE_URL (Railway → Postgres → Variables → DATABASE_PUBLIC_URL)," >&2
    echo "either in your shell or in a .env.live file:  LIVE_DATABASE_URL=postgresql://..." >&2
    exit 1
  fi
  if [ "$LIVE_DATABASE_URL" = "$LOCAL_URL" ]; then
    echo "Refusing: LIVE_DATABASE_URL is the same as the local database." >&2
    exit 1
  fi
  NAME="live-$(date -u +%Y-%m-%dT%H%M%SZ).dump"
  echo "[db:pull] dumping the live database to backups/$NAME"
  pg pg_dump --format=custom --no-owner --no-acl --file="/backups/$NAME" "$LIVE_DATABASE_URL"
  FILE="backups/$NAME"
fi

[ -f "$FILE" ] || { echo "No such file: $FILE" >&2; exit 1; }

if [ "$YES" -ne 1 ]; then
  printf "Replace ALL data in the local database with %s? [y/N] " "$FILE"
  read -r answer
  case "$answer" in y|Y|yes|YES) ;; *) echo "Cancelled. The dump is kept at $FILE."; exit 0 ;; esac
fi

# The container sees the file under /backups; copy it there if it lives elsewhere.
case "$FILE" in
  backups/*) IN="/backups/${FILE#backups/}" ;;
  *) cp "$FILE" backups/restore.dump; IN="/backups/restore.dump" ;;
esac

echo "[db:pull] wiping the local database"
pg psql --quiet --set ON_ERROR_STOP=1 "$LOCAL_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
echo "[db:pull] loading $FILE"
# Warnings about settings the local Postgres 17 doesn't know are harmless.
pg pg_restore --no-owner --no-acl --dbname="$LOCAL_URL" "$IN" || echo "[db:pull] pg_restore reported warnings (see above)"
rm -f backups/restore.dump

echo "[db:pull] applying any migrations the live database doesn't have yet"
pnpm --silent db:deploy

echo "[db:pull] done. Restart the dev server if it is running. The dump is kept at $FILE."
