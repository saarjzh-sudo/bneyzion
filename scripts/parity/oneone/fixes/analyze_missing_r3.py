#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
analyze_missing_r3.py — ROUND-3 last-mile MISSING-ITEMS analyzer (listings section).

READ-ONLY against the DB (SELECT via sbq.py / cached anon-REST sims).
For every missing item-occurrence reported by reports/verify_results.json (listings):
  (a) find the old row + matched lesson_id (match/item_match.json)
  (b) live DB state: lesson exists? home series? copy in page scope (copied_from)?
  (c) responsible op(s) in plans/RESOLVED-OPS.jsonl + journal state (state/applied.jsonl)
  (d) classify:
      ALIAS_PAGE_CODE       — page is an alias node (code-rendered roll-up slot); data copies
                              would duplicate content; fix is code / covered by deep pages
      TITLE_DRIFT           — the matched lesson IS rendered on the page but under a different
                              title than the old page shows
      APPLIED_BUT_FILTERED  — a row for the lesson IS in the page scope but the UI filter
                              hides it (status / teacher-only audience)
      DEFERRED_MED_SANITY   — responsible op exists, conf=med, never journaled (med-sanity gate)
      DEFERRED_LOW          — responsible op exists, conf=low, never journaled
      UNJOURNALED_HIGH      — responsible op conf=high absent from journal (stage7 no-row-in-scope)
      OP_ERRORED            — responsible op journaled with an error result
      APPLIED_BUT_NO_ROW    — op journaled applied but no row in scope (later op moved it away …)
      OP_MISSING            — matched lesson exists in DB but plans never emitted a placement op
      NEVER_MATCHED         — old row never matched a lesson (gap never inserted)

Usage:
  python3 fixes/analyze_missing_r3.py            # phases 1-5, writes fixes/r3_analysis.json
  python3 fixes/analyze_missing_r3.py --sql      # also emit fixes/ROUND3-missing.sql
