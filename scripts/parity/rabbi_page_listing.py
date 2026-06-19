#!/usr/bin/env python3
"""
rabbi_page_listing.py — rebuild rabbi_page_items 1:1 from the OLD public rav pages.

Ground truth: oneone/old_rabbi_pages.json — for each of 154 rabbis an ORDERED items[]
list, exactly as the old public rav page shows. Each old item:
    {order_index, item_type ∈ שיעור|סדרה|שו"ת, title_norm, href, media,
     attachment_href / attachment_hrefs, series_lesson_count}

For every rabbi:
  1. map name → rabbi_id (rb_norm via the rabbis table).
  2. resolve each ordered old item → a DB entity, kept in OLD order:
       סדרה  → series  : norm-title match, prefer this-rabbi → lesson_count≈slc → richest.  kind=series
       שיעור → lessons : media-basename golden key first, else norm-title prefer this-rabbi.  kind=lesson
       שו"ת  → lessons : norm-title prefer this-rabbi (qa items rarely carry audio).          kind=qa
  3. emit ordered rpi rows (sort_order = order_index+1), dedup ids, DROP empty lessons.
  4. verify-before-apply: resolution rate + emit≈old; only --apply when healthy.
  5. apply: snapshot once, DELETE rpi (sort_order<9000) for the rabbi, INSERT the 1:1 set.
     Parked rows (sort_order>=9000, kept for audit) are preserved.

RabbiPage renders rabbi_page_items (sort_order<9000) ordered → so this is data-only, NO deploy.
Pools are pre-loaded (a handful of paginated SELECTs) — respects the management-API throttle rule.

Usage:
  python3 rabbi_page_listing.py                       # dry-run ALL → plan json + summary
  python3 rabbi_page_listing.py --rabbi "מנחם שחור"    # dry-run one rabbi (verbose)
  python3 rabbi_page_listing.py --apply               # apply every healthy rabbi
  python3 rabbi_page_listing.py --rabbi "..." --apply  # apply one
  python3 rabbi_page_listing.py --min-res 0.8         # health threshold (default 0.8)
"""
import sys, os, json, re, time, argparse, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
from teachers_reconcile import norm, esc
from fix_lesson_rabbis import rb_norm

SNAP = "rabbi_page_items_bak_l4_20260619"
RESOLVABLE = ("שיעור", "סדרה", 'שו"ת')


def q(sql, _tries=8):
    """Resilient SQL — retry any transient infra error with backoff, never crash a long run."""
    last = ""
    for i in range(_tries):
        out = sbq.run(sql)
        try:
            d = json.loads(out)
        except Exception:
            last = (out or "")[:200]; time.sleep(1.5 * (i + 1)); continue
        if isinstance(d, dict) and d.get("message"):
            last = json.dumps(d, ensure_ascii=False)[:200]; time.sleep(1.5 * (i + 1)); continue
        return d
    print("   [q] gave up:", last)
    return None  # distinguishes infra failure from a legit empty []


def basename(u):
    """Canonical media basename: unquote, strip query, lowercase last path segment."""
    if not u:
        return None
    return urllib.parse.unquote(u.split("?")[0].split("/")[-1]).strip().lower()


def attachments(it):
    out = []
    a = it.get("attachment_href")
    if a:
        out.append(a)
    for a in (it.get("attachment_hrefs") or []):
        if a not in out:
            out.append(a)
    return out


# ─── pools ────────────────────────────────────────────────────────────────────

def load_rabbi_map():
    rows = q("SELECT id, name, slug FROM rabbis") or []
    by = {}
    for r in rows:
        by.setdefault(rb_norm(r["name"]), []).append(r)
    return by


def load_series_pool():
    # include 'category' status: legit non-empty series (e.g. "בין יהושפט לאחאב", 6 lessons)
    # that the old rav page shows and RabbiPage renders fine (it joins series by id, not status).
    rows = q("""SELECT s.id, s.title, s.rabbi_id, s.lesson_count, s.status,
                       (s.audience_tags @> ARRAY['teachers']) AS is_teacher,
                       (s.audience_tags @> ARRAY['general'])  AS is_general
                FROM series s WHERE s.status IN ('active','published','category')""") or []
    idx = {}
    for r in rows:
        idx.setdefault(norm(r["title"]), []).append(r)
    return idx


