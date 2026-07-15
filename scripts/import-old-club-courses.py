#!/usr/bin/env python3
"""
מיגרציית שני הקורסים הפעילים מאתר המכירות הישן (club.bneyzion.co.il) — רמה 19

יואב 15.7: "תעשה מיגרציה לשני קורסים פעילים שאנשים קונים אותם, מאתר המכירות הישן"
- קצב הפעימות של התנ"ך (מוצר wc-989, ₪90) — 5 שיעורים
- ספר יהושע במבט רחב (מוצר wc-401, ₪190) — 20 שיעורים ב-7 נושאים

מקור הווידאו: S3 ציבורי (bneyzion.s3.us-east-2.amazonaws.com) — המבנה והסדר
נלקחו מ-listing של ה-bucket (המספור בשמות הקבצים = סדר הקורס); כותרות
השיעורים ביהושע = כותרות הפוסטים באתר הישן (אומת מול שקף "שיעור שלישי:
העם שנברא מחוץ לארצו"). פעימות 3/4 זוהו בתמלול whisper (3=הפלאות, 4=גאולה).

גישה לרוכשים: תג course:pulses / course:yehoshua-wide, מוענק ב-webhook על
רכישת המוצר בחנות (STORE_PRODUCT_COURSE_TAGS) + linkPendingAccessTags בכניסה.

אידמפוטנטי: קורס לפי access_tag, שיעור לפי video_url.
שימוש: python3 scripts/import-old-club-courses.py [--dry-run|--apply]
"""
import json, re, sys, urllib.request, urllib.parse, pathlib, datetime

REF = "pzvmwfexeiruelwiujxn"
S3 = "https://bneyzion.s3.us-east-2.amazonaws.com/"
BASE_DIR = "הרב יואב אוריאל/קורסים דיגיטליים/"

def s3url(path):
    return S3 + urllib.parse.quote(BASE_DIR + path)

PULSES_DIR = "קורס דיגיטלי - קצב הפעימות של התנך/"
YEHO_DIR = "קורס דיגיטלי יהושע/"

COURSES = [
    {
        "title": 'קצב הפעימות של התנ"ך',
        "description": 'גילוי הפעימות הקבועות שמניעות את ההיסטוריה התנ"כית — מסע בין צמתי הזמן הגדולים של התנ"ך.',
        "access_tag": "course:pulses",
        "store_product_slug": "wc-989",
        "price": 90,
        "lessons": [  # (section, title, s3-path)
            (None, "פתיחה לקורס הפעימות בתנ\"ך", PULSES_DIR + "קצב הפעימות של התנך - פתיחה.mp4"),
            (None, "פעימות ארבעים השנה", PULSES_DIR + "קצב הפעימות של התנך 1 - פעימות ארבעים השנה.mp4"),
            (None, "פעימות של מאות שנים", PULSES_DIR + "קצב הלב של התנך 2 - פעימות של מאות שנים.mp4"),
            (None, "הפלאות של פעימות התנ\"ך", PULSES_DIR + "קצב הפעימות של התנך 3.mp4"),
            (None, "פעימות של גאולה", PULSES_DIR + "קצב הפעימות של התנך 4.mp4"),
        ],
    },
    {
        "title": "ספר יהושע במבט רחב",
        "description": "קורס מקיף על ספר יהושע — המעבר מהתורה לנביאים, הכניסה לארץ, הכיבוש וההתנחלות, במבט רחב ומאיר לדורנו.",
        "access_tag": "course:yehoshua-wide",
        "store_product_slug": "wc-401",
        "price": 190,
        "lessons": [
            ("המעבר החריף מהתורה ליהושע", "מעובריות ללידה", YEHO_DIR + "סידרה ראשונה המעבר החריף מהתורה ליהושע - 4 שיעורים/המעבר החריף מהתורה ליהושע 1.mp4"),
            ("המעבר החריף מהתורה ליהושע", "היום בו ישראל הפכו לעם", YEHO_DIR + "סידרה ראשונה המעבר החריף מהתורה ליהושע - 4 שיעורים/המעבר החריף מהתורה ליהושע 2.mp4"),
            ("המעבר החריף מהתורה ליהושע", "העם שנברא מחוץ לארצו", YEHO_DIR + "סידרה ראשונה המעבר החריף מהתורה ליהושע - 4 שיעורים/המעבר החריף מהתורה ליהושע 3.mp4"),
            ("המעבר החריף מהתורה ליהושע", "המנהיג מששת ימי בראשית", YEHO_DIR + "סידרה ראשונה המעבר החריף מהתורה ליהושע - 4 שיעורים/המעבר החריף מהתורה ליהושע 4.mp4"),
            ("הפלא של ספר יהושע", "הספר בו הכל התרחש כצפוי", YEHO_DIR + "סידרה שניה הפלא של ספר יהושע - 3 שיעורים/הפלא של ספר יהושע 1.mp4"),
            ("הפלא של ספר יהושע", "תהפוכות התנ\"ך ממשיכות", YEHO_DIR + "סידרה שניה הפלא של ספר יהושע - 3 שיעורים/הפלא של ספר יהושע 2.mp4"),
            ("הפלא של ספר יהושע", "ההפתעה הכפולה של יהושע", YEHO_DIR + "סידרה שניה הפלא של ספר יהושע - 3 שיעורים/הפלא של ספר יהושע 3.mp4"),
            ("אתגרי הכניסה אל ארץ ישראל", "הכניסה לארץ מכיוון מזרח", YEHO_DIR + "סידרה שלישית אתגרי הכניסה אל ארץ ישראל - 6 שיעורים/אתגרי הכניסה אל ארץ ישראל 1.mp4"),
            ("אתגרי הכניסה אל ארץ ישראל", "הכניסה המדורגת לארץ", YEHO_DIR + "סידרה שלישית אתגרי הכניסה אל ארץ ישראל - 6 שיעורים/אתגרי הכניסה אל ארץ ישראל 2.mp4"),
            ("אתגרי הכניסה אל ארץ ישראל", "אתגר הפגישה עם טוב הארץ", YEHO_DIR + "סידרה שלישית אתגרי הכניסה אל ארץ ישראל - 6 שיעורים/אתגרי הכניסה אל ארץ ישראל 3.mp4"),
            ("אתגרי הכניסה אל ארץ ישראל", "אתגר אחדות העם", YEHO_DIR + "סידרה שלישית אתגרי הכניסה אל ארץ ישראל - 6 שיעורים/אתגרי הכניסה אל ארץ ישראל 4.mp4"),
            ("אתגרי הכניסה אל ארץ ישראל", "סכנת פיצול העם", YEHO_DIR + "סידרה שלישית אתגרי הכניסה אל ארץ ישראל - 6 שיעורים/אתגרי הכניסה אל ארץ ישראל 5.mp4"),
            ("אתגרי הכניסה אל ארץ ישראל", "אתגר ישוב הארץ", YEHO_DIR + "סידרה שלישית אתגרי הכניסה אל ארץ ישראל - 6 שיעורים/אתגרי הכניסה אל ארץ ישראל 6.mp4"),
            ("פרקי הכניסה לארץ (יהושע א-ה)", "יהושע מנהיג מיוחד", YEHO_DIR + "סידרה רביעית יהושע פרקים א-ה  - פרקי הכניסה לארץ - 3 שיעורים/פרקים א-ה1. יהושע מנהיג מיוחד.mp4"),
            ("פרקי הכניסה לארץ (יהושע א-ה)", "הניצחון הגדול על המים", YEHO_DIR + "סידרה רביעית יהושע פרקים א-ה  - פרקי הכניסה לארץ - 3 שיעורים/פרקים א-ה2. הניצחון ההיסטורי על המים.mp4"),
            ("פרקי הכניסה לארץ (יהושע א-ה)", "האבנים בספר יהושע", YEHO_DIR + "סידרה רביעית יהושע פרקים א-ה  - פרקי הכניסה לארץ - 3 שיעורים/פרקים א-ה3. האבנים בספר יהושע.mp4"),
            ("פרקי כיבוש הארץ (יהושע ו-יא)", "למה גירשנו את הכנענים?", YEHO_DIR + "סידרה חמישית יהושע פרקים ו-יא - פרקי כיבוש הארץ - 2 שיעורים/המפגש עם עמי כנען 1.mp4"),
            ("פרקי כיבוש הארץ (יהושע ו-יא)", "התפקיד החיובי של הכנענים", YEHO_DIR + "סידרה חמישית יהושע פרקים ו-יא - פרקי כיבוש הארץ - 2 שיעורים/המפגש עם עמי כנען 2.mp4"),
            ("פרקי ההתנחלות (יהושע יג-כב)", "הגישה לפרקי הנחלה ביהושע", YEHO_DIR + "סידרה שישית יהושע פרקים יג-כב פרקי ההתנחלות - 1 שיעורים/פרקים יג-כב. הגישה לפרקי ההתנחלות ביהושע.mp4"),
            ("סיום", "הפרידה המפתיעה מיהושע", YEHO_DIR + "הפרידה המפתיעה של יהושע.mp4"),
        ],
    },
]

