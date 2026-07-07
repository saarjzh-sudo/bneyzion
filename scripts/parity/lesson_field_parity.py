#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
lesson_field_parity.py — בדיקת שדות-שיעור מול אמת האתר הישן (נוסף 3.7.2026, הערות הרב יואב).

מה הבדיקות הקיימות (verify_book / parity_watch) לא תפסו, ולמה הסקריפט הזה קיים:
  1. אודיו זר: המיגרציה המקורית (Lovable) גרפה מדיה מכל דף-השיעור הישן, כולל קרוסלת
     "שיעורים נוספים" (swiper של lessonBlock-ים) — ולכן שיעורי *טקסט* קיבלו mp3 של שיעור
     אחר (למשל "אהבת חנם" של הרב שפירא קיבל את "מן החורבן" של הרב בן שחר). בדיקות ה-parity
     אימתו נוכחות/סדר/ייחוס לפי listings — לא שהמדיה בשיעור באמת שייכת לו.
  2. פרומו: לכל שיעור ישן יש h2 (promo) מתחת ל-h1; ב-DB זה description. הבדיקות לא השוו
     שדות דף-שיעור.
  3. ספירת סיידבר-רבנים: rabbis.lesson_count מנורמל ולא חושב מחדש אחרי rebuilds של L4 —
     נוצר פער "13 בתפריט מול 4 בפועל" (וגם רב-פנטום "אהרן בן גרשון" עם ספירה בדויה).

הרצה: python3 lesson_field_parity.py            (קורא oneone/old_listings_*.json + DB)
פלט: reports/LESSON-FIELD-PARITY.json + סיכום למסך. exit 1 אם יש ממצאים.

אמת-מקור: old_listings_*.json (media per item). שיעור עם audio_url שלא מופיע במדיה הישנה
של אותו (title,rabbi) — חשוד. אימות סופי מול דף-שיעור ישן חי: לחלץ רק את אזור השיעור עצמו
(אחרי ה-h1 שלו, לפני swiper-slide/lessonBlock): הפרומו = h2 שבתוך אזור ה-hero (עד fade-bg),
האודיו = קישורים בתוך div.players. אסור לגרוף מדיה מכל הדף — זה בדיוק הבאג המקורי.
"""
import json, re, sys, collections, urllib.parse, subprocess, os

HERE = os.path.dirname(os.path.abspath(__file__))
ONEONE = os.path.join(HERE, 'oneone')
AUDIO_LIKE = ('.mp3', '.m4a', '.wav', '.wma', '.aac', '.mp4', '.3ga')

sys.path.insert(0, HERE)
import sbq  # noqa

def q(sql):
    return json.loads(sbq.run(sql))

def norm(t):
    t = (t or '').strip()
    t = re.sub(r'[֑-ׇ"\'׳״“”„!?]', '', t)
    return re.sub(r'\s+', ' ', t)

def basename(u):
    if not u or not isinstance(u, str):
        return ''
    u = urllib.parse.unquote(u).replace('+', ' ')
    return u.rsplit('/', 1)[-1].strip().lower()

def build_old_truth():
    """(title,rabbi)->{'n':listings-hits,'media':set(basenames)}; media מ-listings בלבד."""
    truth = collections.defaultdict(lambda: {'n': 0, 'media': set()})

    def collect(o):
        if isinstance(o, dict):
            if ('title_norm' in o or 'title' in o) and 'media' in o:
                t = norm(o.get('title_norm') or o.get('title'))
                r = norm(o.get('rabbi_norm') or o.get('rabbi') or '')
                med = o.get('media') or []
                bbs = set()
                if isinstance(med, list):
                    for m in med:
                        h = m.get('href') if isinstance(m, dict) else (m if isinstance(m, str) else '')
                        bb = basename(h)
                        if bb:
                            bbs.add(bb)
                for k in [(t, r), (t, '')]:
                    truth[k]['n'] += 1
                    truth[k]['media'] |= bbs
            for v in o.values():
                collect(v)
        elif isinstance(o, list):
            for x in o:
                collect(x)

    for f in ['old_listings_torah_ketuvim.json', 'old_listings_neviim_moadim.json',
              'old_teachers_listings.json']:
        collect(json.load(open(os.path.join(ONEONE, f))))
    return truth

def main():
    truth = build_old_truth()
    findings = {'audio_suspects': [], 'rabbi_count_drift': [], 'phantom_rabbis': []}

    # audio שאומת ידנית כתקין (7.7.2026) — מדולג; רק חשודים *חדשים* ידווחו
    verified_ok = set()
    try:
        verified_ok = set(json.load(open(os.path.join(HERE, 'audio_verified_ok.json')))['verified_ok_ids'])
    except Exception:
        pass

    # --- 1. audio suspects (published, public)
    rows = []
    off = 0
    while True:
        batch = q("SELECT l.id,l.title,l.audio_url,l.status,r.name AS rabbi "
                  "FROM lessons l LEFT JOIN rabbis r ON r.id=l.rabbi_id "
                  "WHERE l.audio_url IS NOT NULL AND l.status='published' "
                  f"ORDER BY l.id LIMIT 2000 OFFSET {off}")
        if not isinstance(batch, list) or not batch:
            break
        rows += batch
        off += 2000
        if len(batch) < 2000:
            break
    for x in rows:
        if x['id'] in verified_ok:
            continue
        t = norm(x['title']); r = norm(x.get('rabbi') or '')
        ent = truth.get((t, r)) or truth.get((t, ''))
        if not ent or ent['n'] == 0:
            continue
        if basename(x['audio_url']) not in ent['media']:
            findings['audio_suspects'].append(
                {'id': x['id'], 'title': x['title'], 'rabbi': x.get('rabbi'),
                 'db_audio': basename(x['audio_url']),
                 'old_media_sample': sorted(ent['media'])[:3]})

    # --- 2. rabbi sidebar count drift
    # מדד נכון (תוקן 7.7.2026 אחרי תקרית-רגרסיה): הקונבנציה במערכת היא
    #   lesson_count = שיעורים published *ציבוריים* (לא teachers-only) לפי rabbi_id.
    # זה מתקיים ב-186/189 רבנים; הפרות = ספירות-stale (למשל אחרי סבבי-ארכוב).
    # ⚠️ הגרסה הקודמת השוותה מול rabbi_page_items (רשימה מובחרת, לא סך) ודיווחה
    #   "134 drift" שקרי → "תיקון" שהוריד את יואב 1717→143 (גולגל מהגיבוי).
    #   לעולם לא למדוד ספירות מול page_items.
    drift = q("""
