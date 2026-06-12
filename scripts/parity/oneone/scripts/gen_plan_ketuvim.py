#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_plan_ketuvim.py — READ-ONLY plan generator for the כתובים scope.

Inputs (ground truth + match stage, all under scripts/parity/oneone/):
  old_listings_torah_ketuvim.json  — 366 old pages under /כתובים/ (items in page order)
  old_sidebar_tree.json            — old sidebar (order_index = exact old order)
  match/item_match.json            — deterministic item->lesson matches
  match/tree_map.json              — deterministic node->series matches
  newdb_*.json                     — new DB dumps

Output: plans/lessons_plan_ketuvim.json  {ops, yoav_review, code_asks, stats}
No DB writes, no git, no src/ edits.
"""
import json, re, unicodedata, datetime
from collections import Counter, defaultdict

BASE = '/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/oneone/'
OUT  = BASE + 'plans/lessons_plan_ketuvim.json'

# ---------- normalization (per project spec) ----------
def norm(s):
    if not s: return ''
    s = unicodedata.normalize('NFC', s)
    s = ''.join(ch for ch in s if not (0x0591 <= ord(ch) <= 0x05C7))
    s = re.sub(r'[״"\'׳`]', '', s)
    s = re.sub(r'[|–—\-_,:;!?()\[\]{}<>./]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()

HONS = {norm(h) for h in ['הרב','רב','ד"ר','דר','זצ"ל','שליט"א','הרה"ג','פרופ','הרה"ח','הרבנית']}
def rnorm(s):
    return ' '.join(sorted(w for w in norm(s).split() if w not in HONS))

def strip_paren(s):
    if not s: return s
    return re.sub(r'\s*\([^)]*\)\s*', ' ', s).strip(' -').strip()

ADMIN_NAMES = {rnorm('מערכת בני ציון'), rnorm('מנהל מערכת')}

def normu(u):
    return (u or '').replace('https://www.bneyzion.co.il', '').rstrip('/')

# ---------- load ----------
old_pages = json.load(open(BASE + 'old_listings_torah_ketuvim.json'))['pages']
sidebar   = json.load(open(BASE + 'old_sidebar_tree.json'))['tree']
im        = json.load(open(BASE + 'match/item_match.json'))
tm        = json.load(open(BASE + 'match/tree_map.json'))
ser       = {s['id']: s for s in json.load(open(BASE + 'newdb_series.json'))}
les       = {l['id']: l for l in json.load(open(BASE + 'newdb_lessons.json'))}
rabbis    = json.load(open(BASE + 'newdb_rabbis.json'))
topics    = json.load(open(BASE + 'newdb_topics.json'))

rabbi_by_name = defaultdict(list)
for r in rabbis:
    rabbi_by_name[rnorm(r['name'])].append(r['id'])

lesson_topic_links = defaultdict(list)   # lesson_id -> [topic_id]
for lt in topics.get('lesson_topics', topics if isinstance(topics, list) else []):
    if isinstance(lt, dict) and 'lesson_id' in lt:
        lesson_topic_links[lt['lesson_id']].append(lt['topic_id'])

listings = im['listings']

# ---------- scope ----------
ket_pages = {u: p for u, p in listings.items() if '/כתובים/' in u or normu(u).endswith('/כתובים')}
alias_pages = {u for u in ket_pages if old_pages.get(u, {}).get('redirected_to')}
canon_pages = {u: p for u, p in ket_pages.items() if u not in alias_pages}

ket_nodes = [n for n in tm['nodes'] if n['source'] == 'sidebar' and '/כתובים' in n['old_url']]
node_by_url = {normu(n['old_url']): n for n in ket_nodes}
sidebar_urls = set(node_by_url)

# old sidebar subtree for exact child order
ket_root = [t for t in sidebar if (t.get('title') or '') == 'כתובים'][0]
KETUVIM_ROOT_SERIES = '5cdd770c'  # prefix sanity below

# ---------- helpers ----------
ops, yoav, stats = [], [], Counter()
seen_op_keys = set()
def emit(op, key=None, **kw):
    if key is not None:
        if key in seen_op_keys: return
        seen_op_keys.add(key)
    rec = {'op': op}; rec.update(kw); ops.append(rec); stats[op] += 1

def review(issue, **kw):
    rec = {'issue': issue}; rec.update(kw); yoav.append(rec)

def page_depth(u): return len([p for p in normu(u).split('/') if p])
def page_class(u):
    nu = normu(u)
    if nu.endswith('/כתובים'): return 'category'
    n = node_by_url.get(nu)
    if n: return 'book' if n['node_kind'] == 'book' else ('alias' if n['node_kind'] == 'alias' else 'collection')
    return 'source'   # listing page not in sidebar = source series page
OWNER_PRIO = {'source': 0, 'collection': 1, 'book': 2, 'category': 3}

# ---------- legit homes: lesson -> set(series) implied by ANY old page ----------
homes = defaultdict(set)
for src in ['listings', 'teachers']:
    for k, p in im[src].items():
        S = p.get('mapped_series_id')
        if not S: continue
        for it in p.get('items', []):
            if it.get('matched_lesson_id'):
                homes[it['matched_lesson_id']].add(S)

# =========================================================
# PART A — series structure (status / parent / nav / order / rabbi)
# =========================================================
books_order = []          # old order of the 11 books
psalm_no_by_url = {}      # psalm page url-norm -> psalm number (1..150)

def walk_children(node):  # children already in old order (order_index)
    return sorted(node.get('children', []), key=lambda c: c.get('order_index', 0))

for bi, b in enumerate(walk_children(ket_root), start=1):
    books_order.append((bi, b))
    if norm(b['title']) == norm('תהלים'):
        n = 0
        for c in walk_children(b):
            if norm(c['title']).startswith(norm('כל השיעורים')): continue
            n += 1
            psalm_no_by_url[normu(c['url'])] = n

# A1. the missed alias node (matcher classified 'כל עזרא ונחמיה' as unmatched collection)
EZRA_ALIAS = [n for n in ket_nodes if not n.get('matched_series_id')]
for n in EZRA_ALIAS:
    stats['alias_nodes_reclassified'] += 1   # redirected_to == book page → behaves like the auto "כל השיעורים" button; no op

# A2. per sidebar node: status / parent / sort
TEHILIM_URL = None
for n in ket_nodes:
    if n['node_kind'] == 'alias' or n in EZRA_ALIAS: continue
    sid = n.get('matched_series_id')
    if not sid: continue
    s = ser[sid]
    kind = n['node_kind']
    # status
    if kind in ('book', 'category'):
        if s['status'] not in ('active', 'published', 'category'):
            emit('update_series', key=('st', sid), series_id=sid, fields={'status': 'category'},
                 evidence={'old_url': n['old_url'], 'detail': f"book/category node; status '{s['status']}' invisible in sidebar"},
                 confidence='high')
    else:
        if s['status'] not in ('active', 'published'):
            emit('update_series', key=('st', sid), series_id=sid, fields={'status': 'published'},
                 evidence={'old_url': n['old_url'], 'detail': f"sidebar collection; status '{s['status']}' hidden by sidebar children query (active/published only)"},
                 confidence='high')
    if 'teachers' in (s.get('audience_tags') or []):
        emit('update_series', key=('aud', sid), series_id=sid, fields={'audience_tags': ['general']},
             evidence={'old_url': n['old_url'], 'detail': 'public sidebar node tagged teachers'}, confidence='high')
    # parent
    pou = n.get('parent_old_url')
    pn = node_by_url.get(normu(pou)) if pou else None
    if pn and pn.get('matched_series_id') and s['parent_id'] != pn['matched_series_id']:
        emit('reparent_series', key=('rp', sid), series_id=sid, new_parent_ref=pn['matched_series_id'],
             evidence={'old_url': n['old_url'],
                       'detail': f"old parent='{pn['old_title']}'; current parent='{(ser.get(s['parent_id']) or {}).get('title')}'"},
             confidence='high')

# A3. sidebar order: books under כתובים + collections per book
for bi, b in books_order:
    bn = node_by_url.get(normu(b['url']))
    if not (bn and bn.get('matched_series_id')): continue
    emit('set_series_sort', key=('ss', bn['matched_series_id']), series_id=bn['matched_series_id'], sort_order=bi,
         evidence={'old_url': 'https://www.bneyzion.co.il' + b['url'], 'detail': f'book #{bi} in old כתובים sidebar (code also has biblicalOrder fallback)'},
         confidence='high')
    ci = 0
    for c in walk_children(b):
        cn = node_by_url.get(normu(c['url']))
        if not cn or cn['node_kind'] == 'alias' or cn in EZRA_ALIAS or not cn.get('matched_series_id'): continue
        ci += 1
        emit('set_series_sort', key=('ss', cn['matched_series_id']), series_id=cn['matched_series_id'], sort_order=ci,
             evidence={'old_url': 'https://www.bneyzion.co.il' + c['url'], 'detail': f"sidebar child #{ci} of '{b['title']}' (old order_index {c.get('order_index')})"},
             confidence='high')

# A4. source-series (book-page sub_links): nav_visible=false + book-page order + rabbi + parent
for bi, b in books_order:
    burl = [u for u in old_pages if normu(u) == normu(b['url'])]
    if not burl: continue
    bpage = old_pages[burl[0]]
    bn = node_by_url.get(normu(b['url']))
    book_sid = bn.get('matched_series_id') if bn else None
    si = 0
    for sl in bpage.get('sub_links', []):
        slu = normu(sl['url'])
        if '/כתובים/' not in sl['url']:
            review('cross_section_sub_link', old_url=burl[0],
                   detail=f"old book page '{b['title']}' links series '{sl['title']}' that lives under another section ({sl['url']}); parent/child cannot express it — needs curated-link decision",
                   suggested_op=None)
            stats['cross_section_sub_links'] += 1
            continue
        si += 1
        tgt = listings.get(sl['url']) or listings.get(sl['url'].rstrip('/') + '/')
        tsid = tgt.get('mapped_series_id') if tgt else None
        if not tsid:
            # only kuntres falls here — handled in PART B via create_series
            continue
        s = ser[tsid]
        if slu not in sidebar_urls:
            emit('update_series', key=('nav', tsid), series_id=tsid, fields={'nav_visible': False},
                 evidence={'old_url': sl['url'], 'detail': f"source series shown on old book page '{b['title']}' but NOT in old sidebar"},
                 confidence='high')
            emit('set_series_sort', key=('ss', tsid), series_id=tsid, sort_order=si,
                 evidence={'old_url': burl[0], 'detail': f"sub_link #{si} on old book page '{b['title']}'"},
                 confidence='high')
        if s['status'] not in ('active', 'published'):
            emit('update_series', key=('st', tsid), series_id=tsid, fields={'status': 'published'},
                 evidence={'old_url': sl['url'], 'detail': f"source series status '{s['status']}'"}, confidence='high')
        if book_sid and s['parent_id'] != book_sid and slu not in sidebar_urls:
            emit('reparent_series', key=('rp', tsid), series_id=tsid, new_parent_ref=book_sid,
                 evidence={'old_url': sl['url'], 'detail': f"old URL nests it under book '{b['title']}'; current parent='{(ser.get(s['parent_id']) or {}).get('title')}'"},
                 confidence='high')
        # rabbi on the series card (old shows one)
        if sl.get('rabbi') and not s.get('rabbi_id'):
            key = rnorm(sl['rabbi'])
            cand = rabbi_by_name.get(key, [])
            if len(cand) == 1:
                emit('set_series_rabbi', key=('sr', tsid), series_id=tsid, rabbi_id=cand[0],
                     evidence={'old_url': sl['url'], 'detail': f"old card shows '{sl['rabbi']}'"}, confidence='high')
            else:
                review('series_rabbi_unresolved', old_url=sl['url'], series_id=tsid,
                       detail=f"old card rabbi '{sl['rabbi']}' → {len(cand)} matches in newdb_rabbis", suggested_op='set_series_rabbi')

# A5. kuntres — the one unmapped page → create_series
KUNTRES_URL = [u for u in canon_pages if 'קונטרס-הנשים-הנכריות' in u][0]
KUNTRES_TMP = 'tmp:ser_kuntres_nashim_nochriyot'
ezra_book_sid = node_by_url[normu('/מאגר-השיעורים-והמאמרים/כתובים/עזרא-ונחמיה')]['matched_series_id']
emit('create_series', tmp_id=KUNTRES_TMP, title='קונטרס הנשים הנכריות', parent_ref=ezra_book_sid,
     status='published', audience_tags=['general'], sort_order=15, bible_book='עזרא ונחמיה',
     fields={'nav_visible': False},
     evidence={'old_url': KUNTRES_URL, 'detail': "sub_link #15 on old עזרא ונחמיה book page; no series in newdb (its 4 lessons sit in 'שיעורים כלליים')"},
     confidence='high')

# =========================================================
# PART B — lessons per page (membership + order + rabbi + audience)
# =========================================================
# B0. collect claims (lesson listed on a page whose series != current series)
claims = defaultdict(list)       # lesson -> [(prio, depth, url, S, idx, psalm_no)]
inserts = {}                     # unique key -> insert record
insert_occurrences = defaultdict(list)
title_mismatch = 0

def series_ref_for(u, p):
    return p.get('mapped_series_id') or (KUNTRES_TMP if u == KUNTRES_URL else None)

for u, p in sorted(canon_pages.items()):
    S = series_ref_for(u, p)
    if not S:
        review('page_without_series', old_url=u, detail='listing page has no mapped/created series'); continue
    cls = page_class(u)
    psalm_no = psalm_no_by_url.get(normu(u))
    old_items = old_pages[u]['items']
    seen_on_page = set()
    for i, it in enumerate(p.get('items', [])):
        oit = old_items[i] if i < len(old_items) else {}
        if norm(oit.get('title')) != norm(it.get('title')):
            oit = next((x for x in old_items if norm(x.get('title')) == norm(it.get('title'))), oit)
        lid = it.get('matched_lesson_id')
        sort_order = i + 1
        if lid:
            if lid in seen_on_page:
                review('same_page_duplicate_row', old_url=u, lesson_id=lid,
                       detail=f"old page lists '{it['title']}' twice / two rows matched one lesson — kept first position")
                continue
            seen_on_page.add(lid)
            L = les.get(lid)
            if not L:
                review('matched_lesson_missing_from_dump', old_url=u, lesson_id=lid, detail=it['title']); continue
            item_conf = 'high'
            if norm(L['title']) != norm(it['title']):
                title_mismatch += 1
                method = it.get('method', '')
                suspect = ('dup' in method or 'basename' in method)
                if suspect: item_conf = 'low'
                review('title_drift' + ('_suspect_match' if suspect else ''), old_url=u, lesson_id=lid,
                       detail=f"old title '{it['title']}' vs db title '{L['title']}' (method={method})"
                              + ("; shared-media dup/basename match with disagreeing titles — match itself in doubt" if suspect
                                 else "; no title op in vocabulary — decide which title wins (several old titles are themselves typos, e.g. 'קהלת בבקיאות פרקים לב-לד' for a 12-chapter book)"))
            # status
            if L['status'] != 'published':
                review('matched_lesson_not_published', old_url=u, lesson_id=lid,
                       detail=f"'{it['title']}' is status='{L['status']}' but old page shows it publicly",
                       suggested_op='publish_lesson')
            # audience
            tags = L.get('audience_tags') or []
            if 'teachers' in tags:
                dual = any(lid == it2.get('matched_lesson_id') for k2, p2 in im['teachers'].items() for it2 in p2.get('items', []))
                newtags = ['general', 'teachers'] if dual else ['general']
                emit('retag_lesson', key=('rt', lid), lesson_id=lid, audience_tags=newtags,
                     reason='listed on public old page' + (' AND on old teachers pages (dual)' if dual else ''),
                     evidence={'old_url': u, 'detail': it['title']}, confidence='high' if not dual else 'med')
                if dual:
                    review('dual_audience_lesson', old_url=u, lesson_id=lid,
                           detail=f"'{it['title']}' appears on both public and teachers old pages; current public filter (.not cs teachers) hides dual-tagged — see code_asks")
            # rabbi
            old_r = strip_paren(it.get('rabbi') or '')
            db_r = L.get('rabbi_name')
            if old_r and rnorm(old_r) != rnorm(db_r or ''):
                if rnorm(old_r) in ADMIN_NAMES and db_r:
                    stats['rabbi_admin_name_kept_db'] += 1
                    review('old_admin_attribution_kept_db_rabbi', old_url=u, lesson_id=lid,
                           detail=f"old shows '{it['rabbi']}', DB has real rabbi '{db_r}' — kept DB (old-site uploader account, not replicating)")
                else:
                    conf = 'high' if not db_r else 'med'
                    emit('set_lesson_rabbi', key=('lr', lid), lesson_id=lid, rabbi_name=old_r,
                         evidence={'old_url': u, 'detail': f"old='{it.get('rabbi')}' vs db='{db_r}' on '{it['title']}'"},
                         confidence=conf)
                    if db_r and not (set(rnorm(old_r).split()) & set(rnorm(db_r).split())):
                        review('rabbi_attribution_conflict', old_url=u, lesson_id=lid,
                               detail=f"'{it['title']}': old='{it.get('rabbi')}' vs db='{db_r}' (no token overlap)")
            # membership / order
            if L['series_id'] == S:
                emit('set_lesson_sort', key=('ls', lid, S), lesson_id=lid, series_ref=S, sort_order=sort_order,
                     evidence={'old_url': u, 'detail': f"row #{sort_order} on old page"}, confidence=item_conf)
            else:
                claims[lid].append((OWNER_PRIO[cls], -page_depth(u), u, S, sort_order, psalm_no, item_conf))
        else:
            if it.get('candidates'):
                review('ambiguous_item', old_url=u, detail=f"'{it['title']}' ({it.get('rabbi')}) — multiple candidate lessons, no safe winner",
                       candidates=[c.get('id') for c in it['candidates']][:5], suggested_op='link manually')
                stats['ambiguous_items'] += 1
                continue
            ikey = (norm(it['title']), rnorm(it.get('rabbi') or ''), it.get('type'))
            insert_occurrences[ikey].append((OWNER_PRIO[cls], -page_depth(u), u, S, sort_order, psalm_no, oit, it))

# B1. moves/copies from claims
for lid, cl in claims.items():
    cl.sort()
    L = les[lid]
    cur_is_home = L['series_id'] in homes.get(lid, set())
    start = 0
    if not cur_is_home:
        prio, nd, u, S, so, pn, conf = cl[0]
        mv = {'op': 'move_lesson', 'lesson_id': lid, 'to_series_ref': S, 'sort_order': so,
              'evidence': {'old_url': u, 'detail': f"old page row #{so}; current series '{(ser.get(L['series_id']) or {}).get('title')}' matches no old page"},
              'confidence': conf}
        if pn: mv['bible_chapter'] = pn
        ops.append(mv); stats['move_lesson'] += 1
        start = 1
    else:
        stats['lessons_kept_in_home'] += 1
    for prio, nd, u, S, so, pn, conf in cl[start:]:
        key = ('cp', lid, S)
        if key in seen_op_keys: continue
        seen_op_keys.add(key)
        cp = {'op': 'copy_lesson', 'lesson_id': lid, 'to_series_ref': S, 'sort_order': so,
              'evidence': {'old_url': u, 'detail': f"old page also lists it (row #{so}); lesson's home series stays"},
              'confidence': conf}
        if pn: cp['bible_chapter'] = pn
        ops.append(cp); stats['copy_lesson'] += 1

# B1b. nested sub_links on non-book pages (cross-parent doubt → review, no blind reparent)
for u, p in sorted(canon_pages.items()):
    if page_class(u) in ('book', 'category'): continue
    S = p.get('mapped_series_id')
    for sl in old_pages[u].get('sub_links', []):
        tgt = listings.get(sl['url'])
        tsid = tgt.get('mapped_series_id') if tgt else None
        if not tsid: continue
        if ser[tsid]['parent_id'] != S:
            review('nested_sub_series_cross_parent', old_url=u, series_id=tsid,
                   detail=f"old page '{old_pages[u]['h1']}' links sub-series '{sl['title']}' whose newdb parent is "
                          f"'{(ser.get(ser[tsid]['parent_id']) or {}).get('title')}' — cross-listed series (may belong to another scope); "
                          f"needs curated-link/copy decision, not auto-reparent",
                   suggested_op='reparent_series or curated link')
            stats['nested_cross_parent_sub_links'] += 1

# B2. inserts (one per unique missing item) + copies to its other pages
host_re = re.compile(r'^(https?://)?(www\.)?bneyzion\.co\.il|^/')
def classify_media(oit):
    audio = video = None; extra = []
    for m in (oit.get('media') or []):
        href = m.get('href') or ''
        if m.get('kind') == 'audio' and not audio: audio = href
        elif m.get('kind') == 'video' and not video: video = href
        else: extra.append(href)
    return audio, video, extra

for n_i, (ikey, occ) in enumerate(sorted(insert_occurrences.items()), start=1):
    occ.sort()
    prio, nd, u, S, so, pn, oit, it = occ[0]
    tmp = f'tmp:ins_ketuvim_{n_i:03d}'
    audio, video, extra = classify_media(oit)
    att = oit.get('attachment_href')
    book = next((b['title'] for bi, b in books_order if norm(b['title']).replace(' ', '-') in norm(u).replace(' ', '-') or ('/' + b['url'].split('/')[-2] + '/') in u), None)
    is_shut = (it.get('type') == 'שו"ת')
    payload = {
        'title': it['title'],
        'rabbi_name': strip_paren(it.get('rabbi') or '') or None,
        'series_ref': S,
        'source_type': 'audio' if audio else ('video' if video else 'text'),
        'content_type': 'שאלות ותשובות' if is_shut else None,
        'audio_url': audio, 'video_url': video,
        'bible_book': book, 'bible_chapter': pn,
        'audience_tags': ['general'], 'status': 'published',
        'description': oit.get('promo'), 'duration_text': oit.get('duration'),
        'needs_content_scrape': bool(is_shut or (not audio and not video and not att)),
    }
    if att:
        if host_re.search(att): payload['attachment_url_old'] = att; payload['rehost'] = True
        else: payload['attachment_url'] = att
    if extra:
        payload['additional_attachments_old'] = extra; payload['rehost'] = True
    ins_op = {'op': 'insert_lesson', 'tmp_id': tmp, 'payload': payload,
              'old_url': oit.get('href') or u, 'sort_order': so,
              'evidence': {'old_url': u, 'detail': f"row #{so} '{it['title']}' ({it.get('rabbi')}, {it.get('type')}) — no match in newdb (matcher: media+title keys)"},
              'confidence': 'high' if (audio or video or att) else 'med'}
    href = oit.get('href') or ''
    if href and '/כתובים/' not in href:
        ins_op['cross_scope_href'] = True
        review('insert_cross_scope_dedup', old_url=u, tmp_id=tmp,
               detail=f"missing item '{it['title']}' has its lesson page under another section ({href}) — a sibling scope plan may insert the same lesson; apply stage must dedup inserts across plans by (normalized title, rabbi, old lesson href)")
        stats['insert_cross_scope'] += 1
    ops.append(ins_op)
    stats['insert_lesson'] += 1
    if is_shut: stats['insert_shut'] += 1
    for prio2, nd2, u2, S2, so2, pn2, oit2, it2 in occ[1:]:
        if S2 == S:
            continue
        cp = {'op': 'copy_lesson', 'lesson_id': tmp, 'to_series_ref': S2, 'sort_order': so2,
              'evidence': {'old_url': u2, 'detail': f"same missing item also listed here (row #{so2})"}, 'confidence': 'high'}
        if pn2: cp['bible_chapter'] = pn2
        ops.append(cp); stats['copy_lesson'] += 1

# =========================================================
# PART C — extras (rows in new series that the old page does not show)
# =========================================================
matched_anywhere = set()
for src in ['listings', 'teachers']:
    for k, p in im[src].items():
        for it in p.get('items', []):
            if it.get('matched_lesson_id'): matched_anywhere.add(it['matched_lesson_id'])

def ui_key(t):  # the app's dedup key (quote-strip only!)
    t = (t or '').strip()
    t = re.sub(r'[״"\'׳`|]', '', t)
    return re.sub(r'\s+', ' ', t)

NUMSUF = re.compile(r'\s*\(\d+\)\s*$')
seen_extras = set()
for u, p in sorted(canon_pages.items()):
    S = p.get('mapped_series_id')
    if not S: continue
    page_matched = [it['matched_lesson_id'] for it in p.get('items', []) if it.get('matched_lesson_id')]
    pm_uikeys = {(ui_key(les[m]['title']), les[m].get('rabbi_id')): m for m in page_matched if m in les}
    pm_basenorm = {NUMSUF.sub('', norm(les[m]['title'])): m for m in page_matched if m in les}
    for lid in p.get('new_extras', []):
        if isinstance(lid, dict): lid = lid.get('id') or lid.get('lesson_id')
        if (S, lid) in seen_extras or lid not in les: continue
        seen_extras.add((S, lid))
        L = les[lid]
        if lid in matched_anywhere:
            stats['extras_resolved_by_relocation'] += 1   # the page that lists it emits the move (this plan or a sibling scope plan)
            continue
        kcanon = pm_uikeys.get((ui_key(L['title']), L.get('rabbi_id')))
        kbase  = pm_basenorm.get(NUMSUF.sub('', norm(L['title'])))
        if kcanon and kcanon != lid:
            canonical = kcanon; reason = 'physical duplicate (same title+rabbi) of matched row in same series'
        elif NUMSUF.search(L['title'] or '') and kbase and kbase != lid:
            canonical = kbase; reason = 'migration numbered clone "(N)" of matched row in same series'
        else:
            review('extra_lesson_not_on_old_page', old_url=u, lesson_id=lid,
                   detail=f"'{L['title']}' ({L.get('rabbi_name')}) sits in this series in newdb but the old page does not list it — new-only content or mis-filed; never delete",
                   suggested_op='unlink_lesson')
            stats['extras_unexplained'] += 1
            continue
        emit('draft_lesson', key=('dr', lid), lesson_id=lid,
             reason=reason + f'; canonical={canonical}',
             evidence={'old_url': u, 'detail': L['title']}, confidence='med')
        for tid in lesson_topic_links.get(lid, []):
            emit('unlink_lesson_topic', key=('ult', lid, tid), lesson_id=lid, topic_id=tid,
                 evidence={'old_url': u, 'detail': 'relink topic from drafted duplicate to canonical'}, confidence='med')
            emit('link_lesson_topic', key=('llt', canonical, tid), lesson_id=canonical, topic_id=tid, sort_order=None,
                 evidence={'old_url': u, 'detail': f'replaces link of drafted duplicate {lid}'}, confidence='med')

stats['title_mismatch_matched_rows'] = title_mismatch

# =========================================================
# code_asks + meta + write
# =========================================================
code_asks = [
    "ADD series.nav_visible boolean DEFAULT true. Sidebar book-children query (useContentSidebar.ts:81-89) must filter nav_visible=true; /category/:id main series section must list direct children with nav_visible=false ordered by sort_order (this reproduces the old split: sidebar shows the 151 psalm/chapter collections, the book page body shows the rabbi source-series — on the old site these two sets are disjoint for every Ketuvim book).",
    "USE lessons.sort_order (added by apply spec) everywhere a lesson list renders: /series/:id (useLessonsBySeries — replace bible_chapter,title), /category/:id per-series and direct lessons (replace published_at), related lessons. Order: sort_order ASC NULLS LAST, then bible_chapter, then title. Per-psalm parity depends on it.",
    "ORDER series children by sort_order: useSeriesChildren (title-only today, R-SER1) and useSeriesForNode/CategoryPage (lesson_count desc today, R-CAT2).",
    "RAISE useSeriesForNode limit(200) (R-CAT1): clicking the כתובים root must render 280+ descendant series (151 psalms alone).",
    "DEDUP on /series/:id must not hide distinct same-title+rabbi lessons (R-SER4); after sort_order lands, key dedup on id or (title,rabbi,sort_order). /category/:id must apply the SAME dedup as /series/:id (R-CAT4).",
    "PUBLIC audience filter: lessons tagged ['general','teachers'] (dual — 4 in this scope appear on both old wings) are hidden by `.not(audience_tags cs {teachers})`. Change public filters to exclude only teachers-WITHOUT-general.",
    "APPLY-STAGE: copy_lesson must copy the full row (media, content, description, published_at, bible_*, audience) but NOT lesson_topics links, and should stamp copied_from=<source id>; recompute series.lesson_count after all ops (UI gates on it); honor rehost:true / *_old URL fields per Rule 13 (bneyzion.co.il media → Storage).",
    "APPLY-STAGE: insert_lesson rows with needs_content_scrape=true (שו\"ת rows and text items) must scrape full popup/body text from payload old_url into lessons.content before publish — popup full-text parity is a stated goal.",
    "APPLY-STAGE: add publish_lesson support or manual pass for the 1 matched draft lesson flagged in yoav_review (old site shows it).",
    "Auto 'כל השיעורים בספר X' sidebar button (DesignSidebar:832-859) covers the old alias nodes (incl. the mis-classified 'כל עזרא ונחמיה' 302-alias) — keep; old sidebar renders it as FIRST child, new renders as button: acceptable, but keep label format identical.",
]

plan = {
    '_meta': {
        'scope': 'ketuvim — all 11 books incl. 151 per-psalm pages of תהלים',
        'generated': datetime.datetime.now().isoformat(timespec='seconds'),
        'generator': 'scripts/gen_plan_ketuvim.py (re-runnable, read-only)',
        'inputs': ['old_listings_torah_ketuvim.json', 'old_sidebar_tree.json', 'match/item_match.json', 'match/tree_map.json', 'newdb_*.json'],
        'conventions': {
            'tmp_refs': "ids starting 'tmp:' refer to create_series tmp_id / insert_lesson tmp_id earlier in ops[] (ops are apply-ordered)",
            'sort_order_on_move_copy_insert': 'move_lesson/copy_lesson/insert_lesson carry sort_order (and bible_chapter for psalm targets) inline instead of a separate set_lesson_sort',
            'nav_visible': 'series field added via update_series.fields — see code_asks[0]',
            'order_origin': 'lesson sort_order = 1-based row position on the old page; series sort_order = old sidebar order_index per parent, or old book-page sub_link position for nav_visible=false series',
            'move_vs_copy': "move when the lesson's current series corresponds to NO old page that lists it; copy when the old site genuinely lists the lesson on multiple pages (per-psalm aggregation pages vs rabbi source-series pages)",
            'aliases_skipped': '7 redirected "כל-..." listing pages + 5 alias sidebar nodes + the 302-alias כל-עזרא-ונחמיה produce no ops (auto button in code)',
            'cross_plan_dependencies': "extras_resolved_by_relocation counts lessons sitting in ketuvim series that old pages of OTHER scopes list — their move ops live in the sibling scope plans; insert ops flagged cross_scope_href=true must be deduped across plans by (title, rabbi, old href) at apply time",
            'parity_simulation': 'post-apply simulation reproduces 358/359 canonical pages at exact count+position (the 1 diff = the old-site duplicate row on the עזרא-ונחמיה page, flagged, not replicated); remaining visible deltas = 234 extras_unexplained pending yoav_review',
        },
    },
    'ops': ops,
    'yoav_review': yoav,
    'code_asks': code_asks,
    'stats': {},
}

stats['pages_in_scope'] = len(ket_pages)
stats['canonical_pages'] = len(canon_pages)
stats['alias_pages_skipped'] = len(alias_pages)
stats['sidebar_nodes'] = len(ket_nodes)
stats['psalm_pages'] = len(psalm_no_by_url)
stats['old_items_total'] = sum(p['n_items'] for u, p in canon_pages.items())
stats['yoav_review_entries'] = len(yoav)
stats['total_ops'] = len(ops)
plan['stats'] = dict(sorted(stats.items()))

with open(OUT, 'w') as f:
    json.dump(plan, f, ensure_ascii=False, indent=1)
print(json.dumps(plan['stats'], ensure_ascii=False, indent=1))
print('wrote', OUT)
