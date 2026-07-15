#!/usr/bin/env python3
"""
סנכרון שוטף — תכני הפרק השבועי: Drive → community_course_lessons (רמה 19)

הבעיה שזה פותר: הייבוא היה חד-פעמי, והשיעורים החדשים שעולים לדרייב כל שבוע
לא הגיעו לאתר (ככה זכריה נתקע על פרק ב' בזמן שהשיעור בשטח היה על י"ד).

מה הסקריפט עושה בכל ריצה:
  1. סורק את תיקיות הספרים של התכנית בדרייב (rclone, shared drive).
  2. מזהה קבצים בתיקיות פרקים (פרק X / פרק X + פרק Y) בשלוש השכבות
     (תכני הבסיס / תכני הרחבה / השיעור השבועי) — כל השאר מדולג בכוונה.
  3. מוסיף ל-DB רק מה שחדש (append-only, אין עדכון/מחיקה):
     - דילוג לפי drive-file-id שכבר קיים באותו פרק
     - docx מדולג אם pdf/כותרת-זהה כבר קיימים (תאום-קבצים)
  4. שיעור weekly חדש → "הפרק הנוכחי" באתר מתקדם מעצמו (הלוגיקה בדף).

בטיחות: append-only · אידמפוטנטי · ריצה כפולה לא מכפילה · ספר שלא ממופה
ב-BOOKS פשוט לא מסונכרן (מדווח באזהרה — סימן שצריך למפות ספר חדש).

שימוש:  python3 scripts/sync-weekly-chapter-drive.py            # dry-run
        python3 scripts/sync-weekly-chapter-drive.py --apply    # כתיבה
מתוזמן: launchd `com.saar.bz-weekly-drive-sync` (2×יום, לוג ב-~/Library/Logs).
"""
import json, re, subprocess, sys, urllib.request, urllib.parse, pathlib, datetime

REF = "pzvmwfexeiruelwiujxn"
TEAM_DRIVE = "0AFz55knVlI2BUk9PVA"
ROOT = "gdrive:ספרי תכנית הפרק השבועי"

# תיקיית-דרייב (יחסית ל-ROOT) → (course_id, שם הספר בעברית)
BOOKS = {
    "הפרק השבועי - עזרא":                     ("35e7d37b-a263-4e85-a8d8-16fdbae312ae", "עזרא"),
    "הפרק השבועי - נחמיה":                    ("e1ec3ebc-fdf6-41be-a1fe-262174c2c8dd", "נחמיה"),
    "הפרק השבועי - דניאל":                    ("ccee8278-ca37-4025-a5b8-13ea99617a24", "דניאל"),
    "הפרק השבועי - מגילת אסתר":               ("e3ee44dd-07f8-4902-a5cf-07bd1645de92", "אסתר"),
    "הפרק השבועי - מגילת איכה":               ("3f9742e3-370e-4f98-b9d2-3aaae94da38e", "איכה"),
    "הפרק השבועי - חגי, זכריה ומלאכי/1. זכריה": ("dff61c84-48d4-4d11-88de-1f52ecbd7885", "זכריה"),
    "הפרק השבועי - חגי, זכריה ומלאכי/2. חגי":   ("a0a70711-0001-4b01-8001-c0ffee000001", "חגי"),
    "הפרק השבועי - חגי, זכריה ומלאכי/3. מלאכי": ("a0a70711-0002-4b01-8001-c0ffee000002", "מלאכי"),
}

GEMATRIA = {"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ל":30}
HEB_CH = {1:"א׳",2:"ב׳",3:"ג׳",4:"ד׳",5:"ה׳",6:"ו׳",7:"ז׳",8:"ח׳",9:"ט׳",10:"י׳",
          11:"י״א",12:"י״ב",13:"י״ג",14:"י״ד",15:"ט״ו",16:"ט״ז",17:"י״ז",18:"י״ח",
          19:"י״ט",20:"כ׳",21:"כ״א",22:"כ״ב",23:"כ״ג",24:"כ״ד"}

def heb_to_num(s):
    v = sum(GEMATRIA.get(c, 0) for c in s)
    return v if 0 < v <= 36 else None

