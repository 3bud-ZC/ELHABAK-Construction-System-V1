#!/usr/bin/env bash
# Pre-switch release validation for elhabak.com.
#
# Usage: release-preflight.sh <release-dir> [--pre-build]
#
#   --pre-build   validate environment + forbidden files only (run before build)
#
# Prints PASS/FAIL lines only — never prints URLs, credentials, or secrets.
# Exit 0 only when every check passes. A FAIL must abort the deployment
# BEFORE /var/www/elhabak/current is switched.
#
# Overridable for testing: ELHABAK_SHARED_ENV, ELHABAK_SHARED_STORAGE,
# ELHABAK_PROD_DOMAIN, ELHABAK_PROD_DB_NAME, ELHABAK_PROD_DB_USER.
set -uo pipefail

REL="${1:-}"
MODE="${2:-}"
SHARED_ENV="${ELHABAK_SHARED_ENV:-/var/www/elhabak/shared/.env}"
STORAGE="${ELHABAK_SHARED_STORAGE:-/var/www/elhabak/shared/storage}"
DOMAIN="${ELHABAK_PROD_DOMAIN:-elhabak.com}"
PROD_DB_NAME="${ELHABAK_PROD_DB_NAME:-elhabak}"
PROD_DB_USER="${ELHABAK_PROD_DB_USER:-elhabak}"

FAILED=0
pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; FAILED=1; }

[ -n "$REL" ] && [ -d "$REL" ] || { echo "FAIL: release directory missing"; exit 1; }

# ---- 0. Release provenance ---------------------------------------------------
META="$REL/.release-meta.json"
if [ ! -f "$META" ]; then
  fail "release provenance metadata missing"
else
  if python3 - "$META" <<'PY'
import json, re, sys
from pathlib import Path
try:
    meta = json.loads(Path(sys.argv[1]).read_text())
    required = ("commitSha", "branch", "deployedAt", "archiveSha256")
    valid = all(isinstance(meta.get(key), str) and meta[key] for key in required)
    valid = valid and bool(re.fullmatch(r"[0-9a-f]{40}", meta["commitSha"]))
    valid = valid and bool(re.fullmatch(r"[0-9a-f]{64}", meta["archiveSha256"]))
    valid = valid and bool(re.fullmatch(r"[^\\s]+", meta["branch"]))
except (OSError, ValueError, TypeError, KeyError):
    valid = False
sys.exit(0 if valid else 1)
PY
  then
    pass "release provenance metadata is valid"
  else
    fail "release provenance metadata is malformed"
  fi
fi

source_archive_sha256() {
  tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner \
    --exclude='./.release-meta.json' --exclude='./apps/web/next-env.d.ts' --exclude='./node_modules' --exclude='./.next' --exclude='./dist' \
    --exclude='*/node_modules' --exclude='*/.next' --exclude='*/dist' --exclude='*/coverage' --exclude='*/storage' \
    --exclude='./.turbo' --exclude='./coverage' --exclude='./.pnpm-store' --exclude='./storage' \
    --exclude='*/.turbo' --exclude='*/test-results' --exclude='./test-results' --exclude='./storage-backups' --exclude='./backups' --exclude='*.tsbuildinfo' \
    --exclude='*.log' --exclude='.env' --exclude='.env.*' --exclude='.credentials.local' \
    --exclude='*.secret' --exclude='*.pem' --exclude='*.key' --exclude='id_rsa*' \
    --exclude='.codex-*-qa' --exclude='.codex-brand-preview' --exclude='.playwright-cli' \
    --exclude='.claude' --exclude='.vscode' --exclude='.idea' --exclude='create-qa-*' \
    --exclude='cleanup-qa*' --exclude='revoke-sessions*' --exclude='*.tar.gz' \
    -cf - -C "$1" . | sha256sum | awk '{print $1}'
}
if [ -f "$META" ] && [ "$(source_archive_sha256 "$REL")" = "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["archiveSha256"])' "$META")" ]; then
  pass "release archive checksum matches provenance"
elif [ -f "$META" ]; then
  fail "release archive checksum does not match provenance"
fi

# ---- 1. Forbidden files in the candidate release (regular files only) -------
# Env files may exist ONLY as symlinks to the shared env. Examples allowed.
FOUND_FORBIDDEN="$(cd "$REL" && find . \
  -path './node_modules' -prune -o \
  -path './.next' -prune -o \
  -path './dist' -prune -o \
  -type f \( \
       -name '.env' -o -name '.env.local' -o -name '.env.development' \
       -o -name '.env.development.local' -o -name '.env.production' \
       -o -name '.env.production.local' -o -name '.env.test' \
       -o -name '.env.test.local' -o -name '.env.staging' \
       -o -name '.env.staging.local' -o -name '.credentials.local' \
       -o -name '*.secret' -o -name '*.pem' -o -name '*.key' \
       -o -name 'id_rsa*' -o -name 'create-qa-*' -o -name 'cleanup-qa*' \
       -o -name 'revoke-sessions*' \
  \) -print 2>/dev/null | head -20)"
if [ -n "$FOUND_FORBIDDEN" ]; then
  echo "$FOUND_FORBIDDEN" | sed 's/^/FAIL: forbidden file in release: /'
  FAILED=1
else
  pass "no dev env/secret/QA files in release"
fi

