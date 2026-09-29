#!/usr/bin/env bash
# Deploy orchestrator for elhabak.com (production) and staging.elhabak.com — run on
# the VPS as root.
#
# Usage: deploy-release.sh /root/elhabak-release.tar.gz
#        ELHABAK_TARGET=staging deploy-release.sh /root/elhabak-release.tar.gz
#
# Targets (production is the default and behaves exactly as before):
#   production  /var/www/elhabak          pm2 elhabak-{api,web}          db elhabak
#   staging     /var/www/elhabak-staging  pm2 elhabak-staging-{api,web}  db elhabak_staging
#               (staging also applies committed migrations automatically; production
#                migrations are applied only with ELHABAK_APPLY_MIGRATIONS=1 and a
#                DB + storage backup newer than 60 minutes)
#
# Safe order (the /current symlink is touched only after every gate passes):
#   1. extract to timestamped release dir
#   2. strip any env/secret files that slipped into the package
#   3. symlink shared production env (never copied into the release)
#   4. env preflight (before building — fail fast on bad config)
#   5. pnpm install --frozen-lockfile
#   6. pnpm build
#   7. full preflight (env + release sanity + web build output guards)
#   8. switch /current, restart PM2 (as elhabak), verify health
#   9. on health failure: revert /current to the previous release
set -euo pipefail

TARGET_ENV="${ELHABAK_TARGET:-production}"
case "$TARGET_ENV" in
  production) BASE="/var/www/elhabak"; DOMAIN="elhabak.com"; APP_PREFIX="elhabak"; DB_NAME="elhabak" ;;
  staging) BASE="/var/www/elhabak-staging"; DOMAIN="staging.elhabak.com"; APP_PREFIX="elhabak-staging"; DB_NAME="elhabak_staging" ;;
  *) echo "FATAL: unknown ELHABAK_TARGET '$TARGET_ENV' (production|staging)"; exit 1 ;;
esac
SHARED="$BASE/shared"
SHARED_ENV="${ELHABAK_SHARED_ENV:-$SHARED/.env}"
# release-preflight.sh reads these; the production values equal its built-in defaults.
export ELHABAK_SHARED_ENV="$SHARED_ENV" ELHABAK_SHARED_STORAGE="$SHARED/storage"
export ELHABAK_PROD_DOMAIN="$DOMAIN" ELHABAK_PROD_DB_NAME="$DB_NAME" ELHABAK_PROD_DB_USER="$DB_NAME"
PM2_APPS="$APP_PREFIX-api $APP_PREFIX-web"
HEALTH_URL="https://$DOMAIN/api/health"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARBALL="${1:?usage: deploy-release.sh <tarball>}"
APP_USER="elhabak"

REL="$BASE/releases/$(date +%Y%m%d-%H%M%S)"
# Only an existing symlink is a previous release (the first deploy of a target has none).
PREV="$( [ -L "$BASE/current" ] && readlink -f "$BASE/current" || true )"

echo ">> release dir: $REL"
mkdir -p "$REL"
tar -xzf "$TARBALL" -C "$REL"

# --- defensive strip: no env/secret file may survive inside a release --------
find "$REL" \
  -path '*/node_modules' -prune -o \
  -type f \( \
       -name '.env' -o -name '.env.*' -o -name '.credentials.local' \
       -o -name '*.secret' -o -name '*.pem' -o -name '*.key' \
       -o -name 'id_rsa*' -o -name 'create-qa-*' -o -name 'cleanup-qa*' \
       -o -name 'revoke-sessions*' \
  \) ! -name '.env.example' ! -name '.env*.example' -print -exec rm -f -- {} +

# --- env: production config exists ONLY in shared/.env ------------------------
[ -f "$SHARED_ENV" ] || { echo "FATAL: shared env missing — aborting before build"; exit 1; }
ln -sfn "$SHARED_ENV" "$REL/.env"
ln -sfn "$SHARED_ENV" "$REL/apps/api/.env"
ln -sfn "$SHARED_ENV" "$REL/apps/web/.env"
chmod 600 "$SHARED_ENV"
chown -R "$APP_USER:$APP_USER" "$REL"

