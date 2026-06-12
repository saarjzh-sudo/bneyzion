#!/usr/bin/env python3
"""
merge_check.py — cross-plan conflict detector for the bneyzion 1:1 parity plans.
READ-ONLY: reads plans/*.json, writes plans/merge_report.json + prints a summary.

Conflict classes
  A  move-move        same lesson_id, contradictory move_lesson targets
  B  reparent-reparent same series_id, contradictory new_parent_ref
  C  series-sort      same series_id, different set_series_sort values (single column!)
  D  draft-vs-use     lesson drafted in one plan, actively used (sort/copy/move/link/rpi) in another
  E  publish-vs-draft publish_lesson + draft_lesson on the same lesson
  F  merge-cycles     merge_rabbi / merge_topic from→into graph cycles or chains onto merged-away ids
  G  lesson-sort-contradiction same (lesson_id, series scope) different sort values
  H  lesson-sort-collision     same (series scope, sort value) different lessons
  I  topic-sort-collision      same (topic scope, sort value) different lessons / series
  J  rpi-collision             rabbi_page_items same (rabbi, sort) different items; + duplicate items
  K  insert-dup       insert_lesson duplicated across plans (same normalized old_url, or title+rabbi+series)
  L  retag-conflict   same lesson, different audience_tags targets
  M  lesson-rabbi-conflict  same lesson, different set_lesson_rabbi names
  N  series-rabbi-conflict  same series, different set_series_rabbi ids
  O  update-series-conflict same series+field, different values
  P  create-series-dup      same normalized title+parent created in >1 plan
  Q  tli-collision          teacher_listing_items same (scope,key,sort) different items
  S  demote-vs-structure    demote_series vs tree_plan/book-plan active ops on same series

Scope semantics (NOT conflicts):
  lessons.sort_order is applied per-(lesson,row-in-series): a set_lesson_sort whose series_ref
  differs from the lesson's home series targets the COPY row created by copy_lesson into that
  series. lesson_topics.sort_order is per topic; rabbi_page_items.sort_order per rabbi;
  teacher_listing_items.sort_order per (scope,key). Cross-scope same-number = fine.
"""
import json, re, sys, unicodedata
from collections import defaultdict, Counter
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
PLANS = BASE / "plans"

# priority: lower = wins. tree wins structure; book plans win lesson placement;
# topic/rabbi/teacher plans are copy/link-semantics consumers.
PLAN_PRIORITY = {
    "tree_plan": 0,
    "lessons_plan_torah": 1,
    "lessons_plan_ketuvim": 2,
    "lessons_plan_neviim_rishonim": 2.5,   # forward-compat: plan being regenerated 12.6
    "lessons_plan_neviim_aharonim": 3,
    "lessons_plan_moadim_misc": 4,
    "topics_plan": 5,
    "rabbis_plan": 6,
    "teachers_plan": 7,
}
BOOK_PLANS = {"lessons_plan_torah", "lessons_plan_ketuvim", "lessons_plan_neviim_rishonim",
              "lessons_plan_neviim_aharonim", "lessons_plan_moadim_misc"}

NIQQUD = re.compile(r"[֑-ׇ]")
PUNCT = re.compile(r"[׳״\"'`|–\-]+")

