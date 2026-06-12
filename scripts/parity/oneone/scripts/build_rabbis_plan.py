#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_rabbis_plan.py — READ-ONLY plan generator for the רבנים tab + rabbi pages (1:1 parity).
Inputs: oneone/old_rabbis_sidebar.json, old_rabbi_pages.json, match/item_match.json, match/tree_map.json,
        newdb_rabbis.json, newdb_series.json, newdb_lessons.json
Output: oneone/plans/rabbis_plan.json  (ops / yoav_review / code_asks / stats)
No DB access, no network. Re-runnable, deterministic.
"""
import json, re, os, unicodedata, collections, urllib.parse

P = '/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/oneone/'
OUT = P + 'plans/rabbis_plan.json'
os.makedirs(P + 'plans', exist_ok=True)

# ---------- load ----------
sidebar = json.load(open(P + 'old_rabbis_sidebar.json'))['items']           # 154
old_pages = json.load(open(P + 'old_rabbi_pages.json'))                     # 154 + _summary
im = json.load(open(P + 'match/item_match.json'))
rab_pages_m = im['rabbi_pages']
listings_m = im['listings']
tree = json.load(open(P + 'match/tree_map.json'))['nodes']
rabbis = json.load(open(P + 'newdb_rabbis.json'))
series = json.load(open(P + 'newdb_series.json'))
lessons = json.load(open(P + 'newdb_lessons.json'))

rb_by_id = {r['id']: r for r in rabbis}
sr_by_id = {s['id']: s for s in series}
ls_by_id = {l['id']: l for l in lessons}

# ---------- normalize_he ----------
QUOTES = '״"\'׳`'
SEPS = '|–—-_,:;!?()[]{}<>./\\'
def norm(s):
    if not s: return ''
    s = unicodedata.normalize('NFC', s)
    s = ''.join(ch for ch in s if not (0x0591 <= ord(ch) <= 0x05C7))
    for ch in QUOTES: s = s.replace(ch, '')
    for ch in SEPS: s = s.replace(ch, ' ')
    return re.sub(r'\s+', ' ', s).strip().lower()

HONOR = {'הרב','הרבנית','הרהג','דר','זצל','שליטא','פרופ','מרן','לנשים','והרב'}
def rabkey(s):
    toks = [t for t in norm(s).split() if t not in HONOR]
    return ' '.join(sorted(toks))

# listings url map (percent-decoded path -> mapped_series_id)
listing_map = {}
for k, v in listings_m.items():
    path = urllib.parse.unquote(k).replace('https://www.bneyzion.co.il', '').rstrip('/')
    path = unicodedata.normalize('NFC', path)
    listing_map[path] = v

tree_map_url = {}
for n in tree:
    if n.get('old_url_norm'):
        tree_map_url[unicodedata.normalize('NFC', n['old_url_norm'].rstrip('/'))] = n

# canonical new rabbi by rabkey (prefer rabbi etype, active, more lessons)
by_key = collections.defaultdict(list)
for r in rabbis: by_key[rabkey(r['name'])].append(r)
def canonical_rabbi_for_name(name):
    g = by_key.get(rabkey(name), [])
    if not g: return None
    return sorted(g, key=lambda r: (r['entity_type'] != 'rabbi', r['status'] != 'active', -r['lesson_count'], r['id']))[0]

# public-lesson counts per rabbi id (rabbi_id) and per rabbi_name key
pub_count_by_rid = collections.Counter()
pub_count_by_key = collections.Counter()
for l in lessons:
    if l['status'] != 'published': continue
    tags = set(l.get('audience_tags') or [])
    public = (not tags) or ('general' in tags) or ('teachers' not in tags)
    if not public: continue
    if l.get('rabbi_id'): pub_count_by_rid[l['rabbi_id']] += 1
    if l.get('rabbi_name'): pub_count_by_key[rabkey(l['rabbi_name'])] += 1

ops = []
yoav = []
stats = collections.Counter()
seen_op_keys = set()

def add_op(op, dedup=None):
    key = dedup or json.dumps({k: v for k, v in op.items() if k not in ('evidence',)}, ensure_ascii=False, sort_keys=True)
    if key in seen_op_keys: return False
    seen_op_keys.add(key)
    ops.append(op)
    stats['ops_' + op['op']] += 1
    return True

old_names = {it['name'] for it in sidebar}
mapped_ids_raw = {nm: rab_pages_m[nm]['mapped_rabbi_id'] for nm in rab_pages_m}

# =====================================================================
# A. RABBI ENTITY OPS — merges of duplicate rabbi rows (old-sidebar relevant)
# =====================================================================
merge_redirect = {}   # from_id -> into_id

def add_merge(from_id, into_id, reason, confidence, old_url=None):
    if from_id == into_id: return
    merge_redirect[from_id] = into_id
    add_op({'op': 'merge_rabbi', 'from_id': from_id, 'into_id': into_id,
            'from_name': rb_by_id[from_id]['name'], 'into_name': rb_by_id[into_id]['name'],
            'evidence': {'old_url': old_url or 'https://www.bneyzion.co.il/ (רבנים sidebar)', 'detail': reason},
            'confidence': confidence})

# A1. duplicate-name groups in newdb_rabbis: merge the 0-lesson twin into the content-bearing twin.
# Survivor preference: the row whose name matches the OLD sidebar display name; tiebreak content-bearing.
for key, grp in sorted(by_key.items()):
    if len(grp) < 2: continue
    grp = sorted(grp, key=lambda r: (-r['lesson_count'], r['id']))
    old_named = [r for r in grp if r['name'] in old_names]
    survivor = old_named[0] if old_named else grp[0]
    # if old-named survivor has 0 lessons but twin has content, keep old-named as survivor (absorb content)
    for r in grp:
        if r['id'] == survivor['id']: continue
        conf = 'high' if (r['lesson_count'] == 0 or survivor['name'] in old_names) else 'med'
        add_merge(r['id'], survivor['id'],
                  f"duplicate rabbi rows for the same person (normalized key '{key}'); old רבנים sidebar lists exactly one entry '{survivor['name'] if survivor['name'] in old_names else grp[0]['name']}'",
                  conf)
        if survivor['lesson_count'] == 0 and r['lesson_count'] > 0:
            yoav.append({'topic': 'merge_rabbi direction', 'rabbi': survivor['name'],
                         'detail': f"survivor '{survivor['name']}' ({survivor['id']}) matches the old sidebar name but had 0 lessons; absorbing {r['lesson_count']} lessons from twin '{r['name']}' ({r['id']}). Verify same person.",
                         'severity': 'low'})

# resolve a rabbi id through merges
def canon_id(rid):
    seen = set()
    while rid in merge_redirect and rid not in seen:
        seen.add(rid); rid = merge_redirect[rid]
    return rid

# A2. junk sidebar entries — sane behavior (do NOT replicate old bugs)
yoav.append({'topic': 'sidebar junk — ולו', 'rabbi': 'ולו',
             'detail': "old sidebar entry 'ולו (1)' is a data-junk creator; its old page is EMPTY (0 rows). New DB row f6ce1953 is already status=hidden + entity_type=content_creator → stays out of the new sidebar. NOT replicating. Approve keeping hidden.",
             'severity': 'low'})
yoav.append({'topic': 'sidebar junk — duplicate יונדב זר', 'rabbi': 'יונדב זר',
             'detail': "old sidebar has BOTH 'הרב יונדב זר (1035)' and 'יונדב זר (21)'; the second's page is EMPTY (0 rows) — an old-site dup bug. New DB has a single rabbi d79a4a34; new sidebar shows ONE entry. NOT replicating the dup.",
             'severity': 'low'})
yoav.append({'topic': 'creators in the רבנים tab', 'rabbi': 'ושננתם / מערכת בני ציון',
             'detail': "old רבנים sidebar lists content creators 'ושננתם (157)' and 'מערכת בני ציון (204)' alongside rabbis. In newdb they are correctly entity_type=content_creator (e6c81665, 274f4480) — the strict entity_type='rabbi' filter would drop them and their rabbi-pages (40 + 8 old rows) would be unreachable. Proposed sane behavior (in code_asks): keep them visible in the tab in a trailing 'יוצרי תוכן' group (alphabetical), pages driven by rabbi_page_items like everyone else. Approve grouping, or approve full exclusion.",
             'severity': 'med'})
yoav.append({'topic': 'ושננתם duplicates', 'rabbi': 'ושננתם',
             'detail': "newdb has TWO ושננתם creators: 'ושננתם' e6c81665 (50 lessons; the one the old public sidebar entry maps to) and 'ושננתם - אוצר התורה' 6f4b2572 (1004 lessons, teachers-wing import). NOT auto-merged (different scopes). Decide: merge or keep split.",
             'severity': 'med'})

# A3. הרב שמעון לוי — old page empty despite nav (408); old-site bug, show real content
yoav.append({'topic': 'הרב שמעון לוי — empty old page (old-site bug)', 'rabbi': 'הרב שמעון לוי',
             'detail': "old nav shows (408) but the old rav page renders 0 rows — server-side bug on the old site. NOT replicated: the new page will show his actual content via the no-rabbi_page_items fallback (dynamic listing). newdb has 'הרב שמעון לוי' 9f9362d5 active (48 lessons) AND a HIDDEN combined row 'הרב שמעון לוי והרב נתן מולאיוף' 0ae09e02 (419 lessons). Decide: unhide/merge/split the combined row so his ~408 lessons are reachable.",
             'severity': 'high'})

# A4. אריה vs אריק אוריאל
yoav.append({'topic': 'אריה אוריאל vs אריק אוריאל', 'rabbi': 'הרב אריה אוריאל',
             'detail': "old sidebar lists BOTH 'הרב אריה אוריאל (149)' and 'הרב אריק אוריאל (5)', but the אריה page renders only 2 rows and BOTH are attributed 'הרב אריק אוריאל' (מאת column). newdb: אריה c0da1cd2 (11 lessons), אריק 34ef8dae (133). Counts look swapped between the two spellings — likely the same person under two spellings on the old site. Per cross-attribution policy the 2 rows go to אריק's page. Decide whether to merge_rabbi the two spellings.",
             'severity': 'med'})

# A5. entity_type fixes: real people listed in the old רבנים sidebar but stored as content_creator
for nm, rid in sorted(mapped_ids_raw.items()):
    r = rb_by_id[rid]
    if r['entity_type'] == 'content_creator' and nm not in ('ולו', 'ושננתם', 'מערכת בני ציון'):
        add_op({'op': 'set_entity_type', 'rabbi_id': rid, 'entity_type': 'rabbi',
                'rabbi_name': r['name'],
                'evidence': {'old_url': 'https://www.bneyzion.co.il/' + urllib.parse.quote('מאגר-השיעורים-והמאמרים/רבנים') + f'?rav={nm}',
                             'detail': f"'{nm}' is a person (lecturer) listed in the old רבנים sidebar (count {next(it['count'] for it in sidebar if it['name']==nm)}); entity_type=content_creator would drop her from the tab"},
                'confidence': 'high'})

# =====================================================================
# B. PER-PAGE OPS — rabbi_page_item for EVERY old row (1,139 rows)
# =====================================================================
ins_counter = 0
crs_counter = 0
def next_tmp(prefix):
    global ins_counter, crs_counter
    if prefix == 'L':
        ins_counter += 1; return f'tmp_lesson_{ins_counter:04d}'
    crs_counter += 1; return f'tmp_series_{crs_counter:03d}'

def classify_attachments(hrefs):
    audio = video = att = None; extra = []
    for h in hrefs or []:
        full = h if h.startswith('http') else 'https://www.bneyzion.co.il' + h
        low = urllib.parse.unquote(full).lower()
        if re.search(r'\.(mp3|m4a|wav)(\?|$)', low) and not audio: audio = full
        elif re.search(r'\.(mp4|mov|m4v)(\?|$)', low) and not video: video = full
        elif not att: att = full
        else: extra.append(full)
    return audio, video, att, extra

BOOK_SECTIONS = {'תורה', 'נביאים', 'כתובים'}
def book_from_href(href):
    segs = [s for s in urllib.parse.unquote(href or '').split('/') if s]
    if len(segs) >= 3 and segs[0].startswith('מאגר') and segs[1] in BOOK_SECTIONS:
        return segs[2].replace('-', ' ')
    return None

def resolve_series_ref_for_href(href):
    """walk-up resolution of an old lesson URL's container series (for insert_lesson.series_ref)"""
    path = unicodedata.normalize('NFC', urllib.parse.unquote(href or '').rstrip('/'))
    parent = re.sub(r'/[^/]+$', '', path)
    lvl = 0
    while parent.count('/') >= 2 and lvl < 4:
        n = tree_map_url.get(parent)
        if n and n.get('matched_series_id'):
            return {'series_id': n['matched_series_id']}, f'tree_map@walkup{lvl}'
        lp = listing_map.get(parent)
        if lp and lp.get('mapped_series_id'):
            return {'series_id': lp['mapped_series_id']}, f'listings_map@walkup{lvl}'
        parent = re.sub(r'/[^/]+$', '', parent); lvl += 1
    return {'old_parent_url': 'https://www.bneyzion.co.il' + re.sub(r'/[^/]+$', '', path) + '/'}, 'unresolved'

