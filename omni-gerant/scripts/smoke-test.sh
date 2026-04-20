#!/bin/bash
# Smoke test for zenadmin API
# Usage: ./scripts/smoke-test.sh [API_URL]

API_URL="${1:-https://omni-gerant-api.onrender.com}"
FAILURES=0

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  status=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  if [ "$status" = "$expected_status" ]; then
    echo "  OK  $name ($status)"
  else
    echo "  FAIL $name (got $status, expected $expected_status)"
    FAILURES=$((FAILURES + 1))
  fi
}

echo "Smoke test: $API_URL"
echo "---"

check "Health"       "$API_URL/health"
check "Health Ready" "$API_URL/health/ready"
check "Health Live"  "$API_URL/health/live"
check "Metrics"      "$API_URL/metrics"
check "Auth (no body = 400)" "$API_URL/api/auth/login" "400"
check "Dashboard (no auth = 401)" "$API_URL/api/dashboard" "401"

echo "---"
if [ "$FAILURES" -eq 0 ]; then
  echo "All checks passed"
  exit 0
else
  echo "$FAILURES check(s) failed"
  exit 1
fi
