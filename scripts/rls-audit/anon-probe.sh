#!/usr/bin/env bash
# Anon leak probe — hits the PUBLIC REST API with ONLY the anon key, exactly as a
# stranger with no login could. Read-only GETs. Demonstrates which tables leak.
# Run before hardening (see the leaks) and after (confirm they're sealed).
set -euo pipefail

B="https://pzvmwfexeiruelwiujxn.supabase.co/rest/v1"
# anon (publishable) key — PUBLIC by design (already shipped in every browser bundle).
ANON="$(python3 -c "import base64;print(base64.b64decode('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CNmRtMTNabVY0WldseWRXVnNkMmwxYW5odUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpVMU5UTTFOelVzSW1WNGNDSTZNakE1TVRFeU9UVTNOWDAuVTVhZ0xrZjZqZkxVZzdVamZkblRKZmF2VXN4LWR5enhzMmZ4SmdXQXA4bw==').decode())")"

probe() { # label  path
  printf '%-34s => ' "$1"
  local code
  code=$(curl -s --noproxy '*' -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
              "$B/$2" -w '%{http_code}' -o /tmp/_probe.json)
  printf '[HTTP %s] ' "$code"; head -c 180 /tmp/_probe.json; echo
}

echo "── LEAKS the hardening seals (expect data BEFORE, [] AFTER) ──"
probe "order_items (purchase prices)" "order_items?select=title,unit_price&limit=2"
probe "user_roles (admin ids)"        "user_roles?select=user_id,role&limit=5"
probe "ohp_messages"                  "ohp_messages?select=id,subject&limit=2"

echo "── Already protected (must stay [] / blocked) ──"
probe "donations (PII)"               "donations?select=*&limit=1"
probe "orders (PII)"                  "orders?select=*&limit=1"
probe "profiles (PII)"                "profiles?select=*&limit=1"
probe "backup lessons_bak_20260607"   "lessons_bak_20260607?select=id&limit=1"

echo "── Architecturally public (stays readable — see RLS-PLAN §5) ──"
probe "teacher-tagged lessons"        "lessons?select=id&audience_tags=cs.%7Bteachers%7D&limit=1"
probe "public series"                 "series?select=id&limit=1"
