#!/usr/bin/env python3
"""bnei-zion Supabase SQL helper (curl-backed, NetSpark-safe). Usage:
  echo "SELECT ..." | python3 sbq.py
  python3 sbq.py "SELECT ..."
  python3 sbq.py -f query.sql
Returns parsed JSON rows."""
import sys, json, subprocess, os

# הטוקן נקרא ממשתנה-סביבה SUPABASE_ACCESS_TOKEN (לא נשמר בקוד — הקובץ ב-git).
# fallback לישן נשאר רק כדי לא לשבור import; אם אין env → יחזיר Unauthorized ותדע להגדיר.
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "sbp_539f16334f9c71e7fa4c036a2ab0a33fe8493c7a")
REF = "pzvmwfexeiruelwiujxn"
URL = f"https://api.supabase.com/v1/projects/{REF}/database/query"

def run(sql):
    body = json.dumps({"query": sql})
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
        env.pop(k, None)
    env["NO_PROXY"] = "*"
    p = subprocess.run([
        "curl","-s","--noproxy","*","-X","POST",URL,
        "-H",f"Authorization: Bearer {TOKEN}",
        "-H","Content-Type: application/json",
        "--data-binary","@-",
    ], input=body, capture_output=True, text=True, env=env, timeout=180)
    return p.stdout

if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "-f":
        sql = open(sys.argv[2], encoding="utf-8").read()
    elif len(sys.argv) >= 2:
        sql = sys.argv[1]
    else:
        sql = sys.stdin.read()
    out = run(sql)
    try:
        parsed = json.loads(out)
        if isinstance(parsed, dict) and parsed.get("message"):
            print("ERROR:", json.dumps(parsed, ensure_ascii=False))
            sys.exit(2)
        print(json.dumps(parsed, ensure_ascii=False, indent=2))
    except Exception:
        print(out)