"""
import argparse
import importlib.util
import json
import os
import re
import sys
import unicodedata
import urllib.parse
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))          # …/oneone/fixes
ONEONE = os.path.dirname(HERE)                              # …/oneone
SCRIPTS = os.path.join(ONEONE, "scripts")
PARITY = os.path.dirname(ONEONE)                            # …/parity

# ── import the verify harness as a module (read-only sims, warm /tmp cache) ──
spec = importlib.util.spec_from_file_location("ov", os.path.join(SCRIPTS, "oneone_verify.py"))
ov = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ov)

# ── sbq (management-API SELECT helper) ──
spec2 = importlib.util.spec_from_file_location("sbq", os.path.join(PARITY, "sbq.py"))
sbq = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(sbq)


def run_sql(q):
    out = sbq.run(q)
    parsed = json.loads(out)
    if isinstance(parsed, dict) and parsed.get("message"):
        raise RuntimeError(f"SQL error: {parsed}")
    return parsed


def load_json(name):
    with open(os.path.join(ONEONE, name), encoding="utf-8") as f:
        return json.load(f)


def norm_url(u):
    u = urllib.parse.unquote(u or "").replace("https://www.bneyzion.co.il", "")
    u = unicodedata.normalize("NFC", u)
    return u.rstrip("/")


IDX_RE = re.compile(r"(?:item idx|old item idx)=(\d+)")

# ═══════════════ phase 1: failing pages from verify_results ═══════════════
print("[1] loading verify_results …", flush=True)
VR = load_json("reports/verify_results.json")["listings"]
fail_pages = [p for p in VR["pages"] if p.get("n_missing", 0) > 0]
print(f"    {len(fail_pages)} pages, {sum(p['n_missing'] for p in fail_pages)} missing occurrences (verify)")

# ═══════════════ phase 2: ground truth + match + ops + journal ═══════════════
print("[2] loading ground truth / match / ops / journal …", flush=True)
IM = load_json("match/item_match.json")["listings"]
old_tk = load_json("old_listings_torah_ketuvim.json")["pages"]
old_nm = load_json("old_listings_neviim_moadim.json")
OLD = {}
for u, p in old_tk.items():
    if u != "_meta":
        OLD[u] = ("tk", p)
for u, p in old_nm.items():
    if u != "_meta" and isinstance(p, dict):
        OLD[u] = ("nm", p)

TMP_MAP = load_json("state/tmp_map.json")
COPY_MAP = load_json("state/copy_map.json")

kind_by_url = {}
for n in load_json("match/tree_map.json")["nodes"]:
    kind_by_url[norm_url(n.get("old_url_norm") or n.get("old_url"))] = n.get("node_kind")

OPS = {}
ops_by_urlidx = defaultdict(list)     # (norm_url, idx) -> [op]
ops_by_lesson = defaultdict(list)     # lesson uuid -> [op]
for line in open(os.path.join(ONEONE, "plans/RESOLVED-OPS.jsonl"), encoding="utf-8"):
    line = line.strip()
    if not line:
        continue
    j = json.loads(line)
    OPS[j["op_id"]] = j
    b = j["body"]
    ev = b.get("evidence") or {}
    ou = ev.get("old_url") or b.get("old_url") or ""
    det = ev.get("detail") or ""
    if ou:
        for m in IDX_RE.finditer(det):
            ops_by_urlidx[(norm_url(ou), int(m.group(1)))].append(j)
        if not IDX_RE.search(det) and b["op"] == "insert_lesson":
            ops_by_urlidx[(norm_url(ou), -1)].append(j)
    lid = b.get("lesson_id")
    if isinstance(lid, str) and len(lid) == 36:
        ops_by_lesson[lid].append(j)

JOURNAL = {}
for line in open(os.path.join(ONEONE, "state/applied.jsonl"), encoding="utf-8"):
    line = line.strip()
    if not line:
        continue
    j = json.loads(line)
    JOURNAL[j["op_id"]] = j["result"]   # last result wins


def resolve_series_ref(ref):
    if ref is None:
        return None
    s = str(ref)
    if len(s) == 36 and s.count("-") == 4:
        return s
    return TMP_MAP.get(s) or TMP_MAP.get(f"tmp:{s}")


# ═══════════════ phase 3: live DB dumps (sbq, paged) ═══════════════
print("[3] live DB dump via sbq …", flush=True)
LESSONS = {}
off = 0
while True:
    page = run_sql("SELECT id,title,series_id,status,audience_tags,sort_order,copied_from,rabbi_id,"
                   "audio_url,video_url,attachment_url,legacy_attachment_url "
                   f"FROM lessons ORDER BY id LIMIT 5000 OFFSET {off}")
    for r in page:
        LESSONS[r["id"]] = r
    if len(page) < 5000:
        break
    off += 5000
SERIES = {r["id"]: r for r in run_sql("SELECT id,title,parent_id,status,sort_order,lesson_count FROM series")}
RABBIS = {r["id"]: r for r in run_sql("SELECT id,name FROM rabbis")}
print(f"    {len(LESSONS)} lessons, {len(SERIES)} series, {len(RABBIS)} rabbis")

children = defaultdict(list)
for s in SERIES.values():
    children[s.get("parent_id")].append(s["id"])


def descendants(root):
    out, stack = set(), [root]
    while stack:
        x = stack.pop()
        for c in children.get(x, ()):
            if c not in out:
                out.add(c)
                stack.append(c)
    return out


copies_of = defaultdict(list)         # source lesson id -> [copy rows]
for r in LESSONS.values():
    if r.get("copied_from"):
        copies_of[r["copied_from"]].append(r)

lessons_by_norm_title = defaultdict(list)
for r in LESSONS.values():
    lessons_by_norm_title[ov.normalize_he(r["title"])].append(r)

rabbi_by_norm = {}
for r in RABBIS.values():
    rabbi_by_norm.setdefault(ov.norm_rabbi(r["name"]), r["id"])

# ═══════════════ phase 4: re-sim failing pages (full missing lists) ═══════════════
print("[4] re-simulating failing pages (cached anon-REST) …", flush=True)
ov.probe_embed_ambiguity()

occurrences = []   # one record per missing occurrence
sim_mismatch = []

for pi, rec in enumerate(fail_pages):
    url, sid = rec["url"], rec["series_id"]
    sim_mode, node_kind, section = rec["sim_mode"], rec["node_kind"], rec["section"]
    kind, p = OLD.get(url) or (None, None)
    if p is None:
        sim_mismatch.append((url, "no-old-page"))
        continue
    items = p.get("items", [])
    if kind == "tk":
        items = sorted(items, key=lambda x: x.get("order_index", 0))
        old_items = [dict(it, _idx=it.get("order_index", 0),
                          _key=ov.normalize_he(it["title_norm"]),
                          _rabbi=ov.norm_rabbi(it.get("rabbi_norm", "")))
                     for it in items if it.get("type") in ("שיעור", 'שו"ת')]
    else:
        items = sorted(items, key=lambda x: x.get("order", 0))
        old_items = [dict(it, _idx=it.get("order", 0),
                          _key=ov.normalize_he(it["title_norm"]),
                          _rabbi=ov.norm_rabbi(it.get("author_norm", "")))
                     for it in items if it.get("type") in ("שיעור", 'שו"ת')]

    if sim_mode == "category_page":
        _children, lessons = ov.sim_category_page(sid)
    else:
        _children, lessons = ov.sim_series_page(sid)
    new_keys = [ov.normalize_he(l["title"]) for l in lessons]
    rendered_ids = {l["id"] for l in lessons}
    rendered_by_id = {l["id"]: l for l in lessons}

    co, cn = Counter(i["_key"] for i in old_items), Counter(new_keys)
    n_missing_now = sum((co - cn).values())
    if n_missing_now != rec["n_missing"]:
        sim_mismatch.append((url, f"verify={rec['n_missing']} now={n_missing_now}"))

    # per-page match records by idx
    m = IM.get(url) or {}
    match_by_idx = {it.get("idx"): it for it in (m.get("items") or [])}
    mapped_sid = m.get("mapped_series_id")

    scope = {sid} | (descendants(sid) if sim_mode == "category_page" else set())
    page_targets = {sid}
    if mapped_sid:
        page_targets.add(mapped_sid)

    for key in (co - cn):
        n_miss = co[key] - cn[key]
        cands = [i for i in old_items if i["_key"] == key]
        # prefer candidates whose matched lesson is NOT rendered on the page
        def cand_rendered(c):
            mr = match_by_idx.get(c["_idx"]) or {}
            mlid = mr.get("matched_lesson_id")
            if not mlid:
                return False
            ids = {mlid} | {cp["id"] for cp in copies_of.get(mlid, ())}
            return bool(ids & rendered_ids)
        cands.sort(key=cand_rendered)            # un-rendered first
        chosen = cands[:n_miss]

        for c in chosen:
            mr = match_by_idx.get(c["_idx"]) or {}
            mlid = mr.get("matched_lesson_id")
            occ = {
                "url": url, "section": section, "sid": sid, "mapped_sid": mapped_sid,
                "sim_mode": sim_mode, "node_kind": node_kind,
                "idx": c["_idx"], "key": key, "title": c.get("title"),
                "rabbi": c.get("rabbi") or c.get("author") or "",
                "href": c.get("href"), "type": c.get("type"),
                "media": c.get("media") or [], "attachment_href": c.get("attachment_href"),
                "matched_lesson_id": mlid, "match_method": mr.get("method"),
                "match_score": mr.get("score"),
                "old_pos": old_items.index(c),       # position among lesson items (old order)
                "old_items_n": len(old_items),
            }

            # ── live state ──
            lrow = LESSONS.get(mlid) if mlid else None
            crows = copies_of.get(mlid, []) if mlid else []
            in_scope = [r for r in ([lrow] if lrow else []) + crows
                        if r and r.get("series_id") in scope]
            occ["lesson_exists"] = bool(lrow)
            occ["lesson_home"] = lrow.get("series_id") if lrow else None
            occ["copies_n"] = len(crows)
            occ["rows_in_scope"] = [{"id": r["id"], "series_id": r["series_id"],
                                     "status": r["status"], "tags": r.get("audience_tags"),
                                     "sort": r.get("sort_order"),
                                     "is_copy": bool(r.get("copied_from"))} for r in in_scope]

            # ── responsible ops ──
            rel = []
            for op in ops_by_urlidx.get((norm_url(url), c["_idx"]), ()):
                rel.append(op)
            if mlid:
                for op in ops_by_lesson.get(mlid, ()):
                    b = op["body"]
                    tgt = resolve_series_ref(b.get("to_series_ref") or b.get("series_ref"))
                    if b["op"] in ("copy_lesson", "move_lesson", "set_lesson_sort") and tgt in page_targets | scope:
                        if op not in rel:
                            rel.append(op)
            occ["ops"] = [{"op_id": o["op_id"], "op": o["body"]["op"], "conf": o["conf"],
                           "plan": o["plan"], "idx": o["idx"],
                           "journal": JOURNAL.get(o["op_id"], "ABSENT")} for o in rel]

            # ── classify ──
            rendered_hit = None
            if mlid:
                ids = {mlid} | {cp["id"] for cp in crows}
                hit = ids & rendered_ids
                if hit:
                    rendered_hit = rendered_by_id[next(iter(hit))]
            if node_kind == "alias":
                occ["class"] = "ALIAS_PAGE_CODE"
            elif rendered_hit is not None:
                occ["class"] = "TITLE_DRIFT"
                occ["rendered_title"] = rendered_hit["title"]
            elif in_scope:
                r0 = sorted(in_scope, key=lambda r: (r["status"] != "published",))[0]
                why = []
                if r0["status"] != "published":
                    why.append(f"status={r0['status']}")
                if ov.teachers_only(r0.get("audience_tags")):
                    why.append("teachers-only")
                occ["class"] = "APPLIED_BUT_FILTERED"
                occ["filter_why"] = why or ["in-scope-but-not-rendered(?)"]
                occ["filtered_row"] = r0["id"]
                occ["filtered_row_series"] = r0["series_id"]
            else:
                placement = [o for o in rel if o["body"]["op"] in
                             ("copy_lesson", "move_lesson", "insert_lesson", "set_lesson_sort")]
                if placement:
                    states = [(o, JOURNAL.get(o["op_id"])) for o in placement]
                    err = [o for o, s in states if s and s.startswith("error")]
                    absent = [o for o, s in states if s is None]
                    if absent:
                        confs = {o["conf"] for o in absent}
                        if "low" in confs:
                            occ["class"] = "DEFERRED_LOW"
                        elif "med" in confs:
                            occ["class"] = "DEFERRED_MED_SANITY"
                        else:
                            occ["class"] = "UNJOURNALED_HIGH"
                    elif err:
                        occ["class"] = "OP_ERRORED"
                        occ["error"] = JOURNAL.get(err[0]["op_id"])
                    else:
                        occ["class"] = "APPLIED_BUT_NO_ROW"
                elif mlid and lrow:
                    occ["class"] = "OP_MISSING"
                elif mlid and not lrow:
                    occ["class"] = "MATCHED_LESSON_GONE"
                else:
                    occ["class"] = "NEVER_MATCHED"
            occurrences.append(occ)
    if (pi + 1) % 25 == 0:
        print(f"    {pi+1}/{len(fail_pages)} pages…", flush=True)

print(f"    {len(occurrences)} occurrences resolved; sim mismatches: {len(sim_mismatch)}")

# ═══════════════ phase 5: histogram + dump ═══════════════
hist = Counter(o["class"] for o in occurrences)
print("\nCLASS HISTOGRAM:")
for k, v in hist.most_common():
    print(f"  {k:24s} {v}")
sec_hist = defaultdict(Counter)
for o in occurrences:
    sec_hist[o["section"]][o["class"]] += 1

out = {
    "_meta": {"occurrences": len(occurrences), "pages": len(fail_pages),
              "sim_mismatch": sim_mismatch, "histogram": dict(hist),
              "by_section": {k: dict(v) for k, v in sec_hist.items()}},
    "occurrences": occurrences,
}
with open(os.path.join(HERE, "r3_analysis.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print(f"\nwrote fixes/r3_analysis.json ({len(occurrences)} occurrences)")

# ═══════════════════════════════════════════════════════════════════════════
# phase 6+7 (--sql): refine sub-classes and author fixes/ROUND3-missing.sql
# ═══════════════════════════════════════════════════════════════════════════
if "--sql" not in sys.argv:
    sys.exit(0)

import uuid as _uuid


def det_uuid(op_id):
    return str(_uuid.uuid5(_uuid.NAMESPACE_URL, "oneone:" + op_id))


INSERT_DET = {}          # det lesson id -> insert op
for o in OPS.values():
    if o["body"]["op"] == "insert_lesson":
        INSERT_DET[det_uuid(o["op_id"])] = o

# global old-page demand index (normalized title -> [(url, idx)])
DEMAND = defaultdict(list)
for u, (kind, p) in OLD.items():
    items = p.get("items", [])
    for it in items:
        if it.get("type") in ("שיעור", 'שו"ת'):
            DEMAND[ov.normalize_he(it["title_norm"])].append(u)

pure_missing = {p["url"] for p in VR["pages"]
                if p["n_missing"] > 0 and p["extra_unexplained"] == 0
                and p["planned_removals"] == 0 and p["rabbi_mismatches"] == 0
                and p.get("series_n_missing", 0) == 0 and p.get("series_n_extra", 0) == 0}

print("\n[6] refining sub-classes …", flush=True)
refined = Counter()
yoav = []            # rows for the yoav evidence list
scrape_pending = []  # insert-op drafts awaiting the scrape/rehost queues
sql_actions = []     # dicts: kind, params, evidence  (consumed by the SQL writer)
report_notes = defaultdict(list)

LCOL = ("id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,"
        "thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,"
        "audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,sort_order")


def copy_sql(src_id, tgt_id, slot, ev):
    return {"kind": "copy", "src": src_id, "tgt": tgt_id, "slot": slot, "ev": ev}


def norm_key_row(r):
    return ov.normalize_he(r["title"])


def series_title(sid):
    s = SERIES.get(sid)
    return s["title"] if s else "?"


def old_lesson_items(url):
    kind, p = OLD[url]
    items = p.get("items", [])
    if kind == "tk":
        items = sorted(items, key=lambda x: x.get("order_index", 0))
        return [i for i in items if i.get("type") in ("שיעור", 'שו"ת')]
    items = sorted(items, key=lambda x: x.get("order", 0))
    return [i for i in items if i.get("type") in ("שיעור", 'שו"ת')]


def media_hrefs(it):
    out = []
    for m in it.get("media") or []:
        h = m.get("href") if isinstance(m, dict) else str(m)
        if h:
            out.append(h)
    if it.get("attachment_href"):
        out.append(it["attachment_href"])
    return out


# ---------------------------------------------------------------- §1 twin chains
# verify-mapping follows stray empty/near-empty DRAFT twins parked at the נביאים root.
# Reparenting each draft under its ACTIVE twin's parent arms the verifier's twin-repick
# (same parent + same normalize_he title + lessons>0) — page then renders the REAL series.
TWINS = [
    # (page url frag, draft twin prefix, active twin prefix)
    ("שיעורים-קצרים-קריאה-וביאור-ספר-מלכים-ב", "c466c2fc", "5578c087"),
    ("שיעורים-על-התנך-יחזקאל", "9064a41d", "b7b24b9b"),
    ("ישעיהו-מוקלט-ללא-טעמים", "9675678a", "cfb7da1a"),
    ("שיעורים-יהושע", "d5ef79b3", "497d3550"),
    ("שיעורים-על-התנך-ירמיהו", "aeea0713", "6948ae1e"),
]
sid_full = {}
for s in SERIES.values():
    sid_full[s["id"][:8]] = s["id"]

for frag, d8, a8 in TWINS:
    draft, active = sid_full[d8], sid_full[a8]
    sql_actions.append({"kind": "reparent", "sid": draft, "new_parent": SERIES[active]["parent_id"],
                        "ev": f"stray draft twin of {series_title(active)!r} ({a8}); arming verify twin-repick "
                              f"for old page …/{frag}/"})

# 1a מלכים-ב: move the draft twin's two rows (פ (14), פ (15)) to the active twin at the tail
mk_old = old_lesson_items("https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/מלכים-ב/שיעורים-קצרים-קריאה-וביאור-ספר-מלכים-ב/")
mk_active = sid_full["5578c087"]
max_sort = max((r.get("sort_order") or 0) for r in LESSONS.values() if r["series_id"] == mk_active)
for i, lid8 in enumerate(("78d7087b", "c953bf5d")):          # פ (14), פ (15) — old rows 60, 61
    lid = next(l["id"] for l in LESSONS.values() if l["id"].startswith(lid8))
    sql_actions.append({"kind": "move", "lid": lid, "tgt": mk_active, "slot": max_sort + 10 * (i + 1),
                        "ev": f"old page …/שיעורים-קצרים…מלכים-ב/ rows 60-61 ('פ (14)','פ (15)' הרב חנניה מלכה); "
                              f"rows currently stranded in the stray draft twin c466c2fc"})

# 1b יחזקאל: copy 'אחד היה אברהם' (7c0ae70c, old row 27) into the active twin; plan's own
#    set_lesson_sort (lessons_plan_neviim_aharonim[2511]) errored no-row-in-scope.
yez_active = sid_full["b7b24b9b"]
yez_old = old_lesson_items("https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/יחזקאל/שיעורים-על-התנך-יחזקאל/")
sql_actions.append(copy_sql("7c0ae70c-e31c-415a-be4f-2b9aa1211a14", yez_active, None,
                            "old page …/שיעורים-על-התנך-יחזקאל/ row 27 '\"אחד היה אברהם\"' (הרב יצחק בן שחר); "
                            "stage7 op b0a8460f…(idx 2511) errored no-row-in-scope — the copy that should "
                            "have created the row was never planned"))
# surgical demotes (extras blocking the twin page):
sql_actions.append({"kind": "demote", "lid": "03011661-25dc-4f79-a7ac-6992c737dce8",
                    "ev": "title 'עיין חדש בחזון העצמות היבשות' (typo עיין) is listed on NO old page; "
                          "old row 32 'חזון העצמות היבשות' is satisfied by df551fc9 in the same series; "
                          "the demanded 'עיון חדש…' rows live in ימי-עיון (09ee99f9, 164cb9ef)"})
sql_actions.append({"kind": "demote", "lid": "f2010000-0001-4000-8000-000000000113",
                    "ev": "title 'קידוש ה' שיהיה בקיבוץ הגלויות' (audio ירמיהו/23655.mp3) is listed on NO old "
                          "page; old row 19 has the ד' spelling and is satisfied by 422e624a (audio יחזקאל 18)"})
yoav.append({"what": "demoted to draft: 'קידוש ה' שיהיה בקיבוץ הגלויות' (f2010000-…113)",
             "why": "real audio (ירמיהו/23655.mp3) but the title appears on no old page — possible mistitled "
                    "ירמיהו lesson; demoted (reversible), needs a human call on its true identity"})
yoav.append({"what": "demoted to draft: 'עיין חדש בחזון העצמות היבשות' (03011661)",
             "why": "typo-twin of the ימי-עיון lesson 'עיון חדש בחזון העצמות היבשות'; audio likely duplicates "
                    "09ee99f9/164cb9ef — confirm before deleting/merging"})

# 1e ירמיהו: the active twin holds 2 surplus unsorted dups
# 'על מה אבדה הארץ': twin has a7160a62(so=80)+c8775828(unsorted, same audio ירמיהו 12.mp3);
# old ירמיהו-פרק-ט lists the title TWICE but its series d1010001 has only one row → move the dup there.
prk9 = sid_full["d1010001"]
prk9_max = max((r.get("sort_order") or 0) for r in LESSONS.values() if r["series_id"] == prk9)
c87 = next(l for l in LESSONS.values() if l["id"].startswith("c8775828"))
sql_actions.append({"kind": "move", "lid": c87["id"], "tgt": prk9, "slot": prk9_max + 10,
                    "ev": "twin 6948ae1e holds 'על מה אבדה הארץ' twice (a7160a62 sorted + c8775828 unsorted, "
                          "same audio); old …/ירמיהו-פרק-ט/ lists the title twice and its series has one row"})
c7a = next(l for l in LESSONS.values() if l["id"].startswith("c7a4171e"))
sql_actions.append({"kind": "demote", "lid": c7a["id"],
                    "ev": "twin 6948ae1e holds a second 'אפסות העבודה זרה' whose audio is ישעיהו '42 פרק מד.MP3' "
                          "(another rabbi) — a misfiled ישעיהו recording; old ירמיהו page lists the title once "
                          "(satisfied by 1df0344e, audio ירמיהו 15.mp3); ישעיהו pages are already satisfied"})
yoav.append({"what": "demoted to draft: 'אפסות העבודה זרה' copy c7a4171e in שיעורים-על-התנ\"ך-ירמיהו",
             "why": "audio is the ישעיהו פרק-מד recording (הרב אחיקם גץ) — misfiled under ירמיהו; "
                    "ישעיהו-פרק-מד already renders its own row; confirm identity before merge/delete"})

# יחזקאל repack to old order (order_ok=False today: df551fc9 + the new copy are unsorted)
yez_rows = [r for r in LESSONS.values() if r["series_id"] == yez_active]
yez_by_key = defaultdict(list)
for r in yez_rows:
    yez_by_key[norm_key_row(r)].append(r)
repack = []
miss_for_repack = []
for pos, it in enumerate(yez_old):
    k = ov.normalize_he(it["title_norm"])
    rows = [r for r in yez_by_key.get(k, []) if r["id"] not in
            ("03011661-25dc-4f79-a7ac-6992c737dce8", "f2010000-0001-4000-8000-000000000113")]
    if k == "אחד היה אברהם":
        repack.append(("NEWCOPY:7c0ae70c-e31c-415a-be4f-2b9aa1211a14", 10 * (pos + 1)))
        continue
    if len(rows) == 1:
        repack.append((rows[0]["id"], 10 * (pos + 1)))
    else:
        miss_for_repack.append((k, len(rows)))
if miss_for_repack:
    report_notes["repack"].append(f"יחזקאל twin repack ambiguity: {miss_for_repack[:5]}")
else:
    for lid, slot in repack:
        if lid.startswith("NEWCOPY:"):
            for a in sql_actions:
                if a.get("kind") == "copy" and a["src"] == lid.split(":", 1)[1]:
                    a["slot"] = slot
        else:
            cur = LESSONS[lid].get("sort_order")
            if cur != slot:
                sql_actions.append({"kind": "sort", "lid": lid, "slot": slot,
                                    "ev": f"repack שיעורים-על-התנ\"ך-יחזקאל to old order (old pos {slot//10})"})

# ---------------------------------------------------------------- §2/§3/§4 page-level fix+repack
# Generic handler for flip-target series pages: walk the old page in order; ensure each old
# item has exactly one row in the target series (move from the book node when the home IS the
# page's parent category, otherwise guarded copy); assign sorts 10·position when the page can
# fully match (0 extras expected). Falls back to append-at-end when extras exist.

def fix_page_full(url, tgt, move_from=None, repack=True):
    old_items = old_lesson_items(url)
    match_by = {it.get("idx"): it for it in ((IM.get(url) or {}).get("items") or [])}
    tgt_rows = [r for r in LESSONS.values() if r["series_id"] == tgt]
    by_key = defaultdict(list)
    for r in tgt_rows:
        by_key[norm_key_row(r)].append(r)
    for k in by_key:
        by_key[k].sort(key=lambda r: (r.get("sort_order") is None, r.get("sort_order") or 0))
    used = set()
    mx = max([(r.get("sort_order") or 0) for r in tgt_rows], default=0)
    page_short = url.split("/מאגר-השיעורים-והמאמרים")[1][:60]
    for pos, it in enumerate(old_items):
        idx = it.get("order_index", it.get("order"))
        k = ov.normalize_he(it["title_norm"])
        slot = 10 * (pos + 1) if repack else None
        avail = [r for r in by_key.get(k, []) if r["id"] not in used]
        ev = f"old {page_short} row idx={idx} {it['title_norm'][:42]!r} (pos {pos+1})"
        if avail:
            row = avail[0]
            used.add(row["id"])
            if repack and row.get("sort_order") != slot:
                sql_actions.append({"kind": "sort", "lid": row["id"], "slot": slot, "ev": ev})
            if row["status"] == "draft" and row["id"] in INSERT_DET:
                scrape_pending.append({"lesson_id": row["id"], "op_id": INSERT_DET[row["id"]]["op_id"],
                                       "title": row["title"], "page": url,
                                       "note": "insert-op draft in target series; renders once scrape queue publishes"})
            continue
        mlid = (match_by.get(idx) or {}).get("matched_lesson_id")
        row = LESSONS.get(mlid) if mlid else None
        if row is None:
            cands = [r for r in lessons_by_norm_title.get(k, []) if r["id"] not in used]
            ins = [c for c in cands if c["id"] in INSERT_DET]
            if ins:
                c = ins[0]
                used.add(c["id"])
                scrape_pending.append({"lesson_id": c["id"], "op_id": INSERT_DET[c["id"]]["op_id"],
                                       "title": c["title"], "page": url, "series_target": tgt,
                                       "slot": slot,
                                       "note": f"insert-op draft (in {c['series_id'][:8]}); needs scrape-publish"
                                               + ("" if c["series_id"] == tgt else " AND placement in the page series")})
                continue
            if len(cands) == 1 and cands[0]["status"] == "published":
                row = cands[0]
            else:
                yoav.append({"what": f"{it['title_norm'][:48]!r} on {page_short} — no usable DB row",
                             "why": "never matched; candidates " +
                                    str([c["id"][:8] + "/" + c["status"] for c in cands[:3]]) +
                                    ("; old media: " + ", ".join(media_hrefs(it)[:2]) if media_hrefs(it) else "; text lesson — needs scrape")})
                continue
        used.add(row["id"])
        if move_from and row["series_id"] == move_from:
            sql_actions.append({"kind": "move", "lid": row["id"], "tgt": tgt, "slot": slot if slot else mx + 10,
                                "ev": ev + " | home is the page's parent book node (direct lesson) — moving into "
                                           "the child series keeps every ancestor roll-up identical"})
        else:
            sql_actions.append(copy_sql(row["id"], tgt, slot if slot else mx + 10,
                                        ev + f" | lesson anchored in {series_title(row['series_id'])!r} → copy"))
        if not repack:
            mx += 10


# §2 אסתר — old page is the real 'כל השיעורים על מגילת אסתר' series (1 row live); 14 of its
# lessons sit as DIRECT lessons of the book node 8600dfad (its parent) → moves; rest → copies.
fix_page_full("https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/",
              sid_full["0ab89828"], move_from=sid_full["8600dfad"], repack=True)

# §3 small OP_MISSING series pages — copies + full repack (these pages have 0 extras)
fix_page_full("https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/הפטרות/הפטרות-שמות/מאמרים-הפטרות-ספר-שמות/",
              sid_full["269dc17c"], repack=True)
fix_page_full("https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים-כלליים-בתנך/מלחמת-גוג-ומגוג/",
              sid_full["c76ac534"], repack=True)
fix_page_full("https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/",
              sid_full["d2020001"], repack=True)
fix_page_full("https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/",
              sid_full["f5050001"], repack=True)
fix_page_full("https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/",
              sid_full["b2020001"], repack=True)

# §4 deferred-low copies (4 occurrences; copy ops authored by the plans but conf=low → never ran)
seen_dl = set()
for o in occurrences:
    if o["class"] != "DEFERRED_LOW":
        continue
    op = next((OPS[p["op_id"]] for p in o["ops"] if p["journal"] == "ABSENT" and p["op"] == "copy_lesson"), None)
    if not op or op["op_id"] in seen_dl:
        continue
    seen_dl.add(op["op_id"])
    b = op["body"]
    src = b.get("lesson_id")
    tgt = resolve_series_ref(b.get("to_series_ref"))
    if not (src in LESSONS and tgt in SERIES):
        yoav.append({"what": f"deferred-low copy unresolvable: {o['title'][:40]!r} → {b.get('to_series_ref')}",
                     "why": "source or target missing live"})
        continue
    # slot: old position among the page's lesson items × 10 (these targets were stage-7 repacked)
    slot = 10 * (o["old_pos"] + 1)
    sql_actions.append(copy_sql(src, tgt, slot,
                                f"deferred-low op {op['op_id'][:10]} ({op['plan']}[{op['idx']}]); old page "
                                f"{o['url'].split('/מאגר-השיעורים-והמאמרים')[1][:50]} row idx={o['idx']} lists it "
                                f"(old pos {o['old_pos']+1})"))

# ---------------------------------------------------------------- §5 filtered drafts / chunk-cap
for o in occurrences:
    if o["class"] != "APPLIED_BUT_FILTERED":
        continue
    if o.get("filter_why") == ["status=draft"]:
        row = LESSONS.get(o["filtered_row"])
        has_media = any(row.get(f) for f in ("audio_url", "video_url", "attachment_url"))
        if row["id"] in INSERT_DET and not has_media:
            scrape_pending.append({"lesson_id": row["id"], "op_id": INSERT_DET[row["id"]]["op_id"],
                                   "title": row["title"], "page": o["url"],
                                   "note": "insert-op draft in the right series — publish happens via scrape queue"})
            refined["FILTERED_DRAFT_pending_scrape"] += 1
        elif has_media:
            sql_actions.append({"kind": "publish", "lid": row["id"],
                                "ev": f"old {o['url'].split('/מאגר-השיעורים-והמאמרים')[1][:55]} row idx={o['idx']} "
                                      f"lists {o['title'][:40]!r}; row already in scope with media — draft hides it"})
            refined["FILTERED_DRAFT_published"] += 1
        else:
            yoav.append({"what": f"draft-with-no-content in scope: {o['title'][:45]!r} ({row['id'][:8]})",
                         "why": f"old page {o['url'][:70]} lists it; publishing an empty row would show a blank "
                                f"popup — needs content (scrape) first"})
            refined["FILTERED_DRAFT_yoav"] += 1
    else:
        refined["FILTERED_chunk_cap_or_other"] += 1
        report_notes["chunk_cap"].append(f"{o['title'][:40]!r} @ {o['url'].split('/מאגר-השיעורים-והמאמרים')[1][:45]} "
                                         f"(row {o.get('filtered_row','?')[:8]} in {o.get('filtered_row_series','?')[:8]})")

# ---------------------------------------------------------------- §6 title drift
for o in occurrences:
    if o["class"] != "TITLE_DRIFT":
        continue
    rendered = o.get("rendered_title") or ""
    rk, ok_ = ov.normalize_he(rendered), o["key"]
    if rk == ok_:
        refined["TD_dup_occurrence"] += 1
        yoav.append({"what": f"old page lists {o['title'][:40]!r} more than once, DB has one row "
                             f"({(o['matched_lesson_id'] or '?')[:8]})",
                     "why": f"page {o['url'][:75]} — duplicating the row would clone content; decide if the old "
                            f"duplication is intentional"})
        continue
    demanded_elsewhere = [u for u in DEMAND.get(rk, []) ]
    row = LESSONS.get(o["matched_lesson_id"])
    if not demanded_elsewhere and row is not None and ov.normalize_he(row["title"]) == rk:
        # current DB title appears on NO old page; the old-page title is nav truth → rename
        sql_actions.append({"kind": "retitle", "lid": row["id"], "new_title": o["title"],
                            "old_title": row["title"],
                            "ev": f"old {o['url'].split('/מאגר-השיעורים-והמאמרים')[1][:55]} row idx={o['idx']} shows "
                                  f"{o['title'][:45]!r}; current DB title {row['title'][:45]!r} appears on no old page "
                                  f"(match method {o.get('match_method')}, score {o.get('match_score')})"})
        refined["TD_renamed"] += 1
    else:
        refined["TD_yoav"] += 1
        yoav.append({"what": f"title drift: old {o['title'][:40]!r} vs DB {rendered[:40]!r} ({(o['matched_lesson_id'] or '?')[:8]})",
                     "why": f"the DB title is demanded by other old pages {demanded_elsewhere[:2]} — renaming would "
                            f"break them; likely needs a copy-with-retitle decision"})

# ---------------------------------------------------------------- §7 NEVER_MATCHED refinement
for o in occurrences:
    if o["class"] != "NEVER_MATCHED":
        continue
    cands = lessons_by_norm_title.get(o["key"], [])
    if cands:
        ins = [c for c in cands if c["id"] in INSERT_DET]
        if ins:
            c = ins[0]
            scrape_pending.append({"lesson_id": c["id"], "op_id": INSERT_DET[c["id"]]["op_id"],
                                   "title": c["title"], "page": o["url"],
                                   "note": f"insert-op draft (status={c['status']}); page renders it once the "
                                           f"scrape queue publishes it" if c["status"] == "draft" else
                                           f"insert-op row PUBLISHED but in series {c['series_id'][:8]} — check scope"})
            refined["NM_insert_draft_pending"] += 1
        else:
            pub = [c for c in cands if c["status"] == "published"]
            if pub:
                refined["NM_title_exists_published"] += 1
                yoav.append({"what": f"{o['title'][:45]!r} missing on {o['url'].split('/מאגר-השיעורים-והמאמרים')[1][:45]}",
                             "why": f"published row(s) with this exact title exist elsewhere "
                                    f"({[c['id'][:8] + '@' + c['series_id'][:8] for c in pub[:3]]}) but the matcher "
                                    f"never linked them — copy candidate, needs eyeball (different lessons may share titles)"})
            else:
                refined["NM_title_exists_draft_preexisting"] += 1
                yoav.append({"what": f"{o['title'][:45]!r} — only pre-existing DRAFT rows carry this title",
                             "why": f"page {o['url'][:70]}; drafts {[c['id'][:8] for c in cands[:3]]} have no content — "
                                    f"need content/publish decision"})
        continue
    hrefs = media_hrefs(o)
    if hrefs and all(not h.startswith("/media") and "bneyzion.co.il" not in h for h in hrefs):
        # full data + external media → INSERT
        rid = rabbi_by_norm.get(ov.norm_rabbi(o["rabbi"] or ""))
        audio = next((h for h in hrefs if h.lower().split("?")[0].endswith((".mp3", ".m4a", ".wav"))), None)
        video = next((h for h in hrefs if h.lower().split("?")[0].endswith((".mp4", ".mov"))), None)
        sql_actions.append({"kind": "insert", "title": o["title"], "rabbi_id": rid, "tgt": o["sid"],
                            "audio": audio, "video": video,
                            "ev": f"old {o['url'].split('/מאגר-השיעורים-והמאמרים')[1][:55]} row idx={o['idx']} "
                                  f"{o['title'][:40]!r} ({o['rabbi'][:25]}); media on external host; "
                                  f"never matched, never inserted"})
        refined["NM_inserted"] += 1
    elif hrefs:
        refined["NM_rule13_rehost"] += 1
        yoav.append({"what": f"{o['title'][:45]!r} — only bneyzion.co.il media ({hrefs[0][:60]})",
                     "why": f"Rule 13: old-domain media must be rehosted before insert; page {o['url'][:70]} "
                            f"row idx={o['idx']}"})
    else:
        refined["NM_no_data"] += 1
        yoav.append({"what": f"{o['title'][:45]!r} ({o['rabbi'][:25]}) — no media, no DB candidate",
                     "why": f"text lesson needing old-page scrape; page {o['url'][:70]} row idx={o['idx']}, "
                            f"href {o.get('href','')[:70]}"})

# ---------------------------------------------------------------- §8 APPLIED_BUT_NO_ROW → insert-draft check
for o in occurrences:
    if o["class"] != "APPLIED_BUT_NO_ROW":
        continue
    ins_op = next((OPS[p["op_id"]] for p in o["ops"] if p["op"] == "insert_lesson"), None)
    if ins_op:
        lid = det_uuid(ins_op["op_id"])
        row = LESSONS.get(lid)
        if row and row["status"] == "draft":
            scrape_pending.append({"lesson_id": lid, "op_id": ins_op["op_id"], "title": row["title"],
                                   "page": o["url"], "note": "insert applied; draft pending scrape queue"})
            refined["ABNR_insert_draft_pending"] += 1
            continue
        if row:
            refined["ABNR_row_exists_out_of_scope"] += 1
            yoav.append({"what": f"inserted row {lid[:8]} {row['title'][:40]!r} sits in {row['series_id'][:8]}, "
                                 f"page expects scope {o['sid'][:8]}",
                         "why": f"page {o['url'][:70]} row idx={o['idx']}"})
            continue
        refined["ABNR_det_row_missing"] += 1
        yoav.append({"what": f"insert op {ins_op['op_id'][:10]} journaled applied but det-row {lid[:8]} absent",
                     "why": f"page {o['url'][:70]} {o['title'][:40]!r}"})
    else:
        refined["ABNR_other"] += 1
        yoav.append({"what": f"applied ops but no row in scope: {o['title'][:40]!r}",
                     "why": f"page {o['url'][:70]} idx={o['idx']} ops={[(p['op'], p['journal'][:20]) for p in o['ops']][:3]}"})

print("refined:", dict(refined))

# ---------------------------------------------------------------- write SQL
SQL = []
A = SQL.append
A("-- ============================================================================")
A("-- ROUND3-missing.sql — bnei-zion 1:1 parity, ROUND-3 LAST-MILE MISSING ITEMS")
A("-- Author: round-3 missing-items analyst (read-only scoping via sbq.py; this file")
A("--         is EXECUTED BY THE ORCHESTRATOR, not by the author).")
A("-- Built from: reports/verify_results.json (listings: 172 pages / 1,290 missing")
A("--   occurrences), fixes/analyze_missing_r3.py classification (fixes/r3_analysis.json),")
A("--   match/item_match.json, plans/RESOLVED-OPS.jsonl, state/applied.jsonl,")
A("--   old_listings_*.json, live SELECTs 2026-06-12.")
A("-- POLICY: never DELETE (demotes are status='draft', reversible); every statement")
A("--   carries old-page evidence; all statements IDEMPOTENT (guarded).")
A("-- Copy semantics follow oneone_apply._copy_sql (clone + copied_from stamp) but with")
A("--   gen_random_uuid() per ROUND-3 brief.")
A("-- ============================================================================")
A("")

reparents = [a for a in sql_actions if a["kind"] == "reparent"]
moves = [a for a in sql_actions if a["kind"] == "move"]
copies = [a for a in sql_actions if a["kind"] == "copy"]
sorts = [a for a in sql_actions if a["kind"] == "sort"]
demotes = [a for a in sql_actions if a["kind"] == "demote"]
publishes = [a for a in sql_actions if a["kind"] == "publish"]
retitles = [a for a in sql_actions if a["kind"] == "retitle"]
inserts = [a for a in sql_actions if a["kind"] == "insert"]

A("-- ============================================================================")
A("-- §1 STRAY-DRAFT-TWIN CHAINS — 5 old pages were matched to stray EMPTY/near-empty")
A("--    draft twins parked at the נביאים root, while the plans (correctly) targeted the")
A("--    ACTIVE twins. Reparenting each draft under its active twin's parent arms the")
A("--    verifier's twin-repick (same parent + same normalized title + lessons>0), so the")
A("--    page follows the real series. Drafts stay draft/sort 0 — invisible in the app.")
A("--    Old pages: שיעורים-קצרים…מלכים-ב (61), שיעורים-על-התנך-יחזקאל (40),")
A("--    ישעיהו-מוקלט-ללא-טעמים (36), שיעורים-יהושע (34), שיעורים-על-התנך-ירמיהו (20)")
A("-- ----------------------------------------------------------------------------")
A("-- scope: expect 5 rows still parented to the נביאים root pre-apply, 0 after")
ids = ", ".join(f"'{a['sid']}'" for a in reparents)
A(f"SELECT count(*) AS s1_twins_to_reparent FROM series WHERE id IN ({ids})")
A(f"  AND parent_id = 'a0472c9f-8212-44ff-8937-ace5fea4b4dc';")
A("")
for a in reparents:
    A(f"-- {a['ev']}")
    A(f"UPDATE series SET parent_id = '{a['new_parent']}'")
    A(f"WHERE id = '{a['sid']}' AND parent_id IS DISTINCT FROM '{a['new_parent']}';")
    A("")

A("-- ============================================================================")
A(f"-- §2 MOVES — {len(moves)} lessons re-homed (each keeps every ancestor roll-up intact;")
A("--    evidence per statement). Never deletes; sort set to the old-page slot.")
A("-- ----------------------------------------------------------------------------")
for a in moves:
    A(f"-- {a['ev']}")
    A(f"UPDATE lessons SET series_id = '{a['tgt']}', sort_order = {a['slot']}")
    A(f"WHERE id = '{a['lid']}' AND (series_id IS DISTINCT FROM '{a['tgt']}' OR sort_order IS DISTINCT FROM {a['slot']});")
    A("")

A("-- ============================================================================")
A(f"-- §3 COPIES — {len(copies)} guarded clones (oneone_apply copy semantics: full column")
A("--    clone + copied_from stamp; id = gen_random_uuid(); status forced 'published';")
A("--    audience union 'general' — an old PUBLIC page lists the row).")
A("-- ----------------------------------------------------------------------------")
for a in copies:
    slot = a["slot"] if a["slot"] is not None else "NULL"
    A(f"-- {a['ev']}")
    A(f"INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,")
    A(f"  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,")
    A(f"  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,")
    A(f"  sort_order,copied_from)")
    A(f"SELECT gen_random_uuid(),title,description,content,rabbi_id,'{a['tgt']}',video_url,audio_url,")
    A(f"  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,")
    A(f"  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags")
    A(f"    ELSE array_append(coalesce(audience_tags,'{{}}'),'general') END,")
    A(f"  additional_attachments,content_type,legacy_attachment_url,published_at,{slot},id")
    A(f"FROM lessons WHERE id = '{a['src']}'")
    A(f"  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '{a['src']}' AND c.series_id = '{a['tgt']}')")
    A(f"  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '{a['src']}' AND h.series_id = '{a['tgt']}');")
    A("")

A("-- ============================================================================")
A(f"-- §4 SORT REPACKS — {len(sorts)} rows set to their old-page slot (10·position).")
A("-- ----------------------------------------------------------------------------")
for a in sorts:
    A(f"-- {a['ev']}")
    A(f"UPDATE lessons SET sort_order = {a['slot']} WHERE id = '{a['lid']}' AND sort_order IS DISTINCT FROM {a['slot']};")
A("")

A("-- ============================================================================")
A(f"-- §5 DEMOTES — {len(demotes)} rows hidden (status='draft', REVERSIBLE — never delete).")
A("--    Each title is listed on NO old page (verified against the full ground-truth")
A("--    demand index); each blocks an otherwise-1:1 page as an unexplained extra.")
A("-- ----------------------------------------------------------------------------")
for a in demotes:
    A(f"-- {a['ev']}")
    A(f"UPDATE lessons SET status = 'draft' WHERE id = '{a['lid']}' AND status <> 'draft';")
    A("")

A("-- ============================================================================")
A(f"-- §6 PUBLISHES — {len(publishes)} in-scope draft rows WITH media that an old public page lists.")
A("-- ----------------------------------------------------------------------------")
for a in publishes:
    A(f"-- {a['ev']}")
    A(f"UPDATE lessons SET status = 'published' WHERE id = '{a['lid']}' AND status <> 'published';")
    A("")

A("-- ============================================================================")
A(f"-- §7 RETITLES — {len(retitles)} rows renamed to the old-page title (nav truth). In every")
A("--    case the CURRENT DB title appears on no old page (safe — nothing demands it).")
A("-- ----------------------------------------------------------------------------")
for a in retitles:
    old_esc = a["old_title"].replace("'", "''")
    new_esc = a["new_title"].replace("'", "''")
    A(f"-- {a['ev']}")
    A(f"UPDATE lessons SET title = '{new_esc}' WHERE id = '{a['lid']}' AND title = '{old_esc}';")
    A("")

A("-- ============================================================================")
A(f"-- §8 INSERTS — {len(inserts)} never-matched old rows with full data + external media.")
A("-- ----------------------------------------------------------------------------")
for a in inserts:
    t = a["title"].replace("'", "''")
    rid = f"'{a['rabbi_id']}'" if a["rabbi_id"] else "NULL"
    au = f"'{a['audio']}'" if a.get("audio") else "NULL"
    vi = f"'{a['video']}'" if a.get("video") else "NULL"
    A(f"-- {a['ev']}")
    A(f"INSERT INTO lessons (id,title,rabbi_id,series_id,audio_url,video_url,source_type,status,audience_tags)")
    A(f"SELECT gen_random_uuid(),'{t}',{rid},'{a['tgt']}',{au},{vi},")
    A(f"  '{'audio' if a.get('audio') else ('video' if a.get('video') else 'text')}','published',ARRAY['general']")
    A(f"WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE series_id = '{a['tgt']}' AND title = '{t}');")
    A("")

# lesson_count sync
touched = sorted({a["tgt"] for a in moves + copies if a.get("tgt")} |
                 {LESSONS[a["lid"]]["series_id"] for a in demotes + publishes if a["lid"] in LESSONS} |
                 {a["tgt"] for a in inserts} |
                 {next(l["series_id"] for l in LESSONS.values() if l["id"] == a["lid"]) for a in moves})
A("-- ============================================================================")
A("-- §9 lesson_count SYNC for every series touched above (incl. move sources).")
A("-- ----------------------------------------------------------------------------")
ids = ",\n  ".join(f"'{t}'" for t in touched)
A("UPDATE series s SET lesson_count = (")
A("  SELECT count(*) FROM lessons l WHERE l.series_id = s.id AND l.status = 'published')")
A(f"WHERE s.id IN (\n  {ids}\n);")
A("")
A("-- ============================================================================")
A("-- VERIFICATION (read-only, run after apply)")
A("-- v1: 5 twins reparented — expect 0")
A(f"SELECT count(*) AS v1_twins_still_at_root FROM series WHERE id IN ({', '.join(chr(39)+a['sid']+chr(39) for a in reparents)}) AND parent_id = 'a0472c9f-8212-44ff-8937-ace5fea4b4dc';")
A("-- v2: copies landed — expect " + str(len(copies)))
srcs = ", ".join(f"('{a['src']}','{a['tgt']}')" for a in copies)
if copies:
    A(f"SELECT count(*) AS v2_copies FROM (VALUES {srcs}) AS w(src,tgt)")
    A("WHERE EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = w.src::uuid AND c.series_id = w.tgt::uuid)")
    A("   OR EXISTS (SELECT 1 FROM lessons h WHERE h.id = w.src::uuid AND h.series_id = w.tgt::uuid);")
A("-- v3: demotes hidden — expect 0 published")
if demotes:
    A(f"SELECT count(*) AS v3_demotes_still_published FROM lessons WHERE id IN ({', '.join(chr(39)+a['lid']+chr(39) for a in demotes)}) AND status = 'published';")

with open(os.path.join(HERE, "ROUND3-missing.sql"), "w", encoding="utf-8") as f:
    f.write("\n".join(SQL) + "\n")
n_stmts = sum(1 for l in SQL if l.startswith(("UPDATE", "INSERT", "SELECT count")))
print(f"\nwrote fixes/ROUND3-missing.sql ({n_stmts} statements: {len(reparents)} reparents, "
      f"{len(moves)} moves, {len(copies)} copies, {len(sorts)} sorts, {len(demotes)} demotes, "
      f"{len(publishes)} publishes, {len(retitles)} retitles, {len(inserts)} inserts)")

with open(os.path.join(HERE, "r3_scrape_queue.jsonl"), "w", encoding="utf-8") as f:
    seen = set()
    for s in scrape_pending:
        if s["lesson_id"] in seen:
            continue
        seen.add(s["lesson_id"])
        f.write(json.dumps(s, ensure_ascii=False) + "\n")
print(f"wrote fixes/r3_scrape_queue.jsonl ({len(seen)} unique insert-op drafts pending the scrape queue)")

with open(os.path.join(HERE, "r3_yoav_list.json"), "w", encoding="utf-8") as f:
    json.dump(yoav, f, ensure_ascii=False, indent=1)
print(f"wrote fixes/r3_yoav_list.json ({len(yoav)} items)")
print("\nrefined sub-classes:", json.dumps(dict(refined), ensure_ascii=False, indent=1))
for k, v in report_notes.items():
    print(f"note[{k}]:", v[:3])

# ---------------------------------------------------------------- gains estimation
TWIN_URLS = {
    "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/מלכים-ב/שיעורים-קצרים-קריאה-וביאור-ספר-מלכים-ב/": "flip",
    "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/יחזקאל/שיעורים-על-התנך-יחזקאל/": "flip",
    "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/ישעיהו/ישעיהו-מוקלט-ללא-טעמים/": "no-flip-51-extras",
    "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/יהושע/שיעורים-יהושע/": "flip",
    "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/ירמיהו/שיעורים-על-התנך-ירמיהו/": "flip",
}
FIXED_PAGES = {
    "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/",
    "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/הפטרות/הפטרות-שמות/מאמרים-הפטרות-ספר-שמות/",
    "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים-כלליים-בתנך/מלחמת-גוג-ומגוג/",
    "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/",
    "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/",
    "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/",
}
HOWTO_URL = "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/"
pending_ids = {s["lesson_id"] for s in scrape_pending}
retitled_ids = {a["lid"] for a in retitles}
published_ids = {a["lid"] for a in publishes}
copied_pairs = {(a["src"], a["tgt"]) for a in copies}
moved_ids = {a["lid"] for a in moves}

def route(o):
    if o["class"] == "ALIAS_PAGE_CODE":
        return "code-alias"
    if o["url"] in TWIN_URLS:
        return "sql"
    if o["url"] in FIXED_PAGES:
        mlid = o.get("matched_lesson_id")
        if mlid and ((mlid, o["sid"]) in copied_pairs or mlid in moved_ids):
            return "sql"
        cands = lessons_by_norm_title.get(o["key"], [])
        if any(c["id"] in moved_ids or (c["id"], o["sid"]) in copied_pairs for c in cands):
            return "sql"
        if any(c["id"] in pending_ids for c in cands):
            return "scrape-queue"
        if mlid and mlid in pending_ids:
            return "scrape-queue"
        return "yoav"
    if o["class"] == "OP_MISSING" and o["url"] == HOWTO_URL:
        return "match-artifact"
    if o["class"] == "TITLE_DRIFT":
        return "sql" if (o.get("matched_lesson_id") in retitled_ids) else "yoav"
    if o["class"] == "APPLIED_BUT_FILTERED":
        if o.get("filtered_row") in published_ids:
            return "sql"
        if o.get("filtered_row") in pending_ids:
            return "scrape-queue"
        return "code-chunk-cap" if o.get("filter_why") == ["in-scope-but-not-rendered(?)"] else "yoav"
    if o["class"] == "DEFERRED_LOW":
        return "sql"
    if o["class"] in ("NEVER_MATCHED", "APPLIED_BUT_NO_ROW", "OP_MISSING"):
        mlid = o.get("matched_lesson_id")
        if mlid and mlid in pending_ids:
            return "scrape-queue"
        cands = lessons_by_norm_title.get(o["key"], [])
        if any(c["id"] in pending_ids for c in cands):
            return "scrape-queue"
        for p in o.get("ops", []):
            if p["op"] == "insert_lesson":
                lid = det_uuid(p["op_id"])
                if lid in pending_ids:
                    return "scrape-queue"
        if mlid and ((mlid, o["sid"]) in copied_pairs):
            return "sql"
        return "yoav"
    return "yoav"

routes = Counter()
page_routes = defaultdict(Counter)
for o in occurrences:
    r = route(o)
    o["fix_route"] = r
    routes[r] += 1
    page_routes[o["url"]][r] += 1

print("\nFIX ROUTING (1290 occurrences):")
for k, v in routes.most_common():
    print(f"  {k:18s} {v}")

flips_now, flips_after_queue = [], []
for url, rc in page_routes.items():
    if url in TWIN_URLS:
        if TWIN_URLS[url] == "flip":
            flips_now.append(url)
        continue
    if url not in pure_missing:
        continue
    if set(rc) <= {"sql"}:
        flips_now.append(url)
    elif set(rc) <= {"sql", "scrape-queue"}:
        flips_after_queue.append(url)

sec_route = defaultdict(Counter)
for o in occurrences:
    sec_route[o["section"]][o["fix_route"]] += 1

est = {
    "routes": dict(routes),
    "flips_now": sorted(flips_now),
    "flips_after_queue": sorted(flips_after_queue),
    "by_section_routes": {k: dict(v) for k, v in sec_route.items()},
    "pure_missing_pages": len(pure_missing & {o["url"] for o in occurrences}),
}
with open(os.path.join(HERE, "r3_gains_estimate.json"), "w", encoding="utf-8") as f:
    json.dump(est, f, ensure_ascii=False, indent=1)
print(f"\nexpected page flips NOW: {len(flips_now)}")
for u in sorted(flips_now):
    print("   +", u.replace("https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים", ""))
print(f"expected additional flips after scrape queue: {len(flips_after_queue)}")
for u in sorted(flips_after_queue):
    print("   ~", u.replace("https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים", ""))
print("wrote fixes/r3_gains_estimate.json")
