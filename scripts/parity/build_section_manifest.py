#!/usr/bin/env python3
"""build_section_manifest.py — map each OLD section-tree leaf to its NEW DB node, producing the
L2 work-list: [{section, title, old_url, new_node_id, pub_lessons, child_series}].
Match new node by title within the section root's descendant subtree."""
import sys, os, json, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
from teachers_reconcile import norm, esc
def q(s, _t=8):
    for i in range(_t):
        out = sbq.run(s)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return []

# section roots (new DB) — from _l2_sections
ROOTS = {
    "איך לומדים תנ\"ך": "62590949-6187-4e17-b84d-65a518467521",
    "נושאים כלליים בתנ\"ך": "2d6d28c1-3c5c-4d61-9283-410bc56cd351",
    "מועדים": "92130154-e96a-4f98-b032-5a20ac385f63",
    "הפטרות": "3327c721-7bc9-471c-878f-0b3aef98b090",
    "ימי עיון בתנ\"ך": "f4040001-0001-4000-8000-000000000000",
    "כלי עזר - טבלאות זמני המאורעות ומפות": "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7",
    "ליווי ת\"תים": "7cbd261e-03b0-43da-a708-e8ae4402105f",
}
BASE = "https://www.bneyzion.co.il"
NEW = "https://bneyzion.vercel.app"

# old tree leaves per section
oldtree = json.load(open(os.path.join(HERE, "oneone/old_sidebar_tree.json")))["tree"]
def leaves(node, sec, out):
    kids = node.get("children", [])
    if not kids:
        out.append({"section": sec, "title": node["title"], "title_norm": norm(node["title"]),
                    "old_url": (BASE + node["url"]) if node.get("url","").startswith("/") else node.get("url","")})
    for ch in kids: leaves(ch, sec, out)
old_leaves = []
for n in oldtree:
    if n["title"] in ROOTS:
        leaves(n, n["title"], old_leaves)
print(f"old section leaves: {len(old_leaves)}")

# new descendants per root → {norm title: [nodes]}
manifest = []
for sec, rid in ROOTS.items():
    rows = q(f"""WITH RECURSIVE d AS (
        SELECT id,title,parent_id,0 lvl FROM series WHERE id='{rid}'
        UNION ALL SELECT c.id,c.title,c.parent_id,d.lvl+1 FROM series c JOIN d ON c.parent_id=d.id)
      SELECT id,title,lvl,
       (SELECT COUNT(*) FROM lessons l WHERE l.series_id=d.id AND l.status='published') pub,
       (SELECT COUNT(*) FROM series c WHERE c.parent_id=d.id) kids
      FROM d""")
    by_norm = {}
    for r in (rows or []): by_norm.setdefault(norm(r["title"]), []).append(r)
    for lf in [l for l in old_leaves if l["section"] == sec]:
        cand = by_norm.get(lf["title_norm"], [])
        node = max(cand, key=lambda r: (r["pub"] or 0)) if cand else None
        manifest.append({**lf,
            "new_node_id": node["id"] if node else None,
            "pub_lessons": node["pub"] if node else None,
            "child_series": node["kids"] if node else None,
            "new_url": f"{NEW}/category/{node['id']}" if node else None})

mapped = [m for m in manifest if m["new_node_id"]]
unmapped = [m for m in manifest if not m["new_node_id"]]
json.dump(manifest, open(os.path.join(HERE, "section-manifest.json"), "w"), ensure_ascii=False, indent=1)
print(f"mapped: {len(mapped)} | UNMAPPED (no new node by title): {len(unmapped)}")
from collections import Counter
print("by section (mapped/total):")
for sec in ROOTS:
    t=[m for m in manifest if m['section']==sec]; mp=[m for m in t if m['new_node_id']]
    print(f"   {sec[:30]:30} {len(mp)}/{len(t)}")
print("\nsample UNMAPPED:", [m['title'] for m in unmapped[:12]])
