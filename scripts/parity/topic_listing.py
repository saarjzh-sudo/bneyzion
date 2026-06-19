#!/usr/bin/env python3
"""
topic_listing.py (L3) — rebuild lesson_topics + series_topics 1:1 from the OLD topic pages.

Ground truth: oneone/old_topic_pages.json — 127 topics, each an ORDERED items[] list exactly as
the old public topic page shows. Item: {order_index, type ∈ lesson|series|qa, title_norm, rabbi,
rabbi_norm, href, media, attachment_hrefs:[{href}], series_lesson_count}.

For every topic:
  1. map name → topic_id (topic-manifest.json, built by build_topic_manifest.py).
  2. resolve each ordered old item → a DB entity (EXCLUDING teacher-tagged — TopicPage strict-filters
     §0.3): lesson/qa → lessons (media golden-key → norm-title, disambig by old rabbi); series → series
     (norm-title, disambig by old rabbi → lesson_count≈slc).
  3. write a UNIFIED sort_order (= order_index) across BOTH tables — TopicPage merges series_topics +
     lesson_topics by this shared order. lessons→lesson_topics, series→series_topics.
  4. replace per topic (DELETE topic rows, INSERT 1:1 set). verify-before-apply (res≥0.8).

NOTE: needs the L3 TopicPage frontend (series_topics merge) live to RENDER series rows — already coded,
pending deploy. The DATA written here is additive/safe regardless.

Usage:
  python3 topic_listing.py                      # dry-run ALL → plan + summary
  python3 topic_listing.py --topic "דוד המלך"   # dry-run one (verbose)
  python3 topic_listing.py --apply              # apply every healthy topic
  python3 topic_listing.py --min-res 0.8
"""
import sys, os, json, time, argparse, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
from teachers_reconcile import norm, esc
from fix_lesson_rabbis import rb_norm
import rabbi_page_listing as rpl  # reuse q, basename, load_rabbi_map, load_series_pool, load_lesson_pools

q = rpl.q
basename = rpl.basename
SNAP_L = "lesson_topics_bak_l3_20260619"
SNAP_S = "series_topics_bak_l3_20260619"


def attachments(it):
    """Topic items: attachment_hrefs is a list of {href:...} dicts (+ optional attachment_href str)."""
    out = []
    a = it.get("attachment_href")
    if isinstance(a, str) and a:
        out.append(a)
    for a in (it.get("attachment_hrefs") or []):
        h = a.get("href") if isinstance(a, dict) else a
        if h and h not in out:
            out.append(h)
    return out


# ─── resolution (non-teacher pools; disambiguate by the OLD item's rabbi) ──────

def _pub(e):
    """Public-appropriate = NOT teacher-EXCLUSIVE. dual-audience (teachers+general) IS public
    (Saar 15.6 + 19.6: 'what was exposed on both sides stays on both'). teacher-only stays hidden."""
    return not (e.get("is_teacher") and not e.get("is_general"))


def resolve_item(it, pools, rabbi_map, used):
    media_idx, title_idx, series_idx = pools
    typ = it.get("type")
    title_key = norm(it.get("title_norm") or it.get("title") or "")
    old_rid = None
    rcand = rabbi_map.get(rb_norm(it.get("rabbi") or "")) if it.get("rabbi") else None
    if rcand:
        old_rid = rcand[0]["id"]

    if typ == "series":
        allc = [s for s in series_idx.get(title_key, []) if _pub(s)]
        cands = [s for s in allc if s["id"] not in used]
        if not cands:
            return None, ("dup_series" if allc else "absent_series"), None
        s = rpl.rank_series(cands, old_rid, it.get("series_lesson_count"))
        return ("series", s["id"]), "series_title", s

    # lesson / qa → media golden key first, then norm-title; teacher-EXCLUSIVE excluded (dual kept)
    cands = []
    via = None
    for att in attachments(it):
        b = basename(att)
        if b and b in media_idx:
            cands = [l for l in media_idx[b] if _pub(l) and l["id"] not in used]
            via = "media"
            if cands:
                break
    if not cands:
        allc = [l for l in title_idx.get(title_key, []) if _pub(l)]
        cands = [l for l in allc if l["id"] not in used]; via = "title"
        if not cands and allc:
            return None, "dup_lesson", None
    if not cands:
        return None, "absent_lesson", None
    l = rpl.rank_lessons(cands, old_rid)
    if not l["has_content"] and not l["_has_media"]:
        return None, "empty_lesson", l
    return ("lesson", l["id"]), via, l


