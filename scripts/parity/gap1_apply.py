#!/usr/bin/env python3
"""gap1: apply certain author fixes (lessons.rabbi_id + series.rabbi_id).

Reads gap1-fix-plan-*-final.json. Batched UPDATE via Supabase Management API.
Scope guard: only rows with audience_tags @> ['teachers'].
Run AFTER backups lessons_bak_gap1_* / series_bak_gap1_* are verified.
"""
import json
import glob
import subprocess
import sys

TOKEN = "sbp_539f16334f9c71e7fa4c036a2ab0a33fe8493c7a"
REF = "pzvmwfexeiruelwiujxn"
BATCH = 400


def run_sql(sql):
    payload = json.dumps({"query": sql})
    r = subprocess.run(
        ["curl", "-s", "--noproxy", "*", "-X", "POST",
         f"https://api.supabase.com/v1/projects/{REF}/database/query",
         "-H", f"Authorization: Bearer {TOKEN}",
         "-H", "Content-Type: application/json", "-d", payload],
        capture_output=True)
    out = r.stdout.decode()
    try:
        return json.loads(out)
    except Exception:
        print("RAW:", out[:500])
        raise


plan_path = sorted(glob.glob("scripts/parity/reports/gap1-fix-plan-*-final.json"))[-1]
plan = json.load(open(plan_path))
fixes = plan["lesson_fixes"]
sfixes = plan["series_fixes"]
print(f"plan: {plan_path} | lesson fixes: {len(fixes)} | series fixes: {len(sfixes)}")

if "--dry-run" in sys.argv:
    sys.exit(0)

total = 0
for i in range(0, len(fixes), BATCH):
    chunk = fixes[i:i + BATCH]
    values = ",".join(f"('{f['lesson_id']}'::uuid,'{f['new_rabbi_id']}'::uuid)"
                      for f in chunk)
    sql = (f"WITH v(id, rid) AS (VALUES {values}) "
           "UPDATE lessons l SET rabbi_id = v.rid FROM v "
           "WHERE l.id = v.id AND l.audience_tags @> ARRAY['teachers'] "
           "RETURNING l.id")
    res = run_sql(sql)
    n = len(res) if isinstance(res, list) else 0
    total += n
    print(f"  batch {i//BATCH + 1}: updated {n}/{len(chunk)}", flush=True)
print(f"lessons updated: {total}")

stotal = 0
for f in sfixes:
    sql = (f"UPDATE series SET rabbi_id = '{f['new_rabbi_id']}'::uuid "
           f"WHERE id = '{f['series_id']}'::uuid "
           "AND audience_tags @> ARRAY['teachers'] RETURNING id")
    res = run_sql(sql)
    stotal += len(res) if isinstance(res, list) else 0
print(f"series updated: {stotal}")
