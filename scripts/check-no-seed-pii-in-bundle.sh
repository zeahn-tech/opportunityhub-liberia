#!/usr/bin/env bash
# ====================================================================
# check-no-seed-pii-in-bundle.sh
# ====================================================================
# Phase 3 found the demo seed dataset (src/db/dbClient.ts's SEED_USERS
# array -- real-looking candidate/employer emails and one password
# hash) shipping in the production client bundle, regardless of demo
# mode. That specific leak was left open (see docs/PHASE3_GAP_CLOSURE.md
# and the Performance Status section of docs/PRODUCTION_CERTIFICATION_REPORT.md
# for why -- it needs a dedicated async refactor of dbClient.ts, not a
# quick patch). This script is a REGRESSION GATE for whatever fix
# eventually lands: it fails CI if any known seed PII string is found
# in the built client bundle (dist/, excluding dist/server.cjs, which
# is the Node server bundle and is a different exposure surface).
#
# It intentionally does NOT currently pass -- see the Testing/Deployment
# Status sections of the certification report. It exists so that once
# the dbClient.ts refactor lands, this check immediately proves it and
# guards against the leak silently coming back later.
#
# Run via `npm run check:no-seed-pii-in-bundle`. Intended as a CI gate
# (see .github/workflows/ci.yml) that runs after `npm run build`.
# ====================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

# Known seed PII, extracted directly from src/db/dbClient.ts's
# SEED_USERS array. Keep this list in sync with that file -- if a new
# seed user is added there, add their email here too.
SEED_STRINGS=(
  "tamba.kollie@gmail.com"
  "hiring@savethechildren.lr"
  "agency@liberiaworkforce.com"
  "info.tracenetlib@gmail.com"
  "investor@capitolhill.lr"
  "nathaniel.sherman@capitolhillcapital.lr"
  "patrick@gantacivil.lr"
  "procurement@mpw.gov.lr"
  "samuel.tweh@pepperbird.lr"
  "seller@pepperbird.lr"
  "admin@savethechildren.lr"
  # the one real (non-placeholder) password hash seeded for the demo
  # admin account -- see SEED_USERS / dbClient.ts line ~501
  "eb78c639b7ffc706d6fa88b5e355f25d11c19ab6a5f6f66009efb9a4152a2b92"
)

if [ ! -d "dist" ]; then
  echo "SKIP: dist/ not found -- run 'npm run build' first (done automatically in CI before this step)."
  exit 0
fi

FAIL=0
for needle in "${SEED_STRINGS[@]}"; do
  MATCHES=$(grep -rl --exclude=server.cjs --exclude=server.cjs.map -- "$needle" dist/ 2>/dev/null || true)
  if [ -n "$MATCHES" ]; then
    echo "FAIL: seed PII '$needle' found in the built client bundle:"
    echo "$MATCHES"
    FAIL=1
  fi
done

echo ""
if [ "$FAIL" -eq 1 ]; then
  echo "check-no-seed-pii-in-bundle: FAILED"
  echo "See docs/PHASE3_GAP_CLOSURE.md and the certification report's Performance"
  echo "Status section -- this is a known, currently-unfixed leak (dbClient.ts"
  echo "is statically imported by authService.ts / permissionEngine.ts /"
  echo "TrustSafetyAdminCenter.tsx and runs eagerly at module load)."
  exit 1
fi
echo "check-no-seed-pii-in-bundle: PASSED -- no known seed PII strings found in dist/."
