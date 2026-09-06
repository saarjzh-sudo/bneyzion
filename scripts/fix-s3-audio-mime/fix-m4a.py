#!/usr/bin/env python3
"""השלמה ל-fix.py: קבצי ftyp (MP4/M4A) שסומנו skip-not-audio — מוגשים כ-audio/mp4."""
import json, os, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SCAN = json.load(open(os.path.join(HERE, "scan-results.json")))
LOGP = os.path.join(HERE, "fix-log.json")
LOG = json.load(open(LOGP))
TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]; SR = os.environ["SB_SERVICE_ROLE"]
PROJ = "pzvmwfexeiruelwiujxn"

def db(q):
    req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{PROJ}/database/query",
        data=json.dumps({"query": q}).encode(),
        headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json",
                 "User-Agent": "Mozilla/5.0 (Macintosh) Chrome/126"}, method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=60).read().decode())

for lid, v in list(LOG.items()):
    if v.get("status") != "skip-not-audio" or not v.get("head", "").endswith("66747970"):
        continue
    url = SCAN[lid]["url"]
    raw = urllib.request.urlopen(url, timeout=180).read()
    assert raw[4:8] == b"ftyp", lid
    path = f"audio-fix/{lid}.m4a"
    up = urllib.request.Request(f"https://{PROJ}.supabase.co/storage/v1/object/lesson-files/{path}",
        data=raw, method="POST",
        headers={"Authorization": "Bearer " + SR, "Content-Type": "audio/mp4", "x-upsert": "true"})
    urllib.request.urlopen(up, timeout=300).read()
    new_url = f"https://{PROJ}.supabase.co/storage/v1/object/public/lesson-files/{path}"
    assert urllib.request.urlopen(urllib.request.Request(new_url, method="HEAD"), timeout=60).status == 200
    old_esc = url.replace("'", "''")
    r = db("insert into public.lessons_audio_url_bak_20260903 (lesson_id, old_audio_url) "
           f"select id, audio_url from lessons where id='{lid}' on conflict do nothing; "
           f"update lessons set audio_url='{new_url}' where id='{lid}' and audio_url='{old_esc}' returning id;")
    LOG[lid] = {"status": "fixed", "new_url": new_url, "bytes": len(raw), "kind": "m4a"} if r else {"status": "skip-url-changed"}
    json.dump(LOG, open(LOGP, "w"))
    print(lid, LOG[lid]["status"], flush=True)
    time.sleep(1)
print("M4A DONE", flush=True)