def load_keys():
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

def head_ok(url):
    req = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status == 200
    except Exception:
        return False

def main():
    apply = "--apply" in sys.argv
    key = load_keys()
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    for spec in COURSES:
        print(f"\n══ {spec['title']} ══")
        rows, bad = [], 0
        for i, (section, title, path) in enumerate(spec["lessons"], 1):
            url = s3url(path)
            ok = head_ok(url)
            print(f"  {i:>2}. [{section or '—'}] {title} {'✓' if ok else '✗ 404'}")
            if not ok:
                bad += 1; continue
            rows.append({"title": title, "section_title": section, "video_url": url, "lesson_number": i})
        if bad:
            print(f"  ⚠️ {bad} קבצים לא נגישים — עוצר (fail-closed)"); sys.exit(1)
        if not apply:
            continue

        existing = rest(key, "GET", f"community_courses?access_tag=eq.{urllib.parse.quote(spec['access_tag'])}&select=id")
        if existing:
            course_id = existing[0]["id"]
            print(f"  course exists: {course_id}")
        else:
            created = rest(key, "POST", "community_courses", [{
                "title": spec["title"], "description": spec["description"],
                "access_type": "requires_tag", "access_tag": spec["access_tag"],
                "store_product_slug": spec["store_product_slug"],
                "price": spec["price"], "status": "active",
                "total_lessons": len(rows), "sort_order": 90,
            }])
            course_id = created[0]["id"]
            print(f"  course created: {course_id}")

        have = {r["video_url"] for r in (rest(key, "GET",
            f"community_course_lessons?course_id=eq.{course_id}&select=video_url") or []) if r.get("video_url")}
        new_rows = [{**r, "course_id": course_id, "status": "published", "published_at": now}
                    for r in rows if r["video_url"] not in have]
        if new_rows:
            rest(key, "POST", "community_course_lessons", new_rows, prefer="return=minimal")
        print(f"  lessons inserted: {len(new_rows)} (skipped existing: {len(rows)-len(new_rows)})")
        rest(key, "PATCH", f"community_courses?id=eq.{course_id}",
             {"total_lessons": len(rows)}, prefer="return=minimal")

if __name__ == "__main__":
    main()
