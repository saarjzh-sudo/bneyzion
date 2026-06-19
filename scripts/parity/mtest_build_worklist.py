#!/usr/bin/env python3
"""mtest_build_worklist.py — assemble the BIG migration-test work-list:
each node = {type, name, safe, old_url, new_url}. Outputs mtest-worklist.json (~380 nodes)."""
import sys, os, json, time, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
from fix_lesson_rabbis import rb_norm

def q(s, _t=8):
    for i in range(_t):
        out = sbq.run(s)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"): time.sleep(1.5*(i+1)); continue
            return d
        except Exception: time.sleep(1.5*(i+1))
    return []

NEW = "https://bneyzion.vercel.app"
OLDBASE = "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים"
def safe(s): return s.replace("/", "_").replace('"', "").replace(" ", "_").replace("'", "")[:60]

work = []

# 1. TOPICS (127) — old url from old_topic_pages, new from slug
old_top = json.load(open(os.path.join(HERE, "oneone/old_topic_pages.json"), encoding="utf-8"))
for m in json.load(open(os.path.join(HERE, "topic-manifest.json"), encoding="utf-8")):
    if not m.get("slug"): continue
    ou = old_top.get(m["title"], {}).get("url") or f"{OLDBASE}/נושאים/?subject=" + urllib.parse.quote(m["title"])
    work.append({"type": "topic", "name": m["title"], "safe": "topic_"+safe(m["title"]),
                 "old_url": ou, "new_url": f"{NEW}/topic/{m['slug']}", "old_items_hint": m.get("old_items")})

# 2. RABBIS (154) — old url built from full rabbis.name (with הרב), new from slug
names = {r["slug"]: r["name"] for r in q("SELECT slug, name FROM rabbis WHERE slug IS NOT NULL")}
for m in json.load(open(os.path.join(HERE, "rabbi-manifest.json"), encoding="utf-8")):
    if not m.get("slug"): continue
    full = names.get(m["slug"], m["name"])
    work.append({"type": "rabbi", "name": m["name"], "safe": "rabbi_"+safe(m["name"]),
                 "old_url": f"{OLDBASE}/רבנים?rav=" + urllib.parse.quote(full),
                 "new_url": f"{NEW}/rabbis/{m['slug']}", "old_items_hint": m.get("old_items")})

# 3. BOOKS (37) — verify-manifest (list of book dicts) has both urls
vm = json.load(open(os.path.join(HERE, "verify-manifest.json"), encoding="utf-8"))
vm_list = vm if isinstance(vm, list) else [dict(v, book=k) for k, v in vm.items()]
for e in vm_list:
    if not e.get("old_url") or not e.get("new_url"): continue
    bk = e.get("book") or e.get("name")
    work.append({"type": "book", "name": bk, "safe": "book_"+safe(bk),
                 "old_url": e["old_url"], "new_url": e["new_url"], "old_items_hint": None})

# 4. SECTIONS — section-manifest old_url + resolve new_url (/category/<node_id>)
sm = json.load(open(os.path.join(HERE, "section-manifest.json"), encoding="utf-8"))
for s in (sm if isinstance(sm, list) else []):
    ou = s.get("old_url"); nid = s.get("new_node_id")
    if not ou: continue
    if not nid:
        # resolve by title → series id (category node)
        r = q(f"SELECT id FROM series WHERE title='{s['title'].replace(chr(39),chr(39)*2)}' AND status='category' LIMIT 1")
        nid = r[0]["id"] if r else None
    if not nid:
        # section leaves are status='active' series-page nodes → /series/<id> (NOT /category)
        r = q(f"SELECT id FROM series WHERE title='{s['title'].replace(chr(39),chr(39)*2)}' AND status IN ('active','published') LIMIT 1")
        nid = r[0]["id"] if r else None
    if not nid: continue
    # active section nodes render at /series/<id>; only true category folders use /category
    st = q(f"SELECT status FROM series WHERE id='{nid}'")
    route = "category" if (st and st[0].get("status") == "category") else "series"
    work.append({"type": "section", "name": s["title"], "safe": "section_"+safe(s["title"]),
                 "old_url": ou, "new_url": f"{NEW}/{route}/{nid}", "old_items_hint": s.get("pub_lessons")})

json.dump(work, open(os.path.join(HERE, "mtest-worklist.json"), "w"), ensure_ascii=False, indent=1)
from collections import Counter
c = Counter(w["type"] for w in work)
print(f"work-list: {len(work)} nodes →", dict(c))
