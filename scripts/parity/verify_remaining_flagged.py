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
def esc(x): return x.replace("'", "''")
def show(l, r): print(f"\n=== {l} ==="); print(json.dumps(r, ensure_ascii=False, indent=1) if r else " (none)")

# 1. ויקרא missing standalone 'מאוהל מועד לאמר' (יוסף שילר) — in DB? status/audience/in-listing?
show("ויקרא 'מאוהל מועד לאמר'", q("""SELECT l.id,l.title,r.name rabbi,l.status,l.bible_book,l.audience_tags,
  (SELECT string_agg(ti.scope||':'||ti.key,', ') FROM teacher_listing_items ti WHERE ti.lesson_id=l.id) listed
  FROM lessons l LEFT JOIN rabbis r ON r.id=l.rabbi_id WHERE l.title LIKE '%מאוהל מועד לאמר%'"""))
# 2. מלכים-א missing 'בין משכן למקדש' + 'מרד אדוניהו' author
show("מלכים-א 'בין משכן למקדש' + 'מרד אדוניהו'", q("""SELECT l.id,l.title,r.name rabbi,l.status,l.bible_book,
  (SELECT string_agg(ti.scope||':'||ti.key,', ') FROM teacher_listing_items ti WHERE ti.lesson_id=l.id) listed
  FROM lessons l LEFT JOIN rabbis r ON r.id=l.rabbi_id
  WHERE l.title LIKE '%בין משכן למקדש%' OR l.title LIKE '%מרד אדוניהו%'"""))
# 3. ישעיהו 'ארבעה נביאים' + the two לב הפרק series
show("ישעיהו 'ארבעה נביאים הגלוי והסמוי'", q("""SELECT l.id,l.title,r.name rabbi,l.status,l.bible_book,
  (SELECT string_agg(ti.scope||':'||ti.key,', ') FROM teacher_listing_items ti WHERE ti.lesson_id=l.id) listed
  FROM lessons l LEFT JOIN rabbis r ON r.id=l.rabbi_id WHERE l.title LIKE '%ארבעה נביאים%הגלוי%'"""))
# 4. שמואל-א top series 'ספר שמואל א' (35) author
show("שמואל-א series 'ספר שמואל א' variants (rabbi + lesson count)", q("""SELECT s.id,s.title,r.name series_rabbi,s.status,
  (SELECT COUNT(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') pub,
  (SELECT string_agg(DISTINCT ti.key,',') FROM teacher_listing_items ti WHERE ti.series_id=s.id AND ti.scope='public_book') pubkey
  FROM series s LEFT JOIN rabbis r ON r.id=s.rabbi_id
  WHERE s.title='ספר שמואל א' OR s.title LIKE 'ספר שמואל א %' ORDER BY pub DESC"""))
# 5. בראשית 'שיעורים על התנ"ך - בראשית' (בן שחר)
show("בראשית 'שיעורים על התנך - בראשית'", q("""SELECT s.id,s.title,r.name series_rabbi,s.status,s.audience_tags,
  (SELECT COUNT(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') pub
  FROM series s LEFT JOIN rabbis r ON r.id=s.rabbi_id WHERE s.title LIKE '%שיעורים על התנ%בראשית%'"""))
# 6. יהושע 'מפות עזר לספר יהושע'
show("יהושע 'מפות עזר'", q("""SELECT s.id,s.title,s.status,s.audience_tags,
  (SELECT COUNT(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') pub
  FROM series s WHERE s.title LIKE '%מפות עזר%יהושע%'"""))