SELECT r.name, r.lesson_count, v.n AS actual FROM rabbis r
JOIN LATERAL (
  SELECT (SELECT count(*) FROM lessons l WHERE l.rabbi_id=r.id AND l.status='published'
          AND NOT (l.audience_tags @> ARRAY['teachers'] AND NOT l.audience_tags @> ARRAY['general'])) AS n
) v ON true
WHERE r.status='active' AND r.entity_type='rabbi' AND abs(coalesce(r.lesson_count,0)-v.n)>0
""")
    if isinstance(drift, list):
        findings['rabbi_count_drift'] = drift

    # --- 3. phantom rabbis: active rabbis שאינם מופיעים בשום מקור באתר הישן
    # תוקן 7.7.2026: (א) נרמול משופר — הישן כותב "זצל" בלי גרשיים ו-"(לנשים)" לא-עקבי,
    # מה שיצר 20 פנטומים-שקריים (קופרמן, דוד לאו, מורות...). (ב) נוכחות באגף-המורים
    # הישן (old_teachers_listings) = לגיטימי — יוצרי דפי-עבודה לא הופיעו בסיידבר-הרבנים.
    def norm_name(t):
        t = norm(t)
        t = re.sub(r'\s*זצ"?ל\s*$', '', t)
        t = re.sub(r'\s*\(לנשים\)\s*', ' ', t)
        return re.sub(r'\s+', ' ', t).strip()
    old_names = set()
    teachers_blob = ''
    try:
        # json.load (לא regex!) — שמות עם גרשיים נשמרים ב-JSON כ-`זצ\"ל`, ו-regex
        # `"([^"]+)"` נעצר בגרש המוברח → השם נקטע → phantom שקרי. זה היה המקור ל-20 FP.
        sidebar = json.load(open(os.path.join(ONEONE, 'old_rabbis_sidebar.json'), encoding='utf-8'))
        for it in sidebar.get('items', []):
            for k in ('name', 'name_norm', 'title'):
                if it.get(k):
                    old_names.add(norm_name(it[k]))
        # כל דאטת-הישן (מורים + רשימות כלליות) — רב שמופיע בכל אחת מהן = לא פנטום
        parts = []
        for fn in ('old_teachers_listings.json', 'old_listings_torah_ketuvim.json',
                   'old_listings_neviim_moadim.json'):
            parts.append(json.dumps(json.load(open(os.path.join(ONEONE, fn), encoding='utf-8')),
                                    ensure_ascii=False))
        teachers_blob = norm(' '.join(parts))
    except Exception:
        pass
    if old_names:
        active = q("SELECT name FROM rabbis WHERE status='active' AND entity_type='rabbi' AND lesson_count>0")
        for a in active if isinstance(active, list) else []:
            nn = norm_name(a['name'])
            in_sidebar = nn in old_names
            # יוצר אגף-מורים בישן? (חיפוש בשם ללא תואר "הרב ")
            bare = re.sub(r'^הרב(נית)?\s+', '', nn)
            in_teachers = bool(bare) and bare in teachers_blob
            if not in_sidebar and not in_teachers:
                findings['phantom_rabbis'].append(a['name'])

    os.makedirs(os.path.join(HERE, 'reports'), exist_ok=True)
    out = os.path.join(HERE, 'reports', 'LESSON-FIELD-PARITY.json')
    json.dump(findings, open(out, 'w'), ensure_ascii=False, indent=1)
    na, nd, np_ = len(findings['audio_suspects']), len(findings['rabbi_count_drift']), len(findings['phantom_rabbis'])
    print(f"audio_suspects={na} rabbi_count_drift={nd} phantom_rabbis={np_} → {out}")
    # phantom_rabbis כולל false-positives צפויים (רבנים שדפי-הישן שלהם נשברו בגרידה) — לסקור ידנית.
    sys.exit(1 if (na or nd) else 0)

if __name__ == '__main__':
    main()
