#!/usr/bin/env python3
"""
gap3_fix.py — close the residual thin chapter-events in ישעיהו/יחזקאל (gap3).

Why the night passes missed these: consolidate.py matched only within the book's
lesson pool (bible_book=X OR series under the book subtree), but the real copies
live under project roots (מוקלט / בבקיאות / קריאה-וביאור) with their own series,
sometimes with title variants ("... | ללא טעמים"). chapter_fallback.py then only
added lessons that carry bible_chapter — many of these don't.

This pass searches the ENTIRE published lessons table per old-page lesson
(ground truth: the old chapter page's lessonBlocks — title + rabbi + parentSeries),
tolerant NFC matching, and assigns into the thin series:
  COPY  when the source sits in a real named series (source preserved),
  MOVE  only for loose copies (orphan / draft / category / synthetic / aggregation).
Teacher-audience lessons are never assigned (zero teacher leak to public).
Ambiguous / not-found → logged for yoav, never invented.

Backups already taken: lessons_bak_gap3_20260610_1959 + series_bak_gap3_20260610_1959.

Usage:
  python3 gap3_fix.py            # dry run, writes reports/gap3-plan-<ts>.json
  python3 gap3_fix.py --apply
"""
import sys, json, re, html, os, argparse, subprocess, time, unicodedata
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq

TARGETS = {
    "ישעיהו": {
        "book_id": "1fb20386-80be-4e03-a205-7ee9ea4a385b",
        "events": ["ישעיהו פרק ד", "ישעיהו פרק טז", "ישעיהו פרק י", "ישעיהו פרק יב",
                   "ישעיהו פרק יד", "ישעיהו פרק יח", "ישעיהו פרק כ", "ישעיהו פרק כו",
                   "ישעיהו פרק לג", "ישעיהו פרק מד", "ישעיהו פרק מו", "ישעיהו פרק נ",
                   "ספר ישעיהו", "קריאה וביאור בקצרה של ספר ישעיהו"],
    },
    "יחזקאל": {
        "book_id": "5b0c3232-2ba9-4b6b-8b1e-4e8b1a82245d",
        "events": ["יחזקאל פרק יא", "יחזקאל פרק כז", "יחזקאל פרק ל", "יחזקאל פרק לז",
                   "יחזקאל פרק לט", "יחזקאל פרק מא", "יחזקאל פרק מב", "יחזקאל פרק מו",
                   "יחזקאל פרק מז", "יחזקאל פרק מח"],
    },
}

def nfc(s): return unicodedata.normalize("NFC", s or "")

def norm(s):
    s = nfc(s)
    s = re.sub(r"[֑-ׇ]", "", s)
    s = re.sub(r"[\"'״׳`‘’“”|]", "", s)
    return re.sub(r"\s+", " ", s).strip()

def norm_loose(s):
    """norm + drop the common recorded-series suffix variants."""
    s = norm(s)
    s = re.sub(r"\s*(ללא טעמים|עם טעמים)\s*$", "", s).strip()
    return s

def q(sql):
    out = sbq.run(sql)
    d = json.loads(out)
    if isinstance(d, dict) and d.get("message"):
        raise RuntimeError("SQL error: " + json.dumps(d, ensure_ascii=False)[:400])
    return d

def q_retry(sql, tries=3):
    for i in range(tries):
        try:
            return q(sql)
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(3)

def fetch(url):
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
        env.pop(k, None)
    env["NO_PROXY"] = "*"
    p = subprocess.run(["curl","-s","--noproxy","*","-L",url,"--max-time","60"],
                       capture_output=True, text=True, env=env, timeout=90)
    return p.stdout

