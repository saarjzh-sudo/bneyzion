#!/usr/bin/env python3
"""backfill_recon.py — what exists in DB for the 4 backfill series + lessons schema."""
import os, sys, json, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
def q(sql, _t=8):
    for i in range(_t):
        out = sbq.run(sql)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return None
def show(l, r): print(f"\n=== {l} ==="); print(json.dumps(r, ensure_ascii=False, indent=1) if r else "  (none)")

# 1. the 4 target series — existence, status, lesson count, in public listing?
show("4 target series (status, pub_lessons, in public_book listing)", q("""
SELECT s.id, s.title, s.status, s.bible_book,
  (SELECT COUNT(*) FROM lessons l WHERE l.series_id=s.id) all_lessons,
  (SELECT COUNT(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') pub_lessons,
  (SELECT string_agg(DISTINCT ti.key,',') FROM teacher_listing_items ti WHERE ti.series_id=s.id AND ti.scope='public_book') in_public
FROM series s WHERE
   s.title LIKE '%קדושת פשוטו של מקרא%במדבר%'
   OR (s.title LIKE '%יהושע%' AND s.title LIKE '%ושננתם%')
   OR (s.title LIKE '%רות%' AND s.title LIKE '%ושננתם%')
   OR (s.title LIKE '%שיעורים קצרים%' AND s.title LIKE '%מלכים ב%')
ORDER BY s.title"""))

# 2. lessons table columns + NOT NULL constraints
show("lessons columns (name, nullable, default)", q("""
SELECT column_name, is_nullable, column_default, data_type
FROM information_schema.columns WHERE table_name='lessons' ORDER BY ordinal_position"""))

# 3. a sample published PDF lesson (to mirror the shape for inserts)
show("sample published attachment lesson (shape to mirror)", q("""
SELECT id, series_id, title, rabbi_id, status, sort_order, attachment_url, audio_url, video_url,
  (content IS NOT NULL) has_content, slug, bible_book, content_type
FROM lessons WHERE attachment_url IS NOT NULL AND attachment_url LIKE '%supabase%' AND status='published' LIMIT 2"""))
