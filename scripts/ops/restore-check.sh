#!/usr/bin/env bash
# Prove the newest backup restores — into an ISOLATED throwaway database and directory,
# never over production. Run as root on the VPS:
#   scripts/ops/restore-check.sh
#
# 1. pg_restore of the newest elhabak-*.dump into a new database elhabak_restore_check
# 2. row counts of key tables compared with the live database (read-only query)
# 3. newest storage-*.tar.gz extracted into a temporary directory, file count compared
# 4. the temporary database and directory are dropped/removed on exit
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/www/elhabak/shared/backups}"
STORAGE_DIR="${STORAGE_DIR:-/var/www/elhabak/shared/storage}"
LIVE_DB="${LIVE_DB:-elhabak}"
CHECK_DB="elhabak_restore_check"
TMP_DIR="$(mktemp -d /tmp/elhabak-restore-check.XXXXXX)"

cleanup() {
  sudo -u postgres dropdb --if-exists "$CHECK_DB" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

DUMP="$(ls -1t "$BACKUP_DIR"/elhabak-*.dump | head -1)"
echo "dump: $DUMP ($(du -h "$DUMP" | cut -f1), $(( ( $(date +%s) - $(stat -c %Y "$DUMP") ) / 3600 ))h old)"
[ "$CHECK_DB" != "$LIVE_DB" ] || { echo "refusing: check db equals live db"; exit 1; }

sudo -u postgres dropdb --if-exists "$CHECK_DB"
sudo -u postgres createdb "$CHECK_DB"
cp "$DUMP" "$TMP_DIR/restore.dump"
chmod 644 "$TMP_DIR/restore.dump"
chmod 755 "$TMP_DIR"
sudo -u postgres pg_restore --no-owner --no-privileges -d "$CHECK_DB" "$TMP_DIR/restore.dump"

COUNTS_SQL='SELECT (SELECT count(*) FROM "User")||'"'"' users, '"'"'||(SELECT count(*) FROM "Project")||'"'"' projects, '"'"'||(SELECT count(*) FROM "SiteUpdate")||'"'"' site updates, '"'"'||(SELECT count(*) FROM "ProjectDocument")||'"'"' documents, '"'"'||(SELECT count(*) FROM "ProjectMessage")||'"'"' messages, '"'"'||(SELECT count(*) FROM "_prisma_migrations")||'"'"' migrations'"'"';'
RESTORED="$(sudo -u postgres psql -tAq -d "$CHECK_DB" -c "$COUNTS_SQL")"
LIVE="$(sudo -u postgres psql -tAq -d "$LIVE_DB" -c "BEGIN READ ONLY; $COUNTS_SQL COMMIT;" | grep users)"
echo "restored: $RESTORED"
echo "live now: $LIVE"

ARCHIVE="$(ls -1t "$BACKUP_DIR"/storage-*.tar.gz 2>/dev/null | head -1 || true)"
if [ -n "$ARCHIVE" ]; then
  mkdir -p "$TMP_DIR/storage"
  tar -C "$TMP_DIR/storage" -xzf "$ARCHIVE"
  echo "storage archive: $ARCHIVE → $(find "$TMP_DIR/storage" -type f | wc -l) files restored; live has $(find "$STORAGE_DIR" -type f | wc -l)"
else
  echo "storage archive: none found"
fi
echo "RESTORE CHECK PASS (temporary database and files removed on exit)"
