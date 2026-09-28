#!/usr/bin/env bash
# ELHABAK production backup: PostgreSQL dump + protected upload storage archive.
#
# Usage (cron, as the elhabak user):
#   /var/www/elhabak/shared/backups/backup.sh
#
# Auth: ~/.pgpass of the elhabak user (no secrets in this file). Both artefacts are
# written mode 600, verified readable before rotation, and the newest KEEP of each kind
# are kept. Storage and database are captured in the same run so a restore gets a
# consistent pair (the database is the index into the storage paths).
set -euo pipefail

BASE="${ELHABAK_BASE:-/var/www/elhabak}"
BACKUP_DIR="${BACKUP_DIR:-$BASE/shared/backups}"
STORAGE_DIR="${STORAGE_DIR:-$BASE/shared/storage}"
DB_NAME="${DB_NAME:-elhabak}"
DB_USER="${DB_USER:-elhabak}"
KEEP="${KEEP:-14}"
TS="$(date +%Y%m%d-%H%M%S)"

umask 077
mkdir -p "$BACKUP_DIR"

# 1) Database (custom format), verified by listing its table of contents.
DB_OUT="$BACKUP_DIR/elhabak-$TS.dump"
pg_dump -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -Fc -f "$DB_OUT"
pg_restore -l "$DB_OUT" >/dev/null
echo "db backup: $DB_OUT ($(du -h "$DB_OUT" | cut -f1))"

# 2) Protected uploads, verified by listing the archive.
if [ -d "$STORAGE_DIR" ]; then
  FILES_OUT="$BACKUP_DIR/storage-$TS.tar.gz"
  tar -C "$STORAGE_DIR" -czf "$FILES_OUT" .
  COUNT="$(tar -tzf "$FILES_OUT" | grep -vc '/$' || true)"
  echo "storage backup: $FILES_OUT ($(du -h "$FILES_OUT" | cut -f1), $COUNT files)"
else
  echo "storage backup: skipped, $STORAGE_DIR missing"
fi

# 3) Rotation: newest $KEEP of each kind.
ls -1t "$BACKUP_DIR"/elhabak-*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
ls -1t "$BACKUP_DIR"/storage-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

# 4) Capacity warning when the filesystem holding backups runs low.
USED_PCT="$(df --output=pcent "$BACKUP_DIR" | tail -1 | tr -dc '0-9')"
if [ "${USED_PCT:-0}" -ge 85 ]; then
  echo "WARNING: backup filesystem ${USED_PCT}% used"
fi