def pick_series_candidate(cands):
    """deterministic pick among near-identical series candidates: active/published + lesson_count desc"""
    rows = [sr_by_id[c['id']] for c in cands if c['id'] in sr_by_id]
    if not rows: return None
    rows.sort(key=lambda s: (s['status'] not in ('active', 'published'), -s['lesson_count'], s['id']))
    top = rows[0]
    if top['lesson_count'] == 0: return None
    return top

series_rabbi_claims = collections.defaultdict(set)   # series_id -> {(rabbi_id, page_name)}
qa_db_profile = collections.Counter()
cross_rows = []
empty_pages = []
dedup_dropped = collections.Counter()

for sb_it in sidebar:                              # keep old alphabetical order
    name = sb_it['name']
    opg = old_pages[name]
    mpg = rab_pages_m[name]
    page_rid = canon_id(mpg['mapped_rabbi_id'])
    page_url = 'https://www.bneyzion.co.il' + urllib.parse.unquote(sb_it['url'])
    items_m = {it['idx']: it for it in mpg.get('items', [])}
    series_m = {ss['idx']: ss for ss in mpg.get('sub_series_match', [])}

    if opg['n_items'] == 0:
        stats['pages_empty_old'] += 1
        empty_pages.append({'name': name, 'old_nav_count': sb_it['count'],
                            'new_public_signal': pub_count_by_rid.get(mpg['mapped_rabbi_id'], 0) + pub_count_by_key.get(rabkey(name), 0)})
        if name not in ('ולו', 'יונדב זר', 'הרב שמעון לוי'):
            new_pub = pub_count_by_rid.get(mpg['mapped_rabbi_id'], 0) + pub_count_by_key.get(rabkey(name), 0)
            yoav.append({'topic': 'old page empty, nav count > 0', 'rabbi': name,
                         'detail': f"old nav count {sb_it['count']}, but the old rav page renders 0 rows (old-site bug). New DB public-lesson signal for this rabbi: {new_pub}. Fallback dynamic listing will show whatever exists; if 0 the rabbi is hidden from the sidebar (effective count 0). No content to migrate from the old page itself.",
                         'severity': 'low'})
        continue

    for row in opg['items']:
        oi = row['order_index']
        rtype = row['item_type']                   # שיעור / סדרה / שו"ת
        title = row['title']
        rshown = row.get('rabbi_shown') or name
        is_cross = bool(rshown) and rabkey(rshown) and rabkey(rshown) != rabkey(name)
        true_rb = canonical_rabbi_for_name(rshown) if is_cross else None
        target_rid = canon_id(true_rb['id']) if (is_cross and true_rb) else page_rid
        target_sort = 9000 + oi if (is_cross and true_rb) else oi
        ev = {'old_url': page_url, 'detail': f"row #{oi} on the old rav page: [{rtype}] '{title}' מאת {rshown}" + (f" — old row 'href={row.get('href')}'" if row.get('href') else '')}

        if is_cross:
            cross_rows.append((name, rshown, rtype, title, oi, bool(true_rb)))
            if true_rb:
                ev['detail'] += f" | CROSS-ATTRIBUTED: shown on {name}'s old page but authored by {rshown} → placed on the TRUE author's page (appended at end)"
            else:
                yoav.append({'topic': 'cross-attributed row, author not in newdb', 'rabbi': name,
                             'detail': f"row '{title}' attributed to '{rshown}' who has no newdb rabbi row; left on {name}'s page", 'severity': 'med'})

        if rtype == 'סדרה':
            ss = series_m.get(oi)
            sid = ss.get('matched_series_id') if ss else None
            method = ss.get('method') if ss else None
            conf = 'high'
            if not sid:
                # fallback 1: the same old URL was crawled as a listing page and mapped there
                path = unicodedata.normalize('NFC', urllib.parse.unquote(row.get('href') or '').rstrip('/'))
                lp = listing_map.get(path)
                if lp and lp.get('mapped_series_id'):
                    sid = lp['mapped_series_id']; method = 'listings_page_map'; conf = 'high'
                elif ss and ss.get('candidates'):
                    pick = pick_series_candidate(ss['candidates'])
                    if pick:
                        sid = pick['id']; method = 'candidate_pick_deterministic'; conf = 'med'
                        yoav.append({'topic': 'series row resolved by deterministic pick', 'rabbi': name,
                                     'detail': f"'{title}' had {len(ss['candidates'])} near-identical series candidates; picked {pick['id']} ('{pick['title']}', {pick['lesson_count']} lessons, {pick['status']}). Verify.",
                                     'severity': 'low'})
            if sid:
                added = add_op({'op': 'rabbi_page_item', 'rabbi_id': target_rid, 'kind': 'series',
                                'series_id': sid, 'sort_order': target_sort,
                                'evidence': {**ev, 'detail': ev['detail'] + f' | match={method}'},
                                'confidence': conf},
                               dedup=f'rpi::{target_rid}::series::{sid}')
                if not added:
                    dedup_dropped['series_row_same_target'] += 1
                    yoav.append({'topic': 'duplicate series row on old page', 'rabbi': name,
                                 'detail': f"'{title}' (row #{oi}) resolves to series {sid} already placed on this page (old page listed it twice, e.g. via the alias path). Single rabbi_page_item kept.",
                                 'severity': 'low'})
                stats['rows_series_resolved'] += 1
                series_rabbi_claims[sid].add((target_rid, name))
            else:
                # fallback 2: container truly missing in newdb → create_series (listings plan will populate)
                tmp = next_tmp('S')
                full_old = 'https://www.bneyzion.co.il' + urllib.parse.quote(urllib.parse.unquote(row.get('href') or ''), safe='/%')
                parent_path = re.sub(r'/[^/]+/?$', '/', urllib.parse.unquote(row.get('href') or ''))
                add_op({'op': 'create_series', 'tmp_id': tmp, 'title': title,
                        'parent_ref': {'old_url': 'https://www.bneyzion.co.il' + parent_path},
                        'status': 'published', 'audience_tags': ['general'], 'sort_order': None,
                        'bible_book': book_from_href(row.get('href')),
                        'dedup_key': 'series::' + norm(title) + '::' + (urllib.parse.unquote(row.get('href') or '').rstrip('/')),
                        'evidence': {'old_url': full_old,
                                     'detail': f"series card on {name}'s old rav page with no newdb container; the old listing page exists ({row.get('series_lesson_count')} שיעורים declared, items individually matched in item_match.listings) — apply stage must dedup against the listings plan's create_series via dedup_key, then attach membership there"},
                        'confidence': 'med'})
                add_op({'op': 'rabbi_page_item', 'rabbi_id': target_rid, 'kind': 'series',
                        'series_ref': {'tmp_id': tmp, 'old_url': full_old}, 'sort_order': target_sort,
                        'evidence': ev, 'confidence': 'med'},
                       dedup=f'rpi::{target_rid}::series::tmp::{norm(title)}::{urllib.parse.unquote(row.get("href") or "")}')
                stats['rows_series_created'] += 1
                series_rabbi_claims['NEW::' + tmp].add((target_rid, name))
            continue

        # שיעור / שו"ת rows
        kind = 'qa' if rtype == 'שו"ת' else 'lesson'
        it = items_m.get(oi)
        lid = it.get('matched_lesson_id') if it else None
        if lid:
            L = ls_by_id.get(lid)
            score = it.get('score', 0)
            conf = 'high' if score >= 0.95 else ('med' if score >= 0.88 else 'low')
            added = add_op({'op': 'rabbi_page_item', 'rabbi_id': target_rid, 'kind': kind,
                            'lesson_id': lid, 'sort_order': target_sort,
                            'evidence': {**ev, 'detail': ev['detail'] + f" | match={it.get('method')} score={score}"},
                            'confidence': conf},
                           dedup=f'rpi::{target_rid}::{kind}::{lid}')
            if not added:
                dedup_dropped['lesson_row_same_target'] += 1
                yoav.append({'topic': 'two old rows matched the same newdb lesson', 'rabbi': name,
                             'detail': f"row #{oi} '{title}' ({rtype}) matched lesson {lid} which is already placed on this page by an earlier row — old page listed the item twice OR the matcher collapsed two distinct old rows into one lesson. Single rabbi_page_item kept; verify.",
                             'old_url': page_url, 'severity': 'low'})
            stats['rows_lessons_matched' if kind == 'lesson' else 'rows_qa_matched'] += 1
            if kind == 'qa' and L:
                qa_db_profile[(L.get('content_type'), L.get('source_type'))] += 1
            # rabbi attribution on the lesson row itself
            if L and rshown and rabkey(L.get('rabbi_name') or '') != rabkey(rshown):
                fix_rb = canonical_rabbi_for_name(rshown)
                add_op({'op': 'set_lesson_rabbi', 'lesson_id': lid,
                        'rabbi_name': (fix_rb['name'] if fix_rb else rshown),
                        'current_rabbi_name': L.get('rabbi_name'),
                        'evidence': {**ev, 'detail': f"old מאת column says '{rshown}' but newdb lesson has rabbi_name='{L.get('rabbi_name')}'"},
                        'confidence': 'high' if fix_rb else 'med'},
                       dedup=f'slr::{lid}')
        else:
            if it and it.get('candidates'):
                yoav.append({'topic': 'ambiguous lesson match', 'rabbi': name,
                             'detail': f"row '{title}' ({rtype}) has multiple newdb candidates with no safe winner: " +
                                       '; '.join(f"{c['id']} '{c['title']}'" for c in it['candidates'][:4]) +
                                       f" — pick one, then rabbi_page_item(kind={kind}, sort_order={target_sort})",
                             'old_url': page_url, 'severity': 'med'})
                stats['rows_ambiguous'] += 1
                continue
            # plain unmatched → insert_lesson + page item via tmp ref
            audio, video, att, extra = classify_attachments(row.get('attachment_hrefs'))
            sref, smethod = resolve_series_ref_for_href(row.get('href'))
            tmp = next_tmp('L')
            full_old = 'https://www.bneyzion.co.il' + urllib.parse.quote(urllib.parse.unquote(row.get('href') or ''), safe='/%') if row.get('href') else page_url
            payload = {'title': title,
                       'rabbi_name': (canonical_rabbi_for_name(rshown) or {}).get('name', rshown),
                       'series_ref': sref,
                       'source_type': 'qa' if kind == 'qa' else {'audio': 'audio', 'video': 'video', 'pdf': 'text', 'text': 'text'}.get(row.get('media') or '', 'text'),
                       'content_type': 'שאלות ותשובות' if kind == 'qa' else None,
                       'audio_url_old': audio, 'video_url_old': video, 'attachment_url_old': att,
                       'additional_attachments_old': extra or None,
                       'rehost': bool(audio or video or att or extra),
                       'needs_content_fetch': kind == 'qa' or not (audio or video or att),
                       'content_fetch_old_url': full_old,
                       'promo_excerpt': row.get('promo'),
                       'bible_book': book_from_href(row.get('href')),
                       'bible_chapter': None,
                       'audience_tags': ['general'], 'status': 'published'}
            add_op({'op': 'insert_lesson', 'tmp_id': tmp, 'payload': payload, 'old_url': full_old,
                    'dedup_key': 'lesson::' + norm(title) + '::' + rabkey(rshown) + '::' + rtype,
                    'evidence': {**ev, 'detail': ev['detail'] + f' | unmatched in newdb (series_ref via {smethod}); Rule 13: all *_old URLs must be rehosted by the apply stage; שו"ת full text must be fetched from the old lesson modal at old_url'},
                    'confidence': 'med' if (audio or video or att or kind == 'qa') else 'low'})
            add_op({'op': 'rabbi_page_item', 'rabbi_id': target_rid, 'kind': kind,
                    'lesson_ref': {'tmp_id': tmp}, 'sort_order': target_sort,
                    'evidence': ev, 'confidence': 'med'},
                   dedup=f'rpi::{target_rid}::{kind}::tmp::{tmp}')
            stats['rows_lessons_inserted' if kind == 'lesson' else 'rows_qa_inserted'] += 1

