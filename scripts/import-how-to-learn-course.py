#!/usr/bin/env python3
"""
העלאת קורס "איך לומדים תנ"ך" — 24 סרטונים מהדרייב של יואב (16.7.2026)

מקור: https://drive.google.com/drive/folders/1dEWcfwdpS6z79RYkXCpVi8LTwyj0KJWN
(4 תיקיות פרקים; בכל אחת תיקיית "עם כתוביות" = הגרסה הנכונה, הוראת יואב)

קורס יעד: 78499931-fccb-44f5-8efd-f52f608184a2 (קורס רגיל, section_title).
אידמפוטנטי: מדלג על video_url שכבר קיים. כותרות נוקו משמות הקבצים.
שימוש: python3 scripts/import-how-to-learn-course.py [--dry-run|--apply]
"""
import json, re, sys, urllib.request, pathlib, datetime

REF = "pzvmwfexeiruelwiujxn"
COURSE_ID = "78499931-fccb-44f5-8efd-f52f608184a2"

S1 = "פרק 1 — איך לפגוש את הפסוקים"
S2 = "פרק 2 — השאלות: שער הכניסה לתנ\"ך"
S3 = "פרק 3 — השאלות מובילות אל תשובות גדולות"
S4 = "פרק 4 — פיתוח המבט הכללי על התנ\"ך"

LESSONS = [  # (section, title, drive-file-id)
    (S1, "הקדמה לקורס", "1ePyCJNtB4u6nB89P4d9eMDo8UPUE1vln"),
    (S1, "הפסוקים לפני הכל", "1eeTeKDJhaCtXC0J9fiXdYepWCpyB9Qs7"),
    (S1, "לדעת להקשיב", "1enxxT3ucBAjWBiezlY_kRl-BNOR5tj4X"),
    (S1, "לקרוא ולקרוא", "1f69bt1XwI8biF9muHMawa8kAtCDykozg"),
    (S1, "המילים פועלות בתוכנו", "1f9hgWLESM590aLqos9hxl-oKDbZ_jSQ7"),
    (S1, "העולם המופלא של השינון", "1f_XOTagtuudB2dO6CQKTBMjWLsvWyHnn"),
    (S2, "השאלות הן שער הכניסה", "1fxjW1JB1tTJw70CD2cJGspozK5mR78MW"),
    (S2, "להרשות לעצמך לשאול", "1g0eQ4wzfY7wkNp_4g1u-WfXnRHsMl9VP"),
    (S2, "השאלה היא המצפן", "1g6AZxmujx_2N5nXfjTTHfR9MFJTxFjZQ"),
    (S2, "השאלה המרכזית", "1gA63QekOOd3OKqgSsdw0zCTmVwH7k1bR"),
    (S2, "השאלות מובילות למפרשים", "1gOEyjYORYAFvwAwA3kd9U4DxRQqm-1xl"),
    (S2, "הדרך הפרקטית ללמוד תנ\"ך", "1gQzx-qO8F-kVG4utv8RSCmIeBrKKkjZ1"),
    (S3, "הקדמה לפרק — להעיז לחשוב", "1iRXKz56OicyhxE2J-Cv_5VaLkm8nLqgb"),
    (S3, "מן השאלה אל התשובה", "1ia3uyi-7wK9CSuB3j7gJxDXhzg0KVWTU"),
    (S3, "להרחיב את השאלה", "1ibMZoiNSmyXM9GX_89UBo0I7hg5CVuKr"),
    (S3, "לבחון את התשובות שלנו", "1id6dTvcLtSqZsZmEqGFz8jTsj9pILkTU"),
    (S3, "חיפוש במדרשים ובמפרשים", "1ilcmBIkfzpCUAVi6_34IhztqtIJLRl-S"),
    (S4, "להתמקד בכללים ולא בפרטים", "1hw9xmrAekQiAOesMbkUlHYldEyJu_maU"),
    (S4, "האמת הגדולה נמצאת בכללים", "1hxAcgiBd0le-0_NiHNYYMBsPN6s2lmni"),
    (S4, "סוגים שונים של כללים", "1hztHmGtobW73to2HDbHOJn9tC98bWaQb"),
    (S4, "המבט הכללי הוא מצפן", "1i--JoEEwJ9yYqydzl94_zf3OWXP7pf5Q"),
    (S4, "בהירות ופשטות", "1i1WHW-ZMh9-Z93VpRShpaz0ZiBqoWInm"),
    (S4, "המסע הבלשי", "1i-imRT_nlRZQYbx8uUdzt9b6t89CzEVL"),
    (S4, "סיכום הקורס", "1i3dpKdxLBglcgVzawBkDhlgoOyrwPMTA"),
]

def load_key():
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

def head_ok(url):
    req = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status == 200
    except Exception:
        return False

def main():
    apply = "--apply" in sys.argv
    key = load_key()
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    have = {r["video_url"] for r in (rest(key, "GET",
        f"community_course_lessons?course_id=eq.{COURSE_ID}&select=video_url") or []) if r.get("video_url")}

    rows, bad = [], 0
    for i, (section, title, fid) in enumerate(LESSONS, 1):
        url = f"https://drive.google.com/file/d/{fid}/preview"
        ok = head_ok(f"https://drive.google.com/file/d/{fid}/view")
        print(f"  {i:>2}. [{section[:12]}…] {title} {'✓' if ok else '✗'}")
        if not ok: bad += 1; continue
        if url in have: continue
        rows.append({"course_id": COURSE_ID, "title": title, "section_title": section,
                     "video_url": url, "lesson_number": i, "status": "published", "published_at": now})
    if bad:
        print(f"⚠️ {bad} קבצים לא נגישים — עוצר"); sys.exit(1)
    print(f"to insert: {len(rows)} | already there: {len(LESSONS)-len(rows)}")
    if apply and rows:
        rest(key, "POST", "community_course_lessons", rows, prefer="return=minimal")
        rest(key, "PATCH", f"community_courses?id=eq.{COURSE_ID}",
             {"total_lessons": len(LESSONS)}, prefer="return=minimal")
        print("inserted ✓")

if __name__ == "__main__":
    main()
