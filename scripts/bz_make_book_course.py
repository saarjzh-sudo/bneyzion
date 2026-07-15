#!/usr/bin/env python3
"""
bz_make_book_course.py — יוצר "קורס נמכר" רגיל מתוך ספר של הפרק-השבועי.

הפיצוח (סער 15.7.2026): הפרק-השבועי (מנויים) והקורס-הנמכר על ספר הם שני
מוצרים שונים על אותו תוכן. המנוי לומד במבנה פרק+שלוש-שכבות; מי שרוכש קורס
בודד מקבל קורס רגיל — נושאים בשם חופשי ("פרק א׳ — הצהרת כורש") ובכל נושא
שיעורים — כמו קורסי אבולעפיה, עם עריכה פשוטה.

הסקריפט מעתיק (לא מזיז!) את תכני הספר לקורס חדש נפרד:
  - section "פתיחה והקדמה" מפריטי intro
  - section לכל פרק: "פרק א׳ — <נושא אם קיים>", בסדר: בסיס → הרחבה → שיעור
  - הקורס נוצר כ-draft (מוסתר מהקטלוג) — מפעילים רק אחרי הכרעה אסטרטגית.

אידמפוטנטי: אם כבר קיים קורס עם אותו slug נגזר — הסקריפט עוצר (או --refresh
שמוחק את שיעורי הקורס הנגזר ובונה מחדש; הקורס עצמו ומזהו נשמרים).

שימוש:
  python3 scripts/bz_make_book_course.py book-ezra           # יצירה
  python3 scripts/bz_make_book_course.py book-ezra --refresh # רענון תוכן
"""
import json
import os
import sys
import urllib.request

SB = "https://pzvmwfexeiruelwiujxn.supabase.co"
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_BNEYZION", "")

HEB = ["א","ב","ג","ד","ה","ו","ז","ח","ט","י","יא","יב","יג","יד","טו","טז","יז","יח","יט","כ","כא","כב","כג","כד","כה","כו","כז","כח","כט","ל"]
LAYER_ORDER = {"base": 0, "enrichment": 1, "weekly": 2}


def req(path, method="GET", body=None, prefer=None):
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    r = urllib.request.Request(SB + path, data=json.dumps(body).encode() if body is not None else None,
                               method=method, headers=headers)
    with urllib.request.urlopen(r) as resp:
        t = resp.read().decode()
        return json.loads(t) if t else None


def main():
    if not KEY:
        sys.exit("חסר SUPABASE_SERVICE_ROLE_BNEYZION בסביבה (ראו api-keys.md)")
    if len(sys.argv) < 2 or not sys.argv[1].startswith("book-"):
        sys.exit("שימוש: bz_make_book_course.py book-<slug> [--refresh]")
    slug = sys.argv[1]
    refresh = "--refresh" in sys.argv
    derived_slug = slug.replace("book-", "course-")  # course-ezra

    src = req(f"/rest/v1/community_courses?select=*&program_slug=eq.{slug}")
    if not src:
        sys.exit(f"לא נמצא ספר פרק-שבועי עם program_slug={slug}")
    src = src[0]

    existing = req(f"/rest/v1/community_courses?select=id,title&course_type=eq.standalone-book&access_tag=eq.{derived_slug}")
    if existing and not refresh:
        sys.exit(f"כבר קיים קורס נגזר: {existing[0]['title']} ({existing[0]['id']}). להרצה מחדש: --refresh")

    lessons = req(
        f"/rest/v1/community_course_lessons?select=*&course_id=eq.{src['id']}&status=eq.published"
        "&order=bible_chapter.nullsfirst,lesson_number"
    )
    if not lessons:
        sys.exit("אין שיעורים מפורסמים בספר המקור")

    # ── בניית המבנה: intro → פרקים (בסיס→הרחבה→שיעור) ─────────────────────
    intro = [l for l in lessons if (l.get("layer_type") or "").lower() == "intro"]
    resources = [l for l in lessons if (l.get("layer_type") or "").lower() == "resources"]
    chapter_items = {}
    for l in lessons:
        lt = (l.get("layer_type") or "").lower()
        ch = l.get("bible_chapter")
        if lt in ("intro", "resources") or not ch:
            continue
        chapter_items.setdefault(ch, []).append(l)

    def chapter_section(ch, items):
        topic = next((i["description"] for i in items if i.get("description")), None)
        label = f"פרק {HEB[ch - 1] if 0 < ch <= len(HEB) else ch}׳"
        return f"{label} — {topic}" if topic else label

    new_rows = []
    n = 0

    def add(item, section):
        nonlocal n
        n += 1
        new_rows.append({
            "lesson_number": n,
            "section_title": section,
            "title": item["title"],
            "description": item.get("description"),
            "video_url": item.get("video_url"),
            "audio_url": item.get("audio_url"),
            "attachment_url": item.get("attachment_url"),
            "content_html": item.get("content_html"),
            "status": "published",
        })

    for item in intro:
        add(item, "פתיחה והקדמה")
    for ch in sorted(chapter_items):
        items = sorted(chapter_items[ch], key=lambda l: (LAYER_ORDER.get((l.get("layer_type") or "").lower(), 9), l.get("lesson_number") or 0))
        section = chapter_section(ch, items)
        for item in items:
            add(item, section)
    for item in resources:
        add(item, "תכנים נוספים")

    # ── יצירה / רענון ──────────────────────────────────────────────────────
    if existing:
        course_id = existing[0]["id"]
        req(f"/rest/v1/community_course_lessons?course_id=eq.{course_id}", method="DELETE")
        req(f"/rest/v1/community_courses?id=eq.{course_id}", method="PATCH",
            body={"total_lessons": n})
        print(f"רוענן קורס קיים {course_id}")
    else:
        created = req("/rest/v1/community_courses", method="POST", prefer="return=representation", body={
            "title": f"קורס {src['title']}",
            "description": f"לימוד עצמאי של {src['title']} — הקורס המלא, מבוסס על תכני הפרק השבועי",
            "image_url": src.get("image_url"),
            "price": src.get("price") or 0,
            "rabbi_id": src.get("rabbi_id"),
            "status": "draft",  # מוסתר עד הכרעה אסטרטגית
            "course_type": "standalone-book",
            "access_type": "closed",
            "access_tag": derived_slug,
            "total_lessons": n,
            "sort_order": 900,
        })
        course_id = created[0]["id"]
        print(f"נוצר קורס חדש {course_id}")

    for row in new_rows:
        row["course_id"] = course_id
    req("/rest/v1/community_course_lessons", method="POST", body=new_rows)
    sections = list(dict.fromkeys(r["section_title"] for r in new_rows))
    print(f"הועתקו {n} שיעורים אל {len(sections)} נושאים:")
    for s in sections:
        print("  •", s)
    print(f"\nהקורס: /portal/course/{course_id} (draft — לא בקטלוג)")


if __name__ == "__main__":
    main()
