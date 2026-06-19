import json, sys
sys.path.insert(0, ".")
d = json.load(open("oneone/old_sidebar_tree.json"))
tree = d["tree"]
BOOKCAT = {"תורה", "נביאים", "כתובים"}
SECTIONS = [n for n in tree if n["title"] not in BOOKCAT]

def walk(node, depth, out):
    kids = node.get("children", [])
    out.append((depth, node["title"], node.get("url", ""), len(kids)))
    for ch in kids:
        walk(ch, depth + 1, out)

for s in SECTIONS:
    rows = []
    walk(s, 0, rows)
    leaves = [r for r in rows if r[3] == 0]
    folders = [r for r in rows if r[3] > 0]
    print(f"\n## {s['title']}  (total {len(rows)} nodes: {len(folders)} folders, {len(leaves)} leaves)")
    for depth, title, url, nk in rows[:30]:
        tag = "📁" if nk else "📄"
        print(f"   {'  '*depth}{tag} {title[:44]:44} kids={nk}")
    if len(rows) > 30:
        print(f"   ... +{len(rows)-30} more")
