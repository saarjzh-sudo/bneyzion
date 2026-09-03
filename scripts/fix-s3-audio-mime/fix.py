#!/usr/bin/env python3
"""תיקון שיעורי-אודיו שמוגשים מ-S3 עם Content-Type: application/zip (3.9.2026).

לכל שיעור נגוע: הורדה מ-S3 → סניף-בטיחות (הבייטים חייבים להיראות MP3/אודיו) →
העלאה ל-Supabase storage (lesson-files/audio-fix/<lesson_id>.mp3, upsert) →
עדכון lessons.audio_url רק אם ה-URL לא השתנה בינתיים (idempotent).
גיבוי: lessons_audio_url_bak_20260903 (נוצרה מראש). checkpoint: fix-log.json.

env: SUPABASE_ACCESS_TOKEN (management) + SB_SERVICE_ROLE (storage upload).
"""
import json, os, sys, time, urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
SCAN = os.path.join(HERE, "scan-results.json")
LOG = os.path.join(HERE, "fix-log.json")
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN") or sys.exit("SUPABASE_ACCESS_TOKEN missing")
SR = os.environ.get("SB_SERVICE_ROLE") or sys.exit("SB_SERVICE_ROLE missing")
PROJ = "pzvmwfexeiruelwiujxn"

def db(q):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJ}/database/query",
        data=json.dumps({"query": q}).encode(),
        headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json",
                 "User-Agent": "Mozilla/5.0 (Macintosh) Chrome/126"}, method="POST")
    return json.loads(fetch(req, timeout=60).read().decode())


def fetch(req_or_url, timeout=120):
    """urlopen עם retry+backoff על 429/5xx (מגבלי-קצב רגעיים של S3/סטורג')."""
    import urllib.error
    delay = 5
    for attempt in range(6):
        try:
            return urllib.request.urlopen(req_or_url, timeout=timeout)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 5:
                time.sleep(delay); delay = min(delay * 2, 60); continue
            raise
        except Exception:
            if attempt < 5:
                time.sleep(delay); delay = min(delay * 2, 60); continue
            raise

def looks_audio(b):
    return b[:3] == b"ID3" or (len(b) > 2 and b[0] == 0xFF and (b[1] & 0xE0) == 0xE0) or b[:4] == b"RIFF"

scan = json.load(open(SCAN))
bad = {lid: v for lid, v in scan.items() if v["ct"] == "application/zip"}
log = json.load(open(LOG)) if os.path.exists(LOG) else {}
print(f"{len(bad)} zip-typed lessons, {len(log)} already handled", flush=True)

done = fails = 0
for i, (lid, v) in enumerate(sorted(bad.items())):
    if log.get(lid, {}).get("status") == "fixed":
        continue
    url = v["url"]
    try:
        raw = fetch(url, timeout=180).read()
        if not looks_audio(raw):
            log[lid] = {"status": "skip-not-audio", "head": raw[:8].hex()}
            json.dump(log, open(LOG, "w")); continue
        path = f"audio-fix/{lid}.mp3"
        up = urllib.request.Request(
            f"https://{PROJ}.supabase.co/storage/v1/object/lesson-files/{path}",
            data=raw, method="POST",
            headers={"Authorization": "Bearer " + SR, "Content-Type": "audio/mpeg", "x-upsert": "true"})
        fetch(up, timeout=300).read()
        new_url = f"https://{PROJ}.supabase.co/storage/v1/object/public/lesson-files/{path}"
        # אימות 200 על ה-URL הציבורי לפני נגיעה ברשומה (דאטה קודם, קוד אחריו)
        h = urllib.request.Request(new_url, method="HEAD")
        assert fetch(h, timeout=60).status == 200
        old_esc = url.replace("'", "''")
        r = db(
            "insert into public.lessons_audio_url_bak_20260903 (lesson_id, old_audio_url) "
            f"select id, audio_url from lessons where id='{lid}' on conflict do nothing; "
            f"update lessons set audio_url='{new_url}' where id='{lid}' and audio_url='{old_esc}' returning id;")
        if not r:
            log[lid] = {"status": "skip-url-changed"}
        else:
            log[lid] = {"status": "fixed", "new_url": new_url, "bytes": len(raw)}
            done += 1
    except Exception as e:
        log[lid] = {"status": "error", "err": str(e)[:120]}
        fails += 1
    json.dump(log, open(LOG, "w"))
    if (i + 1) % 20 == 0:
        print(f"{i+1}/{len(bad)} processed, {done} fixed, {fails} errors", flush=True)
    time.sleep(1.0)

from collections import Counter
print("DONE", dict(Counter(x["status"] for x in log.values())), flush=True)
