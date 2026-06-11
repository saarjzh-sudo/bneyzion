#!/usr/bin/env python3
"""
consolidate.py — populate empty event-series placeholders in נביאים from old-site ground truth.

Strategy (non-destructive, grounded, reversible — full backups exist):
  For each book, the neviim sidebar children include empty 'event' placeholders
  (draft/category, audience general) whose titles + chapter-ranges exactly mirror the
  old site (e.g. "מרד אבשלום | פרקים ט"ו-י"ח"). The actual lessons are scattered &
  DUPLICATED across rabbi/project series. We:
    1. enumerate old event pages (depth-4 crawl paths under the book) + scrape each
       → authoritative lesson list (title + rabbi).
    2. match the old event to its DB placeholder by normalized title.
    3. for each old lesson, find DB copies (normTitle + rabbi) and reassign ONE copy's
       series_id to the event placeholder — preferring a "loose" copy (orphan / aggregation /
       same-book draft) so named rabbi/project series keep a copy. Each old lesson → exactly
       one row in the event (dedup).
    4. promote populated placeholders draft/category → active, recompute lesson_count.
  Rabbi browsing (rabbi_id) and the "כל השיעורים" subtree aggregation are unaffected.

Usage:
  python3 consolidate.py --book "שמואל ב" --book-id 02539385-aaaa-4c7f-9d85-d1af6e1cdd96 [--apply]
  python3 consolidate.py --all-neviim [--apply]
"""
import sys, json, re, html, subprocess, os, argparse, unicodedata, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sbq  # reuse the curl-backed SQL helper

NEVIIM_ROOT = "a0472c9f-8212-44ff-8937-ace5fea4b4dc"
OLD_BASE = "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נביאים/"
CRAWL = os.path.join(HERE, "audit_full_state.json")

def nfc(s):
    return unicodedata.normalize("NFC", s or "")

def norm(s):
    """normalize a title/name for matching: NFC, strip quotes/gershayim/niqqud, collapse ws."""
    s = nfc(s)
    s = re.sub(r"[֑-ׇ]", "", s)          # niqqud / cantillation
    s = re.sub(r"[\"'״׳`‘’“”|]", "", s)            # quotes + pipe
    s = re.sub(r"\s+", " ", s).strip()
    return s

def q(sql):
    out = sbq.run(sql)
    try:
        d = json.loads(out)
    except Exception:
        print("SQL parse error:", out[:400]); raise
    if isinstance(d, dict) and d.get("message"):
        raise RuntimeError("SQL error: " + json.dumps(d, ensure_ascii=False)[:400])
    return d

def fetch(url):
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
        env.pop(k, None)
    env["NO_PROXY"] = "*"
    p = subprocess.run(["curl","-s","--noproxy","*","-L",url,"--max-time","60"],
                       capture_output=True, text=True, env=env, timeout=90)
    return p.stdout

LESSONBLOCK = re.compile(r'<div class="lessonBlock[^"]*">(.*?)(?=<div class="lessonBlock|<div class="lessonPromo-end|</section)', re.S)
H3A = re.compile(r'<h3>\s*<a[^>]*title="([^"]*)"[^>]*>(.*?)</a>', re.S)
AUTHOR = re.compile(r'<div class="author">\s*<a[^>]*>(.*?)</a>', re.S)

def parse_event_page(htmltext):
    """return list of {title, rabbi} from an old event page."""
    out = []
    # split by lessonBlock occurrences
    parts = htmltext.split('<div class="lessonBlock')
    for seg in parts[1:]:
        seg = seg[:4000]
        mt = H3A.search(seg)
        if not mt:
            # fallback: any <h3><a>text</a>
            m2 = re.search(r'<h3>\s*<a[^>]*>(.*?)</a>', seg, re.S)
            title = html.unescape(re.sub(r"<[^>]+>","",m2.group(1)).strip()) if m2 else None
        else:
            title = html.unescape(re.sub(r"<[^>]+>","",mt.group(2)).strip()) or html.unescape(mt.group(1).strip())
        ma = AUTHOR.search(seg)
        rabbi = html.unescape(re.sub(r"<[^>]+>","",ma.group(1)).strip()) if ma else None
        if title:
            out.append({"title": title, "rabbi": rabbi})
    return out

