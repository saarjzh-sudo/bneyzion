#!/usr/bin/env python3
"""mtest_diff.py — compute old-vs-new diff per node from /tmp/mtest/*.json.
Writes /tmp/mtest_diff/<safe>.json = {node, old_n, new_n, old_h1, new_h1, missing[], extra[],
count_mismatch[]}. Reliable Hebrew normalization so the judge agents only judge, not parse."""
import os, json, glob, re, unicodedata
IN = "/tmp/mtest"; OUT = "/tmp/mtest_diff"; os.makedirs(OUT, exist_ok=True)

def norm(s):
    s = unicodedata.normalize("NFC", s or "")
    s = re.sub(r"[֑-ׇ]", "", s)                       # niqqud
    s = re.sub(r"\s*\([0-9]+\)\s*", " ", s)           # (N) copy suffix
    s = re.sub(r"[\"'״׳`‘’“”|\-–—]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def titles(block):
    return [(norm(i.get("title")), i.get("count"), i.get("title")) for i in (block.get("items") or []) if i.get("title")]

n = 0
for fp in glob.glob(os.path.join(IN, "*.json")):
    try:
        d = json.load(open(fp, encoding="utf-8"))
    except Exception:
        continue
    node = d["node"]; old = d.get("old", {}); new = d.get("new", {})
    ot = titles(old); nt = titles(new)
    old_by = {}; new_by = {}
    for k, c, raw in ot: old_by.setdefault(k, []).append((c, raw))
    for k, c, raw in nt: new_by.setdefault(k, []).append((c, raw))
    missing = [old_by[k][0][1] for k in old_by if k and k not in new_by][:40]
    extra = [new_by[k][0][1] for k in new_by if k and k not in old_by][:40]
    count_mismatch = []
    for k in old_by:
        if k in new_by:
            oc = old_by[k][0][0]; nc = new_by[k][0][0]
            if oc is not None and nc is not None and oc != nc:
                count_mismatch.append({"title": old_by[k][0][1], "old": oc, "new": nc})
    out = {"node": {"name": node["name"], "type": node["type"], "old_url": node["old_url"], "new_url": node["new_url"]},
           "old_n": old.get("n"), "new_n": new.get("n"), "old_h1": old.get("h1"), "new_h1": new.get("h1"),
           "old_err": old.get("error"), "new_err": new.get("error"),
           "missing_in_new": missing, "extra_in_new": extra, "count_mismatch": count_mismatch[:40]}
    json.dump(out, open(os.path.join(OUT, node["safe"] + ".json"), "w"), ensure_ascii=False)
    n += 1
print(f"diffed {n} nodes → {OUT}/")
