#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_lessons_plan_moadim_misc.py — READ-ONLY plan generator (diff stage, no DB writes).

Scope (old_listings_neviim_moadim.json sections):
  מועדים, הפטרות, נושאים-כלליים-בתנך, ימי-עיון-בתנך,
  כלי-עזר-טבלאות-זמני-המאורעות-ומפות, פרוייקט-התנך-המוקלט-מתעדכן, ליווי-תתים

Output: plans/lessons_plan_moadim_misc.json  {_meta, ops, yoav_review, code_asks, stats}

Method (shared with the other 1:1 plan agents):
- ground truth = match/item_match.json + match/tree_map.json + old_listings_neviim_moadim.json
- aggregate page  = tree alias node OR page whose mapped series equals the mapped series of a
  strictly shallower listing page (kol-… pages). Aggregates get NO data ops (code renders them).
- canonical page of a lesson = its best old listing occurrence ranked by
  (non-aggregate first, deepest, page-mapped-series==lesson.series, url) — global across ALL listings.
- on each non-aggregate scope page, target = page's mapped series (or old_url ref / tmp ref when
  the container is missing): matched item ⇒ set_lesson_sort (+ move if canonical here & wrong
  series, else copy); unmatched ⇒ second-chance recovery (skeleton-title vs page extras, then
  global title index with rabbi-token containment) ⇒ pair / copy; else insert at its canonical
  page if that page is in scope, else cross-plan copy_lesson with lesson_ref_old.
- sort_order = old item idx * 10 (one number space per page covers lessons AND series cards,
  preserving the old interleaved order).
