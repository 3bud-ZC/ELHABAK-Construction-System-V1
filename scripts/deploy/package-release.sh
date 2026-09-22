#!/usr/bin/env bash
# Package a production release tarball for elhabak.com from the committed source.
#
# Usage: scripts/deploy/package-release.sh [output.tar.gz]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-/tmp/elhabak-release.tar.gz}"
cd "$ROOT"

# Packaging from a dirty tree would make the release unverifiable.
if ! git diff --quiet; then
  echo "FAIL: tracked working-tree changes detected; commit them before packaging" >&2
  exit 1
fi
if ! git diff --cached --quiet; then
  echo "FAIL: staged but uncommitted changes detected; commit them before packaging" >&2
  exit 1
fi
UNTRACKED="$(git status --porcelain=v1 --untracked-files=all | sed -n 's/^?? //p')"
if [ -n "$UNTRACKED" ]; then
  echo "$UNTRACKED" | sed 's/^/FAIL: untracked source-like file prevents packaging: /' >&2
  exit 1
fi

COMMIT="$(git rev-parse HEAD)"
BRANCH="$(git branch --show-current)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
SOURCE_TAR="$TMP/source.tar"
STAGE="$TMP/stage"
mkdir -p "$STAGE"

git archive --format=tar --output="$SOURCE_TAR" HEAD
tar -xf "$SOURCE_TAR" -C "$STAGE"
# Git for Windows may materialize archived text with CRLF; shell entrypoints must remain executable on Linux.
find "$STAGE" -type f -name '*.sh' -exec sed -i 's/\r$//' {} +
ARCHIVE_SHA256="$(tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner \
  --exclude='./.release-meta.json' --exclude='./node_modules' --exclude='./.next' --exclude='./dist' \
  --exclude='./.turbo' --exclude='./coverage' --exclude='./.pnpm-store' --exclude='./storage' \
  --exclude='./test-results' --exclude='./storage-backups' --exclude='./backups' --exclude='*.tsbuildinfo' \
  --exclude='*.log' --exclude='.env' --exclude='.env.*' --exclude='.credentials.local' \
  --exclude='*.secret' --exclude='*.pem' --exclude='*.key' --exclude='id_rsa*' \
  --exclude='.codex-*-qa' --exclude='.codex-brand-preview' --exclude='.playwright-cli' \
  --exclude='.claude' --exclude='.vscode' --exclude='.idea' --exclude='create-qa-*' \
  --exclude='cleanup-qa*' --exclude='revoke-sessions*' --exclude='*.tar.gz' \
  -cf - -C "$STAGE" . | sha256sum | awk '{print $1}')"

cat > "$STAGE/.release-meta.json" <<EOF
{
  "commitSha": "$COMMIT",
  "branch": "$BRANCH",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "archiveSha256": "$ARCHIVE_SHA256"
}
EOF

# Forbidden in any release: real env files, credentials, secrets, QA material,
# build/runtime artifacts, and local backups. Templates remain allowed.
FORBIDDEN_REGEX='(^|/)(\.env$|\.env\.(local|development|production|test|staging)(\.|$)|\.credentials\.|[^/]*\.secret$|[^/]*\.(pem|key)$|id_rsa|qa-pass|admin-visual|admin-verify|create-qa|cleanup-qa|revoke-sessions|storage-backups|(^|/)backups(/|$)|[^/]*\.(dump|tar\.gz)$|node_modules|\.next|dist|coverage|test-results)'

EXCLUDES=(
  --exclude='./.git' --exclude='.git' --exclude='./node_modules' --exclude='node_modules'
  --exclude='./.next' --exclude='.next' --exclude='./dist' --exclude='dist'
  --exclude='./.turbo' --exclude='.turbo' --exclude='./coverage' --exclude='coverage'
  --exclude='./.pnpm-store' --exclude='.pnpm-store' --exclude='./storage' --exclude='storage'
  --exclude='./test-results' --exclude='test-results' --exclude='./storage-backups' --exclude='storage-backups'
  --exclude='./backups' --exclude='backups' --exclude='*.tsbuildinfo' --exclude='*.log'
  --exclude='.env' --exclude='.env.local' --exclude='.env.development' --exclude='.env.development.local'
  --exclude='.env.production' --exclude='.env.production.local' --exclude='.env.test' --exclude='.env.test.local'
  --exclude='.env.staging' --exclude='.env.staging.local' --exclude='.credentials.local'
  --exclude='*.secret' --exclude='*.pem' --exclude='*.key' --exclude='id_rsa*'
  --exclude='.codex-*-qa' --exclude='.codex-brand-preview' --exclude='.playwright-cli'
  --exclude='.claude' --exclude='.vscode' --exclude='.idea' --exclude='create-qa-*'
  --exclude='cleanup-qa*' --exclude='revoke-sessions*' --exclude='.DS_Store' --exclude='Thumbs.db'
)

echo ">> packaging committed source $COMMIT -> $OUT"
tar "${EXCLUDES[@]}" -C "$STAGE" -czf "$OUT" .
if tar -tzf "$OUT" | grep -nE "$FORBIDDEN_REGEX"; then
  echo "FAIL: release archive contains forbidden file(s) listed above" >&2
  rm -f "$OUT"
  exit 1
fi

SIZE="$(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT")"
echo "PASS: archive clean ($SIZE bytes): $OUT"
echo "PASS: release metadata commit=$COMMIT archiveSha256=$ARCHIVE_SHA256"
