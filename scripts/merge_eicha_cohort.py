#!/usr/bin/env python3
"""
merge_eicha_cohort.py — מיזוג קוהורט איכה למנויים הרגילים (להרצה אחרי ט' באב 23.7.2026).

מה זה עושה (הוראת סער 8.7.2026):
  כשמסתיים לימוד איכה בתשעה באב, לומדי איכה (tag program:eicha-monday)
  עוברים להיות מנויים רגילים של ימי רביעי (tag program:weekly-chapter).

זרימה:
  1. snapshot של user_access_tags (טבלת גיבוי עם תאריך).
  2. לכל שורת eicha פעילה: אם אין לאותו מייל שורת weekly-chapter — יוצר אחת
     (source='eicha_merge'); את שורת ה-eicha מסמן valid_until=now (הסתיים המסלול).
  3. מדפיס דוח. אידמפוטנטי — ריצה חוזרת לא מכפילה.

הרצה: SUPABASE_SERVICE_ROLE_BNEYZION=... python3 scripts/merge_eicha_cohort.py [--apply]
       בלי --apply = דוח יבש בלבד.
"""
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

REF = "pzvmwfexeiruelwiujxn"
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_BNEYZION", "")
if not KEY:
    sys.exit("חסר SUPABASE_SERVICE_ROLE_BNEYZION בסביבה")
BASE = f"https://{REF}.supabase.co/rest/v1"
HDR = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
APPLY = "--apply" in sys.argv


def req(method, path, body=None, prefer=None):
    h = dict(HDR)
    if prefer:
        h["Prefer"] = prefer
    r = urllib.request.Request(f"{BASE}{path}", method=method,
                               data=json.dumps(body).encode() if body is not None else None, headers=h)
    with urllib.request.urlopen(r) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None


def main():
    now = datetime.now(timezone.utc).isoformat()
    eicha = req("GET", "/user_access_tags?select=id,email,display_name,valid_until&tag=eq.program:eicha-monday")
    weekly = req("GET", "/user_access_tags?select=email&tag=eq.program:weekly-chapter")
    weekly_emails = {(w.get("email") or "").lower() for w in weekly}

    active_eicha = [r for r in eicha if not r["valid_until"] or r["valid_until"] > now]
    to_promote = [r for r in active_eicha if (r.get("email") or "").lower() not in weekly_emails]
    already = len(active_eicha) - len(to_promote)
    print(f"קוהורט איכה פעיל: {len(active_eicha)} | כבר מנויים רגילים: {already} | לקידום: {len(to_promote)}")

    if not APPLY:
        for r in to_promote[:20]:
            print("  יקודם:", r.get("email") or r.get("display_name"))
        print("\n(דוח יבש — להרצה אמיתית הוסף --apply)")
        return

    # snapshot
    stamp = datetime.now().strftime("%Y%m%d")
    # PostgREST לא יוצר טבלאות — snapshot דרך ה-Management API נעשה ידנית לפני,
    # לכן כאן שומרים JSON מקומי כגיבוי מלא:
    backup = f"scripts/parity/reports/eicha_merge_backup_{stamp}.json"
    with open(backup, "w") as f:
        json.dump(eicha, f, ensure_ascii=False)
    print("גיבוי JSON:", backup)

    promoted = 0
    for r in to_promote:
        req("POST", "/user_access_tags", body={
            "email": (r.get("email") or "").lower() or None,
            "display_name": r.get("display_name"),
            "tag": "program:weekly-chapter",
            "valid_until": None,
            "source": "eicha_merge",
            "pending_user_link": True,
            "notes": f"מוזג מקוהורט איכה {stamp}",
        }, prefer="return=minimal")
        promoted += 1
    # סיום שורות האיכה (המסלול הסתיים)
    for r in active_eicha:
        req("PATCH", f"/user_access_tags?id=eq.{r['id']}",
            body={"valid_until": now, "cancel_note": f"מסלול איכה הסתיים — מוזג לרגילים {stamp}"},
            prefer="return=minimal")
    print(f"קודמו {promoted} · נסגרו {len(active_eicha)} שורות איכה. בוצע.")


if __name__ == "__main__":
    main()
