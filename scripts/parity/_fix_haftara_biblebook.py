import json, sys, time
sys.path.insert(0, ".")
import sbq
def q(s, _t=8):
    for i in range(_t):
        try:
            d = json.loads(sbq.run(s))
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return []
man = [m for m in json.load(open("section-manifest.json")) if m.get("new_node_id")]
ids = [m["new_node_id"] for m in man]
idin = "','".join(ids)
bad = q(f"SELECT id,title,bible_book FROM series WHERE id IN ('{idin}') AND bible_book IS NOT NULL")
print("section nodes with stray bible_book:", len(bad))
bids = [r["id"] for r in bad]
q("DROP TABLE IF EXISTS section_biblebook_bak_20260618")
q(f"CREATE TABLE section_biblebook_bak_20260618 AS SELECT id, bible_book FROM series WHERE id IN ('" + "','".join(bids) + "')")
q(f"UPDATE series SET bible_book=NULL WHERE id IN ('" + "','".join(bids) + "')")
print("cleared bible_book on", len(bids), "section nodes (backup section_biblebook_bak_20260618)")
print("verify:", q(f"SELECT COUNT(*) n FROM series WHERE id IN ('{idin}') AND bible_book IS NOT NULL"))
