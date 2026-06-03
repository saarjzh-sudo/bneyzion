#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_authors_p1.py — P1 author fixes (round-8, 2026-06-03)

Fix 1: מדריכים למורה (יהושע + שופטים) — rabbi_id from מכון דעת סופרים → ישקו העדרים
Fix 2: סיכומים על ספר X (יהושע/שופטים/שמואל א/שמואל ב, all pairs) — add description 'הרב שמעון לוי והרב נתן מולאיוף'

DRY-RUN by default. Writes only with --execute.
Keys read from secrets/credentials.env.
"""
import subprocess, json, os, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRETS = os.path.join(ROOT, "secrets", "credentials.env")
SB = "https://pzvmwfexeiruelwiujxn.supabase.co/rest/v1"

def kv(path, name):
    if not os.path.exists(path): return None
    for ln in open(path, encoding="utf-8"):
        ln = ln.strip()
        if ln.startswith(name + "="): return ln.split("=", 1)[1].strip()
    return None

SECRET = kv(SECRETS, "SUPABASE_SECRET_KEY")

def patch(path, payload):
    h = ["-H", f"apikey: {SECRET}", "-H", f"Authorization: Bearer {SECRET}",
         "-H", "Content-Type: application/json", "-H", "Prefer: return=minimal"]
    r = subprocess.run(["curl", "-s", "--noproxy", "*", "-X", "PATCH", *h,
                        "-w", "\n%{http_code}", f"{SB}/{path}", "--data-binary", "@-"],
                       input=json.dumps(payload).encode(), capture_output=True)
    return r.stdout.decode("utf-8", "ignore").rsplit("\n", 1)[-1]

EXECUTE = "--execute" in sys.argv
print(f"MODE: {'EXECUTE' if EXECUTE else 'DRY-RUN'} | secret: {'ok' if SECRET and SECRET.startswith('sb_secret') else 'MISSING'}")

# ===== FIX 1: מדריכים למורה → ישקו העדרים =====
# ישקו העדרים rabbi_id: 7fcd7014-5eef-4e9b-b792-e6460d75e720
# מכון דעת סופרים rabbi_id: 1be980e3-a688-47aa-9eaf-adfa23b105b6

YISHKO_ID = "7fcd7014-5eef-4e9b-b792-e6460d75e720"

MADRICH_SERIES = [
    ("f45b01af-1fca-49ee-bd7d-7171ae974222", "מדריכים למורה - יהושע"),
    ("b525d0b4-b234-491e-bd32-ed071b5eb2c1", "מדריכים למורה - שופטים"),
]

print()
print("=== FIX 1: מדריכים למורה (יהושע+שופטים) → ישקו העדרים ===")
for sid, title in MADRICH_SERIES:
    if EXECUTE:
        code = patch(f"series?id=eq.{sid}", {"rabbi_id": YISHKO_ID})
        mark = "✓" if code in ("200", "204") else f"⚠ {code}"
        print(f"   {mark} {title}")
        time.sleep(0.1)
    else:
        print(f"   DRY: {title} → rabbi_id = {YISHKO_ID[:8]}... (ישקו העדרים)")

# ===== FIX 2: סיכומים → description = co-author =====
# NOTE: No co_author column in series table. Adding to description field instead.
# הרב שמעון לוי rabbi_id: 9f9362d5-5de7-42d8-8e7f-cac609e23216

CO_AUTHOR_DESC = "הרב שמעון לוי והרב נתן מולאיוף"

SIKUM_SERIES = [
    ("09a14cdd-41f4-43bc-8bc0-0cbeedab3493", "סיכומים על ספר יהושע (2026-05-07)"),
    ("229e96bf-52b5-4760-9451-15cf29ee5bd7", "סיכומים על ספר יהושע (2026-05-27)"),
    ("8caa1cbd-4b4d-4604-89b6-16808ea07685", "סיכומים על ספר שופטים (2026-05-27)"),
    ("0664a155-f6cd-40b1-8d9f-7443805f7b3b", "סיכומים על ספר שופטים (2026-05-07)"),
    ("e89be7a1-9333-4a63-a07e-0e631fadbfd9", "סיכומים על שמואל א (2026-05-27)"),
    ("a47d1ccf-6dd3-4259-a63e-59c5ce235b38", "סיכומים על שמואל א (2026-05-07)"),
    ("5fa2a790-0fa7-4c7b-a312-451ab997da37", "סיכומים על שמואל ב (2026-05-27)"),
    ("376a9aea-e380-4800-8d53-cfcd762c8ccc", "סיכומים על שמואל ב (2026-05-07)"),
]

print()
print("=== FIX 2: סיכומים → description = co-author ===")
print(f"   Value: '{CO_AUTHOR_DESC}'")
for sid, title in SIKUM_SERIES:
    if EXECUTE:
        code = patch(f"series?id=eq.{sid}", {"description": CO_AUTHOR_DESC})
        mark = "✓" if code in ("200", "204") else f"⚠ {code}"
        print(f"   {mark} {title}")
        time.sleep(0.1)
    else:
        print(f"   DRY: {title} → description = '{CO_AUTHOR_DESC}'")

print()
if not EXECUTE:
    print("(DRY-RUN complete. Run with --execute to apply.)")
else:
    print("DONE. Verify: python3 scripts/audit_teachers.py")
