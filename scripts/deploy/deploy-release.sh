#!/usr/bin/env bash
# Production deploy orchestrator for elhabak.com — run on the VPS as root.
#
# Usage: deploy-release.sh /root/elhabak-release.tar.gz
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

BASE="/var/www/elhabak"
SHARED="$BASE/shared"
SHARED_ENV="${ELHABAK_SHARED_ENV:-$SHARED/.env}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARBALL="${1:?usage: deploy-release.sh <tarball>}"
APP_USER="elhabak"

REL="$BASE/releases/$(date +%Y%m%d-%H%M%S)"
PREV="$(readlink -f "$BASE/current" 2>/dev/null || true)"

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

# --- switch -------------------------------------------------------------------
echo ">> switching /current -> $REL (previous: ${PREV:-none})"
ln -sfn "$REL" "$BASE/current"

su -s /bin/bash "$APP_USER" -c "pm2 restart elhabak-api elhabak-web --update-env" >/dev/null
sleep 4

HEALTH=""
for i in 1 2 3 4 5 6 7 8; do
  HEALTH="$(curl -sf --max-time 10 https://elhabak.com/api/health || true)"
  echo "$HEALTH" | grep -q '"status":"ok"' && echo "$HEALTH" | grep -q '"database":"connected"' && break
  sleep 3
done

if echo "$HEALTH" | grep -q '"status":"ok"' && echo "$HEALTH" | grep -q '"database":"connected"'; then
  su -s /bin/bash "$APP_USER" -c "pm2 list" | grep -E 'elhabak-(api|web)' || true
  echo "DEPLOY PASS: $REL"
  echo "rollback: ln -sfn ${PREV:-<previous-release>} $BASE/current && su -s /bin/bash $APP_USER -c 'pm2 restart elhabak-api elhabak-web'"
else
  echo "FAIL: post-switch health check failed — reverting /current"
  [ -n "$PREV" ] && ln -sfn "$PREV" "$BASE/current"
  su -s /bin/bash "$APP_USER" -c "pm2 restart elhabak-api elhabak-web" >/dev/null || true
  echo "DEPLOY FAIL: reverted to ${PREV:-none}"
  exit 1
fi
