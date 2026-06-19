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

# the 4 בן שחר bereshit lessons: current series_id + that series title + is that series emitted publicly?
titles = ["מפגש יעקב ועשו","חלום פרעה","התוודעות יוסף לאחיו","הברכות לאפרים ומנשה"]
ors = " OR ".join(f"l.title='{t}'" for t in titles)
show("4 בן שחר bereshit lessons — current parent", q(f"""
SELECT l.id, l.title, r.name rabbi, l.series_id, s.title series_title, s.status sstatus, l.bible_book, l.status,
 (l.audio_url IS NOT NULL) has_audio,
 (SELECT string_agg(DISTINCT ti.scope||':'||ti.key,', ') FROM teacher_listing_items ti
   WHERE ti.series_id=l.series_id AND ti.scope='public_book') series_listed
FROM lessons l LEFT JOIN rabbis r ON r.id=l.rabbi_id LEFT JOIN series s ON s.id=l.series_id
WHERE ({ors}) AND r.name LIKE '%בן שחר%'"""))

# ישעיהו ארבעה נביאים copy f47e5365 — empty?
show("ישעיהו ארבעה נביאים f47e5365 — emptiness", q("""
SELECT id,title,rabbi_id,(content IS NULL OR content='') cnull, audio_url, video_url, attachment_url, audience_tags
FROM lessons WHERE id='f47e5365-7f8d-48b4-9153-38aaa5b52b99'"""))
