import sys, json, time
sys.path.insert(0, ".")
import sbq
def q(s, _t=8):
    for i in range(_t):
        try:
            d = json.loads(sbq.run(s))
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return []
def show(l, r): print(f"\n=== {l} ==="); print(json.dumps(r, ensure_ascii=False, indent=1) if r else " (none)")

# 1. ציר זמן גלות בבל — all rows, bible_book + audience + status (why חגי didn't get it)
show("ציר זמן גלות בבל — all DB rows", q("""
SELECT id, title, bible_book, status, audience_tags, (attachment_url IS NOT NULL) att, (content IS NULL) cnull
FROM lessons WHERE title LIKE '%ציר זמן גלות בבל%'"""))

# 2. שמואל-ב standalone ca117e7c — what is it, is it in listing
show("שמואל-ב ca117e7c series + its lessons", q("""
SELECT s.id, s.title, s.status,
 (SELECT COUNT(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') pub,
 (SELECT string_agg(ti.scope,',') FROM teacher_listing_items ti WHERE ti.series_id=s.id) scopes
FROM series s WHERE s.id::text LIKE 'ca117e7c%'"""))

# 3. ישעיהו לב הפרק — the empty lesson
show("ישעיהו 'לב הפרק' series + lesson media", q("""
SELECT s.id s_id, s.title s_title, s.status s_status,
 l.id l_id, l.title l_title, l.status l_status,
 (l.content IS NULL OR l.content='') cnull, l.audio_url, l.video_url, l.attachment_url
FROM series s LEFT JOIN lessons l ON l.series_id=s.id
WHERE s.title LIKE '%לב הפרק%ישעיה%' OR s.id='e93c7a85-af4a-479b-8122-bd4f8d7e0f2c'"""))
