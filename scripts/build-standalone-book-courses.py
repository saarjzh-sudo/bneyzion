#!/usr/bin/env python3
"""
קורסים בודדים לספרי תכנית הפרק השבועי (יואב 21.7 17:45ב + הקלטה 19:05).

"שתיקח כל אחד מהספרים שנלמדו ותהפוך אותו לקורס נפרד שבו יהיו רק שני
 דברים: השיעור השבועי שהעברתי וסיכום השיעור. לדוגמה: קורס ספר עזרא —
 עמוד לכל פרק ובכל פרק רק השיעור שלי והסיכום שלו."

מה הסקריפט עושה:
  לכל ספר ב-BOOKS (עזרא, נחמיה, דניאל — השלושה שיואב מנה בהקלטה):
  1. שולף מקורס-התכנית (program_slug=book-*) את שורות layer_type='weekly'
     בלבד — "השיעור השבועי" (וידאו), "(שמע)" והסיכום — מקובצות לפי פרק.
  2. יוצר/מעדכן קורס עצמאי "קורס ספר X" (בלי program_slug! — קורס רגיל
     עם section_title="פרק א׳" וכו'), אותה תמונת-עטיפה של קורס-התכנית.
     description = "מבוסס על תכנית הפרק השבועי" (הקלטה 19:05 — כדי שמנוי
     קיים לא ירכוש בטעות; מוצג על הכרטיס ובדף המכירה).
  3. access_type=requires_tag + access_tag=course:<id> + price=0 —
     מוסתר מהקטלוג עד שיואב יקבע מחיר / יקשר מוצר-חנות.

  עזרא: קיים כבר "קורס ספר עזרא" fa23abe0 (ניסיון קודם עם כל 84 השורות —
  לא מה שיואב ביקש) → שיעוריו נמחקים ונבנים מחדש weekly-בלבד, הקורס נשמר.
  rollback: DELETE שיעורי הקורסים שנוצרו; שחזור עזרא הישן — אין צורך
  (היה עותק מלא של קורס-התכנית, שנשאר המקור).

אידמפוטנטי: --apply חוזר בונה מחדש רק קורס שחסרים בו שיעורים.
הרצה: SUPABASE_SERVICE_ROLE_BNEYZION=<key> python3 scripts/build-standalone-book-courses.py [--apply]
"""
import json
import os
import sys
import urllib.request

KEY = os.environ["SUPABASE_SERVICE_ROLE_BNEYZION"]
BASE = "https://pzvmwfexeiruelwiujxn.supabase.co/rest/v1"
APPLY = "--apply" in sys.argv

# ספר → (program course id, קורס עצמאי קיים אם יש)
# 22.7 אחה"צ (יואב 13:25): נוספו אסתר, איכה וזכריה — "ואז זהו, יש לנו אותם".
# course_title מפורש כי מגילות ≠ "קורס ספר X".
BOOKS = [
    {"name": "עזרא",   "course_title": "קורס ספר עזרא",   "program_id": "35e7d37b-a263-4e85-a8d8-16fdbae312ae", "standalone_id": "fa23abe0-d580-4fa8-a9aa-98062e7e41d2"},
    {"name": "נחמיה",  "course_title": "קורס ספר נחמיה",  "program_id": "e1ec3ebc-fdf6-41be-a1fe-262174c2c8dd", "standalone_id": "3c429936-3fa3-4c16-9bd6-24c4e7f226be"},
    {"name": "דניאל",  "course_title": "קורס ספר דניאל",  "program_id": "ccee8278-ca37-4025-a5b8-13ea99617a24", "standalone_id": "1f17bb44-d1a2-4478-948d-48b407b310a2"},
    {"name": "אסתר",   "course_title": "קורס מגילת אסתר", "program_id": "e3ee44dd-07f8-4902-a5cf-07bd1645de92", "standalone_id": None},
    {"name": "איכה",   "course_title": "קורס מגילת איכה", "program_id": "3f9742e3-370e-4f98-b9d2-3aaae94da38e", "standalone_id": None},
    {"name": "זכריה",  "course_title": "קורס ספר זכריה",  "program_id": "dff61c84-48d4-4d11-88de-1f52ecbd7885", "standalone_id": None},
]

HEB = ["א","ב","ג","ד","ה","ו","ז","ח","ט","י","יא","יב","יג","יד","טו","טז","יז","יח","יט","כ","כא","כב","כג","כד"]
def heb_chapter(n: int) -> str:
    return f"פרק {HEB[n-1]}׳" if 1 <= n <= len(HEB) else f"פרק {n}"


def req(path, body=None, method="GET"):
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = "return=representation"
        data = json.dumps(body).encode()
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(r) as resp:
        txt = resp.read().decode()
        return json.loads(txt) if txt else None