def load_lesson_pools():
    """media-basename index + norm-title index over all published lessons (paginated)."""
    media_idx, title_idx = {}, {}
    by_id = {}
    off, page, total = 0, 6000, 0
    while True:
        rows = q(f"""SELECT id, title, rabbi_id,
                            audio_url, legacy_attachment_url, attachment_url, video_url,
                            (content IS NOT NULL AND btrim(content) <> '') AS has_content,
                            (audience_tags @> ARRAY['teachers']) AS is_teacher,
                            (audience_tags @> ARRAY['general'])  AS is_general
                     FROM lessons WHERE status='published'
                     ORDER BY id LIMIT {page} OFFSET {off}""")
        if rows is None:
            raise SystemExit(f"lesson pool load failed at offset {off}")
        if not rows:
            break
        for r in rows:
            has_media = bool(r["audio_url"] or r["video_url"] or r["legacy_attachment_url"] or r["attachment_url"])
            r["_has_media"] = has_media
            by_id[r["id"]] = r
            title_idx.setdefault(norm(r["title"]), []).append(r)
            for u in (r["audio_url"], r["legacy_attachment_url"], r["attachment_url"]):
                b = basename(u)
                if b:
                    media_idx.setdefault(b, []).append(r)
        total += len(rows); off += page
        if len(rows) < page:
            break
    return media_idx, title_idx, by_id, total


# ─── ranking ──────────────────────────────────────────────────────────────────

def rank_lessons(cands, this_rid):
    # this-rabbi → public → has-content → has-media (all "True first")
    return sorted(cands, key=lambda l: (
        l["rabbi_id"] == this_rid,
        not l["is_teacher"],
        bool(l["has_content"]),
        bool(l["_has_media"]),
    ), reverse=True)[0]


def rank_series(cands, this_rid, slc):
    def keyf(s):
        gap = abs((s.get("lesson_count") or 0) - (slc or 0))
        pub = s.get("status") in ("active", "published")  # prefer published over category on ties
        return (s["rabbi_id"] == this_rid, not s["is_teacher"], pub, -gap, s.get("lesson_count") or 0)
    return sorted(cands, key=keyf, reverse=True)[0]


# ─── resolution ───────────────────────────────────────────────────────────────

def resolve_item(it, this_rid, pools, used):
    """Resolve one old item → (kind, id). `used` (ids already emitted for THIS rabbi) is excluded
    so same-title groups (e.g. 5 distinct 'עולמות חדשים בפרשה' series) each pick a DISTINCT entity."""
    media_idx, title_idx, series_idx = pools
    typ = it.get("item_type")
    title_key = norm(it.get("title_norm") or it.get("title") or "")

    if typ == "סדרה":
        allc = series_idx.get(title_key, [])
        cands = [s for s in allc if s["id"] not in used]
        if not cands:
            return None, ("dup_series" if allc else "absent_series"), None
        s = rank_series(cands, this_rid, it.get("series_lesson_count"))
        teach = " [teacher-series]" if s["is_teacher"] and s["rabbi_id"] != this_rid else ""
        return ("series", s["id"]), f"series_title{teach}", s

    # lesson / qa → media golden key first (precise), then norm-title; both exclude used ids
    cands = []
    via = None
    for att in attachments(it):
        b = basename(att)
        if b and b in media_idx:
            cands = [l for l in media_idx[b] if l["id"] not in used]; via = "media"; break
    if not cands:
        allc = title_idx.get(title_key, [])
        cands = [l for l in allc if l["id"] not in used]; via = "title"
        if not cands and allc:
            return None, "dup_lesson", None
    if not cands:
        return None, "absent_lesson", None
    # prefer a TITLED, non-empty copy: empty/blank-title copies render as blank cards
    l = rank_lessons(cands, this_rid)
    if not l["has_content"] and not l["_has_media"]:
        return None, "empty_lesson", l
    kind = "qa" if typ == 'שו"ת' else "lesson"
    teach = " [teacher-lesson]" if l["is_teacher"] and l["rabbi_id"] != this_rid else ""
    return (kind, l["id"]), f"{via}{teach}", l


def build_rabbi(name, entry, rid, pools):
    items = [it for it in entry.get("items", []) if it.get("item_type") in RESOLVABLE]
    items.sort(key=lambda it: it.get("order_index", 0))
    rows, resolved, unresolved, flags = [], [], [], []
    used = set()
    for it in items:
        res, via, ent = resolve_item(it, rid, pools, used)
        title = it.get("title_norm") or it.get("title")
        if not res:
            # dup_series/dup_lesson = same-title group exhausted (old lists it more times than DB has)
            unresolved.append({"title": title, "type": it.get("item_type"), "reason": via})
            continue
        kind, eid = res
        used.add(eid)
        rows.append({"kind": kind,
                     "series_id": eid if kind == "series" else None,
                     "lesson_id": None if kind == "series" else eid,
                     "sort_order": len(rows) + 1})
        if "[teacher-" in via:
            flags.append({"title": title, "via": via})
        resolved.append({"title": title, "kind": kind, "via": via})
    old_n = len(items)
    res_rate = round(len(rows) / old_n, 3) if old_n else 1.0
    return {"name": name, "rabbi_id": rid, "old_n": old_n, "emitted": len(rows),
            "res_rate": res_rate, "rows": rows, "resolved": resolved,
            "unresolved": unresolved, "teacher_flags": flags}