echo ">> env preflight (pre-build)"
"$SCRIPT_DIR/release-preflight.sh" "$REL" --pre-build

echo ">> install"
cd "$REL"
pnpm install --frozen-lockfile

echo ">> build"
pnpm build

echo ">> full preflight (env + sanity + build output)"
"$SCRIPT_DIR/release-preflight.sh" "$REL"

if [ "$TARGET_ENV" = "staging" ]; then
  echo ">> staging: apply committed migrations to $DB_NAME"
  pnpm db:migrate:deploy
elif [ "${ELHABAK_APPLY_MIGRATIONS:-0}" = "1" ]; then
  # Production migrations are opt-in and only with a database + storage backup taken in
  # the last 60 minutes (scripts/ops/backup.sh). Applied before the switch: committed
  # migrations are additive, so the still-running previous release keeps working.
  BACKUP_DIR="$SHARED/backups"
  FRESH_DB="$(find "$BACKUP_DIR" -maxdepth 1 -name 'elhabak-*.dump' -size +0 -mmin -60 2>/dev/null | head -1)"
  FRESH_STORAGE="$(find "$BACKUP_DIR" -maxdepth 1 -name 'storage-*.tar.gz' -size +0 -mmin -60 2>/dev/null | head -1)"
  if [ -z "$FRESH_DB" ] || [ -z "$FRESH_STORAGE" ]; then
    echo "FATAL: ELHABAK_APPLY_MIGRATIONS=1 needs a DB dump and a storage archive newer than 60 min in $BACKUP_DIR"
    exit 1
  fi
  echo ">> production: backups $FRESH_DB + $FRESH_STORAGE; applying committed migrations to $DB_NAME"
  pnpm db:migrate:deploy
fi

# --- switch -------------------------------------------------------------------
RELEASE_COMMIT="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["commitSha"])' "$REL/.release-meta.json")"
echo ">> switching /current -> $REL (previous: ${PREV:-none})"
ln -sfn "$REL" "$BASE/current"

# First release of a target: register its processes from the shared ecosystem file.
for app in $PM2_APPS; do
  su -s /bin/bash "$APP_USER" -c "pm2 describe $app" >/dev/null 2>&1     || su -s /bin/bash "$APP_USER" -c "COMMIT_SHA=$RELEASE_COMMIT pm2 start $SHARED/ecosystem.config.cjs --only $app && pm2 save" >/dev/null
done
su -s /bin/bash "$APP_USER" -c "COMMIT_SHA=$RELEASE_COMMIT pm2 restart $PM2_APPS --update-env" >/dev/null
sleep 4

HEALTH=""
for i in 1 2 3 4 5 6 7 8; do
  HEALTH="$(curl -sf --max-time 10 "$HEALTH_URL" || true)"
  echo "$HEALTH" | grep -q '"status":"ok"' && echo "$HEALTH" | grep -q '"database":"connected"' && break
  sleep 3
done

if echo "$HEALTH" | grep -q '"status":"ok"' && echo "$HEALTH" | grep -q '"database":"connected"'; then
  su -s /bin/bash "$APP_USER" -c "pm2 list" | grep -E " $APP_PREFIX-(api|web) " || true
  echo "DEPLOY PASS: $REL"
  echo "rollback: ln -sfn ${PREV:-<previous-release>} $BASE/current && su -s /bin/bash $APP_USER -c 'pm2 restart $PM2_APPS'"
else
  echo "FAIL: post-switch health check failed — reverting /current"
  [ -n "$PREV" ] && ln -sfn "$PREV" "$BASE/current"
  su -s /bin/bash "$APP_USER" -c "pm2 restart $PM2_APPS" >/dev/null || true
  echo "DEPLOY FAIL: reverted to ${PREV:-none}"
  exit 1
fi
