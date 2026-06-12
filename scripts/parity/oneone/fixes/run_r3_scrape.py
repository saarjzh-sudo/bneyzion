#!/usr/bin/env python3
"""r3 scrape-queue runner: publish content-less draft inserts with old-site lessonText.
Reuses the engine's extractor semantics. Idempotent: skips lessons already published/with content."""
import json, subprocess, hashlib, unicodedata, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ONEONE = HERE.parent
CACHE = ONEONE / "cache"
OLD_HOST = "https://www.bneyzion.co.il"
SBQ = ONEONE.parent / "sbq.py"

def sbq(sql):
    p = subprocess.run([sys.executable, str(SBQ), sql], capture_output=True, text=True, timeout=180)
    try: return json.loads(p.stdout)
    except Exception: raise RuntimeError(p.stdout[:300])

def extract_lesson_text(h):
    i = h.find('<div id="lessonText">')
    if i == -1: return None
    j = i + len('<div id="lessonText">')
    depth, k = 1, j
    while depth > 0:
        no, nc = h.find("<div", k), h.find("</div>", k)
        if nc == -1: return None
        if no != -1 and no < nc: depth += 1; k = no + 4
        else: depth -= 1; k = nc + 6
    return h[j:k - 6].strip()

def fetch(url):
    if url.startswith("/"): url = OLD_HOST + url
    cp = CACHE / (hashlib.sha1(url.encode()).hexdigest() + ".html")
    if cp.exists():
        return cp.read_text(encoding="utf-8", errors="replace")
    r = subprocess.run(["curl", "-s", "--noproxy", "*", "-L", "--max-time", "60", url],
                       capture_output=True, text=True)
    if r.returncode == 0 and len(r.stdout) > 5000:
        cp.write_text(r.stdout, encoding="utf-8")
        return r.stdout
    return None

# op_id -> insert payload old_url
ops = {}
for line in open(ONEONE / "plans" / "RESOLVED-OPS.jsonl", encoding="utf-8"):
    r = json.loads(line)
    if r["body"].get("op") == "insert_lesson":
        ops[r["op_id"]] = r["body"]

queue = [json.loads(l) for l in open(HERE / "r3_scrape_queue.jsonl", encoding="utf-8")]
ok = pub_media = fail = skip = 0
fails = []
for item in queue:
    lid = item["lesson_id"]
    row = sbq(f"SELECT status, content IS NOT NULL AS has_c, (audio_url IS NOT NULL OR video_url IS NOT NULL OR attachment_url IS NOT NULL) AS has_m FROM lessons WHERE id='{lid}'")
    if not row: fail += 1; fails.append((lid, "lesson-missing")); continue
    if row[0]["status"] == "published" and (row[0]["has_c"] or row[0]["has_m"]):
        skip += 1; continue
    body_op = ops.get(item.get("op_id"), {})
    old_url = (body_op.get("payload") or {}).get("old_url") or body_op.get("old_url") or item.get("lesson_url") or item.get("page")
    text = None
    if old_url:
        h = fetch(old_url)
        if h: text = extract_lesson_text(h)
    if text:
        t = unicodedata.normalize("NFC", text).replace("$", "$")
        sbq(f"UPDATE lessons SET content=$r3${t}$r3$, status='published' WHERE id='{lid}'")
        ok += 1
    elif row[0]["has_m"]:
        sbq(f"UPDATE lessons SET status='published' WHERE id='{lid}'")
        pub_media += 1
    else:
        fail += 1; fails.append((lid, (item.get("title") or "")[:40]))

print(f"r3 scrape: text-published={ok} media-published={pub_media} skipped={skip} fail={fail}")
for f in fails[:20]: print("  FAIL:", f)
json.dump(fails, open(HERE / "r3_scrape_fails.json", "w", encoding="utf-8"), ensure_ascii=False)

