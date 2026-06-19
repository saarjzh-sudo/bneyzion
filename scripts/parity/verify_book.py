#!/usr/bin/env python3
"""
verify_book.py — per-book 1:1 verification UNIT (data audit + full-page screenshots).
The deterministic half; an agent reads the two screenshots and does the visual 1:1 compare.

Checks (data):
  - series_new (applied public_book) vs series_old_live (scrape old page lessonSeriesBlock)
  - rabbi mismatches: DB rabbi != audio-path rabbi, across the book's series lessons (samples)
  - empty_emitted: emitted public_book lessons/series that are empty in DB (must be 0)
Outputs JSON (last line: RESULT {...}) + writes new/old full-page PNGs to /tmp/verify/.

Usage: python3 verify_book.py "<book>"
"""
import sys, os, re, json, subprocess, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sbq, old_listing
from fix_lesson_rabbis import rb_norm  # canonical rabbi-name normalizer (strips הרב/niqqud/geresh/quotes)

OUT = "/tmp/verify"; os.makedirs(OUT, exist_ok=True)
CHROME = subprocess.run("ls -d ~/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell",
                        shell=True, capture_output=True, text=True).stdout.strip().splitlines()
CHROME = CHROME[0] if CHROME else "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

def q(s, _t=6):
    import time
    for i in range(_t):
        o = sbq.run(s)
        try:
            d = json.loads(o)
            if isinstance(d, dict) and d.get("message"):
                time.sleep(1.3 * (i + 1)); continue
            return d
        except Exception:
            time.sleep(1.3 * (i + 1))
    return []

def noenv():
    e = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): e.pop(k, None)
    e["NO_PROXY"] = "*"; return e

def fetch(u):
    return subprocess.run(["curl","-sL","--noproxy","*","-A","Mozilla/5.0","--max-time","45",u],
                          capture_output=True, text=True, env=noenv()).stdout or ""

def shot(url, path):
    e = noenv(); e["CHROME_BIN"] = CHROME
    r = subprocess.run(["node", os.path.join(HERE, "fullshot.cjs"), url, path, "1366"],
                       capture_output=True, text=True, env=e, timeout=120)
    return os.path.exists(path)

def audio_rabbi(u):
    u = urllib.parse.unquote(u or ""); m = re.search(r'/(הרב[^/]+|הרבנית[^/]+)/', u)
    return re.sub(r'\s+', ' ', (m.group(1).replace('+', ' ')).strip()) if m else None

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    data_only = "--data-only" in sys.argv  # skip Chrome screenshots → fast re-audit across books
    book = args[0]
    man = {m["book"]: m for m in json.load(open(os.path.join(HERE, "verify-manifest.json"), encoding="utf-8"))}
    e = man.get(book, {})
    nid, old_url, new_url = e.get("node_id"), e.get("old_url"), e.get("new_url")
    res = {"book": book}

    # series count new (applied) vs old live
    ap = q(f"SELECT COUNT(*) n FROM teacher_listing_items WHERE scope='public_book' AND key='{book}' AND kind='series'")
    res["series_new"] = ap[0]["n"] if ap else 0
    res["series_old_live"] = len(re.findall(r'lessonSeriesBlock', fetch(old_url))) if old_url else None

    # rabbi mismatch (DB vs audio) across the book's public_book series lessons
    sids = [r["series_id"] for r in q(f"SELECT DISTINCT series_id FROM teacher_listing_items WHERE scope='public_book' AND key='{book}' AND kind='series'")]
    mism, samples = 0, []
    for sid in sids:
        for l in q(f"SELECT l.title,r.name db,l.audio_url FROM lessons l LEFT JOIN rabbis r ON r.id=l.rabbi_id WHERE l.series_id='{sid}' AND l.status='published'"):
            a = audio_rabbi(l["audio_url"])
            if a and rb_norm(l["db"] or '') != rb_norm(a):  # canonical norm: geresh/niqqud/quotes-insensitive
                mism += 1
                if len(samples) < 5: samples.append({"title": l["title"][:30], "db": l["db"], "audio": a})
    res["rabbi_mismatch"] = mism; res["rabbi_samples"] = samples

    # empty emitted (must be 0)
    emp = q(f"""SELECT COUNT(*) n FROM teacher_listing_items ti JOIN lessons l ON l.id=ti.lesson_id
        WHERE ti.scope='public_book' AND ti.key='{book}' AND ti.kind='lesson'
        AND (l.content IS NULL OR l.content='') AND l.audio_url IS NULL AND l.video_url IS NULL
        AND l.attachment_url IS NULL AND l.legacy_attachment_url IS NULL""")
    res["empty_emitted"] = emp[0]["n"] if emp else 0

    # screenshots (skipped in --data-only mode)
    if not data_only:
        np = f"{OUT}/{book}-new.png"; op = f"{OUT}/{book}-old.png"
        res["new_shot"] = np if (new_url and shot(new_url, np)) else None
        res["old_shot"] = op if (old_url and shot(old_url, op)) else None

    print("RESULT " + json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
