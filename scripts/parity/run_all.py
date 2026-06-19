#!/usr/bin/env python3
"""
run_all.py — site-wide 1:1 fleet. Runs run_book.py --apply over all remaining public books
with controlled concurrency (gentle on the Supabase throttle). Each book is gated internally
(verify-before-apply); broken data is FLAGGED, never pushed live. Writes one VERDICT line per
book to runall-verdicts.jsonl + a live progress log.

Usage: python3 run_all.py            # all remaining books (skips שמות, בראשית = already done)
       python3 run_all.py --workers 3
"""
import sys, os, json, subprocess, argparse, time
from concurrent.futures import ThreadPoolExecutor, as_completed
HERE = os.path.dirname(os.path.abspath(__file__))

DONE = {"שמות", "בראשית"}
TORAH = ["ויקרא", "במדבר", "דברים"]
NEVIIM = ["יהושע","שופטים","שמואל א","שמואל ב","מלכים א","מלכים ב","ישעיהו","ירמיהו","יחזקאל",
          "הושע","יואל","עמוס","עובדיה","יונה","מיכה","נחום","חבקוק","צפניה","חגי","זכריה","מלאכי"]
KETUVIM = ["תהלים","משלי","איוב","שיר השירים","רות","איכה","קהלת","אסתר","דניאל","עזרא ונחמיה","דברי הימים"]
BOOKS = [b for b in (TORAH + NEVIIM + KETUVIM) if b not in DONE]

OUT = os.path.join(HERE, "runall-verdicts.jsonl")
LOG = os.path.join(HERE, "runall-progress.log")

def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def do_book(book):
    t0 = time.time()
    try:
        p = subprocess.run([sys.executable, "-u", os.path.join(HERE, "run_book.py"), book, "--apply"],
                           cwd=HERE, capture_output=True, text=True, timeout=3600)
        v = None
        for ln in (p.stdout or "").splitlines():
            if ln.startswith("VERDICT "):
                v = json.loads(ln[len("VERDICT "):])
        if v is None:
            v = {"book": book, "status": "ERROR", "blockers": ["no verdict: " + (p.stdout or p.stderr or "")[-300:]]}
    except subprocess.TimeoutExpired:
        v = {"book": book, "status": "TIMEOUT"}
    except Exception as e:
        v = {"book": book, "status": "ERROR", "blockers": [str(e)]}
    v["secs"] = round(time.time() - t0)
    with open(OUT, "a", encoding="utf-8") as f:
        f.write(json.dumps(v, ensure_ascii=False) + "\n")
    log(f"{book}: {v['status']} ({v['secs']}s) "
        f"series={v.get('metrics',{}).get('series_count')} rabbi={v.get('metrics',{}).get('rabbi_fixes')} "
        f"gaps={len(v.get('gaps',[]))} blockers={v.get('blockers')}")
    return v

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--workers", type=int, default=3); a = ap.parse_args()
    open(OUT, "w").close()
    log(f"START site-wide run: {len(BOOKS)} books, workers={a.workers}")
    results = []
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = {ex.submit(do_book, b): b for b in BOOKS}
        for fu in as_completed(futs):
            results.append(fu.result())
    applied = [r for r in results if r["status"] == "APPLIED"]
    flagged = [r for r in results if r["status"] not in ("APPLIED",)]
    log(f"DONE: {len(applied)}/{len(BOOKS)} APPLIED. needs-attention: {[r['book']+':'+r['status'] for r in flagged]}")
    log("FLEET-COMPLETE")

if __name__ == "__main__":
    main()
