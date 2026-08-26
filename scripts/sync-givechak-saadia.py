#!/usr/bin/env python3
"""סנכרון מספרי קמפיין סעדיה מ-givechak אל האתר.

מושך את total_stat/total_donors מה-API הציבורי של givechak (eid 96762,
givechak.co.il/Saadia) ומעדכן את campaigns.external_raised/external_donors
של קמפיין `saadia`. אידמפוטנטי — אפשר להריץ כל כמה דקות (cron/ידני).

טוקן: SUPABASE_ACCESS_TOKEN מה-env, או service-role ב-SUPABASE_SERVICE_ROLE.
אין סודות בקובץ הזה.
"""
import json
import os
import sys
import urllib.request

GIVECHAK_URL = "https://givechak.co.il/ajax/api/givechak_get"
GIVECHAK_EID = "96762"
PROJECT_REF = "pzvmwfexeiruelwiujxn"


def fetch_givechak():
    req = urllib.request.Request(
        GIVECHAK_URL,
        data=f"eid={GIVECHAK_EID}".encode(),
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126",
            "Referer": "https://givechak.co.il/Saadia",
        },
        method="POST",
    )
    data = json.loads(urllib.request.urlopen(req, timeout=30).read().decode())
    raised = int(round(float(data["total_stat"])))
    donors = int(data["total_donors"])
    if raised <= 0 or donors <= 0:
        raise RuntimeError(f"suspicious givechak payload: raised={raised} donors={donors}")
    return raised, donors


def update_campaign(raised, donors):
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        sys.exit("SUPABASE_ACCESS_TOKEN missing from env (see api-keys.md)")
    sql = (
        "update public.campaigns set external_raised=%d, external_donors=%d, "
        "updated_at=now() where slug='saadia' and external_source='givechak' "
        "returning external_raised, external_donors" % (raised, donors)
    )
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126",
        },
        method="POST",
    )
    return json.loads(urllib.request.urlopen(req, timeout=30).read().decode())


if __name__ == "__main__":
    raised, donors = fetch_givechak()
    result = update_campaign(raised, donors)
    print(f"givechak: ₪{raised:,} / {donors:,} donors → campaigns.saadia updated: {result}")
