#!/usr/bin/env python3
"""
recover-yehoshua-shoftim.py
===========================
Recovers 68 missing lessons for יהושע and שופטים.

All recovered lessons use the site-wide VP4 embed
(7338c344-8197-4c91-9501-29767df67ab9 — already used by 67 lessons in DB).
This is a series-level embed, not per-lesson; this is the established pattern
for these series on the old site (confirmed by scraping each lesson page).

Unrecoverable (6 lessons — 404 or IIS 400 on old site):
  - מי היה עכן? (400 — IIS 400 on ? char in URL)
  - בארץ ישראל – הכל על פי ה' (404)
  - יהודה ויוסף – שני משיחים (404)
  - דברי יהושע האחרונים – הנאום הראשון (404)
  - דברי יהושע האחרונים – הנאום השני (404)
  - הקדמה סדר התקופה ויחס הקבה לישראל בתקופה ההיא (404)

Usage:
  DRY_RUN=1 python3 scripts/recover-yehoshua-shoftim.py   # preview
  DRY_RUN=0 python3 scripts/recover-yehoshua-shoftim.py   # real insert
"""

import json, re, unicodedata, subprocess, os, uuid, time
from collections import defaultdict

SUPABASE_TOKEN = os.environ.get("SUPABASE_MANAGEMENT_API_TOKEN")
PROJECT_REF = "pzvmwfexeiruelwiujxn"
DRY_RUN = os.environ.get("DRY_RUN", "1") == "1"

# VP4 series-level embed (same across all pages on the site, already in DB x67)
VP4_VIDEO_URL = "https://embed.vp4.me/LandingPage,7338c344-8197-4c91-9501-29767df67ab9,492029.aspx"

UNRECOVERABLE = {
    "מי היה עכן?",
    "בארץ ישראל – הכל על פי ה'",
    "יהודה ויוסף – שני משיחים",
    "דברי יהושע האחרונים – הנאום הראשון",
    "דברי יהושע האחרונים – הנאום השני",
    "הקדמה סדר התקופה ויחס הקבה לישראל בתקופה ההיא",
}


def sql_query(query):
    payload = json.dumps({"query": query})
    cmd = [
        "curl", "--noproxy", "*", "-s",
        "-H", f"Authorization: Bearer {SUPABASE_TOKEN}",
        "-H", "Content-Type: application/json",
        "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-d", payload,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True,
                            env={**os.environ, "HTTPS_PROXY": "", "HTTP_PROXY": ""})
    data = json.loads(result.stdout)
    if isinstance(data, dict) and "message" in data:
        print(f"SQL ERROR: {data['message']}", flush=True)
        return None
    return data


def esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, str):
        return "'" + v.replace("'", "''") + "'"
    return str(v)


def norm(s):
    s = "".join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


