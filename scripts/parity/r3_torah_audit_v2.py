#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
r3_torah_audit_v2.py — Round 3: depth parity audit for Torah.
Uses URLs scraped directly from the old-site index page (ground truth).
READ-ONLY.

Usage:
  cd /Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity
  export HTTP_PROXY="" HTTPS_PROXY="" NO_PROXY="*"
  python3 r3_torah_audit_v2.py
"""

from __future__ import annotations
import json, re, subprocess, sys, time
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
REPORTS = HERE / "reports"
REPORTS.mkdir(exist_ok=True)

OLD_SITE = "https://www.bneyzion.co.il"
STAMP = datetime.now().strftime("%Y%m%d-%H%M")

# ── Supabase ─────────────────────────────────────────────────────────────────
TOKEN = "sbp_539f16334f9c71e7fa4c036a2ab0a33fe8493c7a"
REF   = "pzvmwfexeiruelwiujxn"

def sbq(sql: str) -> list:
    body = json.dumps({"query": sql})
    r = subprocess.run(
        ["curl", "--noproxy", "*", "-s", "-X", "POST",
         f"https://api.supabase.com/v1/projects/{REF}/database/query",
         "-H", f"Authorization: Bearer {TOKEN}",
         "-H", "Content-Type: application/json",
         "--data-binary", "@-"],
        input=body, capture_output=True, text=True, timeout=60
    )
    try:
        data = json.loads(r.stdout)
        if isinstance(data, dict) and data.get("message"):
            print(f"  SQL ERROR: {data['message'][:300]}", file=sys.stderr)
            return []
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"  JSON err: {e} | {r.stdout[:200]}", file=sys.stderr)
        return []

# ── HTTP fetch ────────────────────────────────────────────────────────────────
def fetch(url: str) -> str | None:
    r = subprocess.run(
        ["curl", "--noproxy", "*", "-sL", "--max-time", "30",
         "-A", "Mozilla/5.0", url],
        capture_output=True, timeout=35
    )
    html = r.stdout.decode("utf-8", errors="replace")
    if not html or len(html) < 500:
        return None
    return html

# ── Count lesson cards on old-site parasha page ────────────────────────────
def count_old_lessons(url: str) -> int | None:
    html = fetch(url)
    if not html:
        return None
    # lessonBlock = one lesson card per div
    blocks = len(re.findall(r'class="[^"]*lessonBlock[^"]*"', html))
    if blocks > 0:
        return blocks
    # table-row pattern (some pages use tr[data-tooltip])
    rows = len(re.findall(r'<tr[^>]+data-tooltip', html))
    if rows > 0:
        return rows
    return 0

# ── DB queries ─────────────────────────────────────────────────────────────
def db_public_count(series_id: str) -> int:
    rows = sbq(f"""
      SELECT count(*) AS n FROM lessons
      WHERE series_id = '{series_id}'
        AND status = 'published'
        AND NOT (audience_tags && ARRAY['teachers']::text[])
    """)
    return int(rows[0]["n"]) if rows else 0

def db_teacher_leak(series_id: str) -> int:
    rows = sbq(f"""
      SELECT count(*) AS n FROM lessons
      WHERE series_id = '{series_id}'
        AND status = 'published'
        AND audience_tags && ARRAY['teachers']::text[]
    """)
    return int(rows[0]["n"]) if rows else 0

# ── Parasha table: (chumash, db_title, series_id, old_path) ───────────────
# old_path = path from old-site index (ground truth, not guessed)
PARASHIYOT = [
    # === בראשית ===
    ("בראשית", "פרשת בראשית | א-ו",    "b8bfb329-6b3b-46a5-ab1f-eff2c4dda28e",
     "/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-בראשית-א-ו/"),
    ("בראשית", "פרשת נח | ו-יא",        "52540731-cd46-483d-9514-cb17ae6ca6c8",
     "/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-נח-ו-יא/"),
    ("בראשית", "פרשת לך לך | יב-יז",    "7e8d543c-cd93-4ba3-a822-bccba62380f0",
     "/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-לך-לך-יב-יז/"),
    ("בראשית", "פרשת וירא | יח-כב",     "5b99dce0-31fa-4d5a-8e04-be8e2aa8bf77",
     "/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-וירא-יח-כב/"),
    ("בראשית", "פרשת חיי שרה | כג-כה",  "7d170b1e-fdb1-48e4-9006-c0a536c06b59",
     "/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-חיי-שרה-כג-כה/"),
    ("בראשית", "פרשת תולדות | כה-כח",   "2b7c2d84-17e0-4d15-922b-96fc154a8e5a",
     "/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-תולדות-כה-כח/"),
    ("בראשית", "פרשת ויצא | כח-לב",     "88710799-12dc-42f7-9a62-6a853dd39a1b",
     "/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-ויצא-כח-לב/"),
    ("בראשית", "פרשת וישלח |לב-לו",     "089dd80d-dab9-4a9b-bfcc-e78b6db42eb8",
     "/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-וישלח-לב-לו/"),
    ("בראשית", "פרשת וישב | לז-מ",      "59437ac3-e350-44ab-9796-d409cf4f06ca",
     "/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-וישב-לז-מ/"),
    ("בראשית", "פרשת מקץ | מא-מד",      "7a286582-271d-488a-8b82-58766c664bd2",
     "/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-מקץ-מא-מד/"),
    ("בראשית", "פרשת ויגש | מד-מז",     "45293720-e656-4708-b42b-209ffbb5757a",
     "/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-ויגש-מד-מז/"),
    ("בראשית", "פרשת ויחי | מז-נ",      "e3ee103d-ec5e-40bb-82c8-54a53805f9dd",
     "/מאגר-השיעורים-והמאמרים/תורה/בראשית/פרשת-ויחי-מז-נ/"),
    # === שמות ===
    ("שמות", "פרשת שמות | א-ו",         "b77de52d-5c04-40f9-9b83-5979e441d4ff",
     "/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-שמות-א-ו/"),
    ("שמות", "פרשת וארא | ו-ט",         "0608bd06-c81a-411b-b3bb-a13188926dad",
     "/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-וארא-ו-ט/"),
    ("שמות", "פרשת בא | י-יג",           "aab1289b-808f-44be-b177-a81d204f8ab1",
     "/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-בא-י-יג/"),
    ("שמות", "פרשת בשלח | יג-יז",       "a13807d1-e4a7-491c-8433-d6329fd26955",
     "/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-בשלח-יג-יז/"),
    ("שמות", "פרשת יתרו | יח-כ",        "e0c50172-363a-4437-ac87-5ac9f5c82960",
     "/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-יתרו-יח-כ/"),
    ("שמות", "פרשת משפטים | כא-כד",     "caa86602-9853-4273-89a3-49ca48fd5656",
     "/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-משפטים-כא-כד/"),
    ("שמות", "פרשת תרומה | כה-כז",      "203af438-5444-4ec5-b31a-6228761ab445",
     "/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-תרומה-כה-כז/"),
    ("שמות", "פרשת תצוה | כז-ל",        "531a3635-53d0-4fac-b9c2-ee37086e499a",
     "/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-תצוה-כז-ל/"),
    ("שמות", "פרשת כי תשא | ל-לד",      "1d0641ae-6d2e-40df-b326-306b1e474e69",
     "/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-כי-תשא-ל-לד/"),
    ("שמות", "פרשת ויקהל | לה-לח",      "9cd15d5d-f1b4-40ef-a080-e06cfac64a7f",
     "/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-ויקהל-לה-לח/"),
    ("שמות", "פרשת פקודי | לח-מ",       "06efb206-6bf2-4ac2-8a5e-91cd9e9d59f6",
     "/מאגר-השיעורים-והמאמרים/תורה/שמות/פרשת-פקודי-לח-מ/"),
    # === ויקרא ===
    ("ויקרא", "פרשת ויקרא | א-ה",       "402cce40-e231-43e5-bb8f-c6d1f1731b76",
     "/מאגר-השיעורים-והמאמרים/תורה/ויקרא/פרשת-ויקרא-א-ה/"),
    ("ויקרא", "פרשת צו | ו-ח",           "004ceb75-a8a4-4f78-a2a1-6f5e457d25a3",
     "/מאגר-השיעורים-והמאמרים/תורה/ויקרא/פרשת-צו-ו-ח/"),
    ("ויקרא", "פרשת שמיני | ט-יא",      "d21cff78-1566-4d59-87be-b48b9ec1f061",
     "/מאגר-השיעורים-והמאמרים/תורה/ויקרא/פרשת-שמיני-ט-יא/"),
    ("ויקרא", "פרשת תזריע | יב-יג",     "98723061-c3aa-4e95-8507-1e936bdb2e87",
     "/מאגר-השיעורים-והמאמרים/תורה/ויקרא/פרשת-תזריע-יב-יג/"),
    ("ויקרא", "פרשת מצורע | יד-טו",     "606fbbf3-27e7-4439-864a-8e1063e81477",
     "/מאגר-השיעורים-והמאמרים/תורה/ויקרא/פרשת-מצורע-יד-טו/"),
    ("ויקרא", "פרשת אחרי מות | טז-יח",  "078783d0-4ede-4801-a75c-6226c4e9eab1",
     "/מאגר-השיעורים-והמאמרים/תורה/ויקרא/פרשת-אחרי-מות-טז-יח/"),
    ("ויקרא", "פרשת קדושים | יט-כ",     "de87714a-bc00-48ff-9ef4-412903e89388",
     "/מאגר-השיעורים-והמאמרים/תורה/ויקרא/פרשת-קדושים-יט-כ/"),
    ("ויקרא", "פרשת אמור | כא-כד",      "ee966caf-ff8b-4ca4-89f7-d174ac92ce76",
     "/מאגר-השיעורים-והמאמרים/תורה/ויקרא/פרשת-אמור-כא-כד/"),
    ("ויקרא", "פרשת בהר | כה-כו",       "d9e88a01-f060-48ff-bec4-9d09653245dc",
     "/מאגר-השיעורים-והמאמרים/תורה/ויקרא/פרשת-בהר-כה-כו/"),
    ("ויקרא", "פרשת בחוקותי | כו-כז",   "448fcf01-3ace-4ed9-9999-27797b132fcd",
     "/מאגר-השיעורים-והמאמרים/תורה/ויקרא/פרשת-בחוקותי-כו-כז/"),
    # === במדבר ===
    ("במדבר", "פרשת במדבר | א-ד",       "bf16434c-3391-4566-a854-9b055d8825e2",
     "/מאגר-השיעורים-והמאמרים/תורה/במדבר/פרשת-במדבר-א-ד/"),
    ("במדבר", "פרשת נשא | ד-ז",         "9cb69292-166f-4114-98d3-ca8812c81787",
     "/מאגר-השיעורים-והמאמרים/תורה/במדבר/פרשת-נשא-ד-ז/"),
    ("במדבר", "פרשת בהעלותך | ח-יב",    "158b38e7-9bc0-42f1-b60f-36afe0bc46ed",
     "/מאגר-השיעורים-והמאמרים/תורה/במדבר/פרשת-בהעלותך-ח-יב/"),
    ("במדבר", "פרשת שלח לך | יג-טו",    "d2f47e60-0a6c-44f3-8942-48a326610095",
     "/מאגר-השיעורים-והמאמרים/תורה/במדבר/פרשת-שלח-לך-יג-טו/"),
    ("במדבר", "פרשת קורח | טז-יח",      "aa50e54c-8b23-4249-94ea-afb9335d4270",
     "/מאגר-השיעורים-והמאמרים/תורה/במדבר/פרשת-קורח-טז-יח/"),
    ("במדבר", "פרשת חוקת | יט-כב",      "fe3e6894-f69b-4064-a1ac-2d03a0c10877",
     "/מאגר-השיעורים-והמאמרים/תורה/במדבר/פרשת-חוקת-יט-כב/"),
    ("במדבר", "פרשת בלק | כב-כה",       "580c5476-1432-4b1c-83ff-0d2eb25ef341",
     "/מאגר-השיעורים-והמאמרים/תורה/במדבר/פרשת-בלק-כב-כה/"),
    ("במדבר", "פרשת פנחס | כה-ל",       "02e69fcc-f1d2-4a41-9835-4f96211350e6",
     "/מאגר-השיעורים-והמאמרים/תורה/במדבר/פרשת-פנחס-כה-ל/"),
    ("במדבר", "פרשת מטות | ל-לב",       "68bb7053-894e-46f7-bc31-222c70a8e33d",
     "/מאגר-השיעורים-והמאמרים/תורה/במדבר/פרשת-מטות-ל-לב/"),
    ("במדבר", "פרשת מסעי | לג-לו",      "46d24bbf-9560-48c5-b811-38b450467697",
     "/מאגר-השיעורים-והמאמרים/תורה/במדבר/פרשת-מסעי-לג-לו/"),
    # === דברים ===
    ("דברים", "פרשת דברים | א-ד",       "8e8346f2-758f-4e91-baf7-0ba3876aae6e",
     "/מאגר-השיעורים-והמאמרים/תורה/דברים/פרשת-דברים-א-ד/"),
    ("דברים", "פרשת ואתחנן | ד-ז",      "09b3e988-e795-460e-b0b2-a86fc627736c",
     "/מאגר-השיעורים-והמאמרים/תורה/דברים/פרשת-ואתחנן-ד-ז/"),
    ("דברים", "פרשת עקב | ז-יא",        "2982bb96-ef32-484b-98a6-4125267b0e61",
     "/מאגר-השיעורים-והמאמרים/תורה/דברים/פרשת-עקב-ז-יא/"),
    ("דברים", "פרשת ראה | יא-טז",       "591226c6-f3d5-4641-99ad-55e9a6cd05f8",
     "/מאגר-השיעורים-והמאמרים/תורה/דברים/פרשת-ראה-יא-טז/"),
    ("דברים", "פרשת שופטים | טז-כא",    "b6ac8545-d6bb-4d13-b87c-74d426faa5a4",
     "/מאגר-השיעורים-והמאמרים/תורה/דברים/פרשת-שופטים-טז-כא/"),
    ("דברים", "פרשת כי תצא | כא-כה",    "51508e0a-8fdc-4f28-ba95-0102c3be194c",
     "/מאגר-השיעורים-והמאמרים/תורה/דברים/פרשת-כי-תצא-כא-כה/"),
    ("דברים", "פרשת כי תבוא | כו-כט",   "08c08443-890d-4652-926c-fc2f45acef57",
     "/מאגר-השיעורים-והמאמרים/תורה/דברים/פרשת-כי-תבוא-כו-כט/"),
    ("דברים", "פרשת נצבים | כט-ל",      "3a0b39fc-7a47-428a-beca-afdc75b23831",
     "/מאגר-השיעורים-והמאמרים/תורה/דברים/פרשת-נצבים-כט-ל/"),
    ("דברים", "פרשת וילך | לא",         "34f0549f-2bfd-4668-8be5-46f71abc052a",
     "/מאגר-השיעורים-והמאמרים/תורה/דברים/פרשת-וילך-לא/"),
    ("דברים", "פרשת האזינו | לב",       "c132b563-962e-48bd-a889-1ea2bc3415a2",
     "/מאגר-השיעורים-והמאמרים/תורה/דברים/פרשת-האזינו-לב/"),
    ("דברים", "פרשת וזאת הברכה | לג-לד", "d3e1932b-3e85-42e2-aaee-19e9d4bc7c26",
     "/מאגר-השיעורים-והמאמרים/תורה/דברים/פרשת-וזאת-הברכה-לג-לד/"),
]

# ── Main audit ────────────────────────────────────────────────────────────────
def main():
    print(f"\n=== R3 Torah Parity Audit v2 — {STAMP} ===\n")
    results = []
    flags   = []

    current_chumash = None
    for (chumash, title, sid, old_path) in PARASHIYOT:
        if chumash != current_chumash:
            print(f"\n── חומש {chumash} ──")
            current_chumash = chumash

        url = OLD_SITE + old_path
        time.sleep(0.35)

        old_n  = count_old_lessons(url)
        db_n   = db_public_count(sid)
        leak_n = db_teacher_leak(sid)

        if old_n is None:
            status = "FETCH_ERROR"
            flag   = True
            gap    = None
        else:
            gap  = old_n - db_n
            flag = gap >= 3
            status = f"GAP={gap}" if flag else "OK"

        marker = " <<<" if flag else ""
        old_str = str(old_n) if old_n is not None else "ERR"
        leak_str = f" LEAK={leak_n}" if leak_n > 0 else ""
        print(f"  {title}: old={old_str} db_pub={db_n}{leak_str}{marker}")

        row = {
            "chumash":      chumash,
            "title":        title,
            "series_id":    sid,
            "old_url":      url,
            "old_count":    old_n,
            "db_public":    db_n,
            "teacher_leak": leak_n,
            "gap":          gap,
            "status":       status,
            "flagged":      flag,
        }
        results.append(row)
        if flag:
            flags.append(row)

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    total     = len(results)
    clean     = [r for r in results if not r["flagged"] and r["old_count"] is not None]
    errs      = [r for r in results if r["old_count"] is None]
    leaks_all = [r for r in results if r["teacher_leak"] > 0]
    true_flags = [r for r in flags if r["old_count"] is not None]

    print(f"סה\"כ פרשיות: {total}")
    print(f"  נקיות (gap<3):    {len(clean)}")
    print(f"  דגלים (gap>=3):   {len(true_flags)}")
    print(f"  שגיאות fetch:     {len(errs)}")
    print(f"  עם דליפת מורים:  {len(leaks_all)}")

    if true_flags:
        print(f"\nדגלים — מיון לפי גודל הפער:")
        for r in sorted(true_flags, key=lambda x: x["gap"], reverse=True):
            lk = f" LEAK={r['teacher_leak']}" if r["teacher_leak"] > 0 else ""
            print(f"  {r['chumash']}/{r['title']}: old={r['old_count']} db={r['db_public']} gap={r['gap']}{lk}")

    if leaks_all:
        print(f"\n⚠️  דליפות מורים ({len(leaks_all)} פרשיות):")
        for r in leaks_all:
            print(f"  {r['chumash']}/{r['title']}: {r['teacher_leak']} שיעורי-מורים")
    else:
        print("\n✓ 0 דליפות מורים")

    # ── Write markdown report ─────────────────────────────────────────────────
    out = REPORTS / f"R3-torah-parity-{STAMP}.md"
    lines = [
        f"# R3 Torah Parity Audit — {STAMP}",
        "",
        f"**סה\"כ:** {total} פרשיות | **נקיות:** {len(clean)} | **דגלים:** {len(true_flags)} | **fetch-ERR:** {len(errs)} | **דליפות:** {len(leaks_all)}",
        "",
    ]

    if true_flags:
        lines += [
            "## פרשיות עם דגל (gap >= 3)",
            "",
            "| חומש | פרשה | ישן | DB-ציבורי | פער | דליפת-מורים |",
            "|------|-------|-----|----------|-----|-------------|",
        ]
        for r in sorted(true_flags, key=lambda x: x["gap"], reverse=True):
            lk = r["teacher_leak"] if r["teacher_leak"] > 0 else ""
            lines.append(f"| {r['chumash']} | {r['title']} | {r['old_count']} | {r['db_public']} | {r['gap']} | {lk} |")
        lines.append("")

    if leaks_all:
        lines += ["## ⚠️ דליפות תוכן-מורים", ""]
        for r in leaks_all:
            lines.append(f"- {r['chumash']}/{r['title']}: {r['teacher_leak']} שיעורים tagged teachers")
        lines.append("")

    lines += [
        "## טבלה מלאה",
        "",
        "| חומש | פרשה | ישן | DB-ציבורי | פער | סטטוס | דליפה |",
        "|------|-------|-----|----------|-----|--------|-------|",
    ]
    for r in results:
        old_d = str(r["old_count"]) if r["old_count"] is not None else "ERR"
        gap_d = str(r["gap"]) if r["gap"] is not None else "?"
        lk    = str(r["teacher_leak"]) if r["teacher_leak"] > 0 else ""
        lines.append(f"| {r['chumash']} | {r['title']} | {old_d} | {r['db_public']} | {gap_d} | {r['status']} | {lk} |")

    lines += ["", f"_Generated: {STAMP}_"]
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nדוח נשמר: {out}")
    return results, flags

if __name__ == "__main__":
    main()
