#!/usr/bin/env bash
# Integration tests for navigation-bot edge function (deployed to Supabase)
# Usage: bash supabase/functions/navigation-bot/integration-test.sh [BASE_URL]
#
# BASE_URL defaults to production Supabase. Pass a local URL for local dev:
#   bash integration-test.sh http://localhost:54321
#
# Requires: curl, python3
# Created: 2026-06-02, branch fix/benzi-valid-links

set -euo pipefail

BASE_URL="${1:-https://pzvmwfexeiruelwiujxn.supabase.co}"
ENDPOINT="${BASE_URL}/functions/v1/navigation-bot"

# Decode anon key (same base64 as in client.ts)
ANON_KEY=$(python3 -c "import base64; print(base64.b64decode('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CNmRtMTNabVY0WldseWRXVnNkMmwxYW5odUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpVMU5UTTFOelVzSW1WNGNDSTZNakE1TVRFeU9UVTNOWDAuVTVhZ0xrZjZqZkxVZzdVamZkblRKZmF2VXN4LWR5enhzMmZ4SmdXQXA4bw==').decode())")

PASS=0
FAIL=0
ERRORS=()

# Known-bad routes that must NEVER appear in responses
KNOWN_BAD_ROUTES=(
  "/how-to-learn-tanach"
  "/study-aids"
  "/pricing"
  "/bible-book/esther"
  "/bible-book/bereshit"
  "/series"
)

call_bot() {
  local msg="$1"
  local session_id="test-$(date +%s)-$RANDOM"
  curl --noproxy '*' -s "${ENDPOINT}" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"${msg}\",\"session_id\":\"${session_id}\",\"history\":[]}" \
    -m 30
}

check_no_bad_routes() {
  local test_name="$1"
  local response="$2"
  local found_bad=()
  for bad_route in "${KNOWN_BAD_ROUTES[@]}"; do
    if echo "$response" | grep -q "\"${bad_route}\""; then
      found_bad+=("$bad_route")
    fi
  done
  if [ ${#found_bad[@]} -eq 0 ]; then
    echo "  PASS: no invalid routes in response"
    ((PASS++))
  else
    echo "  FAIL: found invalid routes: ${found_bad[*]}"
    echo "  response: $(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print('route_suggestion:', d.get('route_suggestion')); print('ctas:', [c.get('route') for c in d.get('cta_buttons',[])])" 2>/dev/null || echo "$response")"
    ERRORS+=("${test_name}: bad routes ${found_bad[*]}")
    ((FAIL++))
  fi
}

check_route_is_valid() {
  local test_name="$1"
  local response="$2"
  local route
  route=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('route_suggestion',''))" 2>/dev/null || echo "")
  if [ -z "$route" ] || [ "$route" = "/" ]; then
    # "/" is always valid (fallback)
    echo "  PASS: route_suggestion is '/' (fallback)"
    ((PASS++))
    return
  fi
  # Check against known valid patterns
  if echo "$route" | grep -qE '^/(parasha|rabbis|teachers|chapter-weekly|megilat-esther|portal|donate|contact|store|about|terms|memorial|community|daily-verse|kenes|dor-haplaot|daily-video|auth|profile|favorites|history|roadmap|courses|portal-login)(/|$)'; then
    echo "  PASS: route_suggestion valid: $route"
    ((PASS++))
  elif echo "$route" | grep -qE '^/(rabbis|lessons|series|bible|store|community|course|teachers/series|teachers/lesson)/'; then
    echo "  PASS: route_suggestion valid prefix: $route"
    ((PASS++))
  else
    echo "  FAIL: potentially invalid route_suggestion: $route"
    ERRORS+=("${test_name}: suspicious route_suggestion '$route'")
    ((FAIL++))
  fi
}

check_has_reply() {
  local test_name="$1"
  local response="$2"
  local reply
  reply=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('reply_text',''))" 2>/dev/null || echo "")
  if [ -n "$reply" ]; then
    echo "  PASS: reply_text present (${#reply} chars)"
    ((PASS++))
  else
    echo "  FAIL: empty reply_text"
    ERRORS+=("${test_name}: empty reply_text")
    ((FAIL++))
  fi
}

run_test() {
  local name="$1"
  local msg="$2"
  echo ""
  echo "─── ${name} ───"
  echo "  Query: \"${msg}\""
  local resp
  resp=$(call_bot "$msg")
  check_has_reply "$name" "$resp"
  check_no_bad_routes "$name" "$resp"
  check_route_is_valid "$name" "$resp"
  # Print what was returned for visibility
  echo "$resp" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  print('  reply:', d.get('reply_text','')[:100])
  print('  route_suggestion:', d.get('route_suggestion',''))
  print('  cta_routes:', [c.get('route') for c in d.get('cta_buttons',[])])
except: print('  (parse error)')" 2>/dev/null || true
}

echo "======================================"
echo "navigation-bot integration tests"
echo "Endpoint: ${ENDPOINT}"
echo "======================================"

# Test 1: basic connectivity
echo ""
echo "─── Test 0: Health check (OPTIONS) ───"
STATUS=$(curl --noproxy '*' -s -o /dev/null -w "%{http_code}" -X OPTIONS "${ENDPOINT}" -H "apikey: ${ANON_KEY}" -m 10)
if [ "$STATUS" = "200" ]; then
  echo "  PASS: OPTIONS returns 200"
  ((PASS++))
else
  echo "  FAIL: OPTIONS returned $STATUS (expected 200)"
  ERRORS+=("Health check: OPTIONS returned $STATUS")
  ((FAIL++))
fi

# Test known-bad scenarios from live audit
run_test "T01 parasha route" "מה פרשת השבוע?"
run_test "T02 how-to-learn (was /how-to-learn-tanach)" "איך ללמוד תנ\"ך?"
run_test "T03 pricing (was /pricing)" "כמה עולה המנוי לתכנית הפרק השבועי?"
run_test "T04 teacher tools (was /study-aids)" "אני מורה לתנ\"ך - מה יש לכם?"
run_test "T05 donation" "אני רוצה לתרום"
run_test "T06 specific rabbi" "אני מחפש שיעורים של הרב יואב אוריאל"
run_test "T07 store" "איפה החנות?"
run_test "T08 portal" "האזור האישי שלי"
run_test "T09 megilat esther (was /bible-book/esther)" "מה זה מגילת אסתר באתר?"
run_test "T10 contact" "איך ליצור קשר?"
run_test "T11 off-topic refusal" "מה דעתך על הממשלה?"
run_test "T12 community" "מה זה קהילת בני ציון?"

# Edge cases
run_test "T13 empty-ish message" "שלום"
run_test "T14 chapter-weekly" "תכנית הפרק השבועי"

echo ""
echo "======================================"
echo "Results: ${PASS} PASS / ${FAIL} FAIL"
if [ ${#ERRORS[@]} -gt 0 ]; then
  echo "Failures:"
  for e in "${ERRORS[@]}"; do
    echo "  - $e"
  done
fi
echo "======================================"

[ $FAIL -eq 0 ]