def normalize_he(s):
    if not s: return ""
    s = unicodedata.normalize("NFC", str(s))
    s = NIQQUD.sub("", s)
    s = PUNCT.sub(" ", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s

def norm_url(u):
    if not u: return ""
    from urllib.parse import unquote
    u = unquote(str(u))
    u = u.replace("https://www.bneyzion.co.il", "").replace("http://www.bneyzion.co.il", "")
    u = u.rstrip("/").strip()
    return unicodedata.normalize("NFC", u).lower()

def get_old_url(op):
    pay = op.get("payload") or {}
    return (op.get("old_url") or op.get("source_old_url")
            or pay.get("old_url") or pay.get("source_old_url")
            or (op.get("evidence") or {}).get("old_url") or "")

def get_tmp_id(op):
    pay = op.get("payload") or {}
    return op.get("tmp_id") or pay.get("tmp_id")

def ref_str(v):
    if isinstance(v, dict):
        if v.get("tmp_id"): return "tmp:" + str(v["tmp_id"])
        if v.get("old_url"): return "oldurl:" + norm_url(v["old_url"])
        if v.get("canonical_old_url"):
            return "oldref:" + norm_url(v["canonical_old_url"]) + "::" + normalize_he(v.get("title"))
        return json.dumps(v, ensure_ascii=False)
    return str(v)

def lesson_key(op):
    """Stable identity of the lesson a lesson-op refers to (uuid / tmp ref / old ref)."""
    v = op.get("lesson_id") or op.get("lesson_ref") or op.get("lesson_tmp_ref") \
        or op.get("lesson_ref_old")
    return ref_str(v) if v is not None else "?"

def series_key(op):
    v = op.get("series_id") or op.get("series_ref") or op.get("series_tmp_ref")
    return ref_str(v) if v is not None else "?"

def main():
    plans = {}
    for f in sorted(PLANS.glob("*.json")):
        if f.name == "merge_report.json": continue
        name = f.stem
        plans[name] = json.load(open(f))

    totals = {}
    for name, d in plans.items():
        totals[name] = dict(Counter(o.get("op") for o in d.get("ops", [])))
        totals[name]["_ops_total"] = len(d.get("ops", []))
        totals[name]["_yoav_review"] = len(d.get("yoav_review", []))
        totals[name]["_code_asks"] = len(d.get("code_asks", []))

    # tagged op stream: (plan, idx, op)
    stream = []
    for name, d in plans.items():
        for i, o in enumerate(d.get("ops", [])):
            stream.append((name, i, o))

    conflicts = []
    def add(cls, key, items, resolution, note=""):
        conflicts.append({
            "class": cls, "key": key,
            "items": [{"plan": p, "idx": i, "op": o.get("op"),
                       "summary": {k: ref_str(v)[:120] for k, v in o.items()
                                   if k in ("lesson_id","series_id","to_series_ref","series_ref",
                                            "new_parent_ref","sort_order","rabbi_id","rabbi_name",
                                            "topic_ref","topic_id","audience_tags","status","kind",
                                            "from_id","into_id","field","value","scope","key","reason")}}
                      for p, i, o in items],
            "resolution": resolution, "note": note})

    # ---------- A: move-move ----------
    moves = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") == "move_lesson":
            moves[str(o.get("lesson_id"))].append((p, i, o))
    n_move_pairs = 0
    for lid, lst in moves.items():
        targets = {ref_str(o.get("to_series_ref")) for _, _, o in lst}
        if len(targets) > 1:
            n_move_pairs += 1
            lst_sorted = sorted(lst, key=lambda t: PLAN_PRIORITY.get(t[0], 99))
            winner = lst_sorted[0]
            losers = lst_sorted[1:]
            res = (f"WINNER move from {winner[0]} (priority: book-page plan owns series_id). "
                   + "; ".join(f"{p}: convert move→copy_lesson (same target, keeps its sort scope)"
                               for p, _, _ in losers if p not in BOOK_PLANS)
                   + ("" if all(p in BOOK_PLANS or p == winner[0] for p, _, _ in losers)
                      else ""))
            # book-vs-book contradictory homes are real conflicts; book-vs-link-plan is policy
            if all(p in BOOK_PLANS for p, _, _ in lst_sorted):
                res = (f"Two book plans claim different homes. WINNER {winner[0]} (fixed priority "
                       f"torah>ketuvim>neviim>moadim); losers convert move→copy_lesson.")
            add("A.move-move", lid, lst, res)

    # ---------- B: reparent-reparent ----------
    reps = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") == "reparent_series":
            reps[str(o.get("series_id"))].append((p, i, o))
    for sid, lst in reps.items():
        tg = {ref_str(o.get("new_parent_ref")) for _, _, o in lst}
        if len(tg) > 1:
            lst_sorted = sorted(lst, key=lambda t: PLAN_PRIORITY.get(t[0], 99))
            add("B.reparent-reparent", sid, lst,
                f"WINNER {lst_sorted[0][0]} (tree_plan wins structure; else book-plan priority). Drop others.")

    # ---------- C: series-sort column conflict ----------
    ssort = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") == "set_series_sort":
            ssort[str(o.get("series_id"))].append((p, i, o))
    for sid, lst in ssort.items():
        distinct = {str(o.get("sort_order")) for _, _, o in lst}
        if len(distinct) > 1:
            lst_sorted = sorted(lst, key=lambda t: (PLAN_PRIORITY.get(t[0], 99), t[1]))
            plans_involved = {p for p, _, _ in lst}
            if len(plans_involved) == 1:
                add("C.series-sort-crosslist", sid, lst,
                    f"Same plan, same series, two page positions (series cross-listed on two old "
                    f"pages). series.sort_order is ONE column → FIRST op wins (canonical home page "
                    f"is emitted first); the other position is page-membership only, served by the "
                    f"page's own card list, not by sort_order. No data loss.")
            else:
                add("C.series-sort", sid, lst,
                    f"series.sort_order is ONE column. WINNER {lst_sorted[0][0]} "
                    f"(tree_plan band 1..99 is sidebar-authoritative; book-plan page order is "
                    f"expressed by the same value only when tree_plan is silent). Drop later values.")

    # ---------- usage maps for D/E ----------
    drafted = defaultdict(list)
    published = defaultdict(list)
    used = defaultdict(list)   # lesson actively placed/sorted/linked
    for p, i, o in stream:
        t = o.get("op"); lid = str(o.get("lesson_id"))
        if t == "draft_lesson": drafted[lid].append((p, i, o))
        elif t == "publish_lesson": published[lid].append((p, i, o))
        elif t in ("set_lesson_sort", "copy_lesson", "move_lesson", "link_lesson_topic",
                   "retag_lesson", "set_lesson_rabbi"):
            used[lid].append((p, i, o))
        elif t in ("rabbi_page_item", "teacher_listing_item") and o.get("lesson_id"):
            used[lid].append((p, i, o))

    for lid, dl in drafted.items():
        if lid in used:
            # same-plan draft+sort is contradictory too; cross-plan = scope found it on an old page
            usingplans = sorted({p for p, _, _ in used[lid]})
            draftplans = sorted({p for p, _, _ in dl})
            add("D.draft-vs-use", lid, dl + used[lid][:4],
                f"USAGE WINS: lesson appears on an old page per {usingplans} → cancel draft_lesson "
                f"from {draftplans}; keep placement+sort ops. Log to yoav_review (draft reason was "
                f"'{(dl[0][2].get('reason') or '')[:80]}').")
    for lid, pl in published.items():
        if lid in drafted:
            add("E.publish-vs-draft", lid, pl + drafted[lid],
                "publish_lesson WINS (old public site displays the row); drop draft_lesson.")

    # ---------- F: merge cycles / chains ----------
    for kind in ("merge_rabbi", "merge_topic"):
        edges = {}
        ops_by_from = {}
        for p, i, o in stream:
            if o.get("op") == kind:
                edges[str(o.get("from_id"))] = str(o.get("into_id"))
                ops_by_from[str(o.get("from_id"))] = (p, i, o)
        # cycle detect
        for start in list(edges):
            seen = [start]; cur = start
            while cur in edges:
                cur = edges[cur]
                if cur in seen:
                    add("F.merge-cycle", "->".join(seen + [cur]),
                        [ops_by_from[s] for s in seen if s in ops_by_from],
                        "Break cycle: keep the edge from the highest-priority plan, drop the rest.")
                    break
                seen.append(cur)
        # chain into merged-away id (into_id itself merged elsewhere) — needs re-pointing
        for frm, into in edges.items():
            if into in edges:
                p, i, o = ops_by_from[frm]
                add("F.merge-chain", f"{frm}->{into}->{edges[into]}", [ops_by_from[frm], ops_by_from[into]],
                    f"Re-point: merge {frm} directly into terminal {edges[into]} at apply time.")

    # ---------- G/H: lesson sort scopes ----------
    lsort = defaultdict(list)   # (lesson, scope) -> ops
    scope_slot = defaultdict(list)  # (scope, sort) -> ops
    for p, i, o in stream:
        if o.get("op") == "set_lesson_sort":
            scope = ref_str(o.get("series_ref") or o.get("series_id") or "?")
            lsort[(lesson_key(o), scope)].append((p, i, o))
            scope_slot[(scope, str(o.get("sort_order")))].append((p, i, o, lesson_key(o)))
        # inline sort on move/copy participates in the same scope
        elif o.get("op") in ("move_lesson", "copy_lesson") and o.get("sort_order") is not None:
            scope = ref_str(o.get("to_series_ref"))
            lsort[(lesson_key(o), scope)].append((p, i, o))
            scope_slot[(scope, str(o.get("sort_order")))].append((p, i, o, lesson_key(o)))

    g_n = h_n = 0
    g_samples, h_samples = [], []
    for (lid, scope), lst in lsort.items():
        vals = {str(o.get("sort_order")) for _, _, o in lst}
        if len(vals) > 1:
            g_n += 1
            if len(g_samples) < 25:
                lst_sorted = sorted(lst, key=lambda t: PLAN_PRIORITY.get(t[0], 99))
                add("G.lesson-sort-contradiction", f"{lid}@{scope[:50]}", lst,
                    f"WINNER {lst_sorted[0][0]} (book plan owns the page order of its scope; "
                    f"plan priority tie-break). Drop later values.")
                g_samples.append(lid)
    for (scope, so), lst in scope_slot.items():
        lids = {lk for _, _, _, lk in lst}
        if len(lids) > 1:
            h_n += 1
            if len(h_samples) < 25:
                add("H.lesson-sort-collision", f"{scope[:50]}#{so}", [(p, i, o) for p, i, o, _ in lst],
                    "Same scope, same slot, different lessons: apply stage re-packs the scope "
                    "sequentially ordered by (sort_order, plan priority, op index) — relative "
                    "order preserved, absolute numbers re-issued.")
                h_samples.append(scope)

    # ---------- I: topic sorts ----------
    tslot = defaultdict(list)
    tdup = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") in ("link_lesson_topic", "link_series_topic"):
            topic = ref_str(o.get("topic_ref") or o.get("topic_id"))
            kindkey = "L:" + lesson_key(o) if o.get("op") == "link_lesson_topic" \
                      else "S:" + series_key(o)
            tslot[(topic, str(o.get("sort_order")), o.get("op"))].append((p, i, o, kindkey))
            tdup[(topic, kindkey)].append((p, i, o))
    for (topic, so, t), lst in tslot.items():
        keys = {k for _, _, _, k in lst}
        if len(keys) > 1:
            add("I.topic-sort-collision", f"{topic[:40]}#{so}#{t}",
                [(p, i, o) for p, i, o, _ in lst],
                "Re-pack per topic at apply (sort_order, op index). Interleave of lesson+series "
                "cards uses a shared ladder — series_topics and lesson_topics numbers may "
                "legitimately interleave; only same-table duplicates are re-packed.")
    for (topic, kk), lst in tdup.items():
        if len(lst) > 1:
            add("I.topic-link-dup", f"{topic[:40]}::{kk[:60]}", lst,
                "Duplicate link rows → keep first (topics_plan is the only owner of lesson_topics; "
                "if cross-plan, keep topics_plan row), dedup at apply on (topic_id, lesson_id).")

    # ---------- J: rabbi_page_items ----------
    rslot = defaultdict(list); rdup = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") == "rabbi_page_item":
            rid = str(o.get("rabbi_id"))
            tgt = ref_str(o.get("series_id") or o.get("lesson_id") or o.get("series_ref")
                          or o.get("lesson_ref") or "?")
            rslot[(rid, str(o.get("sort_order")))].append((p, i, o, tgt))
            rdup[(rid, o.get("kind"), tgt)].append((p, i, o))
    for (rid, so), lst in rslot.items():
        tgts = {t for _, _, _, t in lst}
        if len(tgts) > 1 and so not in ("None", "null"):
            add("J.rpi-sort-collision", f"{rid}#{so}", [(p, i, o) for p, i, o, _ in lst],
                "Re-pack per rabbi at apply: rabbis_plan rows keep their ladder; rows from other "
                "plans (qa inserts, teachers creators) append after max(sort_order) preserving "
                "their relative order.")
    for (rid, kind, tgt), lst in rdup.items():
        if len(lst) > 1:
            add("J.rpi-dup", f"{rid}/{kind}/{tgt[:40]}", lst,
                "Duplicate rabbi_page_items row → keep the rabbis_plan one (page owner), drop others; "
                "unique index (rabbi_id,kind,coalesce(series_id,lesson_id)) enforces at apply.")

    # ---------- K: insert duplicates ----------
    ins_by_url = defaultdict(list); ins_by_sig = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") == "insert_lesson":
            u = norm_url(get_old_url(o))
            pay = o.get("payload") or {}
            sig = (normalize_he(pay.get("title")), normalize_he(pay.get("rabbi_name")))
            if u: ins_by_url[u].append((p, i, o))
            if sig[0]: ins_by_sig[sig].append((p, i, o))
    k_seen = set()
    for u, lst in ins_by_url.items():
        if len(lst) > 1:
            lst_sorted = sorted(lst, key=lambda t: PLAN_PRIORITY.get(t[0], 99))
            k_seen.update((p, i) for p, i, _ in lst)
            add("K.insert-dup-url", u[:100], lst,
                f"ONE physical insert: keep {lst_sorted[0][0]}'s payload (highest priority / richest "
                f"payload); remap losers' tmp_ids → winner tmp_id so their rpi/link/sort ops resolve "
                f"to the single new row.")
    for sig, lst in ins_by_sig.items():
        if len(lst) > 1 and not all((p, i) in k_seen for p, i, _ in lst):
            # only flag cross-plan same title+rabbi if series_ref also same → likely dup
            srs = {ref_str((o.get("payload") or {}).get("series_ref")) for _, _, o in lst}
            if len(srs) == 1:
                add("K.insert-dup-sig", f"{sig[0][:60]}::{sig[1][:30]}", lst,
                    "Same title+rabbi+series across plans with different old_urls — review; default "
                    "keep highest-priority plan's insert, remap tmp ids; flag to yoav_review.")

    # ---------- L: retag ----------
    ret = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") == "retag_lesson":
            ret[str(o.get("lesson_id"))].append((p, i, o))
    for lid, lst in ret.items():
        tags = {json.dumps(sorted(o.get("audience_tags") or []), ensure_ascii=False) for _, _, o in lst}
        if len(tags) > 1:
            allt = sorted({t for _, _, o in lst for t in (o.get("audience_tags") or [])})
            add("L.retag-conflict", lid, lst,
                f"UNION the tags → {allt}: lesson appears on BOTH old wings (dual-audience). "
                f"Requires the dual-audience public filter fix (CODE-SPEC §audience). "
                f"If union would be teachers-only vs general-only contradiction → public wins + yoav_review.")

    # ---------- M / N ----------
    lr = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") == "set_lesson_rabbi":
            lr[str(o.get("lesson_id"))].append((p, i, o))
    for lid, lst in lr.items():
        names = {normalize_he(o.get("rabbi_name")) for _, _, o in lst}
        if len(names) > 1:
            lst_sorted = sorted(lst, key=lambda t: PLAN_PRIORITY.get(t[0], 99))
            add("M.lesson-rabbi-conflict", lid, lst,
                f"WINNER {lst_sorted[0][0]} (book page shows the attribution in context); "
                f"flag to yoav_review.")
    sr = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") == "set_series_rabbi":
            sr[series_key(o)].append((p, i, o))
    for sid, lst in sr.items():
        ids = {str(o.get("rabbi_id")) for _, _, o in lst}
        if len(ids) > 1:
            lst_sorted = sorted(lst, key=lambda t: PLAN_PRIORITY.get(t[0], 99))
            add("N.series-rabbi-conflict", sid, lst,
                f"WINNER {lst_sorted[0][0]}; flag to yoav_review.")

    # ---------- O: update_series field conflicts ----------
    us = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") == "update_series":
            for f, v in (o.get("fields") or {}).items():
                us[(str(o.get("series_id")), f)].append((p, i, o, json.dumps(v, ensure_ascii=False)))
    for (sid, f), lst in us.items():
        vals = {v for _, _, _, v in lst}
        if len(vals) > 1:
            lst_sorted = sorted(lst, key=lambda t: PLAN_PRIORITY.get(t[0], 99))
            add("O.update-series-conflict", f"{sid}.{f}", [(p, i, o) for p, i, o, _ in lst],
                f"WINNER {lst_sorted[0][0]} (tree_plan wins structure/status). Drop later values.")

    # also demote vs update/sort (S)
    dem = {}
    for p, i, o in stream:
        if o.get("op") == "demote_series":
            dem[str(o.get("series_id"))] = (p, i, o)
    for sid, (p, i, o) in dem.items():
        others = [(p2, i2, o2) for p2, i2, o2 in stream
                  if p2 != p and o2.get("op") in ("set_series_sort", "update_series", "reparent_series",
                                                  "set_series_rabbi")
                  and str(o2.get("series_id")) == sid]
        if others:
            add("S.demote-vs-structure", sid, [(p, i, o)] + others[:4],
                "tree_plan structural ops win over demote unless tree_plan itself hides the node; "
                "if winner keeps it visible → drop demote + yoav_review (duplicate-series call).")

    # ---------- P: create_series duplicates ----------
    cs = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") == "create_series":
            key = (normalize_he(o.get("title")), ref_str(o.get("parent_ref"))[:60])
            cs[key].append((p, i, o))
    # also same title anywhere (parent refs differ in representation)
    cs_title = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") == "create_series":
            cs_title[normalize_he(o.get("title"))].append((p, i, o))
    flagged = set()
    for key, lst in cs.items():
        if len(lst) > 1:
            lst_sorted = sorted(lst, key=lambda t: PLAN_PRIORITY.get(t[0], 99))
            flagged.add(key[0])
            add("P.create-series-dup", key[0][:60], lst,
                f"ONE create: keep {lst_sorted[0][0]}'s; remap losers' tmp_ids.")
    for title, lst in cs_title.items():
        if len(lst) > 1 and title not in flagged:
            add("P.create-series-title-dup", title[:60], lst,
                "Same new-series title in >1 plan with different parent representation — verify "
                "same target; if same old node → single create, remap tmp_ids; else keep both.")

    # ---------- Q: teacher_listing_items ----------
    tli = defaultdict(list)
    for p, i, o in stream:
        if o.get("op") == "teacher_listing_item":
            tli[(o.get("scope"), o.get("key"), str(o.get("sort_order")))].append(
                (p, i, o, str(o.get("series_id") or o.get("lesson_id"))))
    for k, lst in tli.items():
        tg = {t for _, _, _, t in lst}
        if len(tg) > 1:
            add("Q.tli-collision", "/".join(str(x) for x in k), [(p, i, o) for p, i, o, _ in lst],
                "Re-pack per (scope,key) ladder at apply.")

    by_class = Counter(c["class"] for c in conflicts)
    report = {
        "totals_per_plan": totals,
        "conflict_counts_by_class": dict(by_class),
        "conflicts_total": len(conflicts),
        "uncapped_counts": {
            "G.lesson-sort-contradiction_total": g_n,
            "H.lesson-sort-collision_total": h_n,
        },
        "conflicts": conflicts,
    }
    out = PLANS / "merge_report.json"
    json.dump(report, open(out, "w"), ensure_ascii=False, indent=1)
    print("== totals per plan ==")
    for n, t in totals.items():
        print(f"  {n}: ops={t['_ops_total']} yoav={t['_yoav_review']} code_asks={t['_code_asks']}")
    print("== conflicts by class ==")
    for k, v in sorted(by_class.items()):
        print(f"  {k}: {v}")
    print(f"TOTAL conflict records: {len(conflicts)} (G uncapped {g_n}, H uncapped {h_n})")
    print(f"wrote {out}")

if __name__ == "__main__":
    main()