def parse_event_page(htmltext):
    """blocks: {title, rabbi, parent_series, links[]} from an old page."""
    out = []
    parts = htmltext.split('<div class="lessonBlock')
    for seg in parts[1:]:
        end = seg.find('<div class="lessonPromo-end')
        seg = seg[: end if 0 < end < 8000 else 8000]
        mt = re.search(r'<h3>\s*<a[^>]*>(.*?)</a>', seg, re.S)
        title = html.unescape(re.sub(r"<[^>]+>", "", mt.group(1)).strip()) if mt else None
        ma = re.search(r'<div class="author">\s*<a[^>]*>(.*?)</a>', seg, re.S)
        rabbi = html.unescape(re.sub(r"<[^>]+>", "", ma.group(1)).strip()) if ma else None
        mp = re.search(r'class="parentSeries".*?<strong>\s*<a[^>]*>(.*?)</a>', seg, re.S)
        parent = html.unescape(re.sub(r"<[^>]+>", "", mp.group(1)).strip()) if mp else None
        links = re.findall(r'href="(https?://[^"]+|/media/[^"]+)"', seg)
        links = [l for l in links if re.search(r'amazonaws|youtu|soundcloud|vp4\.me|\.pdf|\.mp3|\.mp4|\.doc', l)]
        if title:
            out.append({"title": title, "rabbi": rabbi, "parent": parent, "links": links[:4]})
    return out

SYNTH = ("b2020001-","b2020002-","b2020003-","d2020001-")
AGG_HINT = ("כל השיעורים",)

