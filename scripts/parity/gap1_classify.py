#!/usr/bin/env python3
"""gap1: classify teachers-wing attribution mismatches (DB vs old site).

Inputs: gap1-old-inventory JSON + /tmp/gap1_db_*.json + /tmp/gap1_rabbis.json
        + /tmp/gap1_db_series.json
Outputs (in scripts/parity/reports/):
  gap1-fix-plan-<ts>.json    — certain UPDATEs (lesson rabbi_id, series rabbi_id)
  gap1-yoav-<ts>.json        — doubtful items for Yoav
No DB writes here.
"""
import json
import re
import sys
import unicodedata
import html as H
import urllib.parse
from collections import defaultdict

TS = sys.argv[1] if len(sys.argv) > 1 else "manual"
INV = sys.argv[2]


def norm_he(s):
    s = H.unescape(s or "")
    s = "".join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    s = unicodedata.normalize("NFC", s)
    return re.sub(r"\s+", " ", s).strip()


def norm_title(s):
    s = norm_he(s)
    s = re.sub(r'["״׳\'`]', "", s)
    s = re.sub(r"[|–—\-]", " ", s)
    return re.sub(r"\s+", " ", s).strip().lower()


def norm_media(p):
    if not p:
        return None
    p = H.unescape(urllib.parse.unquote(p))
    p = re.sub(r"^https?://[^/]+", "", p)
    return unicodedata.normalize("NFC", p).strip().lower()


# ---------- old side ----------
inv = json.load(open(INV))
media2author = defaultdict(set)        # media -> {(author, title_norm)}
old_title_global = defaultdict(set)    # title_norm -> {author}
old_series_author = defaultdict(set)   # series title_norm -> {author}
old_lesson_series = defaultdict(set)   # (series_page, title_norm) -> {author}
page_title = {}                        # page href -> its own series title (from series rows)

for p in inv["pages"]:
    for r in p["rows"]:
        a = norm_he(r.get("author") or "")
        tn = norm_title(r["title"])
        if r["kind"] == "series":
            if a:
                old_series_author[tn].add(a)
            page_title[r["href"]] = tn
        else:
            if a:
                old_title_global[tn].add(a)
            for m in r.get("media") or []:
                media2author[norm_media(m)].add((a, tn))

# lesson -> parent series title
for p in inv["pages"]:
    ptitle = page_title.get(p["page"])
    for r in p["rows"]:
        if r["kind"] == "lesson" and r.get("author"):
            key = (ptitle, norm_title(r["title"]))
            old_lesson_series[key].add(norm_he(r["author"]))

# ---------- rabbis ----------
rabbis = json.load(open("/tmp/gap1_rabbis.json"))[0]["json_agg"]
rmap = {norm_he(r["name"]): r["id"] for r in rabbis}

# ---------- db lessons ----------
db = []
for off in [0, 2000, 4000, 6000, 8000]:
    rows = json.load(open(f"/tmp/gap1_db_{off}.json"))[0]["json_agg"]
    if rows:
        db.extend(rows)

fix = []          # certain lesson author fixes
yoav = []         # doubtful
wrong_file = []   # file mis-assignment (separate handling)
ok = 0
unmatched = 0

