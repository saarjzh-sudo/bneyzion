#!/usr/bin/env python3
"""
ייבוא קורס "למה ללמוד תנ"ך" (יואב 21.7 23:57) — 21 סרטונים + פרומו וסיכום לכל שיעור.

מקורות:
  - וידאו: תיקיית הדרייב של יואב 1DEtmsmOiktGvTQEf0nMxwBnN2Ch3EbP1
    (21 קבצים: 2 הקדמות + פרק 1×6 + פרק 2×5 + פרק 3×4 + פרק 4×4 — התאמה 1:1
    לסדר השיעורים במסמך). video_url = קישור /preview של דרייב.
  - טקסטים: המסמך שיואב צירף בוואטסאפ (docx) — משפט מוביל → description,
    "סיכום — מה למדנו" → content_html. פורסר ל-lessons.json (בתיקייה הזו).

יעד: הקורס הקיים "למה (וכמה) ללמוד תנ"ך" id=5fb9f3e3-2928-45a5-9a11-21430fbebc87
  (0 שיעורים כרגע, יש לו כבר עטיפת אקוורל) —
  - title מתעדכן ל'למה ללמוד תנ"ך' (השם של יואב)
  - access_type=requires_tag + access_tag=course:<id> (קורס למכירה; price=0
    ⇒ מוסתר מהקטלוג עד שיואב יקבע מחיר/יקשר מוצר — כמו שסוכם)
  - 21 שיעורים published

אידמפוטנטי: מדלג על שיעור שכבר קיים (course_id + lesson_number).
snapshot: אין צורך בטבלת-גיבוי — הקורס ריק (0 שיעורים, נבדק 22.7); rollback =
  DELETE FROM community_course_lessons WHERE course_id='5fb9f3e3-...'.

הרצה: SUPABASE_SERVICE_ROLE_BNEYZION=<key> python3 scripts/why-learn-import/import.py [--apply]
"""
import json
import os
import sys
import urllib.parse
import urllib.request

KEY = os.environ["SUPABASE_SERVICE_ROLE_BNEYZION"]
BASE = "https://pzvmwfexeiruelwiujxn.supabase.co/rest/v1"
COURSE_ID = "5fb9f3e3-2928-45a5-9a11-21430fbebc87"
APPLY = "--apply" in sys.argv
HERE = os.path.dirname(os.path.abspath(__file__))


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


lessons = json.load(open(os.path.join(HERE, "lessons.json")))
course = req(f"/community_courses?id=eq.{COURSE_ID}&select=id,title,access_type,access_tag,price,image_url")
existing = req(f"/community_course_lessons?course_id=eq.{COURSE_ID}&select=lesson_number")
existing_nums = {r["lesson_number"] for r in existing}

print("course:", json.dumps(course, ensure_ascii=False))
print(f"lessons in payload: {len(lessons)} · already in DB: {len(existing_nums)}")

todo = [l for l in lessons if l["lesson_number"] not in existing_nums]
print(f"to insert: {len(todo)}")
if not APPLY:
    for l in todo[:5]:
        print("  e.g.", l["lesson_number"], l["section_title"], "|", l["title"])
    print("dry-run בלבד. להחלה: --apply")
    sys.exit(0)

# 1. עדכון הקורס עצמו
req(
    f"/community_courses?id=eq.{COURSE_ID}",
    body={
        "title": 'למה ללמוד תנ"ך',
        "description": "למה בכלל ללמוד תנ״ך? קורס יסוד שמפרק את המחסומים, פותח את הדלת ומחבר אותנו מחדש לספר הספרים.",
        "access_type": "requires_tag",
        "access_tag": f"course:{COURSE_ID}",
        "status": "active",
    },
    method="PATCH",
)

# 2. השיעורים
inserted = 0
for l in todo:
    row = {
        "course_id": COURSE_ID,
        "lesson_number": l["lesson_number"],
        "title": l["title"],
        "section_title": l["section_title"],
        "description": l["description"] or None,
        "content_html": l["content_html"],
        "video_url": l["video_url"],
        "status": "published",
    }
    req("/community_course_lessons", body=row, method="POST")
    inserted += 1
    print(f"  + {l['lesson_number']:>2} {l['title']}")

# 3. אימות
after = req(f"/community_course_lessons?course_id=eq.{COURSE_ID}&select=lesson_number&order=lesson_number")
nums = [r["lesson_number"] for r in after]
assert len(nums) == 21 and nums == list(range(1, 22)), f"unexpected lesson set: {nums}"
print(f"✓ inserted {inserted} · total now {len(nums)} (1..21 רצוף)")
