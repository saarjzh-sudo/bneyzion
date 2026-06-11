#!/usr/bin/env python3
"""
chapter_fallback.py — second pass for the chapter-organized prophets (ישעיהו/ירמיהו/יחזקאל),
where title+rabbi matching left ~40% of chapter-events thin.

Grounded + safe: each event is "ישעיהו פרק N". DB lessons carry bible_book + bible_chapter
(objective). So for each chapter-event we add the published, non-teacher lessons tagged to that
exact book+chapter that aren't already shown there (deduped by title+rabbi). COPY from real
series (preserved); MOVE only loose copies. Non-destructive; backups already exist.

Usage: python3 chapter_fallback.py --book "ישעיהו" --book-id <id> [--apply]
"""
import sys, json, re, os, argparse, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
from collections import defaultdict

HEB = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,
       'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,'ק':100}
def heb_to_int(s):
    s = re.sub(r'[״׳"\'`\s]', '', s)
    if s == 'טו': return 15
    if s == 'טז': return 16
    return sum(HEB.get(c, 0) for c in s) or None

def norm(s):
    s = unicodedata.normalize("NFC", s or "")
    s = re.sub(r"[֑-ׇ]", "", s); s = re.sub(r'[״"\'׳`|]', "", s)
    return re.sub(r"\s+", " ", s).strip()

def q(sql):
    d = json.loads(sbq.run(sql))
    if isinstance(d, dict) and d.get("message"): raise RuntimeError(d["message"][:300])
    return d

SYNTH = ("b2020001-","b2020002-","b2020003-","d2020001-")
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--book", required=True)
    ap.add_argument("--book-id", required=True); ap.add_argument("--apply", action="store_true")
    a = ap.parse_args(); book, book_id = a.book, a.book_id

    events = q(f"SELECT id,title,status,lesson_count FROM series WHERE parent_id='{book_id}' AND NOT (audience_tags @> ARRAY['teachers']);")
    # map chapter -> event id
    chap_event = {}
    for e in events:
        m = re.search(r'פרק\s+(\S+)\s*$', e["title"])
        if m:
            n = heb_to_int(m.group(1))
            if n: chap_event[n] = e
    print(f"[{book}] {len(chap_event)} single-chapter events parsed")

    # all published non-teacher lessons for this book WITH a chapter
    pool = q(f"""
      SELECT l.id,l.title,l.rabbi_id,l.series_id,l.bible_chapter,s.status s_status
      FROM lessons l LEFT JOIN series s ON s.id=l.series_id
      WHERE l.status='published' AND l.bible_book='{book}' AND l.bible_chapter IS NOT NULL
        AND NOT (coalesce(l.audience_tags,ARRAY[]::text[]) @> ARRAY['teachers']);
    """)
    print(f"[{book}] {len(pool)} chapter-tagged lessons in pool")

    # what's already in each event (dedup key)
    ev_ids = [e["id"] for e in chap_event.values()]
    present = defaultdict(set)
    if ev_ids:
        inlist = ",".join(f"'{x}'" for x in ev_ids)
        for r in q(f"SELECT series_id,title,rabbi_id FROM lessons WHERE series_id IN ({inlist}) AND status='published';"):
            present[r["series_id"]].add((norm(r["title"]), r["rabbi_id"]))

    plan = []  # (event_id, lesson_id, mode)
    for l in pool:
        ev = chap_event.get(l["bible_chapter"])
        if not ev: continue
        key = (norm(l["title"]), l["rabbi_id"])
        if key in present[ev["id"]]: continue           # already shown
        present[ev["id"]].add(key)                       # avoid intra-run dups
        loose = (l["series_id"] is None or l["s_status"] in ("draft","category")
                 or str(l["series_id"]).startswith(SYNTH))
        plan.append((ev["id"], l["id"], "move" if loose else "copy"))

    by_ev = defaultdict(lambda: {"move": [], "copy": []})
    for ev_id, lid, mode in plan: by_ev[ev_id][mode].append(lid)
    nm = sum(1 for p in plan if p[2]=="move"); nc = len(plan)-nm
    print(f"[{book}] fallback adds {len(plan)} lessons ({nm} move + {nc} copy) across {len(by_ev)} events")

    if not a.apply:
        print("  DRY RUN."); return
    CLONE = ("title,description,content,rabbi_id,video_url,audio_url,attachment_url,thumbnail_url,"
             "duration,bible_book,bible_chapter,bible_verse,source_type,status,published_at,"
             "audience_tags,additional_attachments,content_type,legacy_attachment_url")
    for ev_id, d in by_ev.items():
        if d["move"]:
            ids = ",".join(f"'{x}'" for x in d["move"])
            q(f"UPDATE lessons SET series_id='{ev_id}' WHERE id IN ({ids});")
        if d["copy"]:
            ids = ",".join(f"'{x}'" for x in d["copy"])
            q(f"INSERT INTO lessons (id,series_id,views_count,{CLONE}) SELECT gen_random_uuid(),'{ev_id}',0,{CLONE} FROM lessons WHERE id IN ({ids});")
    # recompute + promote
    ev_in = ",".join(f"'{e['id']}'" for e in chap_event.values())
    q(f"UPDATE series s SET lesson_count=sub.n FROM (SELECT series_id,count(*) n FROM lessons WHERE status='published' AND series_id IN ({ev_in}) GROUP BY series_id) sub WHERE s.id=sub.series_id;")
    q(f"UPDATE series SET status='active' WHERE id IN ({ev_in}) AND status IN ('draft','category') AND lesson_count>0;")
    print("  APPLIED.")

if __name__ == "__main__": main()