for row in db:
    rab = norm_he(row.get("rabbi") or "")
    leg = norm_media(row.get("legacy"))
    tn = norm_title(row["title"])
    stn = norm_title(row.get("series_title") or "") or None

    old_auth = None
    basis = None

    if leg and leg in media2author:
        cand = media2author[leg]
        authors_for_title = {a for a, t in cand if t == tn and a}
        all_authors = {a for a, t in cand if a}
        if authors_for_title:
            if len(authors_for_title) == 1:
                old_auth = next(iter(authors_for_title))
                basis = "file+title"
            else:
                yoav.append({**row, "reason": "same file+title, multiple old authors",
                             "old": sorted(authors_for_title)})
                continue
        else:
            # file belongs to a different old lesson → wrong-file row.
            # still try to resolve the AUTHOR strictly via series+title.
            entry = {**row, "file_old_authors": sorted(all_authors),
                     "file_old_titles": sorted({t for _, t in cand})}
            resolved = None
            if stn and (stn, tn) in old_lesson_series:
                s = old_lesson_series[(stn, tn)]
                if len(s) == 1:
                    resolved = next(iter(s))
            if resolved and resolved != rab and rmap.get(resolved):
                fix.append({"lesson_id": row["id"], "title": row["title"],
                            "series": row.get("series_title"), "book": row.get("bible_book"),
                            "db_rabbi": row.get("rabbi"), "old_author": resolved,
                            "new_rabbi_id": rmap[resolved], "basis": "series+title(wrong-file)",
                            "legacy": row.get("legacy")})
                entry["author_fixed_to"] = resolved
            wrong_file.append(entry)
            continue
    else:
        # no usable file key — try series+title, then global title
        if stn and (stn, tn) in old_lesson_series:
            s = old_lesson_series[(stn, tn)]
            if len(s) == 1:
                old_auth = next(iter(s))
                basis = "series+title"
        if old_auth is None and tn in old_title_global:
            s = old_title_global[tn]
            if len(s) == 1:
                cand_auth = next(iter(s))
                if rab:
                    if rab == cand_auth:
                        ok += 1
                    else:
                        # title-only OVERRIDE is unsafe (ושננתם-style collisions) → yoav
                        yoav.append({**row, "reason": "title-only match would override existing rabbi (collision risk)",
                                     "old": [cand_auth]})
                    continue
                # FILL (rabbi is NULL): accept only when DB series title is a
                # meaningful prefix/substring of the old lesson's series title
                old_parents = {p for (p, t), aa in old_lesson_series.items()
                               if t == tn and cand_auth in aa and p}
                if stn and len(stn) >= 10 and any(stn in p or p in stn for p in old_parents):
                    old_auth = cand_auth
                    basis = "title-fill"
                else:
                    yoav.append({**row, "reason": "NULL rabbi, title-only match (series not aligned)",
                                 "old": [cand_auth]})
                    continue
            else:
                yoav.append({**row, "reason": "title matches multiple old authors",
                             "old": sorted(s)})
                continue
        if old_auth is None:
            unmatched += 1
            continue

    if rab == old_auth:
        ok += 1
        continue
    rid = rmap.get(old_auth)
    if not rid:
        yoav.append({**row, "reason": "old author missing in rabbis", "old": [old_auth]})
        continue
    fix.append({"lesson_id": row["id"], "title": row["title"],
                "series": row.get("series_title"), "book": row.get("bible_book"),
                "db_rabbi": row.get("rabbi"), "old_author": old_auth,
                "new_rabbi_id": rid, "basis": basis, "legacy": row.get("legacy")})

# ---------- series-level ----------
db_series = json.load(open("/tmp/gap1_db_series.json"))[0]["json_agg"] or []
series_fix, series_yoav, series_ok, series_unmatched = [], [], 0, 0
for s in db_series:
    tn = norm_title(s["title"])
    rab = norm_he(s.get("rabbi") or "")
    olds = old_series_author.get(tn)
    if not olds:
        series_unmatched += 1
        continue
    if len(olds) > 1:
        series_yoav.append({**s, "reason": "multiple old authors for series title",
                            "old": sorted(olds)})
        continue
    old_auth = next(iter(olds))
    if rab == old_auth:
        series_ok += 1
        continue
    rid = rmap.get(old_auth)
    if not rid:
        series_yoav.append({**s, "reason": "old author missing in rabbis", "old": [old_auth]})
        continue
    series_fix.append({"series_id": s["id"], "title": s["title"],
                       "db_rabbi": s.get("rabbi"), "old_author": old_auth,
                       "new_rabbi_id": rid})

out_fix = {"lesson_fixes": fix, "series_fixes": series_fix}
json.dump(out_fix, open(f"scripts/parity/reports/gap1-fix-plan-{TS}.json", "w"),
          ensure_ascii=False, indent=1)
json.dump({"lessons_doubt": yoav, "wrong_file": wrong_file,
           "series_doubt": series_yoav},
          open(f"scripts/parity/reports/gap1-yoav-{TS}.json", "w"),
          ensure_ascii=False, indent=1)

print(f"DB lessons: {len(db)}")
print(f"  OK (author matches old): {ok}")
print(f"  CERTAIN author fixes:    {len(fix)}")
print(f"  WRONG FILE (separate):   {len(wrong_file)}")
print(f"  DOUBT → yoav:            {len(yoav)}")
print(f"  unmatched (no old key):  {unmatched}")
print(f"Series: total {len(db_series)} | ok {series_ok} | fix {len(series_fix)} | doubt {len(series_yoav)} | unmatched {series_unmatched}")

# distribution of fixes
pairs = defaultdict(int)
for f in fix:
    pairs[(f["db_rabbi"], f["old_author"])] += 1
print("\nTop fix pairs:")
for (a, b), n in sorted(pairs.items(), key=lambda x: -x[1])[:20]:
    print(f"  {n:5}  {a!r} → {b!r}")
