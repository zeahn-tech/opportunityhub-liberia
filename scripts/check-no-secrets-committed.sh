#!/usr/bin/env bash
# ====================================================================
# check-no-secrets-committed.sh
# ====================================================================
# Two checks, both against git-tracked files only (git ls-files --
# never node_modules/dist/local .env, which are gitignored anyway):
#
# 1. .env.example must contain ONLY placeholder values for
#    SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
#    and GEMINI_API_KEY -- never a real-looking key. "Placeholder"
#    means: empty, or a value that doesn't match a real provider's key
#    shape (sk_live_/sk_test_/whsec_/AIza... etc).
#
# 2. No other git-tracked file may contain a real-looking secret value
#    for those same providers, anywhere (not just assigned to those
#    env var names -- a hardcoded key is a leak regardless of variable
#    name).
#
# This is a pattern-based safety net, NOT a replacement for GitHub's
# built-in secret scanning (Settings -> Code security -> Secret
# scanning), which should also be confirmed enabled on the repo --
# see docs/DEPLOYMENT.md's "Secret hygiene" section.
#
# Run via `npm run check:no-secrets-committed`.
# ====================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

FAIL=0

echo "== Checking .env.example is placeholders only =="
if [ ! -f ".env.example" ]; then
  echo "FAIL: .env.example is missing."
  FAIL=1
else
  # Real Stripe/Gemini/Supabase secret shapes that must never appear,
  # even in the example file.
  if grep -nE "sk_live_[A-Za-z0-9]|sk_test_[A-Za-z0-9]{10,}|whsec_[A-Za-z0-9]{10,}|AIza[0-9A-Za-z_-]{20,}" .env.example; then
    echo "FAIL: .env.example contains a real-looking secret value."
    FAIL=1
  else
    echo "OK: .env.example has no real-looking secret values."
  fi
  # The 4 sensitive vars named in this check should be present as
  # empty/placeholder assignments (documenting that they exist and
  # are required) -- not silently missing from the example file.
  for var in SUPABASE_SERVICE_ROLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET GEMINI_API_KEY; do
    if ! grep -qE "^${var}=" .env.example; then
      echo "FAIL: .env.example does not document ${var} (should be present, empty or placeholder)."
      FAIL=1
    fi
  done
fi

echo ""
echo "== Scanning all git-tracked files for real-looking secret values =="
# Scan the actual committed tree (git ls-files), not the working
# directory, so a local .env someone forgot to gitignore-check
# doesn't produce a false pass/fail here -- git ls-files only lists
# what would actually ship in the repo.
MATCHES=$(git ls-files -z \
  | xargs -0 grep -lE "sk_live_[A-Za-z0-9]{10,}|sk_test_[A-Za-z0-9]{10,}|whsec_[A-Za-z0-9]{10,}|AIza[0-9A-Za-z_-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}" 2>/dev/null \
  | grep -v '^.env.example$' \
  || true)
if [ -n "$MATCHES" ]; then
  echo "FAIL: real-looking secret value(s) found in tracked file(s):"
  echo "$MATCHES"
  FAIL=1
else
  echo "OK: no real-looking secret values found in tracked files."
fi

echo ""
if [ "$FAIL" -eq 1 ]; then
  echo "check-no-secrets-committed: FAILED"
  exit 1
fi
echo "check-no-secrets-committed: PASSED"
