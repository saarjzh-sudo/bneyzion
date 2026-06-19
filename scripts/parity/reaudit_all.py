#!/usr/bin/env python3
"""
reaudit_all.py — fast data-only re-audit of all manifest books AFTER the geresh-normalizer fix.
Sequential (throttle-safe), no Chrome. Writes a precise post-fix gap inventory.

Output: reports/REAUDIT-post-geresh.json  (perBook results + dataPass gates)
Gates (hard): |series_new - series_old_live| <= 2 ; rabbi_mismatch == 0 ; empty_emitted == 0
"""
import os, sys, json, time, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))

def noenv():
    e = dict(os.environ)
    for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"):
        e.pop(k, None)
    e["NO_PROXY"] = "*"
    return e

def main():
    man = json.load(open(os.path.join(HERE, "verify-manifest.json"), encoding="utf-8"))
    books = [m["book"] for m in man]
    out = {"generated": time.strftime("%Y-%m-%d %H:%M"), "books": []}
    out_path = os.path.join(HERE, "reports", "REAUDIT-post-geresh.json")
    for i, b in enumerate(books, 1):
        try:
            p = subprocess.run([sys.executable, "-u", os.path.join(HERE, "verify_book.py"), b, "--data-only"],
                               cwd=HERE, capture_output=True, text=True, env=noenv(), timeout=180)
            line = [ln for ln in (p.stdout or "").splitlines() if ln.startswith("RESULT ")]
            if line:
                r = json.loads(line[-1][len("RESULT "):])
            else:
                r = {"book": b, "error": (p.stdout or p.stderr or "")[-200:]}
        except Exception as e:
            r = {"book": b, "error": repr(e)}
        sn, so = r.get("series_new"), r.get("series_old_live")
        r["dataPass"] = (
            so is not None and abs((sn or 0) - so) <= 2
            and r.get("rabbi_mismatch", 99) == 0
            and r.get("empty_emitted", 99) == 0
        )
        out["books"].append(r)
        # write incrementally so progress is watchable
        json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        flag = "PASS" if r["dataPass"] else "FAIL"
        print(f"[{i:>2}/37] {b:<14} {flag}  series={sn}/{so} rabbi={r.get('rabbi_mismatch')} empty={r.get('empty_emitted')}", flush=True)
        time.sleep(0.6)
    n_pass = sum(1 for r in out["books"] if r.get("dataPass"))
    print(f"\nDONE: dataPass {n_pass}/{len(books)}", flush=True)

if __name__ == "__main__":
    main()
