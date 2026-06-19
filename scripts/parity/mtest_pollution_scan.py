#!/usr/bin/env python3
"""mtest_pollution_scan.py — find intra-series pollution: series with direct lessons + no
series_lessons allow-list, where the NEW direct count significantly exceeds the OLD page count
(like 096fc3cd: 35 new vs 12 old). Reliable DB-vs-old, no scraping. → /tmp/pollution_candidates.json"""
import json, os, re, unicodedata, time, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq

def run(SQL):
    for i in range(8):
        out = sbq.run(SQL)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"):
                if "Failed" in d["message"] or "ERROR" in d["message"]: return {"err": d["message"][:120]}
                time.sleep(4 * (i + 1)); continue
            return d
        except Exception: time.sleep(4 * (i + 1))
    return None

def norm(s):
    s = unicodedata.normalize("NFC", s or ""); s = re.sub(r"[֑-ׇ]", "", s)
    s = re.sub(r"[\"'״׳.,()?!|–—-]", " ", s); return re.sub(r"\s+", " ", s).strip()

# all at-risk series (direct published-general lessons, NO series_lessons allow-list)
ATRISK = run('''
WITH al AS (SELECT DISTINCT split_part(key,'|',1) sid FROM teacher_listing_items WHERE scope='series_lessons'),
dl AS (SELECT series_id, COUNT(*) n FROM lessons WHERE status='published' AND audience_tags @> ARRAY['general'] GROUP BY series_id)
SELECT s.id::text id, s.title, dl.n new_direct
FROM series s JOIN dl ON dl.series_id=s.id LEFT JOIN al ON al.sid=s.id::text
WHERE al.sid IS NULL AND s.status IN ('active','published') AND dl.n >= 8 ORDER BY dl.n DESC''')
if not isinstance(ATRISK, list):
    print("query failed:", ATRISK); sys.exit(1)
print(f"at-risk series: {len(ATRISK)}")

# old page item-counts by normalized h1 (deepest pages = series pages)
old_count = {}
for fn in ("oneone/old_listings_torah_ketuvim.json", "oneone/old_listings_neviim_moadim.json"):
    raw = json.load(open(os.path.join(HERE, fn), encoding="utf-8"))
    pages = raw.get("pages") if isinstance(raw, dict) and "pages" in raw else {k: v for k, v in raw.items() if k != "_meta" and isinstance(v, dict)}
    for url, pg in pages.items():
        h1 = norm(pg.get("h1"))
        n = len([it for it in pg.get("items", []) if it.get("title")])
        if h1 and n:
            old_count[h1] = max(old_count.get(h1, 0), n)  # the richest page for that title

# flag pollution candidates: new_direct significantly > old page count
cands = []
for s in ATRISK:
    oc = old_count.get(norm(s["title"]))
    if oc is None:
        continue  # no matching old page — skip (can't compare)
    nd = s["new_direct"]
    if nd >= oc + 6 and nd >= oc * 1.4:  # meaningfully more in new than old → pollution suspect
        cands.append({"id": s["id"], "title": s["title"], "new_direct": nd, "old_count": oc, "extra": nd - oc})
cands.sort(key=lambda x: -x["extra"])
json.dump(cands, open("/tmp/pollution_candidates.json", "w"), ensure_ascii=False, indent=1)
print(f"POLLUTION CANDIDATES (new >> old): {len(cands)}")
for c in cands[:25]:
    print(f"  new={c['new_direct']:>3} old={c['old_count']:>3} (+{c['extra']:>3})  {c['title'][:44]}")
