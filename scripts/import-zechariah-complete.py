#!/usr/bin/env python3
"""
השלמת ייבוא זכריה — רמה 19 (16.7.2026)

הייבוא המקורי (import-all-books-drive-content.mjs) תפס רק פרקים א'-ב' של זכריה;
בדרייב קיימים כל 14 הפרקים (בסיס/הרחבה/שיעור). הסקריפט משלים את החסר בלבד:
- snapshot לפני כתיבה (community_course_lessons_bak_zech_20260716)
- אידמפוטנטי: מדלג על (פרק, file-id) שכבר קיים ב-DB
- תיקיות משולבות ("פרק ח' + פרק ט'") — התוכן משוכפל לשני הפרקים
- docx מדולג כשיש pdf לאותו (פרק, שכבה, תפקיד)

שימוש:
  python3 scripts/import-zechariah-complete.py --dry-run
  python3 scripts/import-zechariah-complete.py --apply
"""
import json, re, subprocess, sys, urllib.request, datetime

REF = "pzvmwfexeiruelwiujxn"
COURSE_ID = "dff61c84-48d4-4d11-88de-1f52ecbd7885"
TEAM_DRIVE = "0AFz55knVlI2BUk9PVA"
DRIVE_PATH = "gdrive:ספרי תכנית הפרק השבועי/הפרק השבועי - חגי, זכריה ומלאכי/1. זכריה"

MGMT_TOKEN = None  # loaded from api-keys.md
SERVICE_KEY = None

def load_keys():
    global MGMT_TOKEN, SERVICE_KEY
    import pathlib
    p = pathlib.Path.home() / "Downloads/saar-workspace/וואן-מן-שואו/סקילים/04-mcp-servers/api-keys.md"
    txt = p.read_text()
    MGMT_TOKEN = re.search(r"SUPABASE_ACCESS_TOKEN=(sbp_\w+)", txt).group(1)
    SERVICE_KEY = re.search(r"SUPABASE_SERVICE_ROLE_BNEYZION=(\S+)", txt).group(1)

def mgmt_sql(sql):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {MGMT_TOKEN}", "Content-Type": "application/json",
                 "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    return json.load(urllib.request.urlopen(req, timeout=90))

def rest_insert(rows):
    req = urllib.request.Request(
        f"https://{REF}.supabase.co/rest/v1/community_course_lessons",
        data=json.dumps(rows).encode(),
        headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
                 "Content-Type": "application/json", "Prefer": "return=minimal"})
    urllib.request.urlopen(req, timeout=90)

HEB_CH = {1:"א׳",2:"ב׳",3:"ג׳",4:"ד׳",5:"ה׳",6:"ו׳",7:"ז׳",8:"ח׳",9:"ט׳",10:"י׳",11:"י״א",12:"י״ב",13:"י״ג",14:"י״ד"}

FOLDER_CH = {
    "פרק א'": [1], "פרק ב'": [2], "פרק ג'": [3], "פרק ד'": [4], "פרק ה'": [5],
    "פרק ו'": [6], "פרק ז'": [7], "פרק ח' + פרק ט'": [8, 9], "פרק י'+  פרק יא'": [10, 11],
    "פרק יב'": [12], "פרק יג'": [13], "פרק יד'": [14],
}
LAYER_DIR = {"תכני הבסיס": "base", "תכני הרחבה": "enrichment", "השיעור השבועי": "weekly"}

HEB_PLAIN = {1:"א",2:"ב",3:"ג",4:"ד",5:"ה",6:"ו",7:"ז",8:"ח",9:"ט",10:"י",11:"יא",12:"יב",13:"יג",14:"יד"}

def resolve_chapters(chapters, fname):
    """בתיקייה משולבת (ח+ט / י+יא): קובץ שמזכיר פרק ספציפי משויך רק אליו."""
    if len(chapters) < 2:
        return chapters
    norm = re.sub(r"[_'׳:]+", " ", fname)
    norm = re.sub(r"\s+", " ", norm)
    a, b = chapters
    la, lb = HEB_PLAIN[a], HEB_PLAIN[b]
    # טווח שמכסה את שניהם ("ח-ט", "פרקים ח-ט")
    if re.search(rf"{la}\s*-\s*{lb}", norm):
        return chapters
    hits = []
    for ch, letter in sorted(((a, la), (b, lb)), key=lambda t: -len(t[1])):
        if re.search(rf"(?:פרק|זכריה)\s*{letter}(?![א-ת])", norm):
            hits.append(ch)
    return sorted(hits) if hits else chapters

def classify(layer, fname):
    """returns (role, title, order) — title=None → cleaned filename"""
    f = fname
    if layer == "base":
        if "ושננתם" in f: return ("verses", "ושננתם — קריאת הפרק עם ביאור", 1)
        if "יונדב זר" in f: return ("reading", "הקראת הפרק עם ביאור — הרב יונדב זר", 2)
        if "דף הכוונה" in f: return ("guidance", "להיפגש עם הפרק — דף הכוונה", 4)
        if "שטיינזלץ" in f or "שטייזלץ" in f: return ("steinsaltz", "ביאור הפרק — שטיינזלץ", 5)
        return ("other", None, 6)
    if layer == "enrichment":
        if "מבט רחב" in f: return ("broad", "הפרק במבט רחב — הרב עמנואל בן ארצי", 2)
        if "מאמר הרחבה" in f: return ("article", "מאמר הרחבה", 4)
        return ("other", None, 6)
    # weekly
    if f.endswith(".mp4") and "סיכום" not in f: return ("weekly_video", "השיעור השבועי — הרב יואב אוריאל", 1)
    if "סיכום" in f: return ("summary", "סיכום השיעור — הרב יואב אוריאל", 3)
    if re.search(r"\.(png|jpe?g)$", f): return ("chart", "תרשים / מפה", 5)
    return ("other", None, 6)