"""
import json, re, sys, unicodedata, urllib.parse, collections
from pathlib import Path

BASE = Path('/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/oneone')
OUT = BASE / 'plans' / 'lessons_plan_moadim_misc.json'

SCOPE = ['מועדים', 'הפטרות', 'נושאים-כלליים-בתנך', 'ימי-עיון-בתנך',
         'כלי-עזר-טבלאות-זמני-המאורעות-ומפות', 'פרוייקט-התנך-המוקלט-מתעדכן', 'ליווי-תתים']

# ---------------- normalization ----------------
NIQ = re.compile(r'[֑-ׇ]')
QUOTES = re.compile(r'[׳״"\'`“”‘’]')
SEPS = re.compile(r'[|–—\-_,:;!?()\[\]{}<>./]')

def nh(s):
    if not s:
        return ''
    s = unicodedata.normalize('NFC', NIQ.sub('', s))
    s = QUOTES.sub('', s)
    s = SEPS.sub(' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()

def skel(s):
    """ktiv male/haser skeleton: drop ו/י after first char of each token."""
    toks = []
    for t in nh(s).split():
        toks.append(t[0] + re.sub(r'[וי]', '', t[1:]) if t else t)
    return ' '.join(toks)

def rabbi_key(s):
    drop = {'הרב', 'הרבנית', 'רב', 'ר', 'דר', 'ד"ר', 'זצל', 'שליטא', 'לנשים'}
    toks = [t for t in nh(s).split() if t not in drop]
    return ' '.join(sorted(toks))

def rabbi_compatible(old_r, new_r):
    """same person-ish: equal keys or token containment (ושננתם ⊂ ושננתם אוצר התורה)."""
    a, b = rabbi_key(old_r), rabbi_key(new_r)
    if not a or not b:
        return True
    sa, sb = set(a.split()), set(b.split())
    return a == b or sa <= sb or sb <= sa

def pathify(u):
    u = urllib.parse.unquote(u or '')
    for pre in ('https://www.bneyzion.co.il', 'http://www.bneyzion.co.il'):
        u = u.replace(pre, '')
    return u.rstrip('/')

def depth(u):
    return len(pathify(u).split('/'))

def section(u):
    parts = pathify(u).split('/')
    try:
        i = parts.index('מאגר-השיעורים-והמאמרים')
        return parts[i + 1] if len(parts) > i + 1 else '(root)'
    except ValueError:
        return None

def short(u):
    p = pathify(u)
    return p.split('מאגר-השיעורים-והמאמרים/')[-1] if 'מאגר' in p else p

# ---------------- load ----------------
im = json.loads((BASE / 'match/item_match.json').read_text())
tm = json.loads((BASE / 'match/tree_map.json').read_text())
old_listings = json.loads((BASE / 'old_listings_neviim_moadim.json').read_text())
lessons = {l['id']: l for l in json.loads((BASE / 'newdb_lessons.json').read_text())}
series = {s['id']: s for s in json.loads((BASE / 'newdb_series.json').read_text())}
rabbis = json.loads((BASE / 'newdb_rabbis.json').read_text())

listings = im['listings']
scope_pages = {u: p for u, p in listings.items() if section(u) in SCOPE}

tnodes = {pathify(n['old_url']): n for n in tm['nodes'] if n.get('old_url') and n['source'] == 'sidebar'}

rabbi_by_key = collections.defaultdict(list)
for r in rabbis:
    rabbi_by_key[rabbi_key(r['name'])].append(r)

# old teachers ground truth lesson ids (dual-audience detection)
teach_gt = set()
for _k, page in (im.get('teachers') or {}).items():
    for it in (page.get('items') or []):
        if it and it.get('matched_lesson_id'):
            teach_gt.add(it['matched_lesson_id'])
occ_topic_rabbi = set()
for src in ('topic_pages', 'rabbi_pages'):
    for _k, page in (im.get(src) or {}).items():
        for it in (page.get('items') or []):
            if it and it.get('matched_lesson_id'):
                occ_topic_rabbi.add(it['matched_lesson_id'])

# ---------------- aggregate flags (global, ownership-based) ----------------
# When several listing pages map to the SAME series (root + "כל-…" views, wrapper pages),
# exactly ONE page owns that series' ops: most items wins, then non-alias, then shallower, then url.
def is_alias(u):
    n = tnodes.get(pathify(u))
    return bool(n and n['node_kind'] == 'alias')

series_pages = collections.defaultdict(list)
for u, p in listings.items():
    ms = p.get('mapped_series_id')
    if ms:
        series_pages[ms].append(u)

series_owner = {}
for ms, urls in series_pages.items():
    series_owner[ms] = sorted(urls, key=lambda x: (
        -listings[x].get('n_items', 0), is_alias(x), depth(x), x))[0]

# non-owner pages are usually duplicate views of their series (kol-… pages) — skip those.
# But three mis-mapping flavors must be re-targeted, not skipped:
#   a. their sidebar tree node matched a DIFFERENT series → use the tree series.
#   b. their tree node is UNMATCHED (container missing in newdb; tree_plan creates it) → old_url ref.
#   c. no tree node but a unique newdb series carries exactly the page-slug title
#      (e.g. מאמרים-הפטרות-ספר-שמות collided onto אוריאל's same-titled series) → that series.
series_by_nh_title = collections.defaultdict(list)
for s in series.values():
    series_by_nh_title[nh(s['title'])].append(s)

def _matched_ids(p):
    ids = {it.get('matched_lesson_id') for it in p['items'] if it.get('matched_lesson_id')}
    ids |= {('s', r.get('matched_series_id')) for r in p.get('sub_series_match', [])
            if r.get('matched_series_id')}
    return ids

target_override = {}
duplicate_view_nodes = []   # non-owner pages whose item set ≈ owner's → sidebar node should ALIAS, not duplicate
for u, p in listings.items():
    ms = p.get('mapped_series_id')
    if not ms or pathify(series_owner.get(ms, u)) == pathify(u):
        continue
    path = pathify(u)
    n = tnodes.get(path)
    tsid = n.get('matched_series_id') if n else None
    if n and n['node_kind'] == 'alias':
        continue
    # duplicate-view guard: if this page shows (mostly) the same items as the owner page,
    # it is the old-site "כל ה…" pattern — the node must alias the owner series, not get copies.
    mine, owners = _matched_ids(p), _matched_ids(listings[series_owner[ms]])
    overlap = len(mine & owners) / len(mine) if mine else 0.0
    if overlap >= 0.8:
        if section(u) in SCOPE:
            duplicate_view_nodes.append((path, ms, round(overlap, 2)))
        continue
    if tsid and tsid != ms and tsid in series:
        target_override[path] = tsid                       # (a)
    elif n and not tsid:
        target_override[path] = 'old_url:' + path          # (b)
    elif not n:
        slug_nh = nh(path.split('/')[-1].replace('-', ' '))
        cands = [s for s in series_by_nh_title.get(slug_nh, []) if s['id'] != ms]
        if len(cands) == 1:
            target_override[path] = cands[0]['id']         # (c)

def is_aggregate(u):
    """page that must NOT emit data ops: alias view, or a non-owner duplicate view of its series."""
    if is_alias(u):
        return True
    if pathify(u) in target_override:
        return False
    ms = listings.get(u, {}).get('mapped_series_id')
    if ms and pathify(series_owner.get(ms, u)) != pathify(u):
        return True
    return False

# ---------------- canonical occurrence maps ----------------
occ = collections.defaultdict(list)            # lesson_id -> [urls] (matched, all listings)
for u, p in listings.items():
    for it in p['items']:
        if it.get('matched_lesson_id'):
            occ[it['matched_lesson_id']].append(u)

def canonical_page(lid):
    pages = occ.get(lid, [])
    if not pages:
        return None
    cur = lessons.get(lid, {}).get('series_id')
    ranked = sorted(pages, key=lambda x: (
        is_aggregate(x),
        -depth(x),
        0 if listings[x].get('mapped_series_id') == cur else 1,
        x))
    return ranked[0]

unocc = collections.defaultdict(list)          # (nh title, nh rabbi) -> [urls] unmatched occurrences
for u, p in listings.items():
    for it in p['items']:
        if it.get('matched_lesson_id') is None and it.get('type') not in ('סדרה', 'series') \
                and not (it.get('method') or '').startswith('ambiguous'):
            unocc[(nh(it['title']), nh(it.get('rabbi') or ''))].append(u)

def canonical_unmatched(key):
    pages = unocc.get(key, [])
    if not pages:
        return None
    return sorted(pages, key=lambda x: (is_aggregate(x), -depth(x), x))[0]

# global newdb title index (second-chance recovery)
title_idx = collections.defaultdict(list)
skel_idx = collections.defaultdict(list)
for l in lessons.values():
    title_idx[nh(l['title'])].append(l)
    skel_idx[skel(l['title'])].append(l)

# nh-title -> matched lesson ids (per series) — for "already in target via another row"
series_titlekeys = collections.defaultdict(dict)
for l in lessons.values():
    if l.get('series_id'):
        series_titlekeys[l['series_id']].setdefault(
            (nh(l['title']), rabbi_key(l.get('rabbi_name') or '')), l['id'])

# ---------------- plan accumulators ----------------
ops, yoav, code_asks = [], [], []
stats = collections.Counter()
emitted_once = set()   # dedup keys for per-lesson global ops (retag/publish/rabbi)
tmp_counter = [0]

def add_op(op, confidence, old_url, detail, **fields):
    o = {'op': op, **fields,
         'evidence': {'old_url': pathify(old_url) if old_url else None, 'detail': detail},
         'confidence': confidence}
    ops.append(o)
    stats['op_' + op] += 1
    return o

def add_review(kind, detail, **fields):
    yoav.append({'kind': kind, 'detail': detail, **fields})
    stats['review_' + kind] += 1

def new_tmp(prefix):
    tmp_counter[0] += 1
    return f'tmp:{prefix}:{tmp_counter[0]:03d}'

_sort_seen, _copy_seen = set(), set()

def emit_sort(lid, ref, val, conf, u, detail):
    """first-wins per (lesson,series): several old rows collapsing onto one db row keep the first position."""
    k = (lid, str(ref))
    if k in _sort_seen:
        stats['old_items_collapsed_to_one_row'] += 1
        add_review('old_items_collapsed_to_one_row',
                   f'a second old item on {short(u)} matched the same db row {lid} (detail: {detail[:80]}) — '
                   f'old page shows more rows than newdb has; first position kept',
                   lesson_id=lid, old_url=pathify(u))
        return
    _sort_seen.add(k)
    add_op('set_lesson_sort', conf, u, detail, lesson_id=lid, series_ref=ref, sort_order=val)

def emit_copy(lid, ref, conf, u, detail):
    k = (lid, str(ref))
    if k in _copy_seen:
        return False
    _copy_seen.add(k)
    add_op('copy_lesson', conf, u, detail, lesson_id=lid, to_series_ref=ref)
    return True

# ---------------- containers missing from newdb ----------------
# pages in scope with no mapped series: tree nodes (tree_plan creates) vs page-only (we create)
container_ref = {}   # page path -> series ref to use in ops
create_series_done = {}
DEPENDS_TREE = []

for u, p in scope_pages.items():
    path = pathify(u)
    ms = p.get('mapped_series_id')
    if ms:
        if path in target_override:
            ov = target_override[path]
            container_ref[path] = ov
            if isinstance(ov, str) and ov.startswith('old_url:'):
                DEPENDS_TREE.append(path)
                add_review('page_target_overridden',
                           f'page {short(u)} item-matched onto the section series {ms} but its own container is missing '
                           f'in newdb (unmatched tree node) — ops target old_url ref, tree_plan creates the series',
                           old_url=path)
            else:
                add_review('page_target_overridden',
                           f'page {short(u)} was item-matched onto series {ms} ("{(series.get(ms) or {}).get("title","?")[:40]}") '
                           f'owned by another old page; re-targeted to {ov} '
                           f'("{(series.get(ov) or {}).get("title","?")[:40]}")', old_url=path)
        else:
            container_ref[path] = ms
        continue
    n = tnodes.get(path)
    if n:  # sidebar tree node → tree_plan owns creation; reference by old_url
        container_ref[path] = 'old_url:' + path
        DEPENDS_TREE.append(path)
    else:  # page-only container → we create it
        title = (p.get('h1') or path.split('/')[-1].replace('-', ' ')).strip()
        parent_path = '/'.join(path.split('/')[:-1])
        parent_url = 'https://www.bneyzion.co.il' + urllib.parse.quote(parent_path) + '/'
        # parent ref: mapped series of parent page if known
        parent_ms = None
        for uu, pp in listings.items():
            if pathify(uu) == parent_path:
                parent_ms = pp.get('mapped_series_id')
                break
        tmp = new_tmp('series')
        create_series_done[path] = tmp
        container_ref[path] = tmp
        add_op('create_series', 'high', u,
               f'old page "{title}" exists with items but no series container in newdb (not a sidebar tree node)',
               tmp_id=tmp, title=title,
               parent_ref=parent_ms or ('old_url:' + parent_path),
               status='published', audience_tags=['general'], sort_order=None, bible_book=None)

# ---------------- helper: media → payload fields ----------------
def media_payload(media_list):
    audio = video = attach = None
    rehost = False
    for m in media_list or []:
        url = m if isinstance(m, str) else (m.get('url') or m.get('href') or '')
        low = urllib.parse.unquote(url).lower()
        full = url if url.startswith('http') else 'https://www.bneyzion.co.il' + url
        if low.endswith(('.mp3', '.m4a', '.wav')):
            audio = audio or full
        elif low.endswith(('.mp4', '.mov')):
            video = video or full
        else:
            attach = attach or full
        if 'bneyzion.co.il' in full or url.startswith('/media/'):
            rehost = True
    return audio, video, attach, rehost

# ---------------- pass 1: iterate scope pages ----------------
processed_pages = 0
inserted_keys = {}     # (nh title, nh rabbi) -> tmp_id (insert emitted in THIS plan)
EMPTY_PAGES = []
agg_pages = []

# old item lookup (media/href) by page+idx
def old_item(u, idx):
    for it in (old_listings.get(u, {}).get('items') or []):
        if it.get('order') == idx:
            return it
    return {}

# extras pool per page-series for second-chance pairing
def page_extras(p):
    res = []
    for lid in p.get('new_extras', []):
        L = lessons.get(lid)
        if L:
            res.append(L)
    return res

paired_extras = set()

def second_chance(it, p, target):
    """unmatched old item → existing newdb row. Returns (lesson_row, how) or (None,None)."""
    t_nh, t_sk = nh(it['title']), skel(it['title'])
    old_r = it.get('rabbi') or ''
    # 1) extras of this page's series, skeleton-title equal, ignore rabbi
    for L in page_extras(p):
        if L['id'] in paired_extras:
            continue
        if skel(L['title']) == t_sk:
            return L, 'extra_skeleton_title'
    # 2) global exact nh title, rabbi compatible (token containment)
    hits = [L for L in title_idx.get(t_nh, []) if rabbi_compatible(old_r, L.get('rabbi_name') or '')]
    if not hits:
        hits = [L for L in skel_idx.get(t_sk, []) if rabbi_compatible(old_r, L.get('rabbi_name') or '')]
    if hits:
        hits = sorted(hits, key=lambda L: (0 if L.get('series_id') == target else 1,
                                           0 if L.get('status') == 'published' else 1, L['id']))
        # require uniqueness after preferring target series, else best deterministic
        return hits[0], 'global_title_recovery'
    return None, None

for u, p in sorted(scope_pages.items()):
    path = pathify(u)
    sec = section(u)
    target = container_ref.get(path) or p.get('mapped_series_id')

    if p.get('n_items', 0) == 0 and not p.get('sub_series_match'):
        EMPTY_PAGES.append(path)
        stats['pages_empty'] += 1
        continue

    if is_aggregate(u):
        agg_pages.append(path)
        stats['pages_aggregate_skipped'] += 1
        continue

    if sec == 'פרוייקט-התנך-המוקלט-מתעדכן':
        stats['pages_project_special'] += 1
        continue  # handled via code_asks / tree_plan (33 series cards live under book parents)

    processed_pages += 1

    # ---- lesson items ----
    for it in p['items']:
        idx = it.get('idx') or 0
        sort_val = idx * 10
        lid = it.get('matched_lesson_id')
        oi = old_item(u, idx)

        if lid and lid in lessons:
            L = lessons[lid]
            cur = L.get('series_id')
            canon = canonical_page(lid)
            here_canonical = canon and pathify(canon) == path

            home_documented = any(pathify(x) != path and listings[x].get('mapped_series_id') == cur
                                  for x in occ.get(lid, []))
            if cur == target:
                emit_sort(lid, target, sort_val, 'high', u, f'old page order idx={idx}: "{it["title"][:60]}"')
            elif here_canonical and not home_documented:
                add_op('move_lesson', 'high' if not is_aggregate(canon) else 'med', u,
                       f'lesson lives in series {cur} but its canonical old page is here and '
                       f'NO old page maps to its current series',
                       lesson_id=lid, to_series_ref=target)
                emit_sort(lid, target, sort_val, 'high', u, f'old page order idx={idx}: "{it["title"][:60]}"')
            else:
                # cross-listing: keep home, copy here — unless an equal row already exists in target
                k = (nh(L['title']), rabbi_key(L.get('rabbi_name') or ''))
                existing = None
                if isinstance(target, str) and not target.startswith(('tmp:', 'old_url:')):
                    existing = series_titlekeys.get(target, {}).get(k)
                if existing:
                    stats['copy_skipped_equal_row_in_target'] += 1
                    emit_sort(existing, target, sort_val, 'high', u,
                              f'old page order idx={idx}: equal row {existing} already lives in target series')
                elif emit_copy(lid, target, 'high', u,
                               f'old page cross-lists this lesson (home series stays {cur}; canonical page: {short(canon) if canon else "?"})'):
                    emit_sort(lid, target, sort_val, 'high', u, f'old page order idx={idx}: "{it["title"][:60]}"')

            # rabbi attribution (once per lesson, only at canonical page, old rabbi non-empty)
            if here_canonical and it.get('rabbi'):
                if not rabbi_compatible(it['rabbi'], L.get('rabbi_name') or ''):
                    key = ('rabbi', lid)
                    if key not in emitted_once:
                        emitted_once.add(key)
                        add_op('set_lesson_rabbi', 'med', u,
                               f'old page attributes "{it["title"][:50]}" to {it["rabbi"]}, newdb has {L.get("rabbi_name")}',
                               lesson_id=lid, rabbi_name=it['rabbi'])
                        add_review('rabbi_attribution_changed',
                                   f'{it["title"][:60]}: old={it["rabbi"]} new={L.get("rabbi_name")} (old taken as truth)',
                                   lesson_id=lid, old_url=path)

            # audience: teacher-tagged lesson shown on old PUBLIC page
            tags = L.get('audience_tags') or []
            if 'teachers' in tags:
                key = ('aud', lid)
                if key not in emitted_once:
                    emitted_once.add(key)
                    if lid in teach_gt:
                        add_review('dual_audience_lesson',
                                   f'"{L["title"][:60]}" appears on old PUBLIC page {short(u)} AND in old teachers wing — '
                                   f'needs dual-audience support (see code_asks), not a retag',
                                   lesson_id=lid, old_url=path)
                    else:
                        add_op('retag_lesson', 'high', u,
                               'lesson is on old public page and NOT in old teachers ground truth — teachers tag is a migration error',
                               lesson_id=lid, audience_tags=['general'],
                               reason='public-only content mis-tagged teachers')

            # status: draft lesson shown on old public page → publish (vocabulary extension)
            if L.get('status') == 'draft':
                key = ('pub', lid)
                if key not in emitted_once:
                    emitted_once.add(key)
                    add_op('publish_lesson', 'high', u,
                           f'old public page lists "{it["title"][:50]}" but newdb row is draft',
                           lesson_id=lid, reason='shown on old public page')
            continue

        # ---- ambiguous items: resolve or punt ----
        if (it.get('method') or '').startswith('ambiguous'):
            cands = it.get('candidates') or []
            in_target = [c for c in cands if c.get('series_id') == target]
            if len(in_target) == 1:
                lid2 = in_target[0]['id']
                emit_sort(lid2, target, sort_val, 'med', u,
                          f'ambiguous match resolved: candidate already in page series; idx={idx}')
            elif cands:
                # cross-list a deterministic candidate: title-equality first, then one owned by another old page
                ranked = sorted(cands, key=lambda c: (
                    0 if skel(c.get('title') or '') == skel(it['title']) else 1,
                    0 if c['id'] in occ else 1, c['id']))
                pick = ranked[0]
                if emit_copy(pick['id'], target, 'low', u,
                             f'ambiguous ({it.get("method")}): {len(cands)} candidates, picked {pick["id"]} '
                             f'("{pick.get("title","")[:40]}" / {pick.get("rabbi","")}) — VERIFY'):
                    emit_sort(pick['id'], target, sort_val, 'low', u, f'old page order idx={idx} (ambiguous pick)')
                add_review('ambiguous_pick',
                           f'"{it["title"][:60]}" on {short(u)}: picked {pick["id"]} of '
                           f'{[c["id"][:8] for c in cands]} — confirm which row the old page shows',
                           old_url=path)
            continue

        # ---- series-type rows inside items[] are handled in sub_series pass ----
        if it.get('type') in ('סדרה', 'series'):
            continue

        # ---- unmatched: second chance, then insert/cross-plan ----
        L, how = second_chance(it, p, target)
        if L is not None:
            lid2 = L['id']
            paired_extras.add(lid2)
            stats['second_chance_' + how] += 1
            cur = L.get('series_id')
            if cur == target:
                emit_sort(lid2, target, sort_val, 'med', u,
                          f'recovered ({how}): old "{it["title"][:50]}" = db "{L["title"][:50]}"')
            else:
                if emit_copy(lid2, target, 'med', u,
                             f'recovered ({how}): old "{it["title"][:50]}" = db "{L["title"][:50]}" (home {cur})'):
                    emit_sort(lid2, target, sort_val, 'med', u, f'old page order idx={idx} (recovered)')
            if it.get('rabbi') and not rabbi_compatible(it['rabbi'], L.get('rabbi_name') or ''):
                key = ('rabbi', lid2)
                if key not in emitted_once:
                    emitted_once.add(key)
                    add_op('set_lesson_rabbi', 'med', u,
                           f'old attributes to {it["rabbi"]}, db row has {L.get("rabbi_name")}',
                           lesson_id=lid2, rabbi_name=it['rabbi'])
                    add_review('rabbi_attribution_changed',
                               f'{it["title"][:60]}: old={it["rabbi"]} db={L.get("rabbi_name")} (recovered pair)',
                               lesson_id=lid2, old_url=path)
            if L.get('status') == 'draft':
                key = ('pub', lid2)
                if key not in emitted_once:
                    emitted_once.add(key)
                    add_op('publish_lesson', 'med', u,
                           f'recovered pair is draft but old public page shows it',
                           lesson_id=lid2, reason='shown on old public page (recovered match)')
            continue

        key = (nh(it['title']), nh(it.get('rabbi') or ''))
        canon = canonical_unmatched(key)
        canon_in_scope = canon and section(canon) in SCOPE
        if canon and canon_in_scope:
            if pathify(canon) == path or is_aggregate(canon):
                # insert here (canonical, or canonical is an aggregate and we are the only real page)
                if key in inserted_keys:
                    tmp = inserted_keys[key]
                    add_op('copy_lesson', 'med', u, 'second in-scope occurrence of inserted lesson',
                           lesson_id=tmp, to_series_ref=target)
                    add_op('set_lesson_sort', 'med', u, f'old page order idx={idx}',
                           lesson_id=tmp, series_ref=target, sort_order=sort_val)
                else:
                    audio, video, attach, rehost = media_payload(oi.get('media'))
                    tmp = new_tmp('lesson')
                    inserted_keys[key] = tmp
                    payload = {
                        'tmp_id': tmp,
                        'title': it['title'],
                        'rabbi_name': it.get('rabbi') or None,
                        'series_ref': target,
                        'source_type': 'audio' if audio else ('video' if video else ('pdf' if attach else 'text')),
                        'content_type': 'שו"ת' if it.get('type') == 'שו"ת' else 'שיעור',
                        'audio_url': audio, 'video_url': video,
                        'attachment_url_old': attach, 'rehost': bool(rehost and attach),
                        'bible_book': None, 'bible_chapter': None,
                        'audience_tags': ['general'], 'status': 'published',
                        'needs_content_fetch': not (audio or video or attach),
                    }
                    add_op('insert_lesson', 'high' if (audio or video or attach) else 'med', u,
                           f'old item "{it["title"][:60]}" ({it.get("rabbi","")}) has no newdb row '
                           f'(verified absent by title+skeleton index)',
                           payload=payload, source_old_url=path)
                    add_op('set_lesson_sort', 'high', u, f'old page order idx={idx}',
                           lesson_id=tmp, series_ref=target, sort_order=sort_val)
                    if payload['needs_content_fetch']:
                        add_review('insert_needs_content',
                                   f'"{it["title"][:60]}" ({it.get("rabbi","")}) on {short(u)}: no media on the old row — '
                                   f'apply stage must scrape the old item modal/page text (cache/ has the HTML)',
                                   tmp_id=tmp, old_url=path)
            else:
                # canonical elsewhere in scope: will be inserted there in this same plan run
                tmp = inserted_keys.get(key)
                if tmp:
                    add_op('copy_lesson', 'med', u, f'cross-listed; inserted at {short(canon)}',
                           lesson_id=tmp, to_series_ref=target)
                    add_op('set_lesson_sort', 'med', u, f'old page order idx={idx}',
                           lesson_id=tmp, series_ref=target, sort_order=sort_val)
                else:
                    # canonical page sorts after this one alphabetically — defer via lesson_ref_old
                    add_op('copy_lesson', 'med', u,
                           f'cross-listed; insert owned by canonical in-scope page {short(canon)}',
                           lesson_ref_old={'title': it['title'], 'rabbi': it.get('rabbi') or '',
                                           'canonical_old_url': pathify(canon)},
                           to_series_ref=target)
                    add_op('set_lesson_sort', 'med', u, f'old page order idx={idx}',
                           lesson_ref_old={'title': it['title'], 'rabbi': it.get('rabbi') or '',
                                           'canonical_old_url': pathify(canon)},
                           series_ref=target, sort_order=sort_val)
                    stats['cross_page_ref_in_scope'] += 1
        else:
            # canonical out of scope → that book/section plan owns the insert; we reference it
            add_op('copy_lesson', 'med', u,
                   f'old item missing from newdb; canonical old page is OUT of this plan scope '
                   f'({short(canon) if canon else "?"}) — its plan owns the insert',
                   lesson_ref_old={'title': it['title'], 'rabbi': it.get('rabbi') or '',
                                   'canonical_old_url': pathify(canon) if canon else None},
                   to_series_ref=target)
            add_op('set_lesson_sort', 'med', u, f'old page order idx={idx}',
                   lesson_ref_old={'title': it['title'], 'rabbi': it.get('rabbi') or '',
                                   'canonical_old_url': pathify(canon) if canon else None},
                   series_ref=target, sort_order=sort_val)
            add_review('cross_plan_insert_dependency',
                       f'"{it["title"][:60]}" ({it.get("rabbi","")}) shown on {short(u)} but its canonical page '
                       f'{short(canon) if canon else "?"} belongs to another scope plan — verify that plan inserts it',
                       old_url=path)

    # ---- sub_series rows (series cards) ----
    for r in p.get('sub_series_match', []):
        idx = r.get('idx') or 0
        sort_val = idx * 10
        sid = r.get('matched_series_id')
        oi = old_item(u, idx)
        href = oi.get('href')
        if not sid and href:
            # recover via the href page's mapped series or our created tmp
            hp = pathify('https://www.bneyzion.co.il' + href)
            sid = container_ref.get(hp)
            if sid is None:
                for uu, pp in listings.items():
                    if pathify(uu) == hp:
                        sid = pp.get('mapped_series_id')
                        break
        if not sid:
            add_review('sub_series_unresolved',
                       f'series card "{r.get("title","")[:50]}" on {short(u)} matched nothing and href page unknown',
                       old_url=path)
            continue
        S = series.get(sid) if isinstance(sid, str) and not sid.startswith(('tmp:', 'old_url:')) else None
        if S and S.get('parent_id') and target and S['parent_id'] != target \
                and not (isinstance(target, str) and target.startswith(('tmp:', 'old_url:'))):
            add_review('cross_listed_series_card',
                       f'old page {short(u)} shows series card "{r.get("title","")[:45]}" but the series\' parent in newdb is '
                       f'"{(series.get(S["parent_id"]) or {}).get("title","?")}" — new /series page only renders parent_id children; '
                       f'decide: keep sidebar parent (recommended) and accept card via code, or reparent',
                       series_id=sid, old_url=path)
            stats['cross_listed_series_cards'] += 1
        else:
            add_op('set_series_sort', 'high', u, f'old page order idx={idx}: series card "{r.get("title","")[:50]}"',
                   series_id=sid, sort_order=sort_val)
        # series rabbi attribution
        if S and oi.get('author') and not S.get('rabbi_id'):
            rk = rabbi_key(oi['author'])
            hits = rabbi_by_key.get(rk, [])
            if len(hits) == 1:
                add_op('set_series_rabbi', 'med', u,
                       f'old card credits "{oi["author"]}", series.rabbi_id is NULL',
                       series_id=sid, rabbi_id=hits[0]['id'])
            elif oi.get('author'):
                add_review('series_rabbi_unresolved',
                           f'series "{r.get("title","")[:45]}": old credits "{oi["author"]}" but rabbi name lookup is not unique '
                           f'({len(hits)} hits)', series_id=sid, old_url=path)

    # ---- new extras: things the new page shows that old does not ----
    matched_here = {it.get('matched_lesson_id') for it in p['items'] if it.get('matched_lesson_id')}
    keys_here = {(skel(lessons[l]['title']), rabbi_key(lessons[l].get('rabbi_name') or ''))
                 for l in matched_here if l in lessons}
    for lid in p.get('new_extras', []):
        L = lessons.get(lid)
        if not L:
            continue
        if lid in paired_extras:
            continue
        k = (skel(L['title']), rabbi_key(L.get('rabbi_name') or ''))
        if k in keys_here:
            stats['extras_dup_hidden_by_ui'] += 1
            continue
        if L.get('status') != 'published':
            stats['extras_already_hidden_nonpublished'] += 1
            continue
        if lid in occ:
            stats['extras_owned_by_other_listing_page'] += 1   # that page's plan moves it
            continue
        if lid in occ_topic_rabbi or lid in teach_gt:
            stats['extras_only_topic_rabbi_or_teachers'] += 1
            add_review('extra_kept_seen_elsewhere_in_old',
                       f'"{L["title"][:55]}" extra on {short(u)} — not on old listing pages but present in old '
                       f'topic/rabbi/teachers ground truth; kept published (would need a better home, not hiding)',
                       lesson_id=lid, old_url=path)
            continue
        if re.match(r'^מעבר ל', L['title'].strip()):
            add_op('draft_lesson', 'high', u,
                   'old-site navigation artifact ("מעבר ל…") migrated as a lesson row; never a real lesson',
                   lesson_id=lid, reason='navigation artifact row')
            continue
        add_op('draft_lesson', 'med', u,
               f'published row "{L["title"][:55]}" sits in this page\'s series but appears NOWHERE in old ground truth '
               f'(listings/topics/rabbis/teachers) — hiding to preserve 1:1 counts; never deleted',
               lesson_id=lid, reason='absent from old site ground truth')
        add_review('orphan_extra_drafted',
                   f'"{L["title"][:55]}" ({(L.get("rabbi_name") or "")[:25]}) on {short(u)} — confirm it is not '
                   f'genuinely-new content that should stay',
                   lesson_id=lid, old_url=path)

# ---------------- duplicate-view nodes (alias, don't copy) ----------------
for path, ms, ovl in duplicate_view_nodes:
    add_review('duplicate_view_node_needs_alias',
               f'old page {path.split("מאגר-השיעורים-והמאמרים/")[-1]} shows the same items as the owner page of series '
               f'{ms} (overlap {ovl}). Its sidebar node (where unmatched in tree_map) must ALIAS the owner series '
               f'(link to /series/{ms} or /category), NOT get a new container with copied rows — this is the old '
               f'"כל ה…"/portal pattern.', old_url=path)

# ---------------- empty pages note ----------------
for path in EMPTY_PAGES:
    add_review('empty_page_must_render',
               f'old page {path} is genuinely empty (0 items). The series must EXIST and render an empty state, '
               f'not 404 — status per tree_plan.', old_url=path)
# shared note for the second known-empty page (owned by the נביאים plan scope)
add_review('empty_page_must_render',
           'old page /מאגר-השיעורים-והמאמרים/נביאים/ישעיהו/כל-השיעורים-בספר-ישעיהו/לב-הפרק-ישעיהו/ is the second '
           'genuinely-empty page named in the task — it lives in the נביאים scope; coordinating note only '
           '(status per tree_plan, must not 404).',
           old_url='/מאגר-השיעורים-והמאמרים/נביאים/ישעיהו/כל-השיעורים-בספר-ישעיהו/לב-הפרק-ישעיהו')

# ---------------- standing reviews ----------------
add_review('old_root_pages_show_subset',
           'old מועדים root and ימי-עיון root/kol pages show ~58/~204 items while their subtrees hold more; this is '
           'old-site pagination/curation, not data. New aggregation pages should show the FULL subtree (sane behavior, '
           'not bug-replication).')
add_review('project_recorded_tanach',
           'פרוייקט-התנ"ך-המוקלט page = 33 series cards whose series live under their book parents in newdb; needs a '
           'code-level section/route + tree_plan root node, no lesson ops (see code_asks).')
add_review('display_name_institution',
           'old credits "ושננתם" where newdb rabbi row is "ושננתם - אוצר התורה" — treated as the same entity (token '
           'containment), display-name difference left to the rabbi plan.')
add_review('portal_pages_are_links',
           'old "מעבר ל…" pages (מעבר-לשיעורים-על-ספר-יונה, מעבר-לשיעורים-על-גוג-ומגוג) are cross-section portals whose '
           'content belongs to the target book/series (owner pages elsewhere). New site should LINK (card → /series/:id '
           'of the target), not duplicate rows; the 3 "מעבר ל…" rows migrated as lessons in ליווי-תתים are drafted as '
           'navigation artifacts.')

# ---------------- code_asks ----------------
code_asks.extend([
    'ORDERING (blocker for this whole plan): /series/:id useLessonsBySeries must order by lessons.sort_order ASC '
    '(nulls last) before bible_chapter/title; CategoryPage useSeriesLessons (published_at ASC) and useDirectLessons '
    '(published_at DESC) must do the same — otherwise set_lesson_sort ops have no effect (code_semantics R-SER5, R-CAT3).',
    'useSeriesChildren must order children by series.sort_order (then title) and filter status IN '
    '(active,published) + exclude teachers-only — chapter/part cards currently render alphabetically (R-SER1/2/3).',
    'CategoryPage canonical series list: order by series.sort_order instead of lesson_count desc, and lift/paginate '
    'the limit(200)/limit(50) caps (R-CAT1/2/5).',
    'Sidebar extra-section children (מועדים/הפטרות/כלי-עזר/ימי-עיון/ליווי-ת"תים): yemeiIyun + livuyTatim must respect '
    'sort_order/custom order like the other sections (R-SB6).',
    'DUAL AUDIENCE: כלי-עזר and ליווי-ת"תים roots + their series/lessons serve BOTH wings on the old site '
    '(32 scope lessons verified in both old public and old teachers ground truth). Public queries must treat '
    "audience_tags ['teachers','general'] as public, and /series/:id should redirect to /teachers only when the series "
    'is teachers-ONLY. Without this, the public כלי-עזר section is empty or bounces (R-SB5 hop).',
    'Title+rabbi dedup in useLessonsBySeries/TopicPage hides genuinely distinct same-title lessons; with sort_order '
    'landed, dedup should key on id (or include media URL) so old counts survive (R-SER4).',
    'Empty-but-existing series (e.g. הפטרת וילך, לב הפרק - ישעיהו): /series/:id must render an empty state, never 404, '
    'and the sidebar must keep the node (status per tree_plan).',
    'פרוייקט-התנ"ך-המוקלט (מתעדכן): top-level old section with 33 recorded-book series that live under their book '
    'parents — needs a sidebar root entry + a page that lists those 33 series in biblical order (no DB reparenting; '
    'a curated list/RPC like the existing hard-coded roots).',
    'Old pages interleave series-cards and lesson rows in one ordered list; the new UI renders them as separate '
    'sections. sort_order preserves each kind\'s internal order — confirm with Saar that section-split rendering is '
    'acceptable as 1:1.',
    'Apply-stage schema (assumed by this plan): lessons.sort_order int; resolution of tmp: lesson/series ids; '
    'resolution of lesson_ref_old {title,rabbi,canonical_old_url} → the row inserted by the owning scope plan; '
    'vocabulary extension publish_lesson{lesson_id,reason} (draft rows that the old public site displays).',
])

# ---------------- meta + write ----------------
meta = {
    'generated_by': 'gen_lessons_plan_moadim_misc.py',
    'scope_sections': SCOPE,
    'scope_pages': len(scope_pages),
    'pages_processed_non_aggregate': processed_pages,
    'aggregate_pages_skipped': sorted(set(agg_pages)),
    'empty_pages_in_scope': EMPTY_PAGES,
    'series_ref_conventions': {
        'uuid': 'existing newdb series id',
        'old_url:<path>': 'container that tree_plan must create (sidebar tree node, unmatched)',
        'tmp:series:NNN': 'container created by a create_series op in THIS plan',
        'tmp:lesson:NNN': 'row created by an insert_lesson op in THIS plan',
        'lesson_ref_old': 'row whose insert is owned by another scope plan (resolve after all inserts)',
    },
    'vocabulary_extensions': {
        'publish_lesson': '{lesson_id, reason} — inverse of draft_lesson; old public page shows a draft row',
        'insert_lesson.payload.tmp_id': 'lets later copy/sort ops reference the inserted row',
        'copy_lesson/set_lesson_sort.lesson_ref_old': 'cross-plan reference (see series_ref_conventions)',
    },
    'depends_on_tree_plan': sorted(set(DEPENDS_TREE)),
    'sort_semantics': 'set_lesson_sort{lesson_id, series_ref, sort_order}: applies to the row living in series_ref '
                      'after moves/copies (per-(lesson,series) row). sort_order = old item idx * 10.',
    'canonical_rule': 'canonical page of an item = best old-listing occurrence ranked by (non-aggregate first, '
                      'deepest path, page-series == lesson.series, url). Aggregate = tree alias OR page mapped to the '
                      'same series as a shallower page. Other scope plans must use the same rule for cross-plan '
                      'insert ownership to be consistent.',
}

plan = {'_meta': meta, 'ops': ops, 'yoav_review': yoav, 'code_asks': code_asks, 'stats': dict(stats)}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(plan, ensure_ascii=False, indent=1))
print('WROTE', OUT)
print(json.dumps(dict(stats), ensure_ascii=False, indent=0, sort_keys=True))
print('ops:', len(ops), '| yoav_review:', len(yoav), '| code_asks:', len(code_asks))
