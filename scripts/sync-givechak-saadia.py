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


TIER_MAP = {  # tickchak ticket title -> campaign_tiers.tier_key
    "140": "tier-140", "270": "tier-270", "50*12": "tier-50x12",
    "100*12": "tier-100x12", "180*12": "tier-180x12",
    "100*36": "tier-100x36", "180*24": "tier-180x24",
}


def fetch_tier_sold():
    """form/init מחזיר sold פר-חבילה + תרומה חופשית (877)."""
    req = urllib.request.Request(
        "https://givechak.co.il/ajax/form/init",
        data=f"eid={GIVECHAK_EID}".encode(),
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126",
            "Referer": "https://givechak.co.il/Saadia",
        },
        method="POST",
    )
    data = json.loads(urllib.request.urlopen(req, timeout=30).read().decode())
    sold = {}
    free = 0
    for t in data.get("event", {}).get("tickets", []) or data.get("tickets", []):
        title, n = t.get("title", ""), int(t.get("sold") or 0)
        if title in TIER_MAP:
            sold[TIER_MAP[title]] = n
        elif "חופשית" in title:
            free = n
    return sold, free


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


def update_tiers(sold, free):
    # שער fail-closed (חוק-ברזל): תשובה בלי חבילות = לא נוגעים בדאטה הקיים
    if not sold:
        print("form/init returned no tier data — skipping tier update (kept previous values)")
        return
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    parts = []
    if free > 0:
        parts.append(
            "update public.campaigns set external_free_donors=%d where slug='saadia' and external_source='givechak';" % free
        )
    for key, n in sold.items():
        parts.append(
            "update public.campaign_tiers t set external_sold=%d from public.campaigns c "
            "where c.id=t.campaign_id and c.slug='saadia' and t.tier_key='%s';" % (n, key)
        )
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        data=json.dumps({"query": "\n".join(parts)}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126",
        },
        method="POST",
    )
    urllib.request.urlopen(req, timeout=30).read()


if __name__ == "__main__":
    raised, donors = fetch_givechak()
    result = update_campaign(raised, donors)
    sold, free = fetch_tier_sold()
    update_tiers(sold, free)
    print(f"givechak: ₪{raised:,} / {donors:,} donors, tiers {sold}, free {free} → updated: {result}")