def looseness(l):
    if l["series_id"] is None: return 0
    if l.get("s_status") in ("draft","category"): return 1
    if str(l["series_id"]).startswith(SYNTH): return 2
    if l.get("s_title") and any(h in l["s_title"] for h in AGG_HINT): return 3
    return 4

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    ts = time.strftime("%Y%m%d-%H%M")

    # rabbi maps
    rabbis = q_retry("SELECT id, name FROM rabbis;")
    rabbi_name = {r["id"]: r["name"] for r in rabbis}
    rabbi_by_norm = {}
    for r in rabbis:
        rabbi_by_norm.setdefault(norm(r["name"]), r["id"])

    # global pool: every published lesson, with series context (teacher rows kept but flagged)
    pool = q_retry("""
      SELECT l.id, l.title, l.rabbi_id, l.series_id, l.bible_book, l.bible_chapter,
             (coalesce(l.audience_tags, ARRAY[]::text[]) @> ARRAY['teachers']) AS is_teacher,
             s.status AS s_status, s.title AS s_title
      FROM lessons l LEFT JOIN series s ON s.id = l.series_id
      WHERE l.status = 'published';
    """)
    print(f"global pool: {len(pool)} published lessons")
    by_title = defaultdict(list)
    by_loose = defaultdict(list)
    for l in pool:
        if l["is_teacher"]:               # never assign teacher content to public series
            continue
        by_title[norm(l["title"])].append(l)
        by_loose[norm_loose(l["title"])].append(l)

    plan, yoav, summary = [], [], []
    for book, t in TARGETS.items():
        book_id = t["book_id"]
        # event title -> old page path (from the night consolidate plan = same scrape the audit uses)
        planfile = json.load(open(os.path.join(HERE, f"reports/consolidate-plan-{book.replace(' ','-')}.json")))
        old_page = {r["event"].strip(): r["old_page"] for r in planfile["report"]}
        rows = q_retry(f"SELECT id, title, status FROM series WHERE parent_id='{book_id}';")
        sid_by_title = {r["title"].strip(): r for r in rows}

        for ev_title in t["events"]:
            srow = sid_by_title.get(ev_title)
            page_path = old_page.get(ev_title)
            if not srow or not page_path:
                yoav.append({"book": book, "event": ev_title, "reason": "series or old page not found"})
                continue
            sid = srow["id"]
            cur = q_retry(f"SELECT title, rabbi_id FROM lessons WHERE series_id='{sid}' AND status='published';")
            present = {(norm(c["title"]), c["rabbi_id"]) for c in cur}
            present_loose = {(norm_loose(c["title"]), c["rabbi_id"]) for c in cur}

            blocks = parse_event_page(fetch("https://www.bneyzion.co.il" + page_path))
            time.sleep(0.3)
            added_here, missing_here = 0, 0
            for b in blocks:
                nt, ntl = norm(b["title"]), norm_loose(b["title"])
                rid = rabbi_by_norm.get(norm(b["rabbi"])) if b["rabbi"] else None
                if (nt, rid) in present or (ntl, rid) in present_loose:
                    continue  # already shown in the series
                cands = by_title.get(nt) or by_loose.get(ntl) or []
                if not cands:  # tolerant containment pass (rare)
                    cands = [l for k, ls in by_loose.items()
                             if ntl and len(ntl) > 12 and (ntl in k or k in ntl) and abs(len(k)-len(ntl)) < 8
                             for l in ls]
                # rabbi gate: old page names a rabbi → only that rabbi's lessons qualify.
                # No same-rabbi candidate = the lesson is genuinely absent → yoav (never
                # substitute another rabbi's same-titled lesson — see מלחמת גוג ומגוג, פרק לט).
                if rid is not None:
                    cands = [c for c in cands if c["rabbi_id"] == rid]
                elif b["rabbi"]:
                    cands = []   # old page names a rabbi we don't have in the rabbis table
                else:
                    # no rabbi on old page: only safe if all candidates share one rabbi
                    if len({c["rabbi_id"] for c in cands}) > 1:
                        cands = []
                if not cands:
                    missing_here += 1
                    yoav.append({"book": book, "event": ev_title, "old_title": b["title"],
                                 "old_rabbi": b["rabbi"], "old_parent_series": b["parent"],
                                 "links": b["links"]})
                    continue
                cands.sort(key=lambda c: (0 if c["bible_book"] == book else 1, looseness(c)))
                pick = cands[0]
                mode = "move" if looseness(pick) < 4 else "copy"
                present.add((nt, pick["rabbi_id"])); present_loose.add((ntl, pick["rabbi_id"]))
                plan.append({"book": book, "event": ev_title, "event_id": sid, "mode": mode,
                             "lesson_id": pick["id"], "lesson_title": pick["title"],
                             "from_series": pick.get("s_title"), "old_title": b["title"],
                             "old_rabbi": b["rabbi"]})
                added_here += 1
            summary.append({"book": book, "event": ev_title, "old_listed": len(blocks),
                            "db_before": len(cur), "adds": added_here, "unmatched": missing_here})

    print(f"\n{'='*60}\nPLAN: {len(plan)} assignments "
          f"({sum(1 for p in plan if p['mode']=='move')} move / {sum(1 for p in plan if p['mode']=='copy')} copy), "
          f"{len(yoav)} unmatched → yoav")
    for s in summary:
        print(f"  {s['book']} / {s['event']}: old={s['old_listed']} db_before={s['db_before']} "
              f"+{s['adds']} adds, {s['unmatched']} unmatched")

    out = {"ts": ts, "plan": plan, "yoav": yoav, "summary": summary}
    path = os.path.join(HERE, f"reports/gap3-plan-{ts}.json")
    json.dump(out, open(path, "w"), ensure_ascii=False, indent=2)
    print(f"plan → {path}")

    if not a.apply:
        print("DRY RUN — no DB changes."); return

    print("\nAPPLYING…")
    CLONE = ("title,description,content,rabbi_id,video_url,audio_url,attachment_url,thumbnail_url,"
             "duration,bible_book,bible_chapter,bible_verse,source_type,status,published_at,"
             "audience_tags,additional_attachments,content_type,legacy_attachment_url")
    mv, cp = defaultdict(list), defaultdict(list)
    for p in plan:
        (mv if p["mode"] == "move" else cp)[p["event_id"]].append(p["lesson_id"])
    for ev_id, lids in mv.items():
        ids = ",".join(f"'{x}'" for x in lids)
        q_retry(f"UPDATE lessons SET series_id='{ev_id}' WHERE id IN ({ids});")
    for ev_id, lids in cp.items():
        ids = ",".join(f"'{x}'" for x in lids)
        q_retry(f"INSERT INTO lessons (id, series_id, views_count, {CLONE}) "
                f"SELECT gen_random_uuid(), '{ev_id}', 0, {CLONE} FROM lessons WHERE id IN ({ids});")
    ev_ids = ",".join(f"'{e}'" for e in {p["event_id"] for p in plan})
    q_retry(f"UPDATE series s SET lesson_count=sub.n FROM (SELECT series_id, count(*) n FROM lessons "
            f"WHERE status='published' AND series_id IN ({ev_ids}) GROUP BY series_id) sub WHERE s.id=sub.series_id;")
    q_retry(f"UPDATE series SET status='active' WHERE id IN ({ev_ids}) AND status IN ('draft','category') AND lesson_count>0;")
    print("APPLIED. Verify with: python3 audit_series_depth.py --book ישעיהו / יחזקאל")

if __name__ == "__main__":
    main()
