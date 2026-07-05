#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
regression_guard.py — שומר-הרצפה של רמת מיגרציה 8.5 (נכתב 5.7.2026).

למה קיים: סבב ציד-הזיות (70+10 סוכנים, 3-5.7) חשף שני דברים —
  (1) באגי-אמת שהמבחן-הגדול (הרכב-צמתים) לא בדק: שיוך מדיה/רב פר-שיעור, סדרות-פנטום.
  (2) שהסוכנים עצמם טועים: הם סימנו עשרות פרקי-תהילים נבדלים כ"כפילויות למחיקה",
      ו-6 שיעורי-גץ יחידים כ"מוזרקים". ארכוב עיוור של אלה = הסתרת תוכן תורני אמיתי.

הסקריפט הזה הוא הרצפה: הוא נכשל (exit 1) אם מופיע שוב אחד מדפוסי-הכשל שתוקנו,
או אם מישהו (אדם או סוכן) ארכב שיעור בלי הצדקה. הרץ אותו:
  • אחרי כל סבב-תיקונים (לפני שקוראים לזה "גמור").
  • כ-cron יומי לצד parity_watch, כדי לתפוס רגרסיה עתידית.

python3 regression_guard.py            # בדיקה; exit 1 אם יש ממצא
python3 regression_guard.py --json     # פלט JSON

⚠️ כלל-הזהב שנלמד בדם (5.7): לעולם אל תארכב "כפילות" בלי אחד משני אלה:
  (א) תאום קנוני published עם אותה כותרת/מדיה, או
  (ב) סיבת-פנטום מוכחת — אודיו-תבנית זר (01Sc_Bereshit על ספר אחר), 404 בישן,
      או "(N)" בכותרת עם גרסה-נקייה published.