# ---- 2. Env symlinks resolve to the shared production env -------------------
for link in "$REL/.env" "$REL/apps/api/.env" "$REL/apps/web/.env"; do
  if [ -L "$link" ] && [ "$(readlink -f "$link")" = "$(readlink -f "$SHARED_ENV" 2>/dev/null)" ]; then
    pass "env symlink ok: ${link#"$REL"/}"
  else
    fail "env symlink missing or not pointing to shared env: ${link#"$REL"/}"
  fi
done

# ---- 3. Shared env exists and is locked down --------------------------------
if [ -f "$SHARED_ENV" ]; then pass "shared env exists"; else fail "shared env missing: $SHARED_ENV"; fi

env_val() { grep -E "^$1=" "$SHARED_ENV" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//; s/"$//'; }

# ---- 4. Required environment keys -------------------------------------------
for key in NODE_ENV DATABASE_URL WEB_ORIGIN API_PORT STORAGE_ROOT \
           NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_API_BASE_URL NEXT_PUBLIC_SOCKET_URL \
           AUTH_SESSION_SECRET SESSION_COOKIE_NAME SESSION_EXPIRES_DAYS; do
  if [ -n "$(env_val "$key")" ]; then pass "env key present: $key"; else fail "env key missing: $key"; fi
done

[ "$(env_val NODE_ENV)" = "production" ] && pass "NODE_ENV=production" || fail "NODE_ENV is not production"

# ---- 5. No localhost/dev origins in public/runtime config -------------------
LOCAL_BAD=0
for key in NEXT_PUBLIC_API_BASE_URL NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_SOCKET_URL WEB_ORIGIN EXTRA_WEB_ORIGINS; do
  v="$(env_val "$key")"
  if echo "$v" | grep -qiE 'localhost|127\.0\.0\.1|0\.0\.0\.0|::1'; then
    fail "$key targets a loopback/dev origin"
    LOCAL_BAD=1
  fi
done
[ "$LOCAL_BAD" = 0 ] && pass "no loopback/dev origins in public config"

# ---- 6. Public URLs point at the production domain ---------------------------
for key in NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_API_BASE_URL NEXT_PUBLIC_SOCKET_URL WEB_ORIGIN; do
  v="$(env_val "$key")"
  case "$v" in
    https://*"$DOMAIN"*) pass "$key targets $DOMAIN" ;;
    *) fail "$key does not target $DOMAIN" ;;
  esac
done

# ---- 7. Database target guard ------------------------------------------------
# Production DB = postgres, user/db = approved names, host = loopback only.
# Non-secret signals only; the URL itself is never printed.
check_db_url() {
  local name="$1" url host port db user
  url="$(env_val "$name")"
  [ -n "$url" ] || { fail "$name missing"; return; }
  user="$(printf '%s' "$url" | sed -E 's#^[^:]+://([^:@/]+)(:[^@/]*)?@.*#\1#')"
  host="$(printf '%s' "$url" | sed -E 's#^[^:]+://[^@/]*@([^:/]+).*#\1#')"
  port="$(printf '%s' "$url" | sed -nE 's#^[^:]+://[^@/]*@[^:/]+:([0-9]+).*#\1#p')"
  db="$(printf '%s' "$url" | sed -E 's#^[^:]+://[^@/]*@[^/]+/([^?]+).*#\1#')"
  case "$host" in
    127.0.0.1|localhost|::1) : ;;
    *) fail "$name targets a non-local database host"; return ;;
  esac
  [ "$port" = "5432" ] || { fail "$name uses unexpected port"; return; }
  [ "$user" = "$PROD_DB_USER" ] || { fail "$name uses a non-production database user"; return; }
  [ "$db" = "$PROD_DB_NAME" ] || { fail "$name targets a non-production database"; return; }
  pass "$name targets the approved production database"
}
check_db_url DATABASE_URL
[ -n "$(env_val DIRECT_DATABASE_URL)" ] && check_db_url DIRECT_DATABASE_URL

# ---- 8. Storage root ----------------------------------------------------------
sv="$(env_val STORAGE_ROOT)"
if [ "$sv" = "$STORAGE" ] && [ -d "$STORAGE" ]; then
  pass "storage root = shared storage (exists)"
else
  fail "storage root mismatch or missing"
fi

# ---- 9. Build output checks (post-build only) ---------------------------------
if [ "$MODE" != "--pre-build" ]; then
  [ -f "$REL/apps/web/.next/BUILD_ID" ] && pass "web build present" || fail "web build missing (.next/BUILD_ID)"
  [ -f "$REL/apps/api/dist/main.js" ] && pass "api build present" || fail "api build missing (dist/main.js)"
  [ -f "$REL/package.json" ] && [ -f "$REL/pnpm-lock.yaml" ] && pass "workspace manifests present" || fail "workspace manifests missing"

  if [ -d "$REL/apps/web/.next" ]; then
    if grep -rIl --include='*.js' -E 'localhost:4000|127\.0\.0\.1:4000|0\.0\.0\.0:4000' "$REL/apps/web/.next" >/dev/null 2>&1; then
      fail "web build output references a localhost API origin"
    else
      pass "web build output has no localhost API origin"
    fi
    if grep -rIl --include='*.js' "$DOMAIN" "$REL/apps/web/.next" >/dev/null 2>&1; then
      pass "web build output contains production origin"
    else
      fail "web build output does not contain $DOMAIN"
    fi
  fi
fi

echo "---"
if [ "$FAILED" = 0 ]; then echo "PREFLIGHT PASS: $REL"; exit 0; else echo "PREFLIGHT FAIL: $REL — do NOT switch /current"; exit 1; fi