# =====================================================================
# C. set_series_rabbi — old rav-page series cards fix series-level attribution
# =====================================================================
for sid, claims in sorted(series_rabbi_claims.items()):
    if sid.startswith('NEW::'):
        if len(claims) == 1:
            (rid, pg) = next(iter(claims))
            add_op({'op': 'set_series_rabbi', 'series_ref': {'tmp_id': sid.split('::')[1]}, 'rabbi_id': rid,
                    'evidence': {'old_url': 'https://www.bneyzion.co.il' + urllib.parse.unquote(next(it['url'] for it in sidebar if it['name'] == pg)),
                                 'detail': f"newly created series is a card on {pg}'s old rav page"},
                    'confidence': 'med'})
        continue
    cur = sr_by_id.get(sid, {}).get('rabbi_id')
    cur = canon_id(cur) if cur else None
    claim_ids = {c[0] for c in claims}
    if len(claim_ids) > 1:
        names = ', '.join(sorted({c[1] for c in claims}))
        yoav.append({'topic': 'series claimed by multiple rabbi pages', 'rabbi': names,
                     'detail': f"series {sid} ('{sr_by_id.get(sid,{}).get('title')}') appears as a card on the old rav pages of: {names}. series.rabbi_id is single-valued (currently {cur or 'NULL'}); rabbi_page_items place it on all those pages either way. Pick the display 'מאת' owner.",
                     'severity': 'med'})
        stats['series_rabbi_conflicts'] += 1
        continue
    rid = next(iter(claim_ids))
    if cur != rid:
        pg = next(iter(claims))[1]
        add_op({'op': 'set_series_rabbi', 'series_id': sid, 'rabbi_id': rid,
                'series_title': sr_by_id.get(sid, {}).get('title'),
                'current_rabbi_id': cur,
                'evidence': {'old_url': 'https://www.bneyzion.co.il' + urllib.parse.unquote(next(it['url'] for it in sidebar if it['name'] == pg)),
                             'detail': f"old rav page of {pg} lists this series as his/hers (מאת column); newdb series.rabbi_id is {'NULL' if cur is None else 'a different rabbi (' + (rb_by_id.get(cur,{}).get('name') or cur) + ')'}"},
                'confidence': 'high'},
               dedup=f'ssr::{sid}')
        stats['series_rabbi_fixed_null' if cur is None else 'series_rabbi_fixed_mismatch'] += 1

