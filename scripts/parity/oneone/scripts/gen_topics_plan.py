# -*- coding: utf-8 -*-
"""
gen_topics_plan.py — READ-ONLY plan generator for the topics tab + topic pages (1:1 parity).
Inputs: oneone/ ground truth + newdb dumps + match/item_match.json.
Output: oneone/plans/topics_plan.json  {_meta, ops, yoav_review, code_asks, stats}
No DB writes, no src/ edits.
"""
import json, os, re, unicodedata
from collections import defaultdict, Counter

D = '/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/oneone/'
OUT = os.path.join(D, 'plans', 'topics_plan.json')
os.makedirs(os.path.dirname(OUT), exist_ok=True)

def nh(s):
    if s is None: return ''
    s = unicodedata.normalize('NFC', s)
    s = ''.join(ch for ch in s if not (0x0591 <= ord(ch) <= 0x05C7))
    s = re.sub(r'[״"\'׳`]', '', s)
    s = re.sub(r'[|–—\-_,:;!?()\[\]{}<>./]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()

load = lambda fn: json.load(open(os.path.join(D, fn)))

old_sidebar = load('old_topics_sidebar.json')['items']            # 127, order = count desc
old_pages   = load('old_topic_pages.json')                        # per-topic page items
nt          = load('newdb_topics.json')
topics      = nt['topics']; lesson_topic_rows = nt['lesson_topics']
lessons     = load('newdb_lessons.json')
series      = load('newdb_series.json')
match       = json.load(open(os.path.join(D, 'match', 'item_match.json')))
tp_match    = match['topic_pages']

lessons_by_id = {l['id']: l for l in lessons}
series_by_id  = {s['id']: s for s in series}
linked_pairs  = {(lt['lesson_id'], lt['topic_id']) for lt in lesson_topic_rows}
topic_links   = defaultdict(set)
for lt in lesson_topic_rows:
    topic_links[lt['topic_id']].add(lt['lesson_id'])

THEMES_ROOT = next(t for t in topics if t['slug'] == 'themes-root')
kids = [t for t in topics if t['parent_id'] == THEMES_ROOT['id']]
kid_by_norm = {}
for k in kids:
    kid_by_norm.setdefault(nh(k['title']), []).append(k)

# ---------------- topic resolution ----------------
TMP_TANAKH_MUKLAT = 'tmp-topic-tanakh-muklat'
TMP_PEREK_LESHIUR = 'tmp-topic-perek-leshiur'
MERGED = {  # old sidebar title -> (target topic id, merge note)
    'התשובה': ('1c4b4a22-adff-437e-84e0-472e76bbf0b8', 'merged into תשובה (gap4 10.6.2026)'),
    'נסים':   ('b5ddc44d-b351-4ddb-b445-e235ba5c097c', 'merged into ניסים (gap4 10.6.2026)'),
}
CREATED = {'תנ"ך מוקלט': TMP_TANAKH_MUKLAT, 'לימוד בקצב של פרק לשיעור': TMP_PEREK_LESHIUR}
DELETED = {'חנ'}
SHLOSHET = 'e6060601-0006-4000-8000-000000000001'  # שלושת השבועות — new-only extra

def topic_target(old_title):
    """-> (ref, kind) where ref is topic_id or tmp_id."""
    if old_title in CREATED: return CREATED[old_title], 'created'
    if old_title in MERGED:  return MERGED[old_title][0], 'merged'
    hit = kid_by_norm.get(nh(old_title))
    if hit: return hit[0]['id'], 'existing'
    return None, 'missing'

ops, yoav, stats = [], [], {}
def add(op): ops.append(op)

# ---------------- 1. sidebar: create / sort ----------------
add({'op': 'create_topic', 'tmp_id': TMP_TANAKH_MUKLAT, 'title': 'תנ"ך מוקלט',
     'parent_ref': THEMES_ROOT['id'], 'slug_suggest': 'theme-tanakh-muklat', 'sort_order': 6,
     'evidence': {'old_url': old_sidebar[5]['url'], 'detail': 'old sidebar #6 (count 40); page = 33 series-collection cards; absent from new themes-root (gap4 known)'},
     'confidence': 'high'})
add({'op': 'create_topic', 'tmp_id': TMP_PEREK_LESHIUR, 'title': 'לימוד בקצב של פרק לשיעור',
     'parent_ref': THEMES_ROOT['id'], 'slug_suggest': 'theme-perek-leshiur', 'sort_order': 9,
     'evidence': {'old_url': old_sidebar[8]['url'], 'detail': 'old sidebar #9 (count 38); page = 38 series-collection cards; absent from new themes-root (gap4 known)'},
     'confidence': 'high'})

n_sort_correct = 0
for o in old_sidebar:
    ref, kind = topic_target(o['title'])
    if kind in ('created',):  # sort carried on create_topic
        continue
    if kind == 'missing' and o['title'] in DELETED:
        continue
    if kind == 'merged':
        # merged target keeps the PRIMARY entry's position (תשובה 45 / ניסים 88);
        # emitting a second sort for the secondary old entry would conflict.
        continue
    desired = o['order_index'] + 1
    t = topics and next((t for t in topics if t['id'] == ref), None)
    already = bool(t and t.get('sort_order') == desired)
    if already: n_sort_correct += 1
    add({'op': 'set_topic_sort', 'topic_id': ref, 'sort_order': desired,
         'already_correct': already, 'title': o['title'],
         'evidence': {'old_url': o['url'], 'detail': f"old sidebar position {desired} (order = count desc as on old home); raw '{o['raw_text']}'"},
         'confidence': 'high'})
# extra new-only topic — push to end, keep (no delete policy; no hide_topic op exists)
add({'op': 'set_topic_sort', 'topic_id': SHLOSHET, 'sort_order': 9999, 'title': 'שלושת השבועות',
     'evidence': {'old_url': 'https://www.bneyzion.co.il/ (home sidebar #tags)', 'detail': 'NOT on old sidebar (new-site addition). Kept (never-delete) but pushed to end.'},
     'confidence': 'med'})
yoav.append({'topic': 'שלושת השבועות', 'issue': 'topic exists only on the NEW site (sidebar parity break: old has exactly 127 tags). Kept at end (sort 9999). Decide: keep visible / remove from themes-root (needs a reparent/hide op not in vocabulary).', 'topic_id': SHLOSHET})
yoav.append({'topic': 'תשובה/התשובה + ניסים/נסים', 'issue': "old sidebar lists 4 separate tags (תשובה 8, התשובה 5, ניסים 2, נסים 3 — duplicate-tag data bug on the old site). gap4 (10.6) already merged them in DB. We keep the merge (sane behavior, not replicating the bug): merged topics will show 13 and 5 items vs old sidebar badges 8 and 2.", 'decision': 'keep merged; secondary-page items appended after primary order (sort 1000+idx)'})
yoav.append({'topic': 'חנ', 'issue': "old junk tag (1 item) — Saar already deleted it in new DB. Kept deleted. Its single lesson exists and is reachable: קרבנות בני הגולה, חנוכת המשכן, ולעתיד לבוא (86f6b071-351d-4dff-a6ad-220a63c070fb).", 'decision': 'no recreate'})
yoav.append({'topic': 'old sidebar badge counts', 'issue': "two old self-mismatches verified by re-fetch: תנ\"ך מוקלט badge 40 vs 33 page items; האזנה לפסוקים badge 56 vs 55 items. Plan targets the PAGE truth (33/55). New sidebar counts will equal rendered counts per code_ask CA1.", 'decision': 'page truth wins'})

# ---------------- 2. series fixes discovered via topic pages ----------------
TMP_MISHPAT = 'tmp-series-mishpat-hamelech'
TMP_BAIT2   = 'tmp-series-maamarim-bait-sheni'
RABBI_MILLER = '52c215fe-b60e-42b6-a5ce-feb1703f65cd'      # הרב יוסף מילר
RABBI_VESHINANTAM_OTZAR = '6f4b2572-b019-4832-9547-de7e8bc6d909'  # ושננתם - אוצר התורה

add({'op': 'create_series', 'tmp_id': TMP_MISHPAT, 'title': 'משפט המלך בתנ"ך והלכה',
     'parent_ref': '57b832aa', 'parent_ref_full': next(s['id'] for s in series if s['id'].startswith('57b832aa')),
     'status': 'published', 'audience_tags': ['general'], 'sort_order': None, 'bible_book': None,
     'evidence': {'old_url': 'https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים-כלליים-בתנך/המלוכה-בישראל-ובעמים/משפט-המלך-בתנך-והלכה/',
                  'detail': 'old series page fetched live 12.6: 10 lessons by הרב יוסף מילר. All 10 exist in newdb inside the orphan bucket שיעורים כלליים (cab4229a). Series row itself missing.'},
     'confidence': 'high'})
add({'op': 'set_series_rabbi', 'series_id': TMP_MISHPAT, 'rabbi_id': RABBI_MILLER,
     'evidence': {'old_url': 'old series page', 'detail': 'all lessons by הרב יוסף מילר'}, 'confidence': 'high'})
MISHPAT_LESSONS = [  # (lesson_id_prefix, title) in old page order
    ('4f668904', 'תחומי משפט המלך'), ('ae015c05', 'משפט המלך בדיני ממונות'),
    ('6a0d3c74', 'משפט המלך בעוברי עבירה'), ('01a43247', 'משפט המלך בעוברי עבירה - המשך'),
    ('26a87280', 'משפט המלך בעבירות שאין בהן מיתת בית דין'), ('66b2fd61', 'ענשי מיתה בדין המלכות'),
    ('559b4bfb', 'מורד במלכות - חיובו ומשפטו'), ('197c0dd6', 'משפטו של יואב בן צרויה'),
    ('d0ddcd8c', 'דינו של נבל הכרמלי'), ('f3bdc2b6', 'חרם המלך ומשפט העוברים על החרם'),
]
add({'op': 'create_series', 'tmp_id': TMP_BAIT2, 'title': 'מאמרים על ימי בית שני',
     'parent_ref': 'ddc98b2e', 'parent_ref_full': next(s['id'] for s in series if s['id'].startswith('ddc98b2e')),
     'status': 'published', 'audience_tags': ['general'], 'sort_order': None, 'bible_book': None,
     'evidence': {'old_url': 'https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים-כלליים-בתנך/תקופת-הבית-השני/מאמרים-על-ימי-בית-שני/',
                  'detail': 'old series page fetched live 12.6: 9 articles by ושננתם - אוצר התורה. All 9 exist in newdb inside שיעורים כלליים (cab4229a). Series row missing. Also appears as series-card on old חגי/זכריה/מלאכי book pages.'},
     'confidence': 'high'})
add({'op': 'set_series_rabbi', 'series_id': TMP_BAIT2, 'rabbi_id': RABBI_VESHINANTAM_OTZAR,
     'evidence': {'old_url': 'old series page', 'detail': 'all 9 by ושננתם - אוצר התורה'}, 'confidence': 'high'})
BAIT2_LESSONS = [
    ('03d59200', 'הכרונולוגיה של מלכות פרס'), ('06daccbd', 'מיהו ארתחשסתא?'),
    ('0e0c5ef8', 'האם עשרת השבטים חזרו עם שבי הגולה?'), ('da739be5', 'בניית המזבח בידי שבי הגולה'),
    ('c1f62106', 'בנין בית המקדש בימי שבי הגולה'), ('f4620397', 'מדוע לא היה ארון בבית המקדש השני?'),
    ('f573c6e2', 'קידוש הארץ בידי שבי הגולה'), ('01c2bac7', 'האם עזרא הוא מלאכי?'),
    ('a021982f', 'אנשי כנסת הגדולה'),
]
def full_lesson_id(prefix):
    return next(l['id'] for l in lessons if l['id'].startswith(prefix))
for i, (pref, title) in enumerate(MISHPAT_LESSONS, 1):
    lid = full_lesson_id(pref)
    add({'op': 'move_lesson', 'lesson_id': lid, 'to_series_ref': TMP_MISHPAT, 'title': title,
         'evidence': {'old_url': '…/משפט-המלך-בתנך-והלכה/', 'detail': f'old page row {i}; currently in orphan bucket שיעורים כלליים'}, 'confidence': 'high'})
    add({'op': 'set_lesson_sort', 'lesson_id': lid, 'series_ref': TMP_MISHPAT, 'sort_order': i,
         'evidence': {'old_url': '…/משפט-המלך-בתנך-והלכה/', 'detail': 'old page order'}, 'confidence': 'high'})
for i, (pref, title) in enumerate(BAIT2_LESSONS, 1):
    lid = full_lesson_id(pref)
    add({'op': 'move_lesson', 'lesson_id': lid, 'to_series_ref': TMP_BAIT2, 'title': title,
         'evidence': {'old_url': '…/מאמרים-על-ימי-בית-שני/', 'detail': f'old page row {i}; currently in orphan bucket שיעורים כלליים'}, 'confidence': 'high'})
    add({'op': 'set_lesson_sort', 'lesson_id': lid, 'series_ref': TMP_BAIT2, 'sort_order': i,
         'evidence': {'old_url': '…/מאמרים-על-ימי-בית-שני/', 'detail': 'old page order'}, 'confidence': 'high'})
    if lessons_by_id[lid].get('audience_tags') == []:
        add({'op': 'retag_lesson', 'lesson_id': lid, 'audience_tags': ['general'],
             'reason': 'empty audience_tags; lesson is public on old site (מאמרים על ימי בית שני)',
             'evidence': {'old_url': '…/מאמרים-על-ימי-בית-שני/', 'detail': title}, 'confidence': 'med'})

# ---------------- 3. inserts (old topic-page items absent from newdb) ----------------
BOOK_SERIES = {  # book -> public book-series id (tree_map exact matches)
    'בראשית': 'db78e0a3-3bcf-4009-96b8-49c76df555f9', 'שמות': '5149a23b-8181-4c41-81db-1efcd2631f5a',
    'ויקרא': '6267feb7-de69-4106-aa02-172411e070cd', 'במדבר': '7f5a8fc9-741f-44ba-90b8-9068e2c8c1e2',
    'שמואל ב': '02539385-aaaa-4c7f-9d85-d1af6e1cdd96', 'מלכים א': 'ff96641e-68f3-4e4c-92ee-2175b77f6e75',
    'ירמיהו': '69c795d9-a415-43a2-afb1-8694fe2e2a60', 'איכה': '35781f30-76a7-4fc6-aa06-52a1db4a4054',
    'אסתר': '8600dfad-9e4d-41af-8b85-ccc325ee1298', 'עזרא ונחמיה': '5896c267-01b2-44d0-9fa4-f0d3b357ccc1',
    'הושע': '5f7b7d9c-ce6b-4bb9-9f43-b097da92a72d', 'יואל': 'a8797de2-98f1-461f-b5f1-6b1143df5597',
    'מיכה': '895474b3-1a1c-4693-820c-a6e645c4e853', 'נחום': 'e8f7ed1c-fa87-4186-ba01-8d2dd4e40b88',
    'חגי': '273e3b3c-318d-4335-b026-d03dc4c8a602', 'זכריה': 'c6285a2a-5b5a-4005-bad0-6712206d5ed6',
    'מלאכי': '3684f720-fd9d-400e-bdb4-24343cbd51b6',
    'שמואל א': 'd4dd089a', 'מלכים ב': '75b7c62c',
}
def book_full(book):
    v = BOOK_SERIES[book]
    if len(v) == 8:
        v = next(s['id'] for s in series if s['id'].startswith(v))
    return v

# whole-book ושננתם public PDF lessons (old cards typed שיעור; the same-named NEW series are
# TEACHERS-wing chapter series — must NOT be linked into public topic pages)
WS_BOOKS = [
    # (title on topic page, book, media path on old site or None->fetch, teachers-series coincidence id or None)
    ('ספר בראשית עם ביאור "ושננתם"', 'בראשית', None, '896aafa4'),
    ("ספר שמות עם ביאור 'ושננתם'", 'שמות', None, 'a64ada4b'),
    ("ספר ויקרא עם ביאור 'ושננתם'", 'ויקרא', None, '29eb7c0b'),
    ("ספר במדבר עם ביאור 'ושננתם'", 'במדבר', None, '6762cff2'),
    ("ספר שמואל ב עם ביאור 'ושננתם'", 'שמואל ב', '/media/142942/שמואל-ב.pdf', 'ca117e7c'),
    ("ספר מלכים א עם ביאור 'ושננתם'", 'מלכים א', '/media/142898/מלכים.pdf', 'dff2b236'),
    ("ספר ירמיהו עם ביאור 'ושננתם'", 'ירמיהו', '/media/142951/ושננתם-ירמיהו-רוב-הפרקים.pdf', 'ad002f20'),
    ("ספר הושע עם ביאור 'ושננתם'", 'הושע', '/media/142953/ושננתם-הושע.pdf', None),
    ("ספר יואל עם ביאור 'ושננתם'", 'יואל', '/media/142955/ושננתם-יואל.pdf', None),
    ("ספר מיכה עם ביאור 'ושננתם'", 'מיכה', '/media/142957/ושננתם-מיכה.pdf', None),
    ("ספרים נחום וחבקוק עם ביאור 'ושננתם'", 'נחום', '/media/142959/ושננתם-נחום-וחבקוק.pdf', None),
    ("ספר חגי עם ביאור 'ושננתם'", 'חגי', '/media/142961/ושננתם-חגי.pdf', None),
    ("ספר זכריה עם ביאור 'ושננתם'", 'זכריה', '/media/142963/ושננתם-זכריה-א-ד.pdf', None),
    ("ספר מלאכי עם ביאור 'ושננתם'", 'מלאכי', '/media/142965/ושננתם-מלאכי.pdf', None),
    ("מגילת איכה עם ביאור 'ושננתם'", 'איכה', None, '43c1040b'),
    ("מגילת אסתר עם ביאור 'ושננתם'", 'אסתר', '/media/143558/מגילת-ישראל-עם-ביאור-ושננתם.pdf', '4915aec2'),
    ("ספר עזרא עם תרגום וביאור 'ושננתם'", 'עזרא ונחמיה', None, '3f9978c4'),
]
ws_tmp = {}   # nh(title) -> tmp lesson ref
insert_count = 0
def add_insert(tmp_id, payload, old_url, detail, confidence='high'):
    global insert_count
    insert_count += 1
    add({'op': 'insert_lesson', 'tmp_id': tmp_id, 'payload': payload, 'old_url': old_url,
         'dedup_key': f"{nh(payload['title'])}::{nh(payload.get('rabbi_name') or '')}",
         'evidence': {'old_url': old_url, 'detail': detail}, 'confidence': confidence})

for i, (title, book, media, teach_sid) in enumerate(WS_BOOKS):
    tmp = f'tmp-lesson-ws-{i:02d}'
    ws_tmp[nh(title)] = tmp
    att_old = ('https://www.bneyzion.co.il' + media) if media else None
    payload = {'title': title, 'rabbi_name': 'ושננתם', 'series_ref': book_full(book),
               'source_type': 'text', 'content_type': 'קריאת הפסוקים עם ביאור פשוט',
               'audio_url': None, 'video_url': None,
               'attachment_url_old': att_old, 'rehost': True,
               'fetch_media_from_old_page': att_old is None,
               'bible_book': book, 'bible_chapter': None,
               'audience_tags': ['general'], 'status': 'published'}
    det = 'whole-book public PDF שיעור card (old book page + topic page קריאת הפסוקים). '
    if teach_sid:
        det += f'TRAP: same-named NEW series {teach_sid}… is a TEACHERS chapter-series — not this content; do not link it publicly. '
    if att_old is None:
        det += 'PDF media id not in listings dump — apply stage must fetch the old card/page to extract /media/... URL.'
    add_insert(tmp, payload, f'https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/…/{title}', det,
               'high' if att_old else 'med')
yoav.append({'topic': 'קריאת הפסוקים עם ביאור פשוט', 'issue': "17 whole-book 'ספר X עם ביאור ושננתם' public PDF lessons missing from newdb (the same-named series in newdb are teachers-wing chapter series — name coincidence, must stay out of public paths). Inserted as public lessons into each book's public series. 5 of them (בראשית, שמות, ויקרא, במדבר, איכה, עזרא) need the PDF URL fetched from the old card at apply time.", 'count': 17})

# other true inserts
OTHER_INSERTS = {}
def oi(page, idx, tmp, payload, old_url, detail, conf='high'):
    OTHER_INSERTS[(page, idx)] = tmp
    add_insert(tmp, payload, old_url, detail, conf)

old_item = lambda page, idx: next(it for it in old_pages[page]['items'] if it['order_index'] == idx)

it = old_item('ימי העיון בתנ"ך', 50)
oi('ימי העיון בתנ"ך', 50, 'tmp-lesson-hamlachat-shaul-rosenzweig',
   {'title': 'המלכת שאול', 'rabbi_name': 'הרב בנימין רוזנצוויג', 'series_ref': book_full('שמואל א'),
    'source_type': 'audio', 'content_type': None, 'audio_url': None, 'video_url': None,
    'attachment_url_old': it['attachment_href'], 'rehost': False, 'media_note': 'old-site S3 bucket (bneyzion.s3.us-east-2) — same family as existing legacy_attachment_url rows; rehost optional',
    'bible_book': 'שמואל א', 'bible_chapter': None, 'audience_tags': ['general'], 'status': 'published'},
   'https://www.bneyzion.co.il' + it['href'],
   'ימי-עיון audio; newdb has המלכת שאול only by וידר/קשתיאל — רוזנצוויג version absent (S3 path unmatched)')

it = old_item('ימי העיון בתנ"ך', 53)
oi('ימי העיון בתנ"ך', 53, 'tmp-lesson-miglut-yehoyachin-abramson',
   {'title': 'מגלות יהויכין עד חורבן הבית', 'rabbi_name': 'הרב אריה אברמסון', 'series_ref': book_full('מלכים ב'),
    'source_type': 'audio', 'content_type': None, 'audio_url': None, 'video_url': None,
    'attachment_url_old': it['attachment_href'], 'rehost': False, 'media_note': 'old-site S3 bucket',
    'bible_book': 'מלכים ב', 'bible_chapter': None, 'audience_tags': ['general'], 'status': 'published'},
   'https://www.bneyzion.co.il' + it['href'],
   'ימי-עיון audio; newdb has same title only as a ושננתם text article — different content (audio, different rabbi)')

it = old_item('כהונה', 17)
oi('כהונה', 17, 'tmp-lesson-harigat-nov-kashtiel',
   {'title': 'הריגת נוב עיר הכהנים', 'rabbi_name': 'הרב אליעזר קשתיאל', 'series_ref': book_full('שמואל א'),
    'source_type': 'audio', 'content_type': None, 'audio_url': None, 'video_url': None,
    'attachment_url_old': it['attachment_href'], 'rehost': False, 'media_note': 'old-site S3 bucket',
    'bible_book': 'שמואל א', 'bible_chapter': None, 'audience_tags': ['general'], 'status': 'published',
    'series_ref_note': "old href parent is collection שיעורים-שמואל-א (no tree_map match) — fell back to the שמואל א book series"},
   'https://www.bneyzion.co.il' + it['href'],
   'newdb has same-title lesson only by הרב צבי שוויגר (different media); קשתיאל audio absent', 'high')

it = old_item('ארץ ישראל', 4)
oi('ארץ ישראל', 4, 'tmp-lesson-nachalat-eretz-israel-miller',
   {'title': 'נחלת ארץ ישראל', 'rabbi_name': 'הרב יוסף מילר',
    'series_ref': next(s['id'] for s in series if s['id'].startswith('1cd1aa5d')),
    'series_ref_note': 'existing series נושאי יסוד בנביאים בראי ההלכה (1cd1aa5d) — its other 9 lessons already migrated',
    'source_type': 'text', 'content_type': None, 'audio_url': None, 'video_url': None,
    'attachment_url_old': 'https://www.bneyzion.co.il/media/144262/נחלת-ארץ-ישראל.pdf', 'rehost': True,
    'bible_book': None, 'bible_chapter': None, 'audience_tags': ['general'], 'status': 'published'},
   'https://www.bneyzion.co.il' + it['href'],
   'the only lesson of series נושאי-יסוד missing from newdb; PDF path recovered from old יהושע book listing')

it = old_item('האבות', 5)
oi('האבות', 5, 'tmp-lesson-qa-gnevat-neshei-avot',
   {'title': 'גניבת נשי האבות ונסיונות חטיפה נוספים', 'rabbi_name': 'הרב יואב אוריאל',
    'series_ref': None,
    'series_ref_note': 'public שו"ת attached on old site to פרשת לך-לך page; assign per the shut/parasha convention chosen in the listings plan',
    'source_type': 'text', 'content_type': 'שו"ת',
    'content_seed_question': it.get('question'),
    'audio_url': None, 'video_url': None, 'attachment_url_old': None, 'rehost': False,
    'bible_book': 'בראשית', 'bible_chapter': None, 'audience_tags': ['general'], 'status': 'published'},
   'https://www.bneyzion.co.il' + it['href'],
   'public שו"ת missing from newdb. NOTE: a teachers docx with the SAME title exists (40ae000f…, הכוונה והדרכה למורה, by ושננתם) — different content, do not link it publicly.', 'med')
yoav.append({'topic': 'האבות', 'issue': "qa item גניבת נשי האבות: inserted as public שו\"ת by הרב יואב אוריאל (per old page). Same-titled teachers worksheet exists in DB (40ae000f…) — verify they are indeed distinct and confirm full answer text import from the old lesson page.", 'old_url': 'https://www.bneyzion.co.il' + it['href']})

# ---------------- 4. manual link resolutions (matched=null in item_match but content exists) ----------------
BRIT_ID = '504e17e7-d17a-4d3f-b674-e7640b4b0d41'   # מהי בעצם ברית בין הבתרים? (שנדורפי)
RESOLVED = {
    ('ארץ ישראל', 5):  (BRIT_ID, 'high', "title variant: old card 'על מה נכרתה ברית בין הבתרים…' → old href slug מהי-בעצם-ברית-בין-הבתרים == DB title (same rabbi שנדורפי)"),
    ('כריתת ברית', 2): (BRIT_ID, 'high', 'same title-variant resolution'),
    ('קיום ברית', 1):  (BRIT_ID, 'high', 'same title-variant resolution'),
    ('חנוכה', 1):      ('ba84d404-de05-486c-85f8-390a41484e83', 'high', "exact title שלוש החנוכות של חודש כסליו; rabbi conflict flagged to Yoav (old topic-tag says יואב אוריאל, DB says איתן שנדורפי)"),
    ('קריאת הפסוקים עם ביאור פשוט', 28): ('cab5bf1d-f13b-494d-9606-067d87b68337', 'high', "exact title מגילת רות עם ביאור ושננתם - פרק א; rabbi key variant ושננתם vs ושננתם - אוצר התורה"),
    ('ימי העיון בתנ"ך', 95): ('496a7521-0b1e-419a-972d-fa3b97b85f96', 'med', "ambiguous duplicate pair (night-session COPY): chose the copy inside the ימי-עיון series f4040001-…-05 matching page context; alt f0e948b3…"),
}
yoav.append({'topic': 'חנוכה', 'issue': "attribution conflict on שלוש החנוכות של חודש כסליו: old topic page credits הרב יואב אוריאל, newdb credits הרב איתן שנדורפי, old listings card shows no rabbi. Linked without changing rabbi — confirm correct attribution.", 'lesson_id': 'ba84d404-de05-486c-85f8-390a41484e83'})
yoav.append({'topic': 'ימי העיון בתנ"ך', 'issue': "רוצה להיות מלכה (הרבנית בת שבע יוסיפון) is a duplicated row; linked 496a7521… (in the ימי-עיון series). If physical dedup later keeps the other copy (f0e948b3…), re-point the link.", 'lesson_id': '496a7521-0b1e-419a-972d-fa3b97b85f96'})

# sub_series manual resolutions
SS_RESOLVED = {
    ('מלכות', 5): (TMP_MISHPAT, 'high', 'created series (see create_series)'),
    ('בית שני', 1): (TMP_BAIT2, 'high', 'created series (see create_series)'),
    ('מבט רחב על ספרים ונושאים', 19): ('1fa7e80a', 'high', "old href …/יג-מידות-הרחמים/יג-מידות-הרחמים/ = the inner series; matcher candidates were {collection bafc63d2, inner series 1fa7e80a} — inner wins by path depth"),
}

# ---------------- 5. per-page link/unlink ops ----------------
link_ops = link_existing = 0
series_links = 0
teacher_retags = set()
unmatched_left = []
old_matched_by_topic = defaultdict(set)   # topic ref -> lesson ids (or tmp refs)
page_link_seen = set()

def emit_link(topic_ref, lesson_id, sort, page, idx, conf, detail, lesson_ref_is_tmp=False):
    global link_ops, link_existing
    key = (topic_ref, lesson_id)
    if key in page_link_seen:
        return
    page_link_seen.add(key)
    o = {'op': 'link_lesson_topic',
         ('lesson_ref' if lesson_ref_is_tmp else 'lesson_id'): lesson_id,
         'topic_ref': topic_ref, 'sort_order': sort,
         'evidence': {'old_url': old_pages[page]['url'], 'detail': f'old page item #{idx}: {detail}'},
         'confidence': conf}
    if not lesson_ref_is_tmp:
        already = (lesson_id, topic_ref) in linked_pairs
        o['already_linked'] = already
        if already: link_existing += 1
        L = lessons_by_id.get(lesson_id)
        if L:
            if 'teachers' in (L.get('audience_tags') or []):
                o['flag'] = 'lesson is teachers-tagged — TopicPage filters it out; retag op emitted'
                if lesson_id not in teacher_retags:
                    teacher_retags.add(lesson_id)
                    add({'op': 'retag_lesson', 'lesson_id': lesson_id, 'audience_tags': ['general'],
                         'reason': f'shown publicly on old topic page {page}',
                         'evidence': {'old_url': old_pages[page]['url'], 'detail': L['title']}, 'confidence': 'med'})
            if L.get('status') != 'published':
                o['flag_status'] = f"status={L.get('status')} — TopicPage hides it; needs publish (no op in vocabulary, flag)"
                yoav.append({'topic': page, 'issue': f"matched lesson '{L['title']}' has status={L.get('status')} — must be published for parity", 'lesson_id': lesson_id})
    add(o)
    link_ops += 1
    old_matched_by_topic[topic_ref].add(lesson_id)

for o in old_sidebar:
    page = o['title']
    if page in DELETED:
        continue
    ref, kind = topic_target(page)
    offset = 1000 if kind == 'merged' else 0
    p_old = old_pages[page]
    p_m = tp_match[page]
    m_items = {it['idx']: it for it in p_m['items']}
    m_ss = {s['idx']: s for s in p_m.get('sub_series_match', [])}
    for it in p_old['items']:
        idx = it['order_index']; sort = idx + offset
        if it['type'] in ('lesson', 'qa'):
            mi = m_items.get(idx)
            if mi and mi.get('matched_lesson_id'):
                emit_link(ref, mi['matched_lesson_id'], sort, page, idx, 'high',
                          f"{it['title']} ({mi['method']} {mi.get('score')})")
            elif (page, idx) in RESOLVED:
                lid, conf, why = RESOLVED[(page, idx)]
                emit_link(ref, lid, sort, page, idx, conf, f"{it['title']} — {why}")
            elif (page, idx) in OTHER_INSERTS:
                emit_link(ref, OTHER_INSERTS[(page, idx)], sort, page, idx, 'high',
                          f"{it['title']} — inserted lesson", lesson_ref_is_tmp=True)
            elif nh(it['title']) in ws_tmp:
                emit_link(ref, ws_tmp[nh(it['title'])], sort, page, idx, 'high',
                          f"{it['title']} — inserted whole-book ושננתם PDF lesson", lesson_ref_is_tmp=True)
            else:
                unmatched_left.append((page, idx, it['title']))
        elif it['type'] == 'series':
            ss = m_ss.get(idx)
            sid, conf, why = None, None, None
            if ss and ss.get('matched_series_id'):
                sid, conf, why = ss['matched_series_id'], 'high', f"matched series ({ss['method']})"
            elif (page, idx) in SS_RESOLVED:
                sid, conf, why = SS_RESOLVED[(page, idx)]
                if len(sid) == 8 and not sid.startswith('tmp'):
                    sid = next(s['id'] for s in series if s['id'].startswith(sid))
            if sid:
                S = series_by_id.get(sid)
                flag = None
                if S and 'teachers' in (S.get('audience_tags') or []):
                    flag = 'matched series is teachers-tagged — verify before exposing publicly'
                    yoav.append({'topic': page, 'issue': f"series-card '{it['title']}' matched a TEACHERS-tagged series ({sid[:8]}…) — confirm it is the public series or retag/relocate", 'series_id': sid})
                op = {'op': 'link_series_topic', 'series_ref': sid, 'topic_ref': ref, 'sort_order': sort,
                      'requires': 'series_topics table + TopicPage series-card support (code_ask CA4)',
                      'evidence': {'old_url': p_old['url'], 'detail': f"old page series-card #{idx}: {it['title']} — {why}"},
                      'confidence': conf}
                if flag: op['flag'] = flag
                add(op); series_links += 1
            else:
                unmatched_left.append((page, idx, it['title'] + ' [series]'))

# ---------------- 6. extras (linked in new but not on old page) ----------------
unlink_teachers = unlink_unpublished = kept_extras = 0
kept_by_topic = {}
for o in old_sidebar:
    page = o['title']
    if page in DELETED: continue
    ref, kind = topic_target(page)
    if ref in (TMP_TANAKH_MUKLAT, TMP_PEREK_LESHIUR):  # freshly created — no links yet
        continue
    if kind == 'merged':  # extras handled on the primary page (same topic id)
        continue
    on_old = old_matched_by_topic[ref]
    extras = sorted(topic_links.get(ref, set()) - {x for x in on_old if not str(x).startswith('tmp')})
    keep = []
    for lid in extras:
        L = lessons_by_id.get(lid)
        if L and 'teachers' in (L.get('audience_tags') or []):
            add({'op': 'unlink_lesson_topic', 'lesson_id': lid, 'topic_ref': ref,
                 'reason': f"teachers content linked to public topic '{page}'; not on old topic page",
                 'evidence': {'old_url': old_pages[page]['url'], 'detail': L['title']}, 'confidence': 'high'})
            unlink_teachers += 1
        elif L and L.get('status') != 'published':
            add({'op': 'unlink_lesson_topic', 'lesson_id': lid, 'topic_ref': ref,
                 'reason': f"non-published ({L.get('status')}) link pollutes sidebar count; not on old topic page",
                 'evidence': {'old_url': old_pages[page]['url'], 'detail': L['title']}, 'confidence': 'med'})
            unlink_unpublished += 1
        else:
            keep.append({'lesson_id': lid, 'title': (L or {}).get('title'), 'rabbi': (L or {}).get('rabbi_name')})
            kept_extras += 1
    if keep:
        kept_by_topic[page] = keep
if kept_by_topic:
    yoav.append({'topic': '__extras_kept__',
                 'issue': f"{kept_extras} general-audience published lessons are linked to topics in newdb but absent from the old topic pages. Kept (genuine content, possibly tagged after the old snapshot) and flagged — Yoav decides keep/unlink per topic. Exact old-order parity of item COUNTS requires unlinking them; they are appended after old items by sort_order so old order is preserved either way.",
                 'by_topic': kept_by_topic})

# leftover unmatched safety
for page, idx, title in unmatched_left:
    yoav.append({'topic': page, 'issue': f'item #{idx} "{title}" left unresolved (no match, no insert) — manual review', 'old_url': old_pages[page]['url']})

# ---------------- meta / code_asks / stats ----------------
code_asks = [
    {'id': 'CA1', 'ask': 'Sidebar topic counts must equal what TopicPage renders', 'detail': "useTopicsSidebar.ts:60-79 counts raw lesson_topics rows (includes unpublished, teachers-tagged and duplicate lessons); TopicPage.tsx:89-141 renders published + non-teachers + title-rabbi-dedup + cap 500. Make the badge use the same filtered/deduped count (join lessons with status='published' and NOT teachers, dedup) or a precomputed count column maintained by the apply stage. (risks R-SB3 / #10)"},
    {'id': 'CA2', 'ask': 'Sidebar נושאים order must come from topics.sort_order', 'detail': "useTopicsSidebar sorts by computed lessonCount desc (:81). The plan freezes the old-site order (count-desc snapshot) into topics.sort_order 1..127 — switch the sort to sort_order asc so created topics (sort 6, 9) land in place and merged topics keep position."},
    {'id': 'CA3', 'ask': 'TopicPage item order must come from lesson_topics.sort_order', 'detail': "TopicPage.tsx sorts published_at DESC (migration order). The apply stage adds lesson_topics.sort_order; ORDER BY lesson_topics.sort_order ASC NULLS LAST. Merged-topic extras use 1000+idx so they trail the primary list. (risk R-TOP2)"},
    {'id': 'CA4', 'ask': 'Series-cards inside topic pages (series_topics table + UI)', 'detail': "Old topic pages interleave 178 series-cards with lessons (e.g. דוד המלך opens with 3 series; תנ\"ך מוקלט and לימוד בקצב של פרק לשיעור are 33/38 series-cards ONLY — without this, both new topics render empty). TopicPage currently queries lesson_topics only. Need table series_topics(series_id, topic_id, sort_order) + interleaved rendering by sort_order with a series-card component linking to /series/:id. This plan emits 178 link_series_topic ops against that table."},
    {'id': 'CA5', 'ask': 'Move/raise the 500-link cap', 'detail': "TopicPage limit(500) applies to raw link rows BEFORE filter+dedup (R-TOP1). Largest old topic is 246 items so post-cleanup it fits, but apply the limit after filtering (or raise) to be safe."},
    {'id': 'CA6', 'ask': 'Drop title+rabbi dedup once links are curated', 'detail': "TopicPage dedups by title-key+rabbi_id (risk #3) which can hide genuinely distinct same-title lessons. After this plan the per-topic link set is exact (old-page parity) — dedup by lesson_id/link row instead."},
    {'id': 'CA7', 'ask': 'VERIFY ONLY: uniform cream-gold TopicPage design on new topics', 'detail': "TopicPage already restyled cream-gold (10.6 night session). Verify the 2 created topics (new slugs) and series-cards (CA4) inherit the same design; no change expected."},
    {'id': 'CA8', 'ask': 'OPTIONAL: library topics strip population', 'detail': "useTopics() (library strip) returns ALL 864 topics incl. structural ones (R-LIB2) — align to themes-root children so the strip matches the sidebar after the cleanup."},
]

stats = {
    'old_sidebar_topics': len(old_sidebar),
    'new_themes_root_children_before': len(kids),
    'topics_matched_exact': len(old_sidebar) - 5,
    'topics_created': 2,
    'topics_merged_into_existing': 2,
    'topics_kept_deleted': 1,
    'new_only_topics_kept_flagged': 1,
    'set_topic_sort_ops': sum(1 for x in ops if x['op'] == 'set_topic_sort'),
    'set_topic_sort_already_correct': n_sort_correct,
    'old_page_items_total': sum(p.get('n_items', 0) for k, p in old_pages.items() if k != '__meta__'),
    'old_lesson_qa_items': 1309,
    'old_series_card_items': 178,
    'link_lesson_topic_ops': link_ops,
    'link_already_existing_sort_only': link_existing,
    'link_new': link_ops - link_existing,
    'link_series_topic_ops': series_links,
    'insert_lesson_ops': insert_count,
    'create_series_ops': 2,
    'move_lesson_ops': len(MISHPAT_LESSONS) + len(BAIT2_LESSONS),
    'retag_lesson_ops': sum(1 for x in ops if x['op'] == 'retag_lesson'),
    'unlink_teachers': unlink_teachers,
    'unlink_unpublished': unlink_unpublished,
    'extras_kept_flagged': kept_extras,
    'unresolved_items': len(unmatched_left),
    'total_ops': len(ops),
    'yoav_review_items': len(yoav),
}

plan = {
    '_meta': {
        'plan': 'topics_plan', 'generated': '2026-06-12', 'generator': 'scripts/gen_topics_plan.py',
        'goal': 'נושאים tab + topic pages 1:1 vs old site (127 topics, old sidebar order, exact per-page item sets + order)',
        'ground_truth': ['old_topics_sidebar.json (127)', 'old_topic_pages.json (1487 items)', 'match/item_match.json topic_pages', '10 old series pages fetched live 12.6.2026'],
        'conventions': {
            'topic_ref/lesson_ref/series_ref': 'UUID of existing row, or tmp-* id created earlier in this plan',
            'sort_order_lessons': 'old page order_index (1-based, lessons+series share one sequence per page); merged secondary pages offset +1000',
            'sort_order_topics': 'old sidebar order_index+1 (= old count-desc order, frozen)',
            'link_series_topic': 'NON-STANDARD op — requires series_topics table per code_ask CA4',
            'create_topic extra fields': 'tmp_id, parent_ref (themes-root), slug_suggest',
            'rule13': 'attachment_url_old + rehost:true for bneyzion.co.il/media/* URLs; old S3-bucket (s3.us-east-2 bneyzion) kept as attachment_url_old with rehost noted optional (existing rows use that bucket)',
            'idempotency': 'link ops carry already_linked; set_topic_sort carries already_correct',
        },
        'merged_topics': {'התשובה': 'theme-תשובה 1c4b4a22…', 'נסים': 'theme-ניסים b5ddc44d…'},
        'deleted_kept': {'חנ': 'old junk tag (1 item) — stays deleted'},
    },
    'ops': ops,
    'yoav_review': yoav,
    'code_asks': code_asks,
    'stats': stats,
}
json.dump(plan, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('WROTE', OUT)
print(json.dumps(stats, indent=1, ensure_ascii=False))
op_counter = Counter(x['op'] for x in ops)
print('ops by type:', dict(op_counter))
print('unresolved:', unmatched_left)
