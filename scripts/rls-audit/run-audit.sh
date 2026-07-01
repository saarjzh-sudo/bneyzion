#!/usr/bin/env bash
# RLS audit runner — executes rls-audit.sql against the live DB via the Supabase
# Management API. READ-ONLY (SELECT + EXPLAIN). Never applies the migration.
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=sbp_... ./run-audit.sh          # runs all statements
#   SUPABASE_ACCESS_TOKEN=sbp_... ./run-audit.sh "<sql>"  # runs one ad-hoc query
#
# Token: קרא מ-api-keys.md → SUPABASE_ACCESS_TOKEN (Management PAT, 6 פרויקטים).
# Never hardcode the token here (KNOWLEDGE §663 — leaked-secret incident).
set -euo pipefail

REF="pzvmwfexeiruelwiujxn"   # bני ציון
: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN (Management PAT) — read from api-keys.md}"
API="https://api.supabase.com/v1/projects/${REF}/database/query"

run_one() {
  local sql="$1"
  local body
  body=$(python3 -c 'import json,sys; print(json.dumps({"query": sys.argv[1]}))' "$sql")
  curl -s --noproxy '*' -X POST "$API" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$body"
  echo
}

if [[ $# -ge 1 ]]; then
  run_one "$1"
  exit 0
fi

# Split rls-audit.sql on ';' at end-of-line and run each statement.
HERE="$(cd "$(dirname "$0")" && pwd)"
python3 - "$HERE/rls-audit.sql" <<'PY' | while IFS= read -r stmt; do
import sys, re
sql = open(sys.argv[1], encoding="utf-8").read()
# strip comment lines, then split on semicolons
lines = [l for l in sql.splitlines() if not l.strip().startswith("--")]
body = "\n".join(lines)
for s in body.split(";"):
    s = s.strip()
    if s:
        print(s.replace("\n", " "))
PY
  [[ -z "$stmt" ]] && continue
  echo "── $stmt" | cut -c1-90
  run_one "$stmt"
  echo
done
