#!/usr/bin/env python3
"""rabbi_truth_all.py — authoritative rabbi gap per book, grounded in the OLD-SITE author.
Runs fix_lesson_rabbis.py DRY (no --apply) for each failing book; it scrapes old div.author
per lesson and reports resolvable fixes (DB-rabbi != old-author, resolves to ONE real rabbi)
plus unresolved (ambiguous). This REPLACES the noisy audio-path metric as the true gap.
Output: reports/RABBI-TRUTH.json
"""
import os, sys, json, time, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))

BOOKS = ["בראשית","שמות","ויקרא","במדבר","דברים","יהושע","שופטים","שמואל א","שמואל ב",
         "מלכים ב","ירמיהו","יחזקאל","עובדיה","יונה","מיכה","נחום","עזרא ונחמיה","דברי הימים"]

def noenv():
    e = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): e.pop(k, None)
    e["NO_PROXY"] = "*"; return e

def main():
    out = {"generated": time.strftime("%Y-%m-%d %H:%M"), "books": []}
    out_path = os.path.join(HERE, "reports", "RABBI-TRUTH.json")
    for i, b in enumerate(BOOKS, 1):
        try:
            subprocess.run([sys.executable, "-u", os.path.join(HERE, "fix_lesson_rabbis.py"), "--book", b],
                           cwd=HERE, capture_output=True, text=True, env=noenv(), timeout=1200)
            rj = os.path.join(HERE, f"rabbi-fix-{b}.json")
            d = json.load(open(rj, encoding="utf-8")) if os.path.exists(rj) else {"fixes": [], "unresolved": []}
        except Exception as e:
            d = {"fixes": [], "unresolved": [], "error": repr(e)}
        rec = {
            "book": b,
            "n_fixes": len(d.get("fixes", [])),
            "n_unresolved": len(d.get("unresolved", [])),
            "fixes": [{"title": f.get("title"), "from": f.get("from"), "to": f.get("to")} for f in d.get("fixes", [])],
            "unresolved": [{"title": u.get("title"), "old_author": u.get("old_author"), "db": u.get("db_rabbi")} for u in d.get("unresolved", [])],
        }
        if d.get("error"): rec["error"] = d["error"]
        out["books"].append(rec)
        json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"[{i:>2}/18] {b:<14} real_fixes={rec['n_fixes']:>2}  unresolved={rec['n_unresolved']:>2}", flush=True)
        time.sleep(0.5)
    tot = sum(r["n_fixes"] for r in out["books"])
    print(f"\nDONE: {tot} total real rabbi fixes across {len(BOOKS)} books", flush=True)

if __name__ == "__main__":
    main()
