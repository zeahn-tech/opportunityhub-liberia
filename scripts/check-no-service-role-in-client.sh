#!/usr/bin/env bash
# ====================================================================
# check-no-service-role-in-client.sh
# ====================================================================
# Fails (non-zero exit) if SUPABASE_SERVICE_ROLE_KEY, or a Supabase
# client constructed with the service-role key, is ever present in:
#   1. Anything under src/ (the client source tree that Vite bundles
#      into the browser build) or index.html.
#   2. The actual built client bundle in dist/ (dist/server.cjs is the
#      Node server bundle and is intentionally excluded -- the service
#      key is allowed there once Phase 3 wires up server-side usage).
#
# Run via `npm run check:no-service-key-leak`. Intended as a CI gate
# (see .github/workflows/ci.yml) that runs after `npm run build`, so
# step 2 has a real dist/ to scan; it degrades gracefully (skips step
# 2 with a warning) if dist/ doesn't exist yet, e.g. when run locally
# pre-build.
# ====================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

FAIL=0

echo "== Checking src/ and index.html for service-role leakage =="
if grep -RInE "SUPABASE_SERVICE_ROLE_KEY|service_role" \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.html" \
    src/ index.html 2>/dev/null; then
  echo "FAIL: found a service-role reference under src/ or index.html (client-bundled code)."
  FAIL=1
else
  echo "OK: no service-role reference in src/ or index.html."
fi

echo ""
echo "== Checking built client bundle (dist/, excluding dist/server.cjs) =="
if [ -d "dist" ]; then
  # dist/server.cjs is the Node/Express server bundle -- it's allowed
  # to reference the service-role key in Phase 3+. Everything else in
  # dist/ is shipped to the browser and must not.
  MATCHES=$(find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.mjs" \) ! -name "server.cjs" \
    -exec grep -lE "SUPABASE_SERVICE_ROLE_KEY|service_role" {} \; 2>/dev/null || true)
  if [ -n "$MATCHES" ]; then
    echo "FAIL: found a service-role reference in the client bundle:"
    echo "$MATCHES"
    FAIL=1
  else
    echo "OK: no service-role reference in the client bundle."
  fi
else
  echo "SKIP: dist/ not found -- run 'npm run build' first for the strongest guarantee (this is done automatically in CI, see .github/workflows/ci.yml)."
fi

echo ""
if [ "$FAIL" -eq 1 ]; then
  echo "check-no-service-role-in-client: FAILED"
  exit 1
fi
echo "check-no-service-role-in-client: PASSED"
