#!/usr/bin/env python3
"""
רמה 26ד (22.7.2026 אחה"צ) — צד ה-DB של סבב ההערות של יואב 13:16-14:32.

מה הסקריפט עושה (אידמפוטנטי, עם snapshot לפני):
  0. snapshot: community_course_lessons של 3 קורסי-הספר הקיימים +
     שתי שורות ה-series → טבלאות *_bak_r26d_20260722 (Management API).
  1. מיגרציית content_sliders (סליידרים בשליטת יואב, /admin/sliders).
  2. שינוי-שם שיעורים בקורסי-הספר הקיימים (עזרא/נחמיה/דניאל):
     "השיעור השבועי" → "שיעור על הפרק" (יואב 13:25, צילום) + עדכון תיאורי הקורסים.
  3. build-standalone-book-courses.py --apply — יוצר את אסתר/איכה/זכריה
     (הקיימים מדולגים; price=0 = מוסתרים עד תמחור יואב).
  4. סדרות רב-רבניות שהוצגו כ"הרב יואב אוריאל" (הקלטת הבודק 13:16) →
     rabbi_id = "כל הרבנים" (a24c2f68): "נושאים כלליים בתנ"ך" + "בכח התנ"ך ננצח".
  5. אימות: 0 שיעורי "השיעור השבועי" בקורסים הבודדים · ספירות הקורסים
     החדשים · rabbi_id של הסדרות · קיום content_sliders.

הרצה: SUPABASE_SERVICE_ROLE_BNEYZION=<key> SUPABASE_ACCESS_TOKEN=<sbp> \
      python3 scripts/apply-round26d-db-20260722.py [--apply]
rollback: השבת הטבלאות מ-*_bak_r26d_20260722; מחיקת קורסי אסתר/איכה/זכריה
          החדשים (access_tag=course:<id>); rabbi_id חזרה ל-acd34d0f.
"""
import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request

KEY = os.environ["SUPABASE_SERVICE_ROLE_BNEYZION"]
MGMT = os.environ["SUPABASE_ACCESS_TOKEN"]
BASE = "https://pzvmwfexeiruelwiujxn.supabase.co/rest/v1"
APPLY = "--apply" in sys.argv

STANDALONE = {
    "עזרא":  "fa23abe0-d580-4fa8-a9aa-98062e7e41d2",
    "נחמיה": "3c429936-3fa3-4c16-9bd6-24c4e7f226be",
    "דניאל": "1f17bb44-d1a2-4478-948d-48b407b310a2",
}
NEW_DESC = "מבוסס על תכנית הפרק השבועי — שיעור על הפרק מאת הרב יואב אוריאל והסיכום שלו, לכל פרק בספר."
MULTI_RABBI_SERIES = {
    "2d6d28c1-3c5c-4d61-9283-410bc56cd351": 'נושאים כלליים בתנ"ך',
    "b6eac28f-ee7f-4e3b-8b56-3946a00a979a": 'בכח התנ"ך ננצח',
}
KOL_HARABANIM = "a24c2f68-2381-4965-a03c-5958ffc163ca"
YOAV = "acd34d0f-1288-47b8-9e8e-38e69599c294"


def rest(path, body=None, method="GET"):
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


def sql(query):
    """Management API — DDL/SQL (curl: urllib נחסם ע"י Cloudflare בלי UA-דפדפן)."""
    out = subprocess.run(
        [
            "curl", "-sk", "--noproxy", "*", "-X", "POST",
            "https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query",
            "-H", f"Authorization: Bearer {MGMT}",
            "-H", "Content-Type: application/json",
            "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "-d", json.dumps({"query": query}),
        ],
        capture_output=True, text=True, check=True,
    ).stdout
    parsed = json.loads(out) if out.strip() else None
    if isinstance(parsed, dict) and parsed.get("error"):
        raise RuntimeError(f"SQL error: {parsed}")
    return parsed


def main():
    ids = "', '".join(STANDALONE.values())

    # ── 0. snapshot ──
    if APPLY:
        sql(f"create table if not exists public.community_course_lessons_bak_r26d_20260722 as "
            f"select * from public.community_course_lessons where course_id in ('{ids}')")
        sql("create table if not exists public.series_bak_r26d_20260722 as "
            "select * from public.series where id in ('" + "', '".join(MULTI_RABBI_SERIES) + "')")
        print("✓ snapshots: community_course_lessons_bak_r26d_20260722 + series_bak_r26d_20260722")

    # ── 1. content_sliders ──
    if APPLY:
        with open(os.path.join(os.path.dirname(__file__), "..", "supabase", "migrations",
                               "20260722_content_sliders.sql"), encoding="utf-8") as f:
            sql(f.read())
        print("✓ מיגרציית content_sliders הוחלה")

    # ── 2. שינוי-שם בקורסים הקיימים ──
    for name, cid in STANDALONE.items():
        rows = rest(f"/community_course_lessons?course_id=eq.{cid}"
                    f"&title=like.*{urllib.parse.quote('השיעור השבועי')}*&select=id,title")
        print(f"📘 {name}: {len(rows)} שיעורים לשינוי-שם")
        if APPLY:
            for row in rows:
                rest(f"/community_course_lessons?id=eq.{row['id']}",
                     body={"title": row["title"].replace("השיעור השבועי", "שיעור על הפרק")},
                     method="PATCH")
            rest(f"/community_courses?id=eq.{cid}", body={"description": NEW_DESC}, method="PATCH")

    # ── 3. הקורסים החדשים ──
    builder = os.path.join(os.path.dirname(__file__), "build-standalone-book-courses.py")
    cmd = [sys.executable, builder] + (["--apply"] if APPLY else [])
    subprocess.run(cmd, check=True, env=os.environ)

    # ── 4. הסדרות הרב-רבניות ──
    for sid, title in MULTI_RABBI_SERIES.items():
        cur = rest(f"/series?id=eq.{sid}&select=rabbi_id")[0]["rabbi_id"]
        print(f"🎓 {title}: rabbi_id={cur[:8]} → {'כל הרבנים' if APPLY else '(dry-run)'}")
        if APPLY and cur == YOAV:
            rest(f"/series?id=eq.{sid}", body={"rabbi_id": KOL_HARABANIM}, method="PATCH")

    # ── 5. אימות ──
    if APPLY:
        # כל קורסי-הספר הבודדים (גם החדשים) — אסור שיישאר "השיעור השבועי"
        all_standalone = rest("/community_courses?select=id,title,total_lessons"
                              f"&description=like.{urllib.parse.quote('מבוסס על תכנית*')}")
        bad = 0
        for c in all_standalone:
            leftover = rest(f"/community_course_lessons?course_id=eq.{c['id']}"
                            f"&title=like.*{urllib.parse.quote('השיעור השבועי')}*&select=id")
            n = rest(f"/community_course_lessons?course_id=eq.{c['id']}&select=id")
            print(f"  ✔ {c['title']}: {len(n)} שיעורים, שאריות-שם: {len(leftover)}")
            bad += len(leftover)
        assert bad == 0, f"נשארו {bad} שיעורים עם השם הישן!"
        for sid in MULTI_RABBI_SERIES:
            assert rest(f"/series?id=eq.{sid}&select=rabbi_id")[0]["rabbi_id"] == KOL_HARABANIM
        assert isinstance(sql("select count(*) as n from public.content_sliders"), list)
        print("\n✅ אימות עבר: שמות ✓ קורסים ✓ סדרות ✓ content_sliders ✓")
    else:
        print("\ndry-run בלבד. להחלה: --apply")


if __name__ == "__main__":
    main()