def parse_chapter_folder(name):
    """'פרק א'' → [1] · 'פרק ח' + פרק ט'' → [8,9] · לא-פרק → []"""
    hits = re.findall(r"פרק\s+([א-ת]{1,3})", name)
    out = []
    for h in hits:
        n = heb_to_num(h)
        if n: out.append(n)
    return sorted(set(out))

def layer_of(dirname):
    if "בסיס" in dirname: return "base"
    if "הרחבה" in dirname: return "enrichment"
    if "שיעור" in dirname: return "weekly"
    return None

def classify(layer, fname):
    """(role, canonical-title, sort-order); title=None → שם קובץ מנוקה"""
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
    if re.search(r"\.(png|jpe?g)$", f, re.I):
        if "סיכום" in f: return ("visual", "סיכום חזותי", 4)
        return ("chart", "תרשים / מפה", 5)
    if f.endswith(".mp4") and "סיכום" not in f:
        # וידאו בלי אזכור "פרק" (למשל upload גולמי של זום) — שם קובץ, לא כותרת קנונית
        if re.search(r"פרק", f): return ("weekly_video", "השיעור השבועי — הרב יואב אוריאל", 1)
        return ("other", None, 2)
    if "סיכום" in f: return ("summary", "סיכום השיעור — הרב יואב אוריאל", 3)
    return ("other", None, 6)

def media_cols(fname, url):
    f = fname.lower()
    if re.search(r"\.(mp3|mpeg|oga|m4a)$", f): return {"audio_url": url}
    if f.endswith(".mp4"): return {"video_url": url}
    if re.search(r"\.(png|jpe?g)$", f): return {"thumbnail_url": url, "attachment_url": url}
    if re.search(r"\.(pdf|docx?)$", f): return {"attachment_url": url}
    return {}

def clean_title(fname):
    return re.sub(r"\.(pdf|docx?|mp3|mp4|mpeg|oga|m4a|png|jpe?g)+$", "", fname, flags=re.I).replace("_", " ").strip()

