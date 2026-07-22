#!/usr/bin/env python3
"""
סבב 22.7.2026 (הערות יואב 22.7 בוקר) — תיקון גישת קורס "איך לומדים תנ"ך".

הבאג: יואב קישר את הקורס למוצר שהקים בחנות, אבל access_type נשאר 'open' —
כל גולש מחובר נכנס חינם לקורס בתשלום (לקוח אמיתי קיבל קישור רכישה הבוקר).

התיקון (שורה אחת ב-community_courses):
  access_type: open → requires_tag
  access_tag:  null → course:<id>   (המוסכמה של הענקת-התג ב-webhook)
  price:       0 → 165              (מחיר המוצר המקושר — לתצוגה בקטלוג)

ערכים לפני: access_type=open, access_tag=null, price=0 (נבדק 22.7 08:45)
rollback: PATCH חזרה לערכים למעלה.

הרצה: SUPABASE_SERVICE_ROLE_BNEYZION=<key> python3 scripts/fix-how-to-learn-access-20260722.py [--apply]
"""
import json
import os
import sys
import urllib.request

KEY = os.environ["SUPABASE_SERVICE_ROLE_BNEYZION"]
BASE = "https://pzvmwfexeiruelwiujxn.supabase.co/rest/v1"
COURSE_ID = "78499931-fccb-44f5-8efd-f52f608184a2"
APPLY = "--apply" in sys.argv


def req(path: str, body=None, method="GET"):
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = "return=representation"
        data = json.dumps(body).encode()
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    return json.load(urllib.request.urlopen(r))


before = req(
    f"/community_courses?id=eq.{COURSE_ID}"
    "&select=id,title,access_type,access_tag,store_product_slug,price"
)
print("BEFORE:", json.dumps(before, ensure_ascii=False))
if not before:
    sys.exit("course not found!")

if not APPLY:
    print("dry-run בלבד. להחלה: --apply")
    sys.exit(0)

after = req(
    f"/community_courses?id=eq.{COURSE_ID}",
    body={
        "access_type": "requires_tag",
        "access_tag": f"course:{COURSE_ID}",
        "price": 165,
    },
    method="PATCH",
)
print("AFTER:", json.dumps(
    [{k: r[k] for k in ("access_type", "access_tag", "price")} for r in after],
    ensure_ascii=False,
))