# ─── apply ────────────────────────────────────────────────────────────────────

def ensure_snapshot():
    r = q(f"SELECT to_regclass('public.{SNAP}') AS t")
    if r and r[0].get("t"):
        return False
    q(f"CREATE TABLE {SNAP} AS SELECT * FROM rabbi_page_items;")
    return True


def apply_rabbi(plan):
    rid = plan["rabbi_id"]
    if not plan["rows"]:
        return 0
    vals = ",".join(
        f"('{rid}','{r['kind']}',"
        f"{('NULL' if r['series_id'] is None else chr(39)+r['series_id']+chr(39))},"
        f"{('NULL' if r['lesson_id'] is None else chr(39)+r['lesson_id']+chr(39))},"
        f"{r['sort_order']})"
        for r in plan["rows"])
    sql = ("BEGIN;"
           f"DELETE FROM rabbi_page_items WHERE rabbi_id='{rid}' AND sort_order<9000;"
           "INSERT INTO rabbi_page_items (rabbi_id,kind,series_id,lesson_id,sort_order) VALUES "
           + vals + ";COMMIT;")
    out = q(sql)
    if out is None:
        raise SystemExit(f"apply failed for {plan['name']}")
    return len(plan["rows"])


# ─── main ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rabbi", default=None, help="substring filter on rabbi name")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--min-res", type=float, default=0.8, help="min resolution rate to auto-apply")
    ap.add_argument("--out", default=os.path.join(HERE, "rabbi-page-listing-plan.json"))
    args = ap.parse_args()

    old = json.load(open(os.path.join(HERE, "oneone/old_rabbi_pages.json"), encoding="utf-8"))
    old_rabbis = {k: v for k, v in old.items() if not k.startswith("_")}
    if args.rabbi:
        old_rabbis = {k: v for k, v in old_rabbis.items() if args.rabbi in k}

    print(f"loading pools…  ({len(old_rabbis)} rabbis to process)")
    rmap = load_rabbi_map()
    series_idx = load_series_pool()
    media_idx, title_idx, _byid, ntot = load_lesson_pools()
    pools = (media_idx, title_idx, series_idx)
    print(f"pools: {len(series_idx)} series-titles, {ntot} lessons, {len(media_idx)} media-basenames")

    if args.apply:
        created = ensure_snapshot()
        print(f"snapshot {SNAP}: {'created' if created else 'already exists (reuse)'}")

    plans, applied, skipped, unmapped = [], 0, [], []
    for name, entry in old_rabbis.items():
        cand = rmap.get(rb_norm(name), [])
        if not cand:
            unmapped.append(name); continue
        rid = cand[0]["id"]
        p = build_rabbi(name, entry, rid, pools)
        p["slug"] = cand[0]["slug"]
        plans.append(p)
        healthy = p["res_rate"] >= args.min_res and p["emitted"] > 0
        status = "OK " if healthy else "FLAG"
        if args.apply and healthy:
            n = apply_rabbi(p); applied += 1; status = f"APL({n})"
            time.sleep(0.25)
        elif not healthy:
            skipped.append(p["name"])
        flagtxt = f" ⚑{len(p['teacher_flags'])}t" if p["teacher_flags"] else ""
        unres = f" unres={len(p['unresolved'])}" if p["unresolved"] else ""
        print(f"  {status:7s} {name[:30]:30s} old={p['old_n']:>3} emit={p['emitted']:>3} "
              f"res={p['res_rate']:.0%}{unres}{flagtxt}")
        if args.rabbi:  # verbose single-rabbi
            for u in p["unresolved"]:
                print(f"        ✗ unresolved [{u['type']}] {u['title'][:50]}  ({u['reason']})")
            for f in p["teacher_flags"]:
                print(f"        ⚑ teacher  {f['title'][:50]}  ({f['via']})")

    json.dump({"apply": args.apply, "min_res": args.min_res, "plans": plans,
               "unmapped": unmapped, "skipped_unhealthy": skipped},
              open(args.out, "w"), ensure_ascii=False, indent=1)

    healthy_n = sum(1 for p in plans if p["res_rate"] >= args.min_res and p["emitted"] > 0)
    print(f"\n=== {len(plans)} mapped | healthy={healthy_n} | flagged={len(skipped)} | "
          f"unmapped={len(unmapped)} | applied={applied} ===")
    if unmapped:
        print("UNMAPPED:", unmapped)
    if skipped:
        print("FLAGGED (res<%.0f%% or 0 emit):" % (args.min_res * 100), skipped[:30])
    print("plan →", args.out)


if __name__ == "__main__":
    main()