def build_topic(name, entry, tid, pools, rabbi_map):
    items = [it for it in entry.get("items", []) if it.get("type") in ("lesson", "series", "qa")]
    items.sort(key=lambda it: it.get("order_index", 0))
    lessons, series, unresolved = [], [], []
    used = set()
    for it in items:
        res, via, ent = resolve_item(it, pools, rabbi_map, used)
        title = it.get("title_norm") or it.get("title")
        if not res:
            unresolved.append({"title": title, "type": it.get("type"), "reason": via})
            continue
        kind, eid = res
        used.add(eid)
        so = it.get("order_index", len(used))
        if kind == "series":
            series.append({"series_id": eid, "sort_order": so})
        else:
            lessons.append({"lesson_id": eid, "sort_order": so})
    old_n = len(items)
    emitted = len(lessons) + len(series)
    res_rate = round(emitted / old_n, 3) if old_n else 1.0
    return {"name": name, "topic_id": tid, "old_n": old_n, "emitted": emitted,
            "res_rate": res_rate, "lessons": lessons, "series": series,
            "unresolved": unresolved}


# ─── apply ────────────────────────────────────────────────────────────────────

def ensure_snapshots():
    made = []
    for snap, src in ((SNAP_L, "lesson_topics"), (SNAP_S, "series_topics")):
        r = q(f"SELECT to_regclass('public.{snap}') AS t")
        if not (r and r[0].get("t")):
            q(f"CREATE TABLE {snap} AS SELECT * FROM {src};"); made.append(snap)
    return made


def apply_topic(p):
    tid = p["topic_id"]
    sql = ["BEGIN;",
           f"DELETE FROM lesson_topics WHERE topic_id='{tid}';",
           f"DELETE FROM series_topics WHERE topic_id='{tid}';"]
    if p["lessons"]:
        vals = ",".join(f"('{r['lesson_id']}','{tid}',{r['sort_order']})" for r in p["lessons"])
        sql.append("INSERT INTO lesson_topics (lesson_id,topic_id,sort_order) VALUES " + vals + ";")
    if p["series"]:
        vals = ",".join(f"('{r['series_id']}','{tid}',{r['sort_order']})" for r in p["series"])
        sql.append("INSERT INTO series_topics (series_id,topic_id,sort_order) VALUES " + vals + ";")
    sql.append("COMMIT;")
    out = q("".join(sql))
    if out is None:
        raise SystemExit(f"apply failed for {p['name']}")
    return len(p["lessons"]) + len(p["series"])


# ─── main ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--topic", default=None)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--min-res", type=float, default=0.8)
    ap.add_argument("--out", default=os.path.join(HERE, "topic-listing-plan.json"))
    args = ap.parse_args()

    old = json.load(open(os.path.join(HERE, "oneone/old_topic_pages.json"), encoding="utf-8"))
    old_topics = {k: v for k, v in old.items() if not str(k).startswith("_")}
    manifest = {m["title"]: m for m in json.load(open(os.path.join(HERE, "topic-manifest.json"), encoding="utf-8"))}
    if args.topic:
        old_topics = {k: v for k, v in old_topics.items() if args.topic in k}

    print(f"loading pools…  ({len(old_topics)} topics)")
    rabbi_map = rpl.load_rabbi_map()
    series_idx = rpl.load_series_pool()
    media_idx, title_idx, _byid, ntot = rpl.load_lesson_pools()
    pools = (media_idx, title_idx, series_idx)
    print(f"pools: {len(series_idx)} series-titles, {ntot} lessons, {len(media_idx)} media-basenames")

    if args.apply:
        made = ensure_snapshots()
        print(f"snapshots: {made or 'already exist (reuse)'}")

    plans, applied, skipped, unmapped = [], 0, [], []
    for name, entry in old_topics.items():
        m = manifest.get(name)
        if not m or not m.get("topic_id"):
            unmapped.append(name); continue
        p = build_topic(name, entry, m["topic_id"], pools, rabbi_map)
        p["slug"] = m.get("slug")
        plans.append(p)
        healthy = p["res_rate"] >= args.min_res and p["emitted"] > 0
        status = "OK " if healthy else "FLAG"
        if args.apply and healthy:
            apply_topic(p); applied += 1; status = "APL"; time.sleep(0.6)
        elif not healthy:
            skipped.append(p["name"])
        ns = sum(1 for _ in p["series"]); nl = len(p["lessons"])
        print(f"  {status:4s} {name[:26]:26s} old={p['old_n']:>3} emit={p['emitted']:>3} "
              f"(L{nl}/S{ns}) res={p['res_rate']:.0%}" + (f" unres={len(p['unresolved'])}" if p['unresolved'] else ""))
        if args.topic:
            for u in p["unresolved"][:20]:
                print(f"        ✗ [{u['type']}] {u['title'][:46]}  ({u['reason']})")

    json.dump({"apply": args.apply, "plans": plans, "unmapped": unmapped, "skipped": skipped},
              open(args.out, "w"), ensure_ascii=False, indent=1)
    healthy_n = sum(1 for p in plans if p["res_rate"] >= args.min_res and p["emitted"] > 0)
    print(f"\n=== {len(plans)} mapped | healthy={healthy_n} | flagged={len(skipped)} | "
          f"unmapped={len(unmapped)} | applied={applied} ===")
    if unmapped: print("UNMAPPED:", unmapped[:20])
    print("plan →", args.out)


if __name__ == "__main__":
    main()