def media_cols(fname, url):
    if re.search(r"\.(mp3|mpeg|oga|m4a)$", fname): return {"audio_url": url}
    if fname.endswith(".mp4"): return {"video_url": url}
    if re.search(r"\.(png|jpe?g)$", fname): return {"thumbnail_url": url, "attachment_url": url}
    if re.search(r"\.(pdf|docx?)$", fname): return {"attachment_url": url}
    return {}

def clean_title(fname):
    return re.sub(r"\.(pdf|docx?|mp3|mp4|mpeg|png|jpe?g)+$", "", fname).replace("_", " ").strip()

def main():
    apply = "--apply" in sys.argv
    load_keys()

    # 1) snapshot (רק ב-apply)
    if apply:
        mgmt_sql(f"""CREATE TABLE IF NOT EXISTS community_course_lessons_bak_zech_20260716 AS
                     SELECT * FROM community_course_lessons WHERE course_id='{COURSE_ID}';""")
        print("snapshot ✓")

    # 2) existing file-ids per chapter (idempotency)
    existing = mgmt_sql(f"""SELECT bible_chapter, coalesce(video_url,'')||' '||coalesce(audio_url,'')||' '||coalesce(attachment_url,'') AS urls
                            FROM community_course_lessons WHERE course_id='{COURSE_ID}' AND bible_chapter IS NOT NULL;""")
    have = set()
    for r in existing:
        for fid in re.findall(r"/d/([\w-]+)/", r["urls"]):
            have.add((r["bible_chapter"], fid))
    print(f"existing (chapter,file) pairs: {len(have)}")

    # 3) list drive
    out = subprocess.run(["rclone", "lsf", DRIVE_PATH, "--drive-team-drive", TEAM_DRIVE,
                          "-R", "--files-only", "--format", "ip"],
                         capture_output=True, text=True, check=True).stdout
    items = []  # (chapters, layer, fname, fid)
    for line in out.strip().splitlines():
        fid, path = line.split(";", 1)
        parts = path.split("/")
        if len(parts) != 3: continue  # רק פרק/שכבה/קובץ; הקדמות כבר יובאו
        chf, layerf, fname = parts
        if chf not in FOLDER_CH or layerf not in LAYER_DIR: continue
        items.append((resolve_chapters(FOLDER_CH[chf], fname), LAYER_DIR[layerf], fname, fid))

    # 4) build rows with pdf-over-docx dedup per (chapter, layer, role)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    by_key = {}
    for chapters, layer, fname, fid in items:
        role, title, order = classify(layer, fname)
        for ch in chapters:
            key = (ch, layer, role, fname)
            by_key[key] = (fname, fid, title, order)
    pdf_keys = {(ch, layer, role) for (ch, layer, role, fn) in by_key if fn.endswith(".pdf")}

    rows, skipped = [], 0
    for (ch, layer, role, fname), (fn, fid, title, order) in sorted(by_key.items()):
        if fn.endswith((".docx", ".doc")) and role != "other" and (ch, layer, role) in pdf_keys:
            continue  # pdf wins
        if (ch, fid) in have:
            skipped += 1; continue
        url = f"https://drive.google.com/file/d/{fid}/preview"
        media = media_cols(fn, url)
        if not media: continue
        rows.append({
            "course_id": COURSE_ID, "bible_book": "זכריה", "bible_chapter": ch,
            "layer_type": layer, "title": title or clean_title(fn),
            "description": f"פרק {HEB_CH[ch]}", "lesson_number": order,
            "status": "published", "published_at": now, **media,
        })

    print(f"to insert: {len(rows)} | skipped existing: {skipped}")
    for r in rows[:200]:
        print(f"  ch{r['bible_chapter']:>2} {r['layer_type']:<10} {r['title']}")

    if apply and rows:
        # PostgREST bulk-insert מחייב מפתחות זהים בכל השורות
        all_keys = {k for r in rows for k in r}
        rows = [{k: r.get(k) for k in all_keys} for r in rows]
        for i in range(0, len(rows), 50):
            rest_insert(rows[i:i+50])
        print("inserted ✓")
        chk = mgmt_sql(f"""SELECT bible_chapter, count(*) FILTER (WHERE layer_type='base') b,
                           count(*) FILTER (WHERE layer_type='enrichment') e,
                           count(*) FILTER (WHERE layer_type='weekly') w
                           FROM community_course_lessons WHERE course_id='{COURSE_ID}' AND bible_chapter IS NOT NULL
                           GROUP BY bible_chapter ORDER BY bible_chapter;""")
        print(json.dumps(chk, ensure_ascii=False))

if __name__ == "__main__":
    main()