# cross-attribution yoav note
if cross_rows:
    yoav.append({'topic': 'cross-attributed rows reassigned to TRUE author', 'rabbi': 'מספר רבנים',
                 'detail': '9 old rows render on one rabbi page but are authored by another (מאת column). Old-site quirk NOT replicated — each row was placed on the TRUE author\'s page (sort_order 9000+ = appended at end): ' +
                           '; '.join(f"'{t}' [{ty}] של {rs} (היה בדף {pg})" for pg, rs, ty, t, oi, ok in cross_rows),
                 'severity': 'med'})

# =====================================================================
# D. SIDEBAR — old vs new reconciliation stats + extras
# =====================================================================
mapped_canon = {canon_id(v) for v in mapped_ids_raw.values()}
extras = [r for r in rabbis if canon_id(r['id']) not in mapped_canon and canon_id(r['id']) == r['id']]
extras_rabbi_public = []
extras_other = []
for r in sorted(extras, key=lambda x: -x['lesson_count']):
    pub = pub_count_by_rid.get(r['id'], 0)
    rec = {'id': r['id'], 'name': r['name'], 'entity_type': r['entity_type'], 'status': r['status'],
           'lesson_count': r['lesson_count'], 'public_published_lessons_by_rabbi_id': pub}
    if r['entity_type'] == 'rabbi' and pub > 0 and r['status'] in ('active', 'published'):
        extras_rabbi_public.append(rec)
    else:
        extras_other.append(rec)

