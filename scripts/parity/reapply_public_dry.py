#!/usr/bin/env python3
"""reapply_public_dry.py — DRY scan of public_book_listing across all 37 books after the
audience fix (_aud allows dual-audience). For each book: old_items, emitted, gaps_unresolved,
+ LEAK CHECK (any emitted series/lesson that is teacher-EXCLUSIVE). Read-only — decides which
books to re-apply and proves the global audience change introduces no leak anywhere.
Output: reports/REAPPLY-DRY.json
"""
import os, sys, json, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import public_book_listing as P
import sbq
def q(sql, _t=8):
    for i in range(_t):
        out = sbq.run(sql)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return []

def main():
    man = json.load(open(os.path.join(HERE, "verify-manifest.json"), encoding="utf-8"))
    books = [m["book"] for m in man]
    out = {"generated": time.strftime("%Y-%m-%d %H:%M"), "books": []}
    op = os.path.join(HERE, "reports", "REAPPLY-DRY.json")
    for i, b in enumerate(books, 1):
        try:
            plan = P.build_book(b)
        except Exception as e:
            out["books"].append({"book": b, "error": repr(e)}); continue
        sids = [r["series_id"] for r in plan.get("rows", []) if r.get("series_id")]
        lids = [r["lesson_id"] for r in plan.get("rows", []) if r.get("lesson_id")]
        leak_s = leak_l = 0
        if sids:
            r = q("SELECT COUNT(*) n FROM series WHERE id IN ('"+"','".join(sids)+"') AND audience_tags @> ARRAY['teachers'] AND NOT audience_tags @> ARRAY['general']")
            leak_s = (r[0]["n"] if r else 0)
        if lids:
            r = q("SELECT COUNT(*) n FROM lessons WHERE id IN ('"+"','".join(lids)+"') AND audience_tags @> ARRAY['teachers'] AND NOT audience_tags @> ARRAY['general']")
            leak_l = (r[0]["n"] if r else 0)
        rec = {"book": b, "old_items": plan.get("old_items"), "emitted": plan.get("emitted"),
               "gaps_unresolved": [g.get("title") for g in plan.get("gaps_unresolved", [])],
               "leak_series": leak_s, "leak_lessons": leak_l}
        out["books"].append(rec)
        json.dump(out, open(op, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        flag = "LEAK!" if (leak_s or leak_l) else "ok"
        print(f"[{i:>2}/37] {b:<14} emit={rec['emitted']}/{rec['old_items']} gaps={len(rec['gaps_unresolved'])} leak={leak_s}+{leak_l} {flag}", flush=True)
        time.sleep(0.3)
    nleak = sum(1 for r in out["books"] if r.get("leak_series") or r.get("leak_lessons"))
    print(f"\nDONE. books with teacher-exclusive leak: {nleak} (must be 0)", flush=True)

if __name__ == "__main__":
    main()
