#!/usr/bin/env bash
# Rollback /current to a previous healthy release — run on the VPS as root.
#
# Usage: rollback.sh /var/www/elhabak/releases/<timestamp>
#        rollback.sh --list          (show candidate releases)
#        ELHABAK_TARGET=staging rollback.sh ...   (staging.elhabak.com)
set -euo pipefail

case "${ELHABAK_TARGET:-production}" in
  production) BASE="/var/www/elhabak"; DOMAIN="elhabak.com"; APP_PREFIX="elhabak" ;;
  staging) BASE="/var/www/elhabak-staging"; DOMAIN="staging.elhabak.com"; APP_PREFIX="elhabak-staging" ;;
  *) echo "FATAL: unknown ELHABAK_TARGET (production|staging)"; exit 1 ;;
esac
APP_USER="elhabak"

release_sha() {
  python3 - "$1/.release-meta.json" <<'PY'
import json, sys
try:
    value = json.load(open(sys.argv[1])).get("commitSha", "")
    print(value[:12] if isinstance(value, str) else "unknown")
except (OSError, ValueError, TypeError):
    print("unknown")
PY
}

if [ "${1:-}" = "--list" ]; then
  CURRENT="$(readlink -f "$BASE/current" 2>/dev/null || true)"
  printf '%-20s %-8s %s\n' "RELEASE" "CURRENT" "COMMIT"
  for release in $(ls -1dt "$BASE"/releases/*/ 2>/dev/null | head -10); do
    release="${release%/}"
    marker="no"
    [ "$(readlink -f "$release")" = "$CURRENT" ] && marker="yes"
    printf '%-20s %-8s %s\n' "$(basename "$release")" "$marker" "$(release_sha "$release")"
  done
  exit 0
fi

TARGET="${1:?usage: rollback.sh <release-dir> | --list}"
[ -d "$TARGET/apps/web/.next" ] && [ -f "$TARGET/apps/api/dist/main.js" ] \
  || { echo "FAIL: $TARGET is not a built release"; exit 1; }
[ -f "$TARGET/.release-meta.json" ] || { echo "FAIL: release provenance metadata is missing"; exit 1; }
[ "$(release_sha "$TARGET")" != "unknown" ] || { echo "FAIL: release provenance metadata is malformed"; exit 1; }

echo ">> rolling back /current -> $TARGET"
ln -sfn "$TARGET" "$BASE/current"
su -s /bin/bash "$APP_USER" -c "pm2 restart $APP_PREFIX-api $APP_PREFIX-web" >/dev/null
sleep 4
curl -sf --max-time 10 "https://$DOMAIN/api/health" \
  && echo && echo "ROLLBACK PASS" \
  || { echo "ROLLBACK FAIL: health check failed — investigate immediately"; exit 1; }