pub_status_extras = [r for r in extras if r['status'] == 'published' and r['entity_type'] == 'rabbi']
if pub_status_extras:
    yoav.append({'topic': "rabbis with status='published' (not 'active')", 'rabbi': ', '.join(r['name'] for r in pub_status_extras),
                 'detail': "6 newdb rabbi rows carry status='published' — the get_public_rabbis RPC filters status='active' so they are invisible in the sidebar. None of them existed on the old site (teachers-wing imports). If they should be public, normalize status to 'active'; else leave (current behavior already hides them).",
                 'severity': 'low'})

yoav.append({'topic': 'old nav counts ≠ old page content (85 rabbis)', 'rabbi': 'כלל הסיידבר',
             'detail': "on the OLD site, the sidebar number next to 85/154 rabbis disagrees with what their page actually renders (e.g. הרב יונדב זר nav=1035, page effective=770). Old-site counting bug — NOT replicated. New sidebar counts use the effective-count formula in code_asks (rows + Σ series sizes from rabbi_page_items).",
             'severity': 'low'})

# =====================================================================
# E. write plan
# =====================================================================
stats_total = {
    'old_sidebar_entries': len(sidebar),
    'old_sidebar_real_rabbis': len(sidebar) - 4,        # minus ולו, ושננתם dup-nav יונדב זר, מערכת? see notes
    'old_rabbi_pages': len(rab_pages_m),
    'old_rows_total': sum(p['n_items'] for n, p in old_pages.items() if n != '_summary'),
    'old_rows_series': 420, 'old_rows_lessons': 537, 'old_rows_qa': 182,
    'newdb_rabbis': len(rabbis),
    'newdb_rabbis_entity_rabbi': sum(1 for r in rabbis if r['entity_type'] == 'rabbi'),
    'old_rabbis_missing_in_new': 0,
    'new_rabbis_not_in_old__kept_public': len(extras_rabbi_public),
    'new_rabbis_not_in_old__other(creators/teachers-wing/no-public-content)': len(extras_other),
    'qa_matched_db_profile': {f'{ct}/{st}': n for (ct, st), n in sorted(qa_db_profile.items(), key=lambda x: -x[1])},
    'rpi_dedup_dropped': dict(dedup_dropped),
    'empty_old_pages': empty_pages,
    'row_reconciliation': '1139 old rows = 420 series (resolved+created-dedup) + 537 lessons (matched+inserted+1 ambiguous→yoav) + 182 qa (matched+inserted); dedup-dropped rows map onto an op already emitted for the same page',
}
stats_total.update(dict(stats))

