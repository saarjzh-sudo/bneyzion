#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gen_round3_rabbis.py — ROUND3 rabbi-page (rabbi_page_items) fix generator.

Reads (read-only): old_rabbi_pages.json, reports/verify_results.json,
match/item_match.json, live rabbi_page_items (via sbq.py SELECT, cached in
/tmp/live_rpi.json), plans/rabbis_plan.json.
Emits: fixes/ROUND3-rabbis.sql (guarded, idempotent; EXECUTED BY THE
ORCHESTRATOR, not by this author) + summary counts on stdout.

Policy (per ROUND3 brief):
  * target ladder = old rav-page rows, sort_order = old order_index + 1
    (the 1-based convention already used by the apply stage and ROUND2 §3).
  * NEVER DELETE — live rows not on the old page are parked at 9000+.
    Cross-attributed rows get their rabbis_plan-sanctioned 9000+old-idx slot.
  * old rows with no physical content → yoav list (in the report).
  * sanctioned deviations (empty-old-page fallback rabbis, ולו junk,
    יונדב-זר dup, אריה-אוריאל cross-attribution, שחור/יואב rows moved to
    their true authors) get NO SQL — documented in the report only.
"""
import json, os, re, subprocess, sys, unicodedata
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # .../scripts/parity/oneone
SBQ = os.path.join(os.path.dirname(os.path.dirname(HERE)), "parity", "sbq.py")
SBQ = os.path.abspath(os.path.join(ROOT, "..", "sbq.py"))

NIQQUD_RE = re.compile("[֑-ׇ]")
QUOTE_RE = re.compile("[׳״\"'`]")
SEP_RE = re.compile("[|–—‒‐‑\\-_,:;!?()\\[\\]{}<>./\\\\]")

def normalize_he(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFC", str(s))
    s = NIQQUD_RE.sub("", s)
    s = QUOTE_RE.sub("", s)
    s = SEP_RE.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip().lower()

def load(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return json.load(f)

def live_rpi(rabbi_ids):
    cache = "/tmp/live_rpi.json"
    if os.path.exists(cache):
        rows = json.load(open(cache))
        have = {r["rabbi_id"] for r in rows}
        if all(r in have or True for r in rabbi_ids):
            return rows
    ids = ",".join(f"'{i}'" for i in sorted(rabbi_ids))
    sql = f"""
SELECT rpi.rabbi_id, rpi.id AS rpi_id, rpi.kind, rpi.series_id, rpi.lesson_id, rpi.sort_order,
       COALESCE(s.title, l.title) AS title, s.lesson_count AS s_lc, s.status AS s_status, l.status AS l_status
