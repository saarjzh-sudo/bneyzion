#!/usr/bin/env python3
"""apply_rabbi_fixes.py — apply the 101 authoritative (old-site-grounded) rabbi fixes.
Step 1: fresh full snapshot of (id, rabbi_id) for rollback.
Step 2: fix_lesson_rabbis.py --book X --apply for each book RABBI-TRUTH.json shows fixes>0.
Step 3: report applied counts. (Re-derives + applies; data unchanged since dry-run.)
"""
import os, sys, json, time, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq

def q(sql, _t=8):
    for i in range(_t):
        out = sbq.run(sql)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"):
                time.sleep(1.3 * (i + 1)); continue
            return d
        except Exception:
            time.sleep(1.3 * (i + 1))
    return None

def noenv():
    e = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): e.pop(k, None)
    e["NO_PROXY"] = "*"; return e

def main():
    # Step 1: fresh full snapshot (precise pre-batch rollback)
    SNAP = "lessons_rabbi_bak_before101_20260618"
    q(f"DROP TABLE IF EXISTS {SNAP}")
    q(f"CREATE TABLE {SNAP} AS SELECT id, rabbi_id FROM lessons")
    chk = q(f"SELECT COUNT(*) n FROM {SNAP}")
    n = chk[0]["n"] if chk else 0
    print(f"snapshot {SNAP}: {n} rows", flush=True)
    if n < 20000:
        print("ABORT: snapshot looks too small — not applying."); return

    # Step 2: books with fixes
    truth = json.load(open(os.path.join(HERE, "reports", "RABBI-TRUTH.json"), encoding="utf-8"))
    books = [b["book"] for b in truth["books"] if b["n_fixes"] > 0]
    print(f"books to apply ({len(books)}): {books}", flush=True)

    total = 0
    for i, b in enumerate(books, 1):
        p = subprocess.run([sys.executable, "-u", os.path.join(HERE, "fix_lesson_rabbis.py"), "--book", b, "--apply"],
                           cwd=HERE, capture_output=True, text=True, env=noenv(), timeout=1800)
        applied = [ln for ln in (p.stdout or "").splitlines() if ln.startswith("APPLIED")]
        rj = os.path.join(HERE, f"rabbi-fix-{b}.json")
        nf = len(json.load(open(rj, encoding="utf-8")).get("fixes", [])) if os.path.exists(rj) else 0
        total += nf
        print(f"[{i:>2}/{len(books)}] {b:<14} {(applied[0] if applied else 'no-apply-line')}  (fixes={nf})", flush=True)
        time.sleep(0.5)
    print(f"\nDONE: ~{total} rabbi fixes applied across {len(books)} books. rollback: {SNAP}", flush=True)

if __name__ == "__main__":
    main()