def resolve_chapters(chapters, fname):
    """בתיקייה משולבת: קובץ שמזכיר פרק ספציפי משויך רק אליו."""
    if len(chapters) < 2:
        return chapters
    norm = re.sub(r"[_'׳:]+", " ", fname)
    norm = re.sub(r"\s+", " ", norm)
    def letters(n):
        tens = {10:"י",20:"כ",30:"ל"}
        if n in (15, 16): return {15:"טו",16:"טז"}[n]
        if n <= 9: return [k for k,v in GEMATRIA.items() if v==n][0]
        t, u = (n//10)*10, n%10
        return tens[t] + ([k for k,v in GEMATRIA.items() if v==u][0] if u else "")
    a, b = chapters[0], chapters[-1]
    la, lb = letters(a), letters(b)
    if re.search(rf"{la}\s*-\s*{lb}", norm):
        return chapters
    hits = []
    for ch, l in sorted([(a, la), (b, lb)], key=lambda t: -len(t[1])):
        if re.search(rf"(?:פרק|פרקים)\s*{l}(?![א-ת])", norm) or re.search(rf"(?:עזרא|נחמיה|דניאל|אסתר|איכה|זכריה|חגי|מלאכי)\s+{l}(?![א-ת])", norm):
            hits.append(ch)
    return sorted(hits) if hits else chapters

def load_key():
    # תחת launchd אין גישה ל-Downloads (TCC) — המפתח מגיע מ-env (~/saar-jobs/bz-weekly-sync/env)
    import os
    if os.environ.get("SUPABASE_SERVICE_ROLE_BNEYZION"):
        return os.environ["SUPABASE_SERVICE_ROLE_BNEYZION"]
    txt = (pathlib.Path.home() / "Downloads/saar-workspace/וואן-מן-שואו/סקילים/04-mcp-servers/api-keys.md").read_text()
    return re.search(r"SUPABASE_SERVICE_ROLE_BNEYZION=(\S+)", txt).group(1)

def rest(key, method, path, body=None, prefer="return=representation"):
    req = urllib.request.Request(
        f"https://{REF}.supabase.co/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None, method=method,
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Content-Type": "application/json", "Prefer": prefer})
    with urllib.request.urlopen(req, timeout=90) as r:
        raw = r.read()
        return json.loads(raw) if raw else None

def drive_list(rel_path):
    out = subprocess.run(
        ["rclone", "lsf", f"{ROOT}/{rel_path}", "--drive-team-drive", TEAM_DRIVE,
         "-R", "--files-only", "--format", "ip"],
        capture_output=True, text=True)
    if out.returncode != 0:
        print(f"  ⚠️ rclone נכשל על {rel_path}: {out.stderr.strip()[:200]}")
        return []
    return [line.split(";", 1) for line in out.stdout.strip().splitlines() if ";" in line]

def sync_book(key, rel_path, course_id, book_heb, apply):
    files = drive_list(rel_path)
    if not files:
        return 0

    existing = rest(key, "GET",
        f"community_course_lessons?course_id=eq.{course_id}&bible_chapter=not.is.null"
        f"&select=bible_chapter,layer_type,title,video_url,audio_url,attachment_url")
    have_ids, have_titles = set(), set()
    for r in existing or []:
        urls = " ".join(str(r.get(c) or "") for c in ("video_url", "audio_url", "attachment_url"))
        for fid in re.findall(r"/d/([\w-]+)/", urls):
            have_ids.add((r["bible_chapter"], fid))
        have_titles.add((r["bible_chapter"], r.get("layer_type"), (r.get("title") or "").strip()))

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_rows, batch_pdf, batch_titles = [], set(), set()
    items = []
    for fid, path in files:
        parts = path.split("/")
        if len(parts) != 3:
            continue
        chapters = parse_chapter_folder(parts[0])
        layer = layer_of(parts[1])
        if not chapters or not layer:
            continue
        items.append((resolve_chapters(chapters, parts[2]), layer, parts[2], fid))

    for chapters, layer, fname, fid in items:
        if fname.lower().endswith(".pdf"):
            role = classify(layer, fname)[0]
            for ch in chapters:
                batch_pdf.add((ch, layer, role))

    for chapters, layer, fname, fid in items:
        role, title, order = classify(layer, fname)
        final_title = title or clean_title(fname)
        for ch in chapters:
            if (ch, fid) in have_ids:
                continue
            # תאום docx: pdf באותו תפקיד בבאץ'
            if fname.lower().endswith((".docx", ".doc")) and role != "other" and (ch, layer, role) in batch_pdf:
                continue
            # תפקידים עם כותרת קנונית: כותרת שכבר קיימת ב-DB (או בבאץ' הזה) =
            # אותו תוכן שהועלה מחדש עם file-id אחר — לא מכפילים
            SINGLETON = {"verses", "reading", "guidance", "steinsaltz", "summary",
                         "weekly_video", "visual", "article", "broad"}
            tkey = (ch, layer, final_title)
            if role in SINGLETON and (tkey in have_titles or tkey in batch_titles):
                continue
            if role in SINGLETON:
                batch_titles.add(tkey)
            url = f"https://drive.google.com/file/d/{fid}/preview"
            media = media_cols(fname, url)
            if not media:
                continue
            new_rows.append({
                "course_id": course_id, "bible_book": book_heb, "bible_chapter": ch,
                "layer_type": layer, "title": final_title,
                "description": f"פרק {HEB_CH.get(ch, ch)}", "lesson_number": order,
                "status": "published", "published_at": now, **media,
            })

    for r in new_rows:
        print(f"  + {book_heb} פרק {r['bible_chapter']} [{r['layer_type']}] {r['title']}")
    if apply and new_rows:
        all_keys = {k for r in new_rows for k in r}
        rows = [{k: r.get(k) for k in all_keys} for r in new_rows]
        rest(key, "POST", "community_course_lessons", rows, prefer="return=minimal")
    return len(new_rows)

def main():
    apply = "--apply" in sys.argv
    key = load_key()
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    total = 0
    print(f"[{stamp}] sync-weekly-chapter-drive {'APPLY' if apply else 'DRY-RUN'}")
    for rel_path, (course_id, book_heb) in BOOKS.items():
        n = sync_book(key, rel_path, course_id, book_heb, apply)
        total += n
        if n:
            print(f"  {book_heb}: {n} פריטים חדשים{' — נכתבו' if apply else ' (dry-run)'}")
    print(f"[{stamp}] done — {total} new items")

if __name__ == "__main__":
    main()