בדיקת-התאום קודמת לארכוב. תמיד. אחרת משחזרים (עדיף כפילות גלויה מתוכן מוסתר).
"""
import json, sys, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sbq  # noqa

def q(sql):
    import time
    for _ in range(8):
        out = sbq.run(sql)
        if 'ThrottlerException' in out or 'Too Many Requests' in out:
            time.sleep(15); continue
        try:
            d = json.loads(out)
        except Exception:
            time.sleep(3); continue
        if isinstance(d, dict) and d.get('message'):  # SQL error / transient
            time.sleep(3); continue
        return d if isinstance(d, list) else []
    return []

# ספרי התנ"ך — לזיהוי כותרת-שיעור ששייכת לספר אחר מהסדרה
BOOK_PREFIX = ('בראשית','שמות','ויקרא','במדבר','דברים','יהושע','שופטים','שמואל','מלכים',
               'ישעיהו','ירמיהו','יחזקאל','הושע','יואל','עמוס','עובדיה','יונה','מיכה','נחום',
               'חבקוק','צפניה','חגי','זכריה','מלאכי','תהילים','תהלים','משלי','איוב','רות',
               'איכה','קהלת','אסתר','דניאל','עזרא','נחמיה','שיר')

def main():
    findings = []

    # ── בדיקה 1: אודיו-תבנית זר — שיעור עם אודיו של ספר אחר (הדפוס של ישעיהו/ירמיהו-מוקלט)
    # התבנית 01Sc_Bereshit היא הקלטת-בראשית; אם היא יושבת על שיעור שכותרתו אינה בראשית = פנטום.
    r = q("""SELECT count(*) AS n FROM lessons
             WHERE status='published' AND audio_url ILIKE '%01Sc_Bereshit%'
             AND title NOT LIKE '%בראשית%'""")
    n = r[0]['n'] if r else 0
    if n:
        findings.append({'check': 'foreign_template_audio', 'severity': 'high', 'count': n,
                         'detail': 'שיעורים מפורסמים עם אודיו-הקלטת-בראשית (01Sc_Bereshit) שכותרתם אינה בראשית — פנטום.'})

    # ── בדיקה 2: סדרות-מוקלט פנטום — סדרה מפורסמת שכל שיעוריה נושאים כותרת של ספר אחר
    rows = q("""SELECT s.id, s.title AS series,
                       count(*) FILTER (WHERE l.status='published') AS pub
                FROM series s JOIN lessons l ON l.series_id=s.id
                WHERE s.title LIKE '%מוקלט%' AND s.status='active'
                GROUP BY s.id, s.title""")
    for row in rows:
        book = re.split(r'\s*-', row['series'])[0].strip()
        mism = q(f"""SELECT count(*) AS n FROM lessons
                     WHERE series_id='{row['id']}' AND status='published'
                     AND title NOT LIKE '%{book[:10]}%' AND title LIKE '%מוקלט%'""")
        if mism and mism[0]['n'] > 0:
            findings.append({'check': 'phantom_muklat_series', 'severity': 'high',
                             'entity': row['series'], 'count': mism[0]['n'],
                             'detail': f"סדרת-מוקלט '{row['series']}' מכילה שיעורי-מוקלט של ספר אחר."})

    # ── בדיקה 3: ארכוב-יתר — שיעור שאורכב אך אין לו תאום published ואין סיבת-פנטום ברורה.
    # זה תופס אם סוכן/אדם עתידי יארכב "כפילות" בטעות (הטעות של 5.7).
    arch = q("""SELECT l.id, l.title, l.audio_url FROM lessons l
                WHERE l.status='archived' AND l.updated_at > now() - interval '2 days'""")
    suspect = 0; examples = []
    for a in arch:
        au = a.get('audio_url') or ''
        if '01Sc_Bereshit' in au or '01Sc_bereshit' in au:
            continue  # פנטום מאומת
        if re.search(r'\(\d+\)\s*$', a['title'] or ''):
            continue  # מסומן-כפילות "(N)"
        t = (a['title'] or '').replace("'", "''")
        tw = q(f"SELECT id FROM lessons WHERE title='{t}' AND status='published' LIMIT 1")
        if not tw:
            suspect += 1
            if len(examples) < 10:
                examples.append(a['title'][:50])
    if suspect:
        findings.append({'check': 'over_archived_without_twin', 'severity': 'medium', 'count': suspect,
                         'examples': examples,
                         'detail': 'שיעורים שאורכבו לאחרונה בלי תאום published ובלי סיבת-פנטום — חשד להסתרת תוכן אמיתי. לשחזר או להצדיק.'})

    # ── בדיקה 4: סדרה מפורסמת שכל שיעוריה archived/draft (קליפה ריקה גלויה)
    empty = q("""SELECT count(*) AS n FROM series s
                 WHERE s.status='active'
                 AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.series_id=s.id AND l.status='published')
                 AND EXISTS (SELECT 1 FROM lessons l WHERE l.series_id=s.id)""")
    if empty and empty[0]['n'] > 0:
        findings.append({'check': 'active_series_no_published_lessons', 'severity': 'low', 'count': empty[0]['n'],
                         'detail': 'סדרות active שכל שיעוריהן לא-מפורסמים — או לארכב את הסדרה או לפרסם שיעור.'})

    out = {'level': '8.5-baseline', 'findings': findings,
           'clean': len(findings) == 0}
    if '--json' in sys.argv:
        print(json.dumps(out, ensure_ascii=False, indent=1))
    else:
        if out['clean']:
            print('✅ regression_guard נקי — רמת מיגרציה 8.5 נשמרת.')
        else:
            print(f'🔴 {len(findings)} ממצאי-רגרסיה:')
            for f in findings:
                print(f"  [{f['severity']}] {f['check']} ×{f.get('count','?')} — {f['detail']}")
                for e in f.get('examples', [])[:5]:
                    print(f"        · {e}")
    sys.exit(0 if out['clean'] else 1)

if __name__ == '__main__':
    main()