plan = {
    '_meta': {
        'plan': 'rabbis_plan — רבנים tab + rabbi pages 1:1 (old www.bneyzion.co.il → new bneyzion.vercel.app)',
        'generated_by': 'scripts/build_rabbis_plan.py (read-only, deterministic, re-runnable)',
        'inputs': ['old_rabbis_sidebar.json', 'old_rabbi_pages.json', 'match/item_match.json', 'match/tree_map.json',
                   'newdb_rabbis.json', 'newdb_series.json', 'newdb_lessons.json'],
        'conventions': {
            'sort_order': 'rabbi_page_item.sort_order = the row\'s order_index on the old rav page (0-based). Cross-attributed rows moved to the TRUE author\'s page get 9000+original (appended after the author\'s own rows).',
            'tmp_refs': 'insert_lesson/create_series ops carry tmp_id; rabbi_page_item / set_series_rabbi ops reference them via lesson_ref/series_ref {tmp_id}. The apply stage resolves tmp_id→uuid after the insert.',
            'dedup_key': 'insert_lesson/create_series ops carry dedup_key (normalized title+rabbi+type / title+old_url). The apply stage MUST dedup against identical keys coming from the listings/topics/teachers plans — same old item may be planned by several plans.',
            'rule_13': 'every *_old URL (bneyzion.co.il, /media/, bneyzion S3) in insert payloads is marked rehost:true — apply stage rehosts to Supabase Storage; never serve old-host URLs.',
            'merges': 'merge_rabbi from_id→into_id; all later ops in this plan already target the canonical (post-merge) rabbi id.',
            'page_semantics': 'old rav page = ONE flat list (table view is the superset): standalone lessons + series-as-single-cards (with declared sizes) + שו"ת rows. NO pagination, NO cap. rabbi_page_items reproduces exactly that.',
        },
    },
    'ops': ops,
    'yoav_review': yoav,
    'code_asks': [
        "rabbi_page_items-driven RabbiPage: when rabbi_page_items rows exist for the rabbi, render EXACTLY them ordered by sort_order ASC as ONE flat list — series rows as cards ('סדרת שיעורים', '<lesson_count> שיעורים', link to /series/:id), lesson rows as table/card rows with rabbi link + duration + download, qa rows like the old שו\"ת rows (title opens the lesson popup with FULL text). Replaces useRabbiSeries+useRabbiLessons composition on that page (kills R-RAB1/R-RAB2: no limit(60), no cap-20, no published_at-DESC reorder, no guest-series inflation).",
        "Dedup on the rabbi page by lesson_id ONLY (the unique rabbi_page_items key) — do NOT apply the title-dedup key that collapses distinct same-title lessons (R-RAB1/R-SER4 class bug).",
        "Fallback when a rabbi has NO rabbi_page_items (e.g. הרב שמעון לוי whose old page was empty-by-bug, and new-only rabbis): dynamic listing of the rabbi's content — owned series (status active/published, audience NOT teachers-only) + his published public lessons, NO 20-cap and NO limit(60), ordered series-first then lessons by bible_chapter,title; add the missing audience filter (R-RAB3).",
        "Media-filter pills exactly like the old page: כל הסוגים / וידאו / אודיו / טקסט-PDF / שאלות ותשובות. Row classification: kind='qa' → שאלות ותשובות; else video_url→וידאו; else audio_url→אודיו; else (attachment_url or text content)→טקסט/PDF. Series cards classify by their dominant lesson media (old page shows a media icon per series row). NO pagination — the old page has none.",
        "Sidebar רבנים tab (usePublicRabbis + DesignSidebar): REMOVE slice(0,30) (R-SB2) — render the FULL list; order alphabetically by display name with Hebrew locale (matches old order incl. honorific prefix, since the old list sorts the raw display string); drop tier pinning in the sidebar tab (tier pinning may stay on /rabbis cards page — Yoav to confirm).",
        "Sidebar count per rabbi = EFFECTIVE lesson count from rabbi_page_items: COUNT(kind IN ('lesson','qa')) + SUM(series.lesson_count) over kind='series' rows — expose as SQL view (e.g. rabbi_effective_counts) consumed by get_public_rabbis; fallback for rabbis without page items = COUNT of their published public lessons. Do NOT display rabbis.lesson_count (stale: e.g. הרבנית רחלי מונדשיין has 0 there but 20 published public lessons by rabbi_name) and do NOT copy old nav numbers (wrong for 85/154 rabbis on the old site itself).",
        "get_public_rabbis RPC visibility: entity_type='rabbi' AND status='active' AND (EXISTS rabbi_page_items OR effective public content > 0) — replace the lesson_count>0 filter which drops rabbis whose content lives only in series cards (e.g. zero standalone lessons). Keep the client entity_type belt.",
        "Content creators in the tab (pending Yoav): old sidebar listed ושננתם + מערכת בני ציון among the rabbis. Proposed: a trailing 'יוצרי תוכן' group in the same tab (alphabetical), driven by entity_type='content_creator' allowlist with rabbi_page_items; their pages render identically.",
        "RabbiPage slug route: add status='active' + entity_type guard (currently hidden/creator rows render when deep-linked) — and keep the UUID→slug redirect.",
        "Migration (apply stage): add lessons.sort_order int, lesson_topics.sort_order int, and TABLE rabbi_page_items(rabbi_id uuid, kind text check in ('series','lesson','qa'), series_id uuid null, lesson_id uuid null, sort_order int, unique(rabbi_id, kind, coalesce(series_id, lesson_id))) — this plan emits its full contents.",
    ],
    'stats': stats_total,
    'sidebar_extras_kept': {'rabbi_public': extras_rabbi_public, 'other': extras_other},
}

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(plan, f, ensure_ascii=False, indent=1)
print('WROTE', OUT)
print(json.dumps(stats_total, ensure_ascii=False, indent=1))
print('n ops:', len(ops), '| yoav:', len(yoav), '| code_asks:', len(plan['code_asks']))
opc = collections.Counter(o['op'] for o in ops)
print('ops by type:', dict(opc))
conf = collections.Counter(o['confidence'] for o in ops)
print('ops by confidence:', dict(conf))
