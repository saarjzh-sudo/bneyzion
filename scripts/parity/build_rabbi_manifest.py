#!/usr/bin/env python3
"""build_rabbi_manifest.py — map 154 OLD rabbi pages → new rabbi_id, measure parity gap
(old n_items vs current rabbi_page_items rows). Output rabbi-manifest.json + gap summary."""
import sys, os, json, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
from fix_lesson_rabbis import rb_norm
def q(s, _t=8):
    for i in range(_t):
        out = sbq.run(s)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return []

old = json.load(open(os.path.join(HERE, "oneone/old_rabbi_pages.json"), encoding="utf-8"))
old_rabbis = {k: v for k, v in old.items() if not k.startswith("_")}
rabbis = q("SELECT id, name, slug FROM rabbis")
by_norm = {}
for r in (rabbis or []): by_norm.setdefault(rb_norm(r["name"]), []).append(r)
rpi = {r["rabbi_id"]: r["n"] for r in q("SELECT rabbi_id, COUNT(*) n FROM rabbi_page_items GROUP BY rabbi_id")}

man = []
for name, e in old_rabbis.items():
    nrm = rb_norm(name)
    cand = by_norm.get(nrm, [])
    node = cand[0] if cand else None
    rid = node["id"] if node else None
    old_n = e.get("n_items") or 0
    cur = rpi.get(rid, 0) if rid else 0
    man.append({"name": name, "old_items": old_n, "eff": e.get("effective_lesson_count"),
                "rabbi_id": rid, "slug": node["slug"] if node else None,
                "cur_rpi": cur, "gap": old_n - cur})
json.dump(man, open(os.path.join(HERE, "rabbi-manifest.json"), "w"), ensure_ascii=False, indent=1)
mapped = [m for m in man if m["rabbi_id"]]
unmapped = [m for m in man if not m["rabbi_id"]]
print(f"154 old rabbis: {len(mapped)} mapped, {len(unmapped)} UNMAPPED")
print(f"UNMAPPED: {[m['name'] for m in unmapped][:20]}")
withitems = [m for m in mapped if m["old_items"] > 0]
big = [m for m in withitems if abs(m["gap"]) > 3]
print(f"mapped with old items>0: {len(withitems)} | with |gap|>3: {len(big)}")
for m in sorted(big, key=lambda x:-abs(x["gap"]))[:25]:
    print(f"   {m['name'][:26]:26} old={m['old_items']:>3} rpi={m['cur_rpi']:>3} gap={m['gap']:+d}")
zero_old = [m for m in mapped if m["old_items"] == 0]
print(f"\nmapped rabbis with 0 old items (empty old pages): {len(zero_old)}")
