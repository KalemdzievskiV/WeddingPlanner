#!/bin/sh
# Nightly database backup to a PRIVATE Cloudflare R2 bucket, kept 30 days (decision 94).
# Runs as its own Railway cron service; see README "Nightly jobs and backups".
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"
# Never the public image bucket: backups hold every guest list and email address.
: "${BACKUP_BUCKET:?BACKUP_BUCKET is required (a private bucket, not R2_BUCKET)}"

PREFIX="${BACKUP_PREFIX:-db}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto

STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
FILE="/tmp/svadba-${STAMP}.dump"

echo "[backup] dumping database"
pg_dump --format=custom --no-owner --no-acl --file="$FILE" "$DATABASE_URL"
echo "[backup] uploading $(du -h "$FILE" | cut -f1) to s3://${BACKUP_BUCKET}/${PREFIX}/"
aws s3 cp "$FILE" "s3://${BACKUP_BUCKET}/${PREFIX}/svadba-${STAMP}.dump" --endpoint-url "$ENDPOINT" --only-show-errors
rm -f "$FILE"

# Delete backups older than KEEP_DAYS. File names sort by date, so a string compare is enough.
CUTOFF="$(date -u -d "@$(( $(date +%s) - KEEP_DAYS * 86400 ))" +%Y-%m-%dT%H%M%SZ)"
aws s3 ls "s3://${BACKUP_BUCKET}/${PREFIX}/" --endpoint-url "$ENDPOINT" \
  | awk -v cutoff="$CUTOFF" '{ key = $4; stamp = key; sub(/^svadba-/, "", stamp); sub(/\.dump$/, "", stamp); if (key ~ /^svadba-/ && stamp < cutoff) print key }' \
  | while read -r old; do
      echo "[backup] removing ${old}"
      aws s3 rm "s3://${BACKUP_BUCKET}/${PREFIX}/${old}" --endpoint-url "$ENDPOINT" --only-show-errors
    done

echo "[backup] done"
