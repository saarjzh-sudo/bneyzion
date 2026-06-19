#!/usr/bin/env python3
"""build_topic_manifest.py — map the 127 OLD sidebar subject-topics to new topic_id/slug,
and measure the current parity gap (old item count vs current lesson_topics rows).
Output: topic-manifest.json + gap summary."""
import sys, os, json, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
from teachers_reconcile import norm
def q(s, _t=8):
    for i in range(_t):
        out = sbq.run(s)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return []

side = json.load(open(os.path.join(HERE, "oneone/old_topics_sidebar.json")))["items"]
pages = json.load(open(os.path.join(HERE, "oneone/old_topic_pages.json")))
# new topics by normalized name
topics = q("SELECT id, name, slug, parent_id FROM topics")
by_norm = {}
for t in (topics or []): by_norm.setdefault(norm(t["name"]), []).append(t)
# current lesson_topics + series_topics counts per topic
lt = {r["topic_id"]: r["n"] for r in q("SELECT topic_id, COUNT(*) n FROM lesson_topics GROUP BY topic_id")}
st = {r["topic_id"]: r["n"] for r in q("SELECT topic_id, COUNT(*) n FROM series_topics GROUP BY topic_id")}

man = []
for it in side:
    title = it["title"]; nrm = norm(title)
    page = pages.get(title) or {}
    old_items = page.get("n_items") or it.get("count")
    cand = by_norm.get(nrm, [])
    # prefer top-level (parent_id NULL); else any
    node = next((c for c in cand if c["parent_id"] is None), cand[0] if cand else None)
    tid = node["id"] if node else None
    cur = (lt.get(tid, 0) + st.get(tid, 0)) if tid else 0
    man.append({"title": title, "old_items": old_items, "topic_id": tid, "slug": node["slug"] if node else None,
                "cur_lessons": lt.get(tid, 0), "cur_series": st.get(tid, 0), "cur_total": cur,
                "gap": (old_items or 0) - cur})
json.dump(man, open(os.path.join(HERE, "topic-manifest.json"), "w"), ensure_ascii=False, indent=1)
mapped = [m for m in man if m["topic_id"]]
print(f"127 sidebar topics: {len(mapped)} mapped to topic_id, {len(man)-len(mapped)} UNMAPPED")
big = [m for m in mapped if abs(m["gap"]) > 3]
print(f"topics with |gap|>3 (old_items vs current): {len(big)}")
for m in sorted(big, key=lambda x:-abs(x["gap"]))[:25]:
    print(f"   {m['title'][:28]:28} old={m['old_items']:>3} cur={m['cur_total']:>3} (L{m['cur_lessons']}/S{m['cur_series']}) gap={m['gap']:+d}")
print("UNMAPPED:", [m['title'] for m in man if not m['topic_id']][:15])