FROM rabbi_page_items rpi
LEFT JOIN series s ON s.id = rpi.series_id
LEFT JOIN lessons l ON l.id = rpi.lesson_id
WHERE rpi.rabbi_id IN ({ids})
ORDER BY rpi.rabbi_id, rpi.sort_order;"""
    out = subprocess.run([sys.executable, SBQ, sql], capture_output=True, text=True).stdout
    rows = json.loads(out)
    json.dump(rows, open(cache, "w"), ensure_ascii=False)
    return rows

# ───────────────────────── resolution tables ─────────────────────────
# Sanctioned-deviation pages (no SQL; report only). Sources:
# rabbis_plan stats.empty_old_pages + yoav_review (ולו, יונדב-זר dup,
# שמעון לוי old-page bug, אריה-אוריאל cross-attribution).
SANCTIONED_PAGES = {
    "הרב אביעד תפוחי", "הרב אוהד קרקובר", "הרב אורן טרבלסי", "הרב אסף שטראוס",
    "הרב אריאל בראלי", "הרב אריאל כהן", "הרב אריה מרזר", "הרב ברק עוקבי",
    "הרב גדי שלוין", "הרב דוב ביגון", "הרב יהודה סדן",
    "הרב יואב אוריאל והרב עמנואל בן ארצי", "הרב משה הגר", "הרב משה שטרנברג",
    "הרב עקיבא קשתיאל", "הרב רפאל למפרט", "הרב שלמה יוסף ויצן", "הרב שמעון לוי",
    "ולו", "יונדב זר", "הרב אריה אוריאל",
}

# old rows whose disappearance from the page is sanctioned (cross-attributed
# שו"ת moved by rabbis_plan to the TRUE author's page) → no insert, no yoav.
SANCTIONED_MISSING = {
    "הרב מנחם שחור": {42, 46},           # → עמנואל 9042 / שילר 9046
    "הרב יואב אוריאל": {110, 131, 137, 139, 140},  # → שילר/עמנואל
}

# forced old_idx → physical id (pair if live, else INSERT at idx+1)
MANUAL = {
    "הרב חגי ולוסקי": {
        0: "8755bfbb-ae30-44d5-87e3-af5eaf4ddd25",  # מידות בפרשה בראשית lc26
        1: "a72009c1-ce50-4ffe-9345-0f98109fbee4",  # שמות (live row)
        2: "23ba1703-6509-41fb-a69c-c4bd85d8a5d0",  # ויקרא lc15
        3: "dfb8c480-35cd-4e8c-9f1d-a3a4c2666213",  # במדבר lc25
        4: "b87f2a49-5e27-40ab-bb7d-e22f5bbc3de0",  # דברים lc30
        5: "af593ccf-0e6f-5602-be6b-d6f744888783",  # מגילת אסתר — series אסתר (old href כתובים/אסתר)
        7: "f5050501-a002-4000-a000-000000000001",  # מגילת אסתר — series פורים (old href מועדים/פורים)
        9: "ff45f588-cc81-505f-9020-cbcb4d845a22",  # מגילת רות... — series שבועות (draft → publish)
    },
    "הרב יהונתן מיכאלי": {
        0: "d6260ade-6c3d-4f5c-956b-c043504fd055",  # בראשית lc36
        1: "cc4b127b-4f23-4f87-83e3-d1ec82f74455",  # שמות (live row)
        2: "3479554b-8826-4f1d-8894-b70dd9709780",  # ויקרא lc19
        3: "9fd0779c-c564-4b03-8409-b1d3b20e7afb",  # במדבר lc32
        4: "a64f6c91-4e4c-48f0-a9c2-91e0319b817e",  # דברים lc31
    },
    "הרב יהונתן עידן": {
        0: "62cc9e36-ed77-4dd5-b14e-93124b50f08f",  # בראשית lc12
        1: "adefd7ce-414e-4de2-914f-8aee48dc3279",  # שמות (live row)
        2: "5a466b5c-cec2-477d-9bd9-5100e13218ad",  # ויקרא lc4
    },
    "הרב יוסף שילר": {
        0: "b66e0cdb-3953-4aa9-b8f7-e0fe27935167",  # בראשית lc19
        1: "e21c697e-2df2-4cf7-999d-36d3691d61bb",  # שמות (live row)
        2: "13854323-40c4-4434-9801-7d4c12694ca3",  # ויקרא lc17
        3: "0b185ef9-32d7-4fd5-9446-15376d08aa62",  # במדבר lc20
        4: "5267cccb-6b8a-49e4-ad22-49c2f1951b32",  # דברים lc16
    },
    "הרב שלמה אבינר": {
        2: "b2e079cd-15cf-4172-ab57-60b362f8e74c",  # שיחות-בראשית (rename below)
        3: "1ff919db-25cc-4935-8e68-f12483693e8f",
        4: "1f4cf5c3-8435-456e-bc08-17d05c8d7535",  # שיחות-שמות (rename below)
        7: "6ba0b449-f49a-4414-9b74-dc6e3f97a149",  # audio-במדבר (rename below)
        8: "d860d934-c76d-47d7-a988-5fe21358b3bd",  # שיחות-במדבר (rename below)
    },
    "הרב אריה אברמסון": {
        1: "f1422687-d9a1-4bf2-a9aa-589b2e0cb676",  # title restore below
    },
    "הרב איתן שנדורפי": {
        102: "91bd2ced-488a-4796-af3c-67b2bd5f6020",  # title restore below
    },
    "הרב עמנואל בן ארצי": {
        6: "ff799d93-9eeb-4290-a987-936ddfb15e23",   # פשט בפרשה בראשית
        7: "3610bdba-ae55-40a5-b764-b31dec4ae7e6",   # שמות
        8: "ef23357b-679b-49fa-b262-a01225edab87",   # ויקרא
        9: "fe1147aa-a2e8-4056-b53e-963a80461c40",   # במדבר
        10: "73a01cf4-28f5-4129-8992-a929fec29cd7",  # דברים
        12: "a5b3d9ba-b813-4658-9940-eecf9cab649a",  # לב הפרק (מלכים א)
        14: "e93c7a85-af4a-479b-8122-bd4f8d7e0f2c",  # לב הפרק - ישעיהו (published twin)
        21: "a69ddf30-9109-465d-a222-f83ce6535b5c",  # לב הפרק (דניאל)
        25: "c8b151d0-7f65-4431-bd33-755240a2072c",  # לב הפרק - ישעיהו (draft twin, old lc0)
        27: "d031ec89-8406-4bbc-8970-e750d9e5845f",  # ציר זמן יהושע שופטים — כלי-עזר copy
        29: "6877c103-dcb7-4d18-846e-0aff06cb3733",  # ציר זמן שנה וחצי — כלי-עזר copy
        37: "4586cc0a-4d85-5fda-b9bc-33daaee9e6fe",  # ציר זמן יהושע שופטים — יהושע copy (teachers-wing old node)
        47: "f995dea4-0000",  # שו"ת זיהוי בימינו — keep ONE qa row (prefix → full id resolved from live rows)
    },
    "ושננתם": {
        6: "f8166389-c3db-4ad9-8037-20ae6fc61579",   # המספרים במקרא (lesson lives under יואב — old row on ושננתם page)
        7: "526ade3e-5a79-449c-b851-706a64428cf8",   # תורה-נביאים-כתובים (same)
        14: "e001f03e-8539-5533-8035-f8cf2035518b",  # ספר מלכים א עם ביאור ושננתם — legacy /media/142898/מלכים.pdf (retarget)
        27: "06adb28d-7d9a-4cf1-a43b-533f94fbacab",  # rename below (legacy /media/143559/קיום-מצוות...)
        29: "6b7c29ba-96aa-59cf-a264-79f0b8fb6b79",  # האם דניאל היה נביא? (נבואה ונביאים, general+teachers)
        33: "7dae3eca-08e8-4b32-8754-fa7e48568dd9",  # על מה נצטוו ישראל במרה? (+audience union)
        39: "92094505-7c5f-4dbd-bc38-b8457fc6798b",  # שורש מלחמת דוד וגלית (lives under הרבנית דינה ראפ)
    },
    "הרב אס\"ף בנדל": {12: "9f29a034-6f0f-46fb-a4f7-d8053cfa4835"},   # תלונות על הקב"ה בתנ"ך (lives under יואב; old href תהלים identical)
    "הרב יוסי ברינר": {26: "24e8524c-fb6c-4896-8564-e2bfd10be3ad"},   # פתיחת למנצח (lives under יואב; old href תהלים identical)
    "הרב יואב אוריאל": {80: "ba84d404-de05-486c-85f8-390a41484e83"},  # שלוש החנוכות — חנוכה copy (lesson lives under שנדורפי)
    "הרבנית בת שבע יוסיפון (לנשים)": {0: "496a7521-0b1e-419a-972d-fa3b97b85f96"},  # רוצה להיות מלכה (audio — old media icon audio)
    "הרב נחום נריה": {0: "e96d96aa-364d-4cd3-b2d8-ec0b5becdbe6"},     # מהפכות הפסח בתנ"ך — series פסח (old href מועדים/פסח)
}

# old idx whose live row must be RETARGETED to a different physical lesson
RETARGET = {
    "ושננתם": {14: ("3bfe8dad-ec4e-490c-9fb6-c5a65d5f9b21", "e001f03e-8539-5533-8035-f8cf2035518b")},
}

# rows truly absent → yoav (old_idx → evidence)
YOAV = {
    "הרב איתן שנדורפי": {96: "שו\"ת 'ארבע מלכויות' — אין שיעור כזה של שנדורפי בלייב (רק הרב יעקב ידיד/ושננתם-מורים); ה-insert_lesson של rabbis_plan נפל ב-apply (STAGE9 dropped-ref 37440dbb)"},
    "הרב עמנואל בן ארצי": {
        39: "'ציר זמן תקופת המלכים' (עזרי-הלמידה/מלכים-ב) — אין עותק של עמנואל בלייב (רק עותקי מורים של שוהם/עמראני/ושננתם והטיוטה '...כמות מידע מינימלית'); dropped-ref ad86657a x2",
        41: "'ציר זמן גלות בבל ותחילת בית שני' (עזרי-הלמידה/כתובים/עזרא) — אין עותק עם הכותרת המלאה אצל עמנואל (יש 'ציר זמן גלות בבל' שכבר משרת את שורה 28); dropped-ref bc039f6a x2",
    },
    "מערכת בני ציון": {
        6: "'חידון תנ\"ך דיגיטלי - על ספר בראשית' (מאגר-התוכן-של-הילדים) — אין שיעור כזה בלייב; dropped-ref 2e136c2e",
        7: "שורה כפולה של אותו חידון (אותו href בדיוק) — דרופ-רף יחיד; כפילות מקור באתר הישן",
    },
}

# cross-attributed park slots (rabbis_plan sanctioned 9000+old-idx convention)
CROSS_ATTR_PARK = {
    "הרב אריק אוריאל": {
        "ff2abcca-4874-4835-9a9d-ac8d3c8c521e": 9000,
        "56be7dc7-4137-47d6-a2d9-544ee86419dd": 9001,
    },
    "הרב יוסף שילר": {
        "3ff0c52e-0000": 9046,  # prefix-resolved at runtime: פוקד עוון אבות על בנים (שחור #46)
        "b8e36d4e-0000": 9110,  # בקשת גדעון לאותות (יואב #110)
        "a20c7b4c-e0a6-40be-94bd-c603615a7669": 9137,
        "0c64ceea-0000": 9139,  # חסרון האורים ותומים (יואב #139)
        "c405e027-c3c3-4358-b2e4-36ede38ed185": 9140,
    },
    "הרב עמנואל בן ארצי": {
        "389b07f7-0000": 9042,  # למה כעס יעקב על רחל? (שחור #42)
        "fa0f3672-0000": 9131,  # למה היתה רעידת אדמה (יואב #131)
    },
}

RENAME_LESSONS = []  # (id, old_title_source) filled in main from old rows
RENAME_SERIES = [
    ("b2e079cd-15cf-4172-ab57-60b362f8e74c", "הרב אבינר - שיחות על פרשיות בראשית", "הרב שלמה אבינר על פרשיות בראשית"),
    ("1f4cf5c3-8435-456e-bc08-17d05c8d7535", "הרב אבינר - שיחות על פרשיות שמות", "הרב אבינר על פרשיות שמות"),
    ("6ba0b449-f49a-4414-9b74-dc6e3f97a149", "הרב אבינר על פרשיות במדבר", "הרב שלמה אבינר על פרשיות במדבר"),
    ("d860d934-c76d-47d7-a988-5fe21358b3bd", "הרב אבינר - שיחות על פרשיות במדבר", "הרב שלמה אבינר על פרשיות במדבר"),
]
# lesson title restores: (id, expected_current, target = exact old rav-page title)
RENAME_LESSON_FIXED = [
    ("f1422687-d9a1-4bf2-a9aa-589b2e0cb676", "מגלת יהויכין עד חורבן הבית", "מגלות יהויכין עד חורבן הבית"),
    ("91bd2ced-488a-4796-af3c-67b2bd5f6020",
     "אם משה היה נכנס לארץ - האם התורה הייתה ממשיכה להיכתב גם בארץ ישראל?",
     "אם משה היה נכנס לארץ - האם התורה היתה ממשיכה להיכתב גם בארץ ישראל?"),
    ("06adb28d-7d9a-4cf1-a43b-533f94fbacab",
     "ושננתם, קיום מצוות מחיית עמלק במגילת אסתר",
     "קיום מצוות מחיית עמלק במגילת אסתר"),
]
PUBLISH = [
    ("ff45f588-cc81-505f-9020-cbcb4d845a22", "מגילת רות ויום מתן תורה, שער לקבלת התורה מרצון — old public rav-page row חגי #9"),
    ("e001f03e-8539-5533-8035-f8cf2035518b", "ספר מלכים א עם ביאור 'ושננתם' — old public ושננתם row #14, legacy /media/142898/מלכים.pdf"),
]
AUDIENCE_UNION = [
    ("7dae3eca-08e8-4b32-8754-fa7e48568dd9", "על מה נצטוו ישראל במרה? — shown on the PUBLIC ושננתם old page (row #33) while live copy is teachers-only (ROUND2 §2 union precedent)"),
]

KIND_MAP = {"סדרה": "series", "שיעור": "lesson", 'שו"ת': "qa"}


def main():
    old = load("old_rabbi_pages.json")
    verify = load("reports/verify_results.json")["rabbis"]["rows"]
    fails = {r["rabbi"]: r for r in verify if not r["pass"]}
    targets = {n: f for n, f in fails.items() if n not in SANCTIONED_PAGES}
    rows = live_rpi({f["rabbi_id"] for f in targets.values()})
    live_by = {}
    for r in rows:
        live_by.setdefault(r["rabbi_id"], []).append(r)

    sql = []
    stats = Counter()
    yoav_out = []
    per_rabbi = {}

    def resolve_prefix(rid_rows, pref):
        """resolve an 8-hex prefix table entry to the full uuid from live rows"""
        p = pref.split("-")[0]
        for r in rid_rows:
            for k in ("lesson_id", "series_id"):
                if r[k] and r[k].startswith(p):
                    return r[k]
        return pref

    sql.append("-- ============================================================================")
    sql.append("-- ROUND3-rabbis.sql — bnei-zion 1:1 parity, rabbi_page_items completion")
    sql.append("-- Author: RABBI-RPI completion author (read-only scoping via sbq.py; this file")
    sql.append("--         is EXECUTED BY THE ORCHESTRATOR, not by the author).")
    sql.append("-- Generated by fixes/gen_round3_rabbis.py from old_rabbi_pages.json +")
    sql.append("--   reports/verify_results.json + match/item_match.json + live SELECTs 2026-06-12.")
    sql.append("-- Conventions (= apply stage + ROUND2 §3): rpi.sort_order = old rav-page row")
    sql.append("--   index + 1 (1-based). Rows NOT on the old page are PARKED at 9000+ —")
    sql.append("--   cross-attributed שו\"ת keep their rabbis_plan slot (9000+old-idx on the")
    sql.append("--   source page), double-apply duplicates get 9000+current-slot. NO DELETES.")
    sql.append("-- All statements guarded/idempotent.")
    sql.append("-- ============================================================================")
    sql.append("")

    # global side fixes first
    sql.append("-- ───────────────────────── §0 SIDE FIXES (titles / status / audience) ─────")
    for lid, cur, tgt in RENAME_LESSON_FIXED:
        sql.append(f"-- title restore to the old rav-page display title")
        sql.append(f"UPDATE lessons SET title = '{tgt}'")
        sql.append(f"WHERE id = '{lid}' AND title = '{cur}';")
        sql.append("")
        stats["lesson_renames"] += 1
    for sid, cur, tgt in RENAME_SERIES:
        sql.append(f"-- series title restore to the old display title (old rav page + old public listings; current title appears on NO old surface)")
        sql.append(f"UPDATE series SET title = '{tgt}'")
        sql.append(f"WHERE id = '{sid}' AND title = '{cur}';")
        sql.append("")
        stats["series_renames"] += 1
    for lid, why in PUBLISH:
        sql.append(f"-- publish: {why}")
        sql.append(f"UPDATE lessons SET status = 'published' WHERE id = '{lid}' AND status = 'draft';")
        sql.append("")
        stats["publishes"] += 1
    for lid, why in AUDIENCE_UNION:
        sql.append(f"-- audience union: {why}")
        sql.append(f"UPDATE lessons SET audience_tags = array_append(audience_tags, 'general')")
        sql.append(f"WHERE id = '{lid}' AND NOT ('general' = ANY(COALESCE(audience_tags, ARRAY[]::text[])));")
        sql.append("")
        stats["audience_unions"] += 1

    for name in sorted(targets):
        f = targets[name]
        rid = f["rabbi_id"]
        lrows = sorted(live_by.get(rid, []), key=lambda x: x["sort_order"])
        items = sorted(old[name].get("items", []), key=lambda x: x["order_index"])
        manual = dict(MANUAL.get(name, {}))
        # resolve prefix-style manual ids
        for k, v in list(manual.items()):
            if v.endswith("-0000") or len(v) < 36:
                manual[k] = resolve_prefix(lrows, v)
        retarget = RETARGET.get(name, {})
        yoav_idx = YOAV.get(name, {})
        sanct_idx = SANCTIONED_MISSING.get(name, set())
        cross = {}
        for pref, slot in CROSS_ATTR_PARK.get(name, {}).items():
            cross[resolve_prefix(lrows, pref) if (pref.endswith("-0000") or len(pref) < 36) else pref] = slot

        used = set()        # rpi ids already paired
        pairs = []          # (old_idx, live_row)
        inserts = []        # (old_idx, kind, phys_id)
        yoavs = []

        def find_live(group, norm=None, phys=None):
            for r in lrows:
                if r["rpi_id"] in used:
                    continue
                g = "S" if r["kind"] == "series" else "L"
                if g != group:
                    continue
                pid = r["series_id"] or r["lesson_id"]
                if phys and pid != phys:
                    continue
                if norm is not None and normalize_he(r["title"]) != norm:
                    continue
                return r
            return None

        for it in items:
            idx = it["order_index"]
            kind = KIND_MAP.get(it["item_type"], "lesson")
            group = "S" if kind == "series" else "L"
            norm = normalize_he(it["title_norm"])
            if idx in sanct_idx:
                continue  # sanctioned cross-attribution: row lives on the true author's page
            if idx in retarget:
                old_phys, new_phys = retarget[idx]
                r = find_live(group, phys=old_phys)
                if r:
                    used.add(r["rpi_id"])
                    pairs.append((idx, r, new_phys))
                    continue
            if idx in manual:
                phys = manual[idx]
                r = find_live(group, phys=phys)
                if r:
                    used.add(r["rpi_id"])
                    pairs.append((idx, r, None))
                else:
                    inserts.append((idx, kind, phys, it["title_norm"]))
                continue
            if idx in yoav_idx:
                yoavs.append((idx, it["title_norm"], yoav_idx[idx]))
                continue
            r = find_live(group, norm=norm)
            if r:
                used.add(r["rpi_id"])
                pairs.append((idx, r, None))
            else:
                yoavs.append((idx, it["title_norm"], "לא נמצאה התאמה חיה (לא נצפה מראש — לבדוק ידנית)"))

        parked = [r for r in lrows if r["rpi_id"] not in used]

        sql.append("-- ============================================================================")
        sql.append(f"-- §{name}  (rabbi_id {rid})")
        sql.append(f"--   old rows: {len(items)} · live rpi: {len(lrows)} · pairs: {len(pairs)} · inserts: {len(inserts)} · parks: {len(parked)} · yoav: {len(yoavs)} · sanctioned-missing: {len(sanct_idx)}")
        sql.append("-- ----------------------------------------------------------------------------")

        n_moves = 0
        for idx, r, new_phys in pairs:
            tgt = idx + 1
            if new_phys:
                sql.append(f"-- retarget old row #{idx} to the legacy-url-exact lesson (basename collision in the plan match)")
                sql.append(f"UPDATE rabbi_page_items SET lesson_id = '{new_phys}', sort_order = {tgt}")
                sql.append(f"WHERE id = '{r['rpi_id']}' AND lesson_id = '{r['lesson_id']}';")
                sql.append("")
                stats["retargets"] += 1
                continue
            if r["sort_order"] != tgt:
                title = (r["title"] or "")[:48].replace("'", "''")
                sql.append(f"UPDATE rabbi_page_items SET sort_order = {tgt} WHERE id = '{r['rpi_id']}' AND sort_order <> {tgt};  -- old #{idx} '{title}'")
                n_moves += 1
        if n_moves:
            sql.append("")
        stats["position_fixes"] += n_moves

        for idx, kind, phys, title in inserts:
            tgt = idx + 1
            col = "series_id" if kind == "series" else "lesson_id"
            t = title[:60].replace("'", "''")
            sql.append(f"-- old row #{idx} '{t}'")
            sql.append(f"INSERT INTO rabbi_page_items (rabbi_id, kind, {col}, sort_order)")
            sql.append(f"SELECT '{rid}', '{kind}', '{phys}', {tgt}")
            sql.append(f"WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='{rid}' AND {col}='{phys}' AND sort_order={tgt});")
            sql.append("")
            stats["inserts"] += 1

        used_slots = set()
        for r in parked:
            pid = r["series_id"] or r["lesson_id"]
            slot = cross.get(pid)
            reason = "cross-attributed שו\"ת — sanctioned rabbis_plan slot" if slot else "not on the old rav page (double-apply dup / deliberate addition) — parked"
            if slot in used_slots or slot is None:
                slot = 9000 + r["sort_order"]
                while slot in used_slots:
                    slot += 1
            used_slots.add(slot)
            title = (r["title"] or "")[:48].replace("'", "''")
            if r["sort_order"] < 9000:
                sql.append(f"UPDATE rabbi_page_items SET sort_order = {slot} WHERE id = '{r['rpi_id']}' AND sort_order = {r['sort_order']};  -- park '{title}' ({reason})")
                stats["parks"] += 1
        if parked:
            sql.append("")

        n_inband = len(pairs) + len(inserts)
        sql.append(f"-- verification: in-band ladder size (expect {n_inband}; old rows {len(items)} minus {len(yoavs)} yoav minus {len(sanct_idx)} sanctioned-missing)")
        sql.append(f"SELECT count(*) AS v_{rid[:8]}_inband FROM rabbi_page_items WHERE rabbi_id = '{rid}' AND sort_order < 9000;")
        sql.append(f"-- verification: parked rows (expect {len(parked) + sum(1 for r in lrows if r['sort_order'] >= 9000)})")
        sql.append(f"SELECT count(*) AS v_{rid[:8]}_parked FROM rabbi_page_items WHERE rabbi_id = '{rid}' AND sort_order >= 9000;")
        sql.append(f"-- verification: no in-band slot collisions (expect 0)")
        sql.append(f"SELECT count(*) AS v_{rid[:8]}_collisions FROM (SELECT sort_order FROM rabbi_page_items WHERE rabbi_id='{rid}' AND sort_order<9000 GROUP BY sort_order HAVING count(*)>1) q;")
        sql.append("")

        for idx, title, why in yoavs:
            yoav_out.append({"rabbi": name, "old_idx": idx, "title": title, "evidence": why})
        per_rabbi[name] = {
            "old_rows": len(items), "live": len(lrows), "pairs": len(pairs),
            "moves": n_moves, "inserts": len(inserts), "parks": len(parked),
            "yoav": len(yoavs), "sanctioned_missing": len(sanct_idx),
            "inband_expect": n_inband,
            "fully_green": not yoavs and not sanct_idx,
            "has_parked": bool(parked) or any(r["sort_order"] >= 9000 for r in lrows),
        }

    out = os.path.join(HERE, "ROUND3-rabbis.sql")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(sql) + "\n")
    print(f"wrote {out} ({len(sql)} lines)")
    print(json.dumps(stats, ensure_ascii=False, indent=1))
    print("rabbis with SQL:", len(per_rabbi))
    print("fully-green in-band (= old ladder complete):", sum(1 for v in per_rabbi.values() if v["fully_green"]))
    print("yoav rows:", len(yoav_out))
    json.dump({"per_rabbi": per_rabbi, "yoav": yoav_out, "stats": dict(stats)},
              open(os.path.join(HERE, "round3_scope.json"), "w"), ensure_ascii=False, indent=1)
    print("wrote round3_scope.json")


if __name__ == "__main__":
    main()
