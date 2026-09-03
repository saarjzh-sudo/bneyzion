#!/usr/bin/env python3
"""סריקת Content-Type לכל קבצי האודיו ב-S3 של האתר הישן (3.9.2026, דיווח אביה).

Chrome מסרב לנגן אודיו שמוגש עם Content-Type החלטי לא-מדיה (application/zip).
הסקריפט עושה HEAD לכל lessons.audio_url על s3.us-east-2, כותב checkpoint
ל-scan-results.json אחרי כל אצווה (אידמפוטנטי — מדלג על מה שכבר נבדק).
"""
import json, os, sys, urllib.request, concurrent.futures, threading

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scan-results.json")
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN") or sys.exit("SUPABASE_ACCESS_TOKEN missing")

def db(q):
    req = urllib.request.Request(
        "https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query",
        data=json.dumps({"query": q}).encode(),
        headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json",
                 "User-Agent": "Mozilla/5.0 (Macintosh) Chrome/126"}, method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=60).read().decode())

rows = db("select id, audio_url from lessons where audio_url ilike '%s3.us-east-2%'")
print(f"{len(rows)} lessons with s3 audio", flush=True)

results = {}
if os.path.exists(OUT):
    results = json.load(open(OUT))
    print(f"resuming, {len(results)} already scanned", flush=True)

lock = threading.Lock()
def head(row):
    lid, url = row["id"], row["audio_url"]
    if lid in results:
        return
    try:
        rq = urllib.request.Request(url, method="HEAD")
        resp = urllib.request.urlopen(rq, timeout=20)
        ct = resp.headers.get("Content-Type", "")
    except Exception as e:
        ct = "ERR:" + str(getattr(e, "code", e))[:60]
    with lock:
        results[lid] = {"ct": ct, "url": url}

todo = [r for r in rows if r["id"] not in results]
for i in range(0, len(todo), 400):
    batch = todo[i:i+400]
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as ex:
        list(ex.map(head, batch))
    with lock:
        json.dump(results, open(OUT, "w"))
    print(f"scanned {min(i+400, len(todo))}/{len(todo)}", flush=True)

from collections import Counter
c = Counter(v["ct"] for v in results.values())
print("DONE", dict(c.most_common(12)), flush=True)
bad = [k for k, v in results.items() if "zip" in v["ct"] or v["ct"].startswith("ERR")]
print(f"problematic (zip/err): {len(bad)}", flush=True)