# יואב: "רק שני דברים — השיעור השבועי והסיכום". "מסמך נלווה" לא נכנס.
def include_lesson(lesson) -> bool:
    t = lesson.get("title") or ""
    return "מסמך נלווה" not in t


# שמות קבצים גולמיים ("נחמיה פרק א'.mp4") → כותרת אחידה ומכירתית.
# יואב 22.7 13:25: בקורסים הבודדים השם הוא "שיעור על הפרק" (לא "השיעור השבועי").
def clean_title(lesson) -> str:
    t = (lesson.get("title") or "").strip()
    if t.lower().endswith(".mp4") or ".mp4" in t.lower():
        return "שיעור על הפרק — הרב יואב אוריאל"
    return t.replace("השיעור השבועי", "שיעור על הפרק")


# סדר קבוע בתוך פרק: וידאו → שמע → סיכום חזותי → סיכום השיעור
def weekly_sort_key(lesson):
    t = lesson.get("title") or ""
    if "סיכום השיעור" in t:
        return 3
    if "סיכום" in t:
        return 2
    if "שמע" in t or (lesson.get("audio_url") and not lesson.get("video_url")):
        return 1
    return 0


for book in BOOKS:
    prog = req(f"/community_courses?id=eq.{book['program_id']}&select=id,title,image_url,description")[0]
    weekly = req(
        f"/community_course_lessons?course_id=eq.{book['program_id']}"
        "&layer_type=eq.weekly&status=eq.published"
        "&select=title,description,video_url,audio_url,content_html,attachment_url,bible_chapter"
    )
    by_ch = {}
    for l in weekly:
        ch = l.get("bible_chapter")
        if ch is None or not include_lesson(l):
            continue
        by_ch.setdefault(int(ch), []).append(l)
    chapters = sorted(by_ch)
    total = sum(len(v) for v in by_ch.values())
    print(f"\n📘 {book['name']}: {len(chapters)} פרקים עם שיעור שבועי · {total} פריטי weekly")

    if not APPLY:
        for ch in chapters[:3]:
            for l in sorted(by_ch[ch], key=weekly_sort_key):
                print(f"   {heb_chapter(ch)} | {clean_title(l)}")
        continue

    # ── הקורס העצמאי ──
    title = book.get("course_title") or f"קורס ספר {book['name']}"
    desc = "מבוסס על תכנית הפרק השבועי — שיעור על הפרק מאת הרב יואב אוריאל והסיכום שלו, לכל פרק בספר."
    cid = book["standalone_id"]
    # אידמפוטנטיות אמיתית: קורס שכבר בנוי במלואו — מדלגים (בלי DELETE+rebuild,
    # כדי לא להחליף ids של שיעורים לחינם). rebuild מלא: למחוק את שיעוריו ידנית קודם.
    if cid:
        existing = req(f"/community_course_lessons?course_id=eq.{cid}&select=id")
        if len(existing) == total and total > 0:
            print(f"   ✓ כבר בנוי במלואו ({total} שיעורים) — מדלג ({cid})")
            continue
    if cid:
        req(f"/community_courses?id=eq.{cid}", body={
            "title": title, "description": desc, "image_url": prog.get("image_url"),
            "access_type": "requires_tag", "access_tag": f"course:{cid}",
            "status": "active", "price": 0,
        }, method="PATCH")
        # ניקוי השיעורים הקיימים (העותק המלא הישן) לפני בנייה מחדש
        req(f"/community_course_lessons?course_id=eq.{cid}", method="DELETE")
        print(f"   קיים → נוקה ונבנה מחדש ({cid})")
    else:
        created = req("/community_courses", body={
            "title": title, "description": desc, "image_url": prog.get("image_url"),
            "access_type": "requires_tag", "status": "active", "price": 0,
        }, method="POST")
        cid = created[0]["id"]
        req(f"/community_courses?id=eq.{cid}", body={"access_tag": f"course:{cid}"}, method="PATCH")
        print(f"   נוצר קורס חדש ({cid})")

    n = 0
    for ch in chapters:
        for l in sorted(by_ch[ch], key=weekly_sort_key):
            n += 1
            req("/community_course_lessons", body={
                "course_id": cid,
                "lesson_number": n,
                "title": clean_title(l),
                "section_title": heb_chapter(ch),
                "description": l.get("description"),
                "video_url": l.get("video_url"),
                "audio_url": l.get("audio_url"),
                "content_html": l.get("content_html"),
                "attachment_url": l.get("attachment_url"),
                "status": "published",
            }, method="POST")
    check = req(f"/community_course_lessons?course_id=eq.{cid}&select=id")
    assert len(check) == n, f"{book['name']}: inserted {n} but found {len(check)}"
    print(f"   ✓ {n} שיעורים ב-{len(chapters)} פרקים")

print("\nסיום." if APPLY else "\ndry-run בלבד. להחלה: --apply")
