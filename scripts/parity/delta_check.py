#!/usr/bin/env python3
"""delta_check.py — for the books whose dry-emit count differs from the applied listing,
show exactly which item (title) would be ADDED or REMOVED by re-applying. Verify-before-apply."""
import os, sys, json, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import public_book_listing as P, sbq
def q(sql, _t=8):
    for i in range(_t):
        out = sbq.run(sql)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"): time.sleep(1.2*(i+1)); continue
            return d
        except Exception: time.sleep(1.2*(i+1))
    return []

DELTA = ["שמות","דברים","שמואל א","מלכים ב","זכריה","מלאכי","אסתר","דניאל","עזרא ונחמיה","ישעיהו"]
for b in DELTA:
    plan = P.build_book(b)
    dry_ids = {(r["kind"], r.get("series_id") or r.get("lesson_id")) for r in plan["rows"]}
    cur = q(f"SELECT kind, series_id, lesson_id FROM teacher_listing_items WHERE scope='public_book' AND key='{P.esc(b)}'")
    cur_ids = {(r["kind"], r.get("series_id") or r.get("lesson_id")) for r in (cur or [])}
    added = dry_ids - cur_ids
    removed = cur_ids - dry_ids
    def titles(idset):
        out = []
        for kind, _id in idset:
            if not _id: continue
            t = q(f"SELECT title FROM {'series' if kind=='series' else 'lessons'} WHERE id='{_id}'")
            out.append(f"{kind}:{(t[0]['title'] if t else '?')}")
        return out
    print(f"\n## {b}  (dry {len(dry_ids)} vs applied {len(cur_ids)})")
    if added:   print("   + ADD :", titles(added))
    if removed: print("   - DROP:", titles(removed))
    if not added and not removed: print("   (no id-level change)")