def book_hyphen(book):
    return book.replace(" ", "-")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True)
    ap.add_argument("--book-id", required=True)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    book, book_id = args.book, args.book_id

    # 1) event placeholders = children of book_id, audience general, NOT teacher worksheet,
    #    NOT the "כל השיעורים" aggregation. Event titles contain "|" (chapter marker) on old site.
    children = q(f"""
      SELECT id, title, status, lesson_count, audience_tags
      FROM series WHERE parent_id='{book_id}' ORDER BY title;
    """)
    events = []
    for c in children:
        tags = c.get("audience_tags") or []
        if "teachers" in tags:        # skip teacher worksheet
            continue
        if "כל השיעורים" in c["title"]:
            continue
        events.append(c)
    print(f"[{book}] {len(events)} event placeholders (of {len(children)} children)")

    # 2) enumerate old event pages from crawl (depth-4 under this book) + map by norm(h1)
    crawl = json.load(open(CRAWL))
    pages = crawl["pages"]
    bh = book_hyphen(book)
    book_path = f"/מאגר-השיעורים-והמאמרים/נביאים/{bh}/"
    old_events = {}
    for path, info in pages.items():
        if not path.startswith(book_path):
            continue
        rel = path[len(book_path):].strip("/")
        if not rel or "/" in rel:    # depth-4 only (no sub-lesson)
            continue
        h1 = info.get("h1") or rel
        old_events[norm(h1)] = {"path": path, "h1": h1}
    print(f"[{book}] {len(old_events)} old depth-4 pages in crawl")

    # 3) load DB lesson pool for the book + rabbi map
    rabbis = {r["id"]: r["name"] for r in q("SELECT id, name FROM rabbis;")}
    rabbi_by_norm = {}
    for rid, rname in rabbis.items():
        rabbi_by_norm.setdefault(norm(rname), rid)
    # pool: all published lessons whose bible_book=book OR series under book subtree
    pool = q(f"""
      WITH sub AS (
        SELECT series_id FROM (SELECT (get_series_descendant_ids('{book_id}')).series_id) t
      )
      SELECT l.id, l.title, l.rabbi_id, l.series_id, l.bible_book, l.bible_chapter,
             s.status AS s_status, s.parent_id AS s_parent, s.title AS s_title
      FROM lessons l LEFT JOIN series s ON s.id=l.series_id
      WHERE l.status='published'
        AND ( l.bible_book='{book}' OR l.series_id IN (SELECT series_id FROM sub) );
    """)
    print(f"[{book}] DB lesson pool: {len(pool)} rows")

    # index pool by (normTitle, rabbi_id) and (normTitle) → copies
    from collections import defaultdict
    by_title_rabbi = defaultdict(list)
    by_title = defaultdict(list)
    for l in pool:
        nt = norm(l["title"])
        by_title_rabbi[(nt, l["rabbi_id"])].append(l)
        by_title[nt].append(l)

    AGG_HINT = ("כל השיעורים",)
    # Synthetic migration UUID families = duplicate chapter/placeholder layers (safe to MOVE).
    SYNTH_PREFIXES = ("b2020001-","b2020002-","b2020003-","d2020001-")
    def looseness(l):
        """lower = looser/safer to move. 0=orphan,1=draft/category,2=synthetic-layer,3=aggregation,4=real named series."""
        if l["series_id"] is None: return 0
        st = l.get("s_status")
        if st in ("draft","category"): return 1
        if str(l["series_id"]).startswith(SYNTH_PREFIXES): return 2
        if l.get("s_title") and any(h in l["s_title"] for h in AGG_HINT): return 3
        return 4
    def decide_mode(l):
        """MOVE loose copies (orphan/draft/category/synthetic/aggregation); COPY real named series
        so legitimate project/rabbi series keep their lesson (non-destructive, model-consistent)."""
        return "copy" if looseness(l) >= 4 else "move"

    # 4) match + plan
    plan = []          # list of {event_id, event_title, lesson_id, from_series, old_title, old_rabbi}
    used_lesson_ids = set()
    report = []
    for ev in events:
        nt_ev = norm(ev["title"])
        oe = old_events.get(nt_ev)
        # tolerant match: also try contains
        if not oe:
            for k,v in old_events.items():
                if nt_ev and (nt_ev in k or k in nt_ev) and abs(len(k)-len(nt_ev))<6:
                    oe = v; break
        if not oe:
            report.append({"event": ev["title"], "old_page": None, "matched": 0, "old_lessons": 0, "unmatched": []})
            continue
        page = fetch("https://www.bneyzion.co.il" + oe["path"])
        old_lessons = parse_event_page(page)
        time.sleep(0.3)
        matched, unmatched = 0, []
        for ol in old_lessons:
            nt = norm(ol["title"]); rid = rabbi_by_norm.get(norm(ol["rabbi"])) if ol["rabbi"] else None
            cands = by_title_rabbi.get((nt, rid)) or by_title.get(nt) or []
            cands = [c for c in cands if c["id"] not in used_lesson_ids]
            if not cands:
                unmatched.append(ol); continue
            cands.sort(key=looseness)        # prefer loosest copy
            pick = cands[0]
            mode = decide_mode(pick)
            # only mark a copy's source as 'used' when we MOVE it (copies leave source intact,
            # but we still avoid re-picking the same physical row twice for the same book)
            used_lesson_ids.add(pick["id"])
            plan.append({"event_id": ev["id"], "event_title": ev["title"], "lesson_id": pick["id"],
                         "mode": mode, "from_series": pick["series_id"], "from_status": pick.get("s_status"),
                         "from_title": pick.get("s_title"),
                         "old_title": ol["title"], "old_rabbi": ol["rabbi"]})
            matched += 1
        report.append({"event": ev["title"], "old_page": oe["path"], "matched": matched,
                       "old_lessons": len(old_lessons), "unmatched": [u["title"] for u in unmatched]})

    # report
    tot_m = sum(r["matched"] for r in report); tot_o = sum(r["old_lessons"] for r in report)
    print(f"\n[{book}] PLAN: {tot_m} reassignments across {len([r for r in report if r['matched']])} events "
          f"(old lessons listed: {tot_o})")
    for r in report:
        flag = "" if r["matched"] else "  <-- NO MATCH"
        print(f"  • {r['event']}: {r['matched']}/{r['old_lessons']}{flag}")
        if r["unmatched"]:
            for u in r["unmatched"][:6]:
                print(f"        unmatched: {u}")

    out_path = args.out or os.path.join(HERE, f"reports/consolidate-plan-{bh}.json")
    json.dump({"book": book, "book_id": book_id, "plan": plan, "report": report},
              open(out_path,"w"), ensure_ascii=False, indent=2)
    print(f"\n  plan written → {out_path}")

    if not args.apply:
        print("\n  DRY RUN (no DB changes). Re-run with --apply to execute.")
        return

    # 5) APPLY
    print("\n  APPLYING…")
    n_move = sum(1 for p in plan if p["mode"]=="move")
    n_copy = sum(1 for p in plan if p["mode"]=="copy")
    print(f"  {n_move} MOVE (reassign series_id) + {n_copy} COPY (clone row, source preserved)")
    CLONE_COLS = ("title,description,content,rabbi_id,video_url,audio_url,attachment_url,thumbnail_url,"
                  "duration,bible_book,bible_chapter,bible_verse,source_type,status,published_at,"
                  "audience_tags,additional_attachments,content_type,legacy_attachment_url")
    by_event_move = defaultdict(list)
    by_event_copy = defaultdict(list)
    for p in plan:
        (by_event_move if p["mode"]=="move" else by_event_copy)[p["event_id"]].append(p["lesson_id"])
    # MOVE: reassign series_id
    for ev_id, lids in by_event_move.items():
        ids = ",".join(f"'{x}'" for x in lids)
        q(f"UPDATE lessons SET series_id='{ev_id}' WHERE id IN ({ids});")
    # COPY: clone the row into the event (new id), leaving the source row untouched
    for ev_id, lids in by_event_copy.items():
        ids = ",".join(f"'{x}'" for x in lids)
        q(f"INSERT INTO lessons (id, series_id, views_count, {CLONE_COLS}) "
          f"SELECT gen_random_uuid(), '{ev_id}', 0, {CLONE_COLS} FROM lessons WHERE id IN ({ids});")
    # recompute lesson_count + promote populated events to active
    ev_ids = ",".join(f"'{e['id']}'" for e in events)
    q(f"""
      UPDATE series s SET lesson_count = sub.n
      FROM (SELECT series_id, count(*) n FROM lessons WHERE status='published' AND series_id IN ({ev_ids}) GROUP BY series_id) sub
      WHERE s.id = sub.series_id;
    """)
    q(f"""
      UPDATE series SET status='active'
      WHERE id IN ({ev_ids}) AND status IN ('draft','category')
        AND lesson_count > 0;
    """)
    print("  APPLIED. Verify with audit_series_depth.py")

if __name__ == "__main__":
    main()