# ── Lesson list ────────────────────────────────────────────────────────────────
# Format: (title, series_id, rabbi_id, bible_book)
# All verified as HTTP 200 on old site (bneyzion.co.il).
LESSONS_TO_INSERT = [
    # ──────────────────────────────────────────────────────────────────────────
    # יהושע: מאמרים - ספר יהושע (abe72107-7e94-4c52-8427-a28ee3e3bde0)
    # rabbi: הרב איתן שנדורפי (be153d0e-...)
    # ──────────────────────────────────────────────────────────────────────────
    ("כיבוש קרית ספר ופרשת עכסה", "abe72107-7e94-4c52-8427-a28ee3e3bde0", "be153d0e-e4fb-4a38-8e33-eac617b0254a", "יהושע"),

    # ──────────────────────────────────────────────────────────────────────────
    # יהושע: מפי כהן - על ספר יהושע (35d92392-c3ee-4839-9050-3c29692bc5f5)
    # rabbi: הרב שמעון כהן (103442a2-...)
    # ──────────────────────────────────────────────────────────────────────────
    ("אנשי הדממה והענוה מן השיטים",                 "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("סוד דמותה של רחב",                             "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("ארון ברית ה' ונושאיו",                          "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("ריבוי שכינה לקראת הכניסה לארץ",               "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("בין קריעת ים סוף למעבר הירדן",                 "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("שתים עשרה האבנים",                              "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("במעבר הירדן נפתח פרק חדש בתולדות ישראל",     "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("פסח ומילה בשערי הכניסה לארץ ישראל",            "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("תמה תקופת המן והחלה תקופת העומר",              "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("לקראת כיבוש יריחו",                             "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("הקפת העיר יריחו וכיבושה בשבת",                 "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("חיבור משיח בן יוסף ומשיח בן דוד בכיבוש יריחו","35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("ארור האיש אשר יקום ויבנה את העיר יריחו",      "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("מלחמת העי הראשונה - המעל בחרם",                "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    # "מי היה עכן?" skipped — 400 IIS
    ("יהושע הביא את עכן לחיי עולם הבא",              "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("כיבוש העי במערכה השניה",                        "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("סימן הכידון ומעמד הברית",                       "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("מעמד הברכה והקללה",                              "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("התקבצות המלכים ועורמת הגבעונים",               "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("ערמת הגבעונים כתיקון לערמת הנחש",               "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("מלחמת מלכי הדרום",                               "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("אבני האלגביש והשמש בגבעון",                     "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("דינם של מלכי האמורי וכיבוש ממלכות הדרום",      "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("מלחמת מלכי הצפון",                               "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    # "בארץ ישראל – הכל על פי ה'" skipped — 404
    ("יהושע התעכב במלחמה ונתקצרו שנותיו",            "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("סיכום כיבושי משה והמלכים שהכה יהושע",          "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("הארץ הנשארת",                                    "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("כלב פועל להופעת מלכות יהודה",                   "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("נחלת בני יהודה בראש",                            "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("נחלת בני יוסף",                                  "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    # "יהודה ויוסף – שני משיחים" skipped — 404
    ("התקהלות העם לקראת הורשת הארץ הנותרת",          "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("נחלת שמעון בתוך נחלת יהודה",                    "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("נחלת יהושע ומצוות הפרשת ערי מקלט",              "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("ערי המקלט וערי הלויים",                          "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("שבטי עבר הירדן עמדו בהבטחתם",                   "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    ("המזבח בגלילות הירדן",                            "35d92392-c3ee-4839-9050-3c29692bc5f5", "103442a2-4a4e-47c8-94fc-e73c74e20c37", "יהושע"),
    # "דברי יהושע האחרונים – הנאום הראשון" skipped — 404
    # "דברי יהושע האחרונים – הנאום השני" skipped — 404

    # ──────────────────────────────────────────────────────────────────────────
    # שופטים: בימי שפוט השופטים (3eb9290f-92ff-4ebe-ac18-cf7a22a035f5)
    # rabbi: הרב דני סטיסקין (e5d69c5f-...)
    # ──────────────────────────────────────────────────────────────────────────
    ("עתניאל בן קנז", "3eb9290f-92ff-4ebe-ac18-cf7a22a035f5", "e5d69c5f-1c5c-4401-83c6-f95809952696", "שופטים"),
    ("אהוד בן גרא",   "3eb9290f-92ff-4ebe-ac18-cf7a22a035f5", "e5d69c5f-1c5c-4401-83c6-f95809952696", "שופטים"),
    ("נדר יפתח",       "3eb9290f-92ff-4ebe-ac18-cf7a22a035f5", "e5d69c5f-1c5c-4401-83c6-f95809952696", "שופטים"),
    ("שמשון",          "3eb9290f-92ff-4ebe-ac18-cf7a22a035f5", "e5d69c5f-1c5c-4401-83c6-f95809952696", "שופטים"),
    ("פילגש בגבעה",    "3eb9290f-92ff-4ebe-ac18-cf7a22a035f5", "e5d69c5f-1c5c-4401-83c6-f95809952696", "שופטים"),

    # ──────────────────────────────────────────────────────────────────────────
    # שופטים: מאמרים על ספר שופטים (22d73e7d-a5b8-4c66-a62b-01d55c93b9ca)
    # rabbi: הרב אלחנן בן נון (06a6954f-...)
    # ──────────────────────────────────────────────────────────────────────────
    ("עתניאל בן קנז", "22d73e7d-a5b8-4c66-a62b-01d55c93b9ca", "06a6954f-7d18-44d5-aa2b-2fcea7fb2e09", "שופטים"),

    # ──────────────────────────────────────────────────────────────────────────
    # שופטים: שיעורים בספר שופטים על פי ה'לב אהרון' (a577d115-0f98-47a3-a6bc-c28c08e4c866)
    # rabbi: הרב אריק אוריאל (34ef8dae-...)
    # ──────────────────────────────────────────────────────────────────────────
    ("הקדמה לספר שופטים",          "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),
    ("אהוד בן גרא",                 "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),
    ("שמגר בן ענת",                 "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),
    ("שירת דבורה",                  "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),
    ("המשך שירת דבורה",             "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),
    ("גדעון בן יואש",               "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),
    ("הכנות גדעון למלחמה",          "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),
    ("תולע בן פואה ויאיר הגלעדי",   "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),
    ("יפתח הגלעדי",                 "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),
    ("נדר יפתח",                    "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),
    ("חידת שמשון",                  "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),
    ("פסל מיכה",                    "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),
    ("פילגש בגבעה",                 "a577d115-0f98-47a3-a6bc-c28c08e4c866", "34ef8dae-e0a7-4a91-89cc-64073d2df1e2", "שופטים"),

    # ──────────────────────────────────────────────────────────────────────────
    # שופטים: שיעורים על התנ"ך - שופטים (78f040d7-b42c-4a74-9f12-2b9d2d06e0cf)
    # rabbi: הרב יצחק בן שחר (afb0d3c5-...)
    # ──────────────────────────────────────────────────────────────────────────
    ("אהוד בן גרא",     "78f040d7-b42c-4a74-9f12-2b9d2d06e0cf", "afb0d3c5-c3ed-4a39-ba05-79b47f47f43f", "שופטים"),
    ("שירת דבורה",      "78f040d7-b42c-4a74-9f12-2b9d2d06e0cf", "afb0d3c5-c3ed-4a39-ba05-79b47f47f43f", "שופטים"),
    ("שמשון",           "78f040d7-b42c-4a74-9f12-2b9d2d06e0cf", "afb0d3c5-c3ed-4a39-ba05-79b47f47f43f", "שופטים"),
    ("פסל מיכה",        "78f040d7-b42c-4a74-9f12-2b9d2d06e0cf", "afb0d3c5-c3ed-4a39-ba05-79b47f47f43f", "שופטים"),
    ("פילגש בגבעה - סיום", "78f040d7-b42c-4a74-9f12-2b9d2d06e0cf", "afb0d3c5-c3ed-4a39-ba05-79b47f47f43f", "שופטים"),

    # ──────────────────────────────────────────────────────────────────────────
    # שופטים: שיעורים קצרים - קריאה וביאור ספר שופטים (f653f565-0e17-4660-bd6f-7a37d4c5f869)
    # rabbi: הרב חנניה מלכה (06cafb42-...)
    # ──────────────────────────────────────────────────────────────────────────
    ("שירת דבורה",  "f653f565-0e17-4660-bd6f-7a37d4c5f869", "06cafb42-36c2-417d-aa6f-a8f5a80d1c03", "שופטים"),
    ("מינוי גדעון", "f653f565-0e17-4660-bd6f-7a37d4c5f869", "06cafb42-36c2-417d-aa6f-a8f5a80d1c03", "שופטים"),
    ("אבימלך",      "f653f565-0e17-4660-bd6f-7a37d4c5f869", "06cafb42-36c2-417d-aa6f-a8f5a80d1c03", "שופטים"),
    ("בת יפתח",     "f653f565-0e17-4660-bd6f-7a37d4c5f869", "06cafb42-36c2-417d-aa6f-a8f5a80d1c03", "שופטים"),
    ("פסל מיכה",    "f653f565-0e17-4660-bd6f-7a37d4c5f869", "06cafb42-36c2-417d-aa6f-a8f5a80d1c03", "שופטים"),

    # ──────────────────────────────────────────────────────────────────────────
    # שופטים: שיעורים שופטים (067b6a22-dd6a-40bc-a7a0-a298e8e89656)
    # rabbi: NULL (unknown)
    # Only 2 of the 3 are recoverable — הקדמה returns 404
    # ──────────────────────────────────────────────────────────────────────────
    ("המשך הקדמה",               "067b6a22-dd6a-40bc-a7a0-a298e8e89656", None, "שופטים"),
    ("סיכום הקדמה- יהודה יעלה",  "067b6a22-dd6a-40bc-a7a0-a298e8e89656", None, "שופטים"),
]


def main():
    print(f"recover-yehoshua-shoftim.py  DRY_RUN={DRY_RUN}")
    print(f"Total to insert: {len(LESSONS_TO_INSERT)}")
    print("=" * 60)

    # Idempotency check: fetch existing published titles per series
    by_series = defaultdict(list)
    for item in LESSONS_TO_INSERT:
        by_series[item[1]].append(item)

    existing_normed_by_sid = {}
    for sid in by_series:
        rows = sql_query(f"SELECT title FROM lessons WHERE series_id='{sid}' AND status='published'")
        if rows is None:
            rows = []
        existing_normed_by_sid[sid] = {norm(r["title"]) for r in rows}

    # Print / insert
    inserted = 0
    skipped = 0
    errors = []
    series_touched = set()

    for i, (title, series_id, rabbi_id, bible_book) in enumerate(LESSONS_TO_INSERT):
        if norm(title) in existing_normed_by_sid.get(series_id, set()):
            print(f"  SKIP (exists): {title}")
            skipped += 1
            continue

        lesson_id = str(uuid.uuid4())

        print(f"  [{i+1}/{len(LESSONS_TO_INSERT)}] {'(DRY)' if DRY_RUN else 'INSERT'}: '{title}' → series {series_id[:8]}")

        if DRY_RUN:
            inserted += 1
            continue

        sql = f"""
            INSERT INTO lessons (id, title, status, series_id, rabbi_id, bible_book, source_type, video_url, audio_url, attachment_url, content)
            VALUES (
                {esc(lesson_id)},
                {esc(title)},
                'published',
                {esc(series_id)},
                {esc(rabbi_id)},
                {esc(bible_book)},
                'video',
                {esc(VP4_VIDEO_URL)},
                NULL, NULL, NULL
            )
            ON CONFLICT (id) DO NOTHING
        """
        result = sql_query(sql.strip())
        if result is None:
            errors.append(title)
        else:
            inserted += 1
            series_touched.add(series_id)

        if i % 15 == 14:
            time.sleep(0.5)

    print()
    print(f"{'(DRY RUN) ' if DRY_RUN else ''}Inserted: {inserted} | Skipped: {skipped} | Errors: {len(errors)}")

    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  {e}")

    if not DRY_RUN and series_touched:
        print("\nUpdating lesson_counts...")
        for sid in series_touched:
            sql_query(f"""
                UPDATE series
                SET lesson_count = (SELECT COUNT(*) FROM lessons WHERE series_id='{sid}' AND status='published')
                WHERE id='{sid}'
            """)
            print(f"  Updated: {sid[:8]}")

    if DRY_RUN:
        print("\nRe-run with DRY_RUN=0 to execute inserts.")


if __name__ == "__main__":
    main()
