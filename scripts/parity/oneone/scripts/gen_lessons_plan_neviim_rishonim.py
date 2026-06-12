#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_lessons_plan_neviim_rishonim.py — READ-ONLY plan generator (diff stage, no DB writes).

Scope: the 6 נביאים ראשונים books — יהושע, שופטים, שמואל-א, שמואל-ב, מלכים-א, מלכים-ב
(all old listing pages under /מאגר-השיעורים-והמאמרים/נביאים/<book>/ in old_listings_neviim_moadim.json).

Output: plans/lessons_plan_neviim_rishonim.json  {_meta, ops, yoav_review, code_asks, stats}

Conventions copied from plans/lessons_plan_neviim_aharonim.json (same op vocabulary, evidence,
confidence, sort_order = raw old row idx, copy-vs-move policy, synonym rule, Rule 13 media policy,
cross-plan ownership of inbound dependencies). Tree containers created by tree_plan are referenced
via its stable 'tmp:<old-url-last-segment>' namespace (never re-created here).
"""
import json, re, sys, unicodedata, urllib.parse, collections, datetime
from difflib import SequenceMatcher
from pathlib import Path

BASE = Path('/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/oneone')
OUT = BASE / 'plans' / 'lessons_plan_neviim_rishonim.json'

BOOKS = ['יהושע', 'שופטים', 'שמואל-א', 'שמואל-ב', 'מלכים-א', 'מלכים-ב']
BOOK_DISPLAY = {'יהושע': 'יהושע', 'שופטים': 'שופטים', 'שמואל-א': 'שמואל א',
                'שמואל-ב': 'שמואל ב', 'מלכים-א': 'מלכים א', 'מלכים-ב': 'מלכים ב'}
SYNTH = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-4000-8000-')

# ---------------- normalization (normalize_he, identical to global matcher) ----------------
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
    toks = []
    for t in nh(s).split():
        toks.append(t[0] + re.sub(r'[וי]', '', t[1:]) if t else t)
    return ' '.join(toks)

RABBI_DROP = {'הרב', 'הרבנית', 'רב', 'ר', 'דר', 'זצל', 'שליטא', 'לנשים', 'הרהג'}

def clean_rabbi(s):
    return re.sub(r'\(לנשים\)', '', s or '').strip()

def rabbi_key(s):
    toks = [t for t in nh(clean_rabbi(s)).split() if t not in RABBI_DROP]
    return ' '.join(sorted(toks))

def rabbi_compatible(old_r, new_r):
    a, b = rabbi_key(old_r), rabbi_key(new_r)
    if not a or not b:
        return True
    sa, sb = set(a.split()), set(b.split())
    return a == b or sa <= sb or sb <= sa

def rabbi_variant(old_r, new_r):
    a, b = rabbi_key(old_r), rabbi_key(new_r)
    return bool(a and b) and SequenceMatcher(None, a, b).ratio() > 0.85

def unq(u):
    u = urllib.parse.unquote(u or '')
    for pre in ('https://www.bneyzion.co.il', 'http://www.bneyzion.co.il'):
        u = u.replace(pre, '')
    return u.rstrip('/')

def full_url(path):
    return 'https://www.bneyzion.co.il' + path + '/'

def book_of(u):
    parts = unq(u).split('/')
    try:
        i = parts.index('מאגר-השיעורים-והמאמרים')
        if len(parts) > i + 2 and parts[i + 1] == 'נביאים' and parts[i + 2] in BOOKS:
            return parts[i + 2]
    except ValueError:
        pass
    return None

ALIAS_SEG = re.compile(r'^(כל-השיעורים-ב|כל-התכנים-ב|כל-הפטרות)')

def strip_alias(path):
    return '/'.join(seg for seg in path.split('/') if not ALIAS_SEG.match(seg))

def short(path):
    return path.split('מאגר-השיעורים-והמאמרים/')[-1]

# ---------------- load ----------------
im = json.loads((BASE / 'match/item_match.json').read_text())
tm = json.loads((BASE / 'match/tree_map.json').read_text())
old_listings = json.loads((BASE / 'old_listings_neviim_moadim.json').read_text())
lessons = {l['id']: l for l in json.loads((BASE / 'newdb_lessons.json').read_text())}
series = {s['id']: s for s in json.loads((BASE / 'newdb_series.json').read_text())}
rabbis = json.loads((BASE / 'newdb_rabbis.json').read_text())
topics_dump = json.loads((BASE / 'newdb_topics.json').read_text())
tree_plan = json.loads((BASE / 'plans/tree_plan.json').read_text())

listings = im['listings']
by_path = {unq(u): u for u in listings}
old_by_path = {unq(u): u for u in old_listings}
listing_paths = set(by_path)

scope_pages = {u: p for u, p in listings.items() if book_of(u)}

lessons_with_topic_links = {lt['lesson_id'] for lt in topics_dump.get('lesson_topics', [])}

rabbi_by_key = collections.defaultdict(list)
for r in rabbis:
    rabbi_by_key[rabbi_key(r['name'])].append(r)

# tree_plan created containers: old_url path -> tmp:<segment> ref (+ sort/parent for verification)
tree_tmp = {}
for o in tree_plan['ops']:
    if o['op'] == 'create_series':
        p = unq('https://www.bneyzion.co.il' + (o.get('evidence', {}).get('old_url') or ''))
        tree_tmp[p] = {'ref': o['tmp_id'], 'sort': o.get('sort_order'), 'parent': o.get('parent_ref')}
tree_series_ops = collections.defaultdict(list)   # series_id -> tree_plan op kinds (coverage check)
tree_ss = {}                                       # series_id -> tree_plan set_series_sort value
tree_reparent = {}                                 # series_id -> new_parent_ref
for o in tree_plan['ops']:
    if o.get('series_id'):
        tree_series_ops[o['series_id']].append(o['op'])
        if o['op'] == 'set_series_sort':
            tree_ss[o['series_id']] = o.get('sort_order')
        elif o['op'] == 'reparent_series':
            tree_reparent[o['series_id']] = o.get('new_parent_ref')

# alias nodes (old sidebar)
alias_paths = {unq(n['old_url']) for n in tm['nodes']
               if n['source'] == 'sidebar' and n.get('node_kind') == 'alias' and n.get('old_url')}
tnode_by_path = {unq(n['old_url']): n for n in tm['nodes']
                 if n['source'] == 'sidebar' and n.get('old_url')}

# old teachers / topic / rabbi ground-truth lesson occurrences
teach_gt, occ_topic_rabbi = set(), set()
for _k, page in (im.get('teachers') or {}).items():
    for it in (page.get('items') or []):
        if it and it.get('matched_lesson_id'):
            teach_gt.add(it['matched_lesson_id'])
for src in ('topic_pages', 'rabbi_pages'):
    for _k, page in (im.get(src) or {}).items():
        for it in (page.get('items') or []):
            if it and it.get('matched_lesson_id'):
                occ_topic_rabbi.add(it['matched_lesson_id'])

# documented (old-justified) series: mapped by any old page / sub-series card / sidebar node
documented_series = set()
for u, p in listings.items():
    if p.get('mapped_series_id'):
        documented_series.add(p['mapped_series_id'])
    for r in p.get('sub_series_match', []):
        if r.get('matched_series_id'):
            documented_series.add(r['matched_series_id'])
for _k, page in (im.get('teachers') or {}).items():
    if page.get('mapped_series_id'):
        documented_series.add(page['mapped_series_id'])
    for r in (page.get('sub_series_match') or []):
        if r.get('matched_series_id'):
            documented_series.add(r['matched_series_id'])
for n in tm['nodes']:
    if n.get('matched_series_id'):
        documented_series.add(n['matched_series_id'])

# occurrence maps over ALL listings
occ = collections.defaultdict(list)                  # lesson_id -> [paths]
for u, p in listings.items():
    for it in p['items']:
        if it.get('matched_lesson_id'):
            occ[it['matched_lesson_id']].append(unq(u))

# global title / skeleton indexes
title_idx = collections.defaultdict(list)
skel_idx = collections.defaultdict(list)
for l in lessons.values():
    title_idx[nh(l['title'])].append(l)
    skel_idx[skel(l['title'])].append(l)

# per-series published title keys (synonym rule) + per-series rows
series_titlekeys = collections.defaultdict(dict)
series_rows = collections.defaultdict(list)
for l in lessons.values():
    sid = l.get('series_id')
    if sid:
        series_rows[sid].append(l['id'])
        if l.get('status') == 'published':
            series_titlekeys[sid].setdefault((nh(l['title']), rabbi_key(l.get('rabbi_name') or '')), l['id'])

pub_count = collections.Counter()
for l in lessons.values():
    if l.get('series_id') and l.get('status') == 'published':
        pub_count[l['series_id']] += 1

series_by_nh_title = collections.defaultdict(list)
for s in series.values():
    series_by_nh_title[nh(s['title'])].append(s)

# media basename index (collapse rescue): normalized per MATCH-README (decode, +→space, NFC, casefold)
def norm_media_basename(u):
    if not u:
        return None
    s = urllib.parse.unquote(u).replace('+', ' ')
    s = unicodedata.normalize('NFC', s).casefold().rstrip('/')
    return s.split('/')[-1] or None

media_idx = collections.defaultdict(set)
for m in json.loads((BASE / 'newdb_lessons_media.json').read_text()):
    for f in ('legacy_attachment_url', 'audio_url', 'video_url', 'attachment_url'):
        bn = norm_media_basename(m.get(f))
        if bn:
            media_idx[bn].add(m['id'])
    for extra in (m.get('additional_attachments') or []):
        u2 = extra if isinstance(extra, str) else (extra.get('url') if isinstance(extra, dict) else None)
        bn = norm_media_basename(u2)
        if bn:
            media_idx[bn].add(m['id'])

def ancestors(sid):
    chain, cur, seen = [], sid, set()
    while cur and cur in series and cur not in seen:
        seen.add(cur)
        cur = series[cur].get('parent_id')
        if cur:
            chain.append(cur)
    return chain

# ---------------- canonical page (aharonim rule: nearest listing page above the old href) ----------------
def canonical_from_href(href, fallback_path):
    if not href:
        return fallback_path
    p = strip_alias(unq(href))
    parts = p.split('/')
    for k in range(len(parts) - 1, 1, -1):
        cand = '/'.join(parts[:k])
        if cand in listing_paths and cand not in alias_paths:
            return cand
    return fallback_path

# ---------------- page targets, aliases, duplicate views ----------------
def matched_ids(p):
    ids = {it.get('matched_lesson_id') for it in p['items'] if it.get('matched_lesson_id')}
    return ids

series_pages = collections.defaultdict(list)
for u, p in listings.items():
    if p.get('mapped_series_id'):
        series_pages[p['mapped_series_id']].append(unq(u))
series_owner = {}
for ms, paths in series_pages.items():
    real = [x for x in paths if x not in alias_paths]
    pool = real or paths
    series_owner[ms] = sorted(pool, key=lambda x: (-listings[by_path[x]].get('n_items', 0), x))[0]

ops, yoav, code_asks = [], [], []
stats = collections.Counter()
classification = collections.Counter()

def add_op(op, confidence, page_path, detail, **fields):
    o = {'op': op, **fields,
         'evidence': {'old_url': full_url(page_path) if page_path else None, 'detail': detail},
         'confidence': confidence}
    ops.append(o)
    stats['op_' + op] += 1
    return o

def add_review(kind, detail=None, **fields):
    e = {'kind': kind}
    if detail is not None:
        e['detail'] = detail
    e.update(fields)
    yoav.append(e)

page_target = {}          # path -> series ref (uuid or 'tmp:…')
remapped_placeholders = []
skipped_alias, skipped_dup_view = [], []

for u, p in sorted(scope_pages.items(), key=lambda kv: unq(kv[0])):
    path = unq(u)
    if path in alias_paths:
        skipped_alias.append(path)
        continue
    sp = strip_alias(path)
    if sp != path and sp in listing_paths:
        # alias-shadow view: the same page exists at the alias-stripped path (e.g.
        # שמואל-א/כל-השיעורים-בספר-שמואל-א/ספר-שמואל-א vs שמואל-א/ספר-שמואל-א) — covered there
        skipped_dup_view.append((path, sp, 'alias_shadow'))
        continue
    ms = p.get('mapped_series_id')
    if not ms:
        t = tree_tmp.get(path)
        if t:
            page_target[path] = t['ref']
        else:
            page_target[path] = 'old_url:' + path
            add_review('container_unplanned',
                       f'page {short(path)} has items but no newdb series and no tree_plan create — needs a container',
                       old_url=path)
        continue
    # placeholder twin remap (aharonim: placeholder_series_superseded)
    S = series.get(ms, {})
    if S.get('status') == 'draft' and pub_count[ms] == 0:
        twins = [s for s in series_by_nh_title.get(nh(S.get('title', '')), [])
                 if s['id'] != ms and pub_count[s['id']] > 0]
        if len(twins) == 1:
            mine = matched_ids(p)
            in_twin = sum(1 for lid in mine if lessons.get(lid, {}).get('series_id') == twins[0]['id'])
            if mine and in_twin / len(mine) >= 0.3:
                page_target[path] = twins[0]['id']
                remapped_placeholders.append((path, ms, twins[0]['id']))
                continue
    # duplicate view of an owner page
    if series_owner.get(ms) and series_owner[ms] != path:
        mine, owners = matched_ids(p), matched_ids(listings[by_path[series_owner[ms]]])
        overlap = len(mine & owners) / len(mine) if mine else 1.0
        if overlap >= 0.8:
            skipped_dup_view.append((path, series_owner[ms], round(overlap, 2)))
            continue
    page_target[path] = ms

if remapped_placeholders:
    add_review('placeholder_series_superseded',
               'migration placeholders (status=draft, 0 published rows) remapped to their populated '
               'same-title twins for this plan: ' +
               '; '.join(f"{short(p)}: {a} → {b}" for p, a, b in remapped_placeholders) +
               '. Placeholders are already draft/hidden.',
               series_ids=[a for _p, a, _b in remapped_placeholders])
for path, owner, ovl in skipped_dup_view:
    why = 'alias-shadow path (same page reachable at the alias-stripped URL)' if ovl == 'alias_shadow' \
          else f'overlap {ovl}'
    add_review('duplicate_view_page',
               f'old page {short(path)} shows the same items as owner page {short(owner)} ({why}) — '
               f'old-site duplicate view; no data ops emitted, items covered via the owner page',
               old_url=path)

# ---------------- helpers ----------------
def media_payload(media_list):
    audio = video = attach = None
    rehost = False
    for url in media_list or []:
        full = url if url.startswith('http') else 'https://www.bneyzion.co.il' + url
        if 'bneyzion.co.il' in full:
            # Rule 13: bneyzion.co.il-hosted media goes only into attachment_url_old with rehost:true
            attach = attach or full
            rehost = True
            continue
        low = urllib.parse.unquote(full).lower()
        if low.endswith(('.mp3', '.m4a', '.wav')):
            audio = audio or full
        elif low.endswith(('.mp4', '.mov', '.avi')):
            video = video or full
        else:
            attach = attach or full
    return audio, video, attach, rehost

def old_item(path, idx):
    op_ = old_listings.get(old_by_path.get(path, ''), {})
    for it in (op_.get('items') or []):
        if it.get('order') == idx:
            return it
    return {}

_sort_seen, _copy_seen = set(), set()
emitted_once = set()

def emit_sort(lref, target, val, conf, path, detail, is_tmp=False):
    k = (str(lref), str(target))
    if k in _sort_seen:
        stats['old_items_collapsed_to_one_row'] += 1
        return
    _sort_seen.add(k)
    if is_tmp:
        add_op('set_lesson_sort', conf, path, detail, lesson_ref=lref, series_ref=target, sort_order=val)
    else:
        add_op('set_lesson_sort', conf, path, detail, lesson_id=lref, series_ref=target, sort_order=val)

def emit_copy(lref, target, conf, path, detail, is_tmp=False):
    k = (str(lref), str(target))
    if k in _copy_seen:
        return False
    _copy_seen.add(k)
    if is_tmp:
        add_op('copy_lesson', conf, path, detail, lesson_ref=lref, to_series_ref=target)
    else:
        add_op('copy_lesson', conf, path, detail, lesson_id=lref, to_series_ref=target)
    return True

def handle_rabbi(lid, L, old_rabbi, path, title):
    old_rabbi = clean_rabbi(old_rabbi)
    if not old_rabbi:
        return
    new_rabbi = L.get('rabbi_name') or ''
    key = ('rabbi', lid)
    if key in emitted_once:
        return
    if not new_rabbi:
        emitted_once.add(key)
        add_op('set_lesson_rabbi', 'high', path,
               f'new rabbi_name empty; old page attributes "{title[:50]}" to {old_rabbi}',
               lesson_id=lid, rabbi_name=old_rabbi)
        classification['set_lesson_rabbi'] += 1
    elif rabbi_compatible(old_rabbi, new_rabbi):
        return
    elif rabbi_variant(old_rabbi, new_rabbi):
        emitted_once.add(key)
        add_op('set_lesson_rabbi', 'med', path,
               f'spelling variant: old "{old_rabbi}" vs new "{new_rabbi}" — old site is ground truth',
               lesson_id=lid, rabbi_name=old_rabbi)
        classification['set_lesson_rabbi_variant'] += 1
    else:
        emitted_once.add(key)
        rabbi_conflicts[(nh(title), rabbi_key(old_rabbi), rabbi_key(new_rabbi))].append(
            {'lesson_id': lid, 'title': title, 'old_rabbi': old_rabbi, 'new_rabbi': new_rabbi, 'page': path})
        classification['rabbi_conflict_review'] += 1

def handle_status_audience(lid, L, path, title):
    if L.get('status') != 'published':
        key = ('pub', lid)
        if key not in emitted_once:
            emitted_once.add(key)
            add_op('publish_lesson', 'high', path,
                   f'old public page lists "{title[:50]}" but newdb row is {L.get("status")}',
                   lesson_id=lid, reason='shown on old public page')
            classification['publish_lesson'] += 1
    tags = L.get('audience_tags') or []
    if 'teachers' in tags:
        key = ('aud', lid)
        if key not in emitted_once:
            emitted_once.add(key)
            if lid in teach_gt:
                classification['dual_audience_no_op'] += 1
            else:
                add_op('retag_lesson', 'high', path,
                       'lesson shown on old PUBLIC page and absent from old teachers ground truth — '
                       'teachers tag is a migration error',
                       lesson_id=lid, audience_tags=['general'],
                       reason='public-only content mis-tagged teachers')
                classification['retag_lesson'] += 1

rabbi_conflicts = collections.defaultdict(list)
consumed_rows = set()        # lesson ids bound to old rows (synonym / second-chance) — extras pass skips them
paired_extras = set()

def page_extras(p):
    return [lessons[lid] for lid in p.get('new_extras', []) if lid in lessons]

def second_chance(it, p, target):
    t_nh, t_sk = nh(it['title']), skel(it['title'])
    old_r = it.get('rabbi') or ''
    for L in page_extras(p):
        if L['id'] in paired_extras:
            continue
        if skel(L['title']) == t_sk:
            return L, 'extra_skeleton_title'
    hits = [L for L in title_idx.get(t_nh, []) if rabbi_compatible(old_r, L.get('rabbi_name') or '')]
    if not hits:
        hits = [L for L in skel_idx.get(t_sk, []) if rabbi_compatible(old_r, L.get('rabbi_name') or '')]
    if hits:
        hits = sorted(hits, key=lambda L: (0 if L.get('series_id') == target else 1,
                                           0 if L.get('status') == 'published' else 1, L['id']))
        return hits[0], 'global_title_recovery'
    return None, None

# ---------------- pass 0: insert ownership (canonical pages of unmatched rows) ----------------
unmatched_global = collections.defaultdict(list)   # key -> [(path, idx, item, old_item)]
planned_paths = set(page_target)
for u, p in sorted(scope_pages.items(), key=lambda kv: unq(kv[0])):
    path = unq(u)
    if path not in planned_paths:
        continue
    for it in p['items']:
        if it.get('matched_lesson_id') or it.get('type') in ('סדרה', 'series') \
                or (it.get('method') or '').startswith('ambiguous'):
            continue
        oi = old_item(path, it.get('idx') or 0)
        key = (nh(it['title']), rabbi_key(it.get('rabbi') or ''))
        unmatched_global[key].append((path, it.get('idx') or 0, it, oi))

insert_home = {}   # key -> canonical path (in scope) or None (out of scope)
for key, occs in unmatched_global.items():
    href = next((oi.get('href') for _p, _i, _it, oi in occs if oi.get('href')), None)
    canon = canonical_from_href(href, occs[0][0])
    insert_home[key] = canon

# inbound cross-plan ownership (moadim_misc lesson_ref_old + aharonim deferral): these rows physically
# live under נושאי-יסוד-בנביאים on the old site, but the cross-plan contract makes THIS plan insert them
# at their book pages. Force canonical home into scope (override the href rule).
PFX = '/מאגר-השיעורים-והמאמרים/נביאים/'
INBOUND_OWN = {
    nh('השופטים בדורותם - מבוא לספר שופטים'): PFX + 'שופטים',
    nh('שמואל בקוראי שמו - מבוא לספר שמואל'): PFX + 'שמואל-א',
    nh('המלכויות בישראל - מבוא לספר מלכים'): PFX + 'מלכים-א',
    nh('המלכויות בישראל - מלכות עשרת השבטים'): PFX + 'מלכים-א',
    nh('נחלת ארץ ישראל'): PFX + 'יהושע',
    nh('מגלות יהויכין עד חורבן הבית'): PFX + 'מלכים-ב',
}
for key in list(insert_home):
    if key[0] in INBOUND_OWN:
        insert_home[key] = INBOUND_OWN[key[0]]

tmp_counters = {'qa': 0, 'lesson': 0}
inserted_keys = {}   # key -> tmp_id
insert_emitted = set()

def new_tmp(kind):
    tmp_counters[kind] += 1
    return f'tmp_{kind}_rish_{tmp_counters[kind]:03d}'

def canonical_matched_row(key, canon):
    """if the canonical page's row for this key MATCHED, bind to that lesson instead of inserting."""
    cp = listings.get(by_path.get(canon, ''))
    if not cp:
        return None
    for it2 in cp['items']:
        lid2 = it2.get('matched_lesson_id')
        if lid2 and (nh(it2['title']), rabbi_key(it2.get('rabbi') or '')) == key:
            return lid2
    return None

# ---------------- pass 1: per page ----------------
per_book = collections.defaultdict(lambda: {'pages': 0, 'old_items': 0, 'matched': 0})
page_cover = {}   # path -> dict(rows, covered, gap_titles)
golden_rows = []
series_card_emitted = set()
move_sources = collections.Counter()
old_dup_rows = []   # (page, idx, title) — old-site duplicate rows not replicated

for u, p in sorted(scope_pages.items(), key=lambda kv: unq(kv[0])):
    path = unq(u)
    if path not in planned_paths:
        continue
    b = book_of(u)
    target = page_target[path]
    target_is_tmp = isinstance(target, str) and target.startswith(('tmp:', 'old_url:'))
    per_book[b]['pages'] += 1
    rows = covered = 0
    gap_titles = []
    card_no = 0
    page_lid_media = {}   # lesson_id -> media list of its FIRST old row on this page (collapse detection)

    for it in p['items']:
        idx = it.get('idx') or 0
        oi = old_item(path, idx)
        if it.get('type') in ('סדרה', 'series'):
            card_no += 1
            continue
        rows += 1
        per_book[b]['old_items'] += 1
        lid = it.get('matched_lesson_id')
        title = it['title']

        if lid and lid in lessons:
            per_book[b]['matched'] += 1
            L = lessons[lid]
            cur = L.get('series_id')
            covered += 1
            # ---- collapse rescue: a SECOND old row on this page matched the same db row ----
            if lid in page_lid_media:
                first_media = page_lid_media[lid]
                this_media = oi.get('media') or []
                if [norm_media_basename(x) for x in this_media] == [norm_media_basename(x) for x in first_media]:
                    classification['collapse_true_old_dup'] += 1
                    old_dup_rows.append((short(path), idx, title))
                    continue   # old-site duplicate row — policy: don't replicate bugs (count covered)
                bn = norm_media_basename(this_media[0]) if this_media else None
                cands2 = sorted((media_idx.get(bn) or set()) - {lid}) if bn else []
                if len(cands2) == 1 and cands2[0] in lessons:
                    lid2 = cands2[0]
                    L2c = lessons[lid2]
                    classification['collapse_rebound_via_media'] += 1
                    consumed_rows.add(lid2)
                    paired_extras.add(lid2)
                    if not target_is_tmp and L2c.get('series_id') == target:
                        emit_sort(lid2, target, idx, 'med', path,
                                  f'row #{idx}: distinct old row (same title as row matched to {lid[:8]}) '
                                  f'rebound to {lid2[:8]} via its media file')
                    elif emit_copy(lid2, target, 'med', path,
                                   f'row #{idx}: distinct old row rebound to {lid2[:8]} via media file '
                                   f'(title-twin of {lid[:8]})'):
                        emit_sort(lid2, target, idx, 'med', path, f'row #{idx} on old page (media rebound)')
                    handle_rabbi(lid2, L2c, it.get('rabbi'), path, title)
                    handle_status_audience(lid2, L2c, path, title)
                    continue
                # distinct old row, media not in newdb → insert
                audio2, video2, attach2, rehost2 = media_payload(this_media)
                tmp2 = new_tmp('lesson')
                has_media2 = bool(audio2 or video2 or attach2)
                o2 = add_op('insert_lesson', 'high' if has_media2 else 'med', path,
                            f'old row #{idx} "{title[:50]}" is a DISTINCT second row (different media) — an earlier '
                            f'row on this page already matched {lid[:8]}; this row\'s own media has no newdb row',
                            tmp_id=tmp2,
                            payload={'title': title, 'rabbi_name': clean_rabbi(it.get('rabbi')) or None,
                                     'series_ref': target, 'source_type': 'lesson', 'content_type': None,
                                     'audio_url': audio2, 'video_url': video2,
                                     'attachment_url_old': attach2, 'rehost': rehost2,
                                     'bible_book': BOOK_DISPLAY[b], 'bible_chapter': None,
                                     'audience_tags': ['general'], 'status': 'published'},
                            old_url=full_url(unq(oi.get('href'))) if oi.get('href') else None,
                            needs_content_scrape=not has_media2)
                if not has_media2:
                    o2['note'] = 'no media on this old row — apply stage must scrape old_url for full text/player'
                classification['collapse_insert_distinct_row'] += 1
                emit_sort(tmp2, target, idx, 'high', path, f'row #{idx} on old page', is_tmp=True)
                continue
            page_lid_media[lid] = oi.get('media') or []
            if not target_is_tmp and cur == target:
                emit_sort(lid, target, idx, 'high', path, f'row #{idx} on old page')
                classification['in_place'] += 1
                consumed_rows.add(lid)
            else:
                k = (nh(L['title']), rabbi_key(L.get('rabbi_name') or ''))
                syn = None if target_is_tmp else series_titlekeys.get(target, {}).get(k)
                if syn:
                    emit_sort(syn, target, idx, 'high', path,
                              f'row #{idx} on old page — identical (title,rabbi) row {syn} already lives in the '
                              f'target series (night-session copy); bound to it instead of moving/copying')
                    classification['in_place_synonym'] += 1
                    consumed_rows.add(syn)
                    paired_extras.add(syn)
                    L = lessons.get(syn, L)
                    lid = syn
                elif not target_is_tmp and target in ancestors(cur):
                    classification['cross_desc_no_op'] += 1
                    # new UI aggregates descendants on /category — row reachable, no copy
                else:
                    canon = canonical_from_href(oi.get('href'), path)
                    here_canonical = canon == path
                    justified = cur in documented_series
                    if here_canonical and not justified:
                        add_op('move_lesson', 'high', path,
                               f'old canonical URL is {oi.get("href") or "this page"} (under this page); current '
                               f'series "{(series.get(cur) or {}).get("title", "?")[:45]}" is not documented by any '
                               f'old page/sidebar node — junk/orphan placement',
                               lesson_id=lid, to_series_ref=target)
                        emit_sort(lid, target, idx, 'high', path, f'row #{idx} on old page')
                        classification['move_lesson'] += 1
                        move_sources[cur] += 1
                        if nh(L['title']) != nh(title):
                            add_review('move_check', lesson_id=lid, old_title=title, new_title=L['title'],
                                       from_series=(series.get(cur) or {}).get('title', '?'),
                                       to_series=str(target),
                                       detail='old/new titles differ (matched via media file) — verify before moving')
                    else:
                        cls = 'copy_lesson' if here_canonical else 'copy_lesson_cross'
                        det = (f'old canonical home of "{title[:45]}" is this page; current series '
                               f'"{(series.get(cur) or {}).get("title", "?")[:45]}" is also old-justified '
                               f'(cross-listing on old site)') if here_canonical else \
                              (f'old page displays "{title[:45]}" whose canonical home is {short(canon)} — '
                               f'copy for parity (home series stays)')
                        if emit_copy(lid, target, 'high', path, det):
                            emit_sort(lid, target, idx, 'high', path, f'row #{idx} on old page')
                        classification[cls] += 1
                        if nh(L['title']) != nh(title):
                            add_review('move_check', lesson_id=lid, old_title=title, new_title=L['title'],
                                       from_series=(series.get(cur) or {}).get('title', '?'),
                                       to_series=str(target),
                                       detail='old/new titles differ (matched via media file) — verify before copying')
            handle_rabbi(lid, L, it.get('rabbi'), path, title)
            handle_status_audience(lid, L, path, title)
            continue

        if (it.get('method') or '').startswith('ambiguous'):
            cands = it.get('candidates') or []
            in_t = [c for c in cands if c.get('series_id') == target]
            if len(in_t) == 1:
                emit_sort(in_t[0]['id'], target, idx, 'med', path,
                          f'row #{idx}: ambiguous match resolved — single candidate already in page series')
                classification['ambiguous_resolved_in_target'] += 1
                consumed_rows.add(in_t[0]['id'])
                covered += 1
            elif cands:
                ranked = sorted(cands, key=lambda c: (
                    0 if skel(c.get('title') or '') == skel(title) else 1,
                    0 if c['id'] in occ else 1, c['id']))
                pick = ranked[0]
                if emit_copy(pick['id'], target, 'low', path,
                             f'row #{idx}: ambiguous ({it.get("method")}), {len(cands)} candidates — picked '
                             f'{pick["id"]} deterministically, VERIFY'):
                    emit_sort(pick['id'], target, idx, 'low', path, f'row #{idx} on old page (ambiguous pick)')
                classification['ambiguous_pick'] += 1
                covered += 1
                add_review('ambiguous_pick',
                           f'"{title[:60]}" on {short(path)}: picked {pick["id"][:8]} of '
                           f'{[c["id"][:8] for c in cands]} — confirm which row the old page shows',
                           old_url=path)
            else:
                gap_titles.append(title)
            continue

        # ---- unmatched: second chance → insert/copy → cross-plan ----
        L2, how = second_chance(it, p, target if not target_is_tmp else None)
        if L2 is not None:
            lid2 = L2['id']
            paired_extras.add(lid2)
            consumed_rows.add(lid2)
            classification['second_chance_' + how] += 1
            covered += 1
            per_book[b]['matched'] += 1
            cur = L2.get('series_id')
            if not target_is_tmp and cur == target:
                emit_sort(lid2, target, idx, 'med', path,
                          f'row #{idx}: recovered ({how}) — old "{title[:40]}" = db "{L2["title"][:40]}"')
            else:
                if emit_copy(lid2, target, 'med', path,
                             f'row #{idx}: recovered ({how}) — old "{title[:40]}" = db "{L2["title"][:40]}" '
                             f'(home series stays {cur})'):
                    emit_sort(lid2, target, idx, 'med', path, f'row #{idx} on old page (recovered)')
            handle_rabbi(lid2, L2, it.get('rabbi'), path, title)
            handle_status_audience(lid2, L2, path, title)
            continue

        key = (nh(title), rabbi_key(it.get('rabbi') or ''))
        canon = insert_home.get(key)
        if canon and canon in planned_paths:
            covered += 1
            if canon != path:
                # cross-listed occurrence: bind to the canonical page's matched row if it has one,
                # else reference the insert that the canonical page owns (reserve the tmp now)
                bound = canonical_matched_row(key, canon)
                if bound and bound in lessons:
                    Lb = lessons[bound]
                    if Lb.get('series_id') == target:
                        emit_sort(bound, target, idx, 'med', path,
                                  f'row #{idx}: same row matched on canonical page {short(canon)}')
                    elif emit_copy(bound, target, 'med', path,
                                   f'row #{idx}: cross-listed; canonical page {short(canon)} matched this row'):
                        emit_sort(bound, target, idx, 'med', path, f'row #{idx} on old page')
                    classification['copy_lesson_cross'] += 1
                    consumed_rows.add(bound)
                else:
                    tmp = inserted_keys.get(key)
                    if not tmp:
                        is_qa = it.get('type') == 'שו"ת'
                        tmp = new_tmp('qa' if is_qa else 'lesson')
                        inserted_keys[key] = tmp
                    if emit_copy(tmp, target, 'med', path,
                                 f'row #{idx}: cross-listed; insert owned by canonical in-scope page {short(canon)}',
                                 is_tmp=True):
                        emit_sort(tmp, target, idx, 'med', path, f'row #{idx} on old page', is_tmp=True)
                    classification['copy_of_insert'] += 1
            elif key in insert_emitted:
                tmp = inserted_keys[key]
                if emit_copy(tmp, target, 'med', path,
                             f'row #{idx}: second occurrence of inserted lesson on its canonical page',
                             is_tmp=True):
                    emit_sort(tmp, target, idx, 'med', path, f'row #{idx} on old page', is_tmp=True)
                classification['copy_of_insert'] += 1
            else:
                audio, video, attach, rehost = media_payload(oi.get('media'))
                is_qa = it.get('type') == 'שו"ת'
                tmp = inserted_keys.get(key) or new_tmp('qa' if is_qa else 'lesson')
                inserted_keys[key] = tmp
                insert_emitted.add(key)
                payload = {
                    'title': title,
                    'rabbi_name': clean_rabbi(it.get('rabbi')) or None,
                    'series_ref': target,
                    'source_type': 'qa' if is_qa else 'lesson',
                    'content_type': 'שאלות ותשובות' if is_qa else None,
                    'audio_url': audio, 'video_url': video,
                    'attachment_url_old': attach, 'rehost': rehost,
                    'bible_book': BOOK_DISPLAY[b], 'bible_chapter': None,
                    'audience_tags': ['general'], 'status': 'published',
                }
                has_media = bool(audio or video or attach)
                o = add_op('insert_lesson', 'high' if has_media else 'med', path,
                           f'old row #{idx} "{title[:55]}" ({it.get("type")}, {it.get("rabbi") or "?"}) — no match '
                           f'in new DB (global matcher: media+title+rabbi keys; verified absent by title+skeleton index)',
                           tmp_id=tmp, payload=payload,
                           old_url=full_url(unq(oi.get('href'))) if oi.get('href') else None,
                           needs_content_scrape=not has_media or is_qa)
                if not has_media:
                    o['note'] = 'no media in old listing row — apply stage must scrape old_url for full text/player'
                classification['insert_lesson_qa' if is_qa else 'insert_lesson'] += 1
                emit_sort(tmp, target, idx, 'high', path, f'row #{idx} on old page', is_tmp=True)
                if is_qa:
                    rk = rabbi_key(it.get('rabbi') or '')
                    hits = rabbi_by_key.get(rk, [])
                    if len(hits) == 1:
                        add_op('rabbi_page_item', 'med', path,
                               'inserted public שו"ת should appear on its rabbi page (old rav pages list שו"ת)',
                               rabbi_id=hits[0]['id'], kind='qa', lesson_ref=tmp, sort_order=None)
                        classification['rabbi_page_item_qa'] += 1
                    elif it.get('rabbi'):
                        add_review('qa_rabbi_unresolved',
                                   f'inserted שו"ת "{title[:50]}": rabbi "{it.get("rabbi")}" resolves to '
                                   f'{len(hits)} newdb rabbi rows — rabbi_page_item not emitted, resolve by hand',
                                   tmp_id=tmp, old_url=path)
        else:
            classification['cross_plan_gap'] += 1
            gap_titles.append(title)
            add_review('cross_plan_dependency',
                       title=title, rabbi=it.get('rabbi') or '', type=it.get('type') or 'שיעור',
                       home_page=full_url(canon) if canon else None,
                       displayed_on=[full_url(path)],
                       media=oi.get('media') or [],
                       detail=f'unmatched row whose canonical home {short(canon) if canon else "?"} is OUT of the '
                              f'neviim_rishonim scope — the owning plan must insert it; afterwards add a copy_lesson '
                              f'+ set_lesson_sort (sort_order={idx}) into series {target} for this page')

    # ---- series cards (sub_series rows) ----
    card_no = 0
    for r in p.get('sub_series_match', []):
        idx = r.get('idx') or 0
        card_no += 1
        sid = r.get('matched_series_id')
        href = r.get('old_href')
        if not sid and href:
            hp = strip_alias(unq(href))
            t = tree_tmp.get(hp) or tree_tmp.get(unq(href))
            if t:
                # tree_plan creates + sorts this container — verify, don't duplicate
                if t['sort'] == card_no:
                    classification['series_card_tree_verified'] += 1
                else:
                    add_review('series_sort_mismatch_tree',
                               f'series card "{r.get("title", "")[:45]}" on {short(path)}: page card #{card_no} but '
                               f'tree_plan create sort_order={t["sort"]} (sidebar position) — tree wins per APPLY-ORDER, '
                               f'verify the old sidebar/page orders really differ',
                               old_url=path, tmp_id=t['ref'])
                continue
            mp = listings.get(by_path.get(hp, ''), {})
            sid = page_target.get(hp) or mp.get('mapped_series_id')
        if not sid:
            add_review('sub_series_unresolved',
                       f'series card "{r.get("title", "")[:50]}" on {short(path)} matched no series and its href page '
                       f'is unknown', old_url=path)
            continue
        if isinstance(sid, str) and sid.startswith('tmp:'):
            classification['series_card_tree_verified'] += 1
            continue
        S = series.get(sid)
        if not S:
            continue
        # post-tree parent: tree_plan reparents win; kol-intermediate ("כל השיעורים בספר X") parents
        # of the SAME book count as same-book (sidebar/category hop through them per tree_plan/CODE-SPEC)
        eff_parent = tree_reparent.get(sid, S.get('parent_id'))
        P = series.get(eff_parent, {})
        same_book_hop = bool(P) and (
            nh(P.get('title', '')) == nh('כל השיעורים בספר ' + BOOK_DISPLAY[b]) or
            nh(P.get('title', '')) == nh(BOOK_DISPLAY[b]))
        if eff_parent == target or (not target_is_tmp and same_book_hop):
            if sid in tree_ss:
                if tree_ss[sid] == card_no:
                    classification['series_card_tree_verified'] += 1
                else:
                    classification['series_card_tree_sort_differs'] += 1
                    add_review('series_sort_mismatch_tree',
                               f'series card "{r.get("title", "")[:45]}" is card #{card_no} on {short(path)} but '
                               f'tree_plan sets sort_order={tree_ss[sid]} (sidebar position) — tree wins per '
                               f'APPLY-ORDER, verify the old sidebar/page orders really differ',
                               series_id=sid, old_url=path)
            elif S.get('sort_order') == card_no:
                classification['series_card_already_correct'] += 1
            elif sid not in series_card_emitted:
                series_card_emitted.add(sid)
                add_op('set_series_sort', 'high', path, f'series card #{card_no} on old page',
                       series_id=sid, sort_order=card_no)
                classification['set_series_sort'] += 1
            # series rabbi from old card author
            oi = old_item(path, idx)
            if oi.get('author') and not S.get('rabbi_id'):
                rk = rabbi_key(oi['author'])
                hits = rabbi_by_key.get(rk, [])
                if len(hits) == 1:
                    kk = ('srab', sid)
                    if kk not in emitted_once:
                        emitted_once.add(kk)
                        add_op('set_series_rabbi', 'med', path,
                               f'old card credits "{oi["author"]}", series.rabbi_id is NULL',
                               series_id=sid, rabbi_id=hits[0]['id'])
                        classification['set_series_rabbi'] += 1
        else:
            add_review('cross_section_series_card',
                       f'old page {short(path)} shows series card "{r.get("title", "")[:45]}" but the series\' '
                       f'post-tree parent in newdb is "{P.get("title", "?")}" — new page renders parent children '
                       f'only; keep sidebar parent (recommended) and accept the card via code, or reparent '
                       f'(tree_plan domain)',
                       series_id=sid, old_url=path)
            classification['cross_section_series_card'] += 1

    page_cover[path] = {'rows': rows, 'covered': covered, 'gap_titles': gap_titles, 'book': b,
                        'target': str(target)}

# ---------------- reserved-but-unemitted inserts (canonical page never reached its row) ----------------
for key, tmp in sorted(inserted_keys.items(), key=lambda kv: kv[1]):
    if key in insert_emitted:
        continue
    occs = unmatched_global.get(key) or []
    canon = insert_home.get(key)
    src = next((o for o in occs if o[3].get('media')), occs[0] if occs else None)
    if not src or not canon or canon not in page_target:
        add_review('reserved_insert_unresolvable',
                   f'tmp {tmp} was referenced by copy/sort ops but its canonical page never produced the insert — '
                   f'resolve by hand', tmp_id=tmp, key=list(key))
        continue
    pth, idx, it, oi = src
    b2 = book_of(by_path[pth])
    audio, video, attach, rehost = media_payload(oi.get('media'))
    is_qa = it.get('type') == 'שו"ת'
    has_media = bool(audio or video or attach)
    o = add_op('insert_lesson', 'high' if has_media else 'med', canon,
               f'late insert at canonical page (reserved by a cross-listing page): old "{it["title"][:55]}" '
               f'({it.get("type")}, {it.get("rabbi") or "?"}) — no match in new DB',
               tmp_id=tmp,
               payload={'title': it['title'], 'rabbi_name': clean_rabbi(it.get('rabbi')) or None,
                        'series_ref': page_target[canon], 'source_type': 'qa' if is_qa else 'lesson',
                        'content_type': 'שאלות ותשובות' if is_qa else None,
                        'audio_url': audio, 'video_url': video,
                        'attachment_url_old': attach, 'rehost': rehost,
                        'bible_book': BOOK_DISPLAY.get(b2), 'bible_chapter': None,
                        'audience_tags': ['general'], 'status': 'published'},
               old_url=full_url(unq(oi.get('href'))) if oi.get('href') else None,
               needs_content_scrape=not has_media or is_qa)
    if not has_media:
        o['note'] = 'no media in old listing row — apply stage must scrape old_url for full text/player'
    classification['insert_lesson_qa' if is_qa else 'insert_lesson'] += 1
    insert_emitted.add(key)

# ---------------- rabbi conflicts → yoav (grouped, aharonim shape) ----------------
for (_t, _o, _n), recs in sorted(rabbi_conflicts.items(), key=lambda kv: kv[1][0]['title']):
    add_review('rabbi_conflict',
               title=recs[0]['title'], old_rabbi=recs[0]['old_rabbi'], new_rabbi=recs[0]['new_rabbi'],
               lesson_ids=sorted({r['lesson_id'] for r in recs}),
               detail='old page and new DB attribute this lesson to different people — verify before set_lesson_rabbi')

# ---------------- new extras (per planned page) ----------------
for u, p in sorted(scope_pages.items(), key=lambda kv: unq(kv[0])):
    path = unq(u)
    if path not in planned_paths:
        continue
    target = page_target[path]
    if isinstance(target, str) and target.startswith(('tmp:', 'old_url:')):
        continue
    matched_keys_here = set()
    for it in p['items']:
        lid = it.get('matched_lesson_id')
        if lid and lid in lessons:
            matched_keys_here.add((nh(lessons[lid]['title']), rabbi_key(lessons[lid].get('rabbi_name') or '')))
    for lid in p.get('new_extras', []):
        L = lessons.get(lid)
        if not L or lid in paired_extras or lid in consumed_rows:
            continue
        if L.get('status') != 'published':
            stats['extras_already_hidden_nonpublished'] += 1
            continue
        k = (nh(L['title']), rabbi_key(L.get('rabbi_name') or ''))
        if k in matched_keys_here:
            # exact-dup of a row the old page shows (night-session copy duplicate)
            if lid not in lessons_with_topic_links:
                add_op('draft_lesson', 'high', path,
                       f'published row "{L["title"][:50]}" duplicates an old-page row already bound in this series '
                       f'(identical title+rabbi, no lesson_topics links) — hidden to preserve 1:1 counts; never deleted',
                       lesson_id=lid, reason='exact duplicate of bound row, clean FK')
                classification['extra_drafted_exact_dup'] += 1
            else:
                add_review('extra_dup_with_links',
                           f'"{L["title"][:50]}" in series {target} duplicates a bound row but carries lesson_topics '
                           f'links — kept published, dedup by hand after links are moved',
                           lesson_id=lid, old_url=path)
                classification['extra_kept_dup_with_links'] += 1
            continue
        if occ.get(lid):
            stats['extras_owned_by_other_listing_page'] += 1
            continue
        if lid in occ_topic_rabbi or lid in teach_gt:
            stats['extras_only_topic_rabbi_or_teachers'] += 1
            continue
        if re.match(r'^מעבר ל', L['title'].strip()):
            add_op('draft_lesson', 'high', path,
                   'old-site navigation artifact ("מעבר ל…") migrated as a lesson row; never a real lesson',
                   lesson_id=lid, reason='navigation artifact row')
            classification['extra_drafted_nav_artifact'] += 1
            continue
        classification['extra_kept_flagged'] += 1
        add_review('extra_kept',
                   f'"{L["title"][:55]}" ({(L.get("rabbi_name") or "")[:25]}) sits in series of {short(path)} but '
                   f'appears nowhere in old ground truth — kept published per policy (draft only exact-dups); '
                   f'confirm it is genuinely-new content',
                   lesson_id=lid, old_url=path)

# ---------------- old-site duplicate rows note ----------------
if old_dup_rows:
    add_review('old_dup_rows_not_replicated',
               f'{len(old_dup_rows)} old rows are exact duplicates of an earlier row on the SAME page (identical '
               f'title + identical media) — old-site bugs, not replicated per policy; the new page shows the row '
               f'once. Rows: ' + '; '.join(f'{pg} #{ix} "{t[:35]}"' for pg, ix, t in old_dup_rows))

# ---------------- retag summary (for Yoav's eyeball) ----------------
retag_by_series = collections.Counter()
for o in ops:
    if o['op'] == 'retag_lesson':
        L = lessons.get(o.get('lesson_id'), {})
        retag_by_series[(series.get(L.get('series_id'), {}) or {}).get('title', '?')] += 1
if retag_by_series:
    add_review('retag_summary',
               'teachers→general retags by current series (rows shown on old PUBLIC pages and absent from old '
               'teachers ground truth — dominated by the per-chapter ושננתם split series, mirroring the aharonim '
               'plan\'s ספר-X-עם-ביאור-ושננתם retags): ' +
               '; '.join(f'{t}: {n}' for t, n in retag_by_series.most_common()))

def find_tmp_by_title(t):
    tn = nh(t)
    for k, v in inserted_keys.items():
        if k[0] == tn:
            return v
    return None

# ---------------- inbound cross-plan dependencies (owned here) ----------------
inbound = []
MOADIM_REFS = [
    ('השופטים בדורותם - מבוא לספר שופטים', 'הרב יוסף מילר', 'נביאים/שופטים'),
    ('שמואל בקוראי שמו - מבוא לספר שמואל', 'הרב יוסף מילר', 'נביאים/שמואל-א'),
    ('המלכויות בישראל - מבוא לספר מלכים', 'הרב יוסף מילר', 'נביאים/מלכים-א'),
    ('המלכויות בישראל - מלכות עשרת השבטים', 'הרב יוסף מילר', 'נביאים/מלכים-א'),
    ('נחלת ארץ ישראל', 'הרב יוסף מילר', 'נביאים/יהושע'),
]
for t, r, home in MOADIM_REFS:
    tmp = find_tmp_by_title(t)
    inbound.append({'from_plan': 'lessons_plan_moadim_misc', 'mechanism': 'lesson_ref_old',
                    'title': t, 'rabbi': r, 'canonical_old_url': '/מאגר-השיעורים-והמאמרים/' + home,
                    'resolved_to': tmp})
    if not tmp:
        add_review('inbound_ref_unresolved',
                   f'moadim_misc lesson_ref_old "{t}" expected an insert in this plan but none was emitted — '
                   f'verify the canonical page row matched something instead', title=t)

# מגלות יהויכין עד חורבן הבית — aharonim deferred insert+copies to this plan. The מלכים-ב row #17
# was recovered onto the EXISTING lesson f1422687 'מגלת יהויכין עד חורבן הבית' (אברמסון, ימי עיון תשע"ד,
# ktiv variant) — better than inserting a duplicate; the aharonim-page copies reference that row.
def binding_at(page_path, row_idx):
    tgt_url = full_url(page_path)
    for o in ops:
        if o['op'] == 'set_lesson_sort' and o['evidence']['old_url'] == tgt_url and o['sort_order'] == row_idx:
            return o.get('lesson_id') or o.get('lesson_ref')
    return None

res_m = find_tmp_by_title('מגלות יהויכין עד חורבן הבית') or binding_at(PFX + 'מלכים-ב', 17)
if res_m:
    is_tmp_m = isinstance(res_m, str) and res_m.startswith('tmp_')
    for disp_path_end, row_idx in (('נביאים/יחזקאל', 15), ('נביאים/ירמיהו', 19)):
        disp = '/מאגר-השיעורים-והמאמרים/' + disp_path_end
        tgt = listings.get(by_path.get(disp, ''), {}).get('mapped_series_id')
        # aharonim remapped the ירמיהו book page to its populated twin
        if disp_path_end == 'נביאים/ירמיהו':
            tgt = '69c795d9-a415-43a2-afb1-8694fe2e2a60'
        if tgt:
            if emit_copy(res_m, tgt, 'high', disp,
                         f'aharonim-plan cross_plan_dependency owned here: old row #{row_idx} on this page displays '
                         f'"מגלות יהויכין עד חורבן הבית" whose canonical home is נביאים/מלכים-ב '
                         f'(resolved to {res_m})', is_tmp=is_tmp_m):
                emit_sort(res_m, tgt, row_idx, 'high', disp, f'row #{row_idx} on old page', is_tmp=is_tmp_m)
            classification['inbound_copy_for_aharonim'] += 1
    inbound.append({'from_plan': 'lessons_plan_neviim_aharonim', 'mechanism': 'yoav cross_plan_dependency',
                    'title': 'מגלות יהויכין עד חורבן הבית', 'rabbi': 'הרב אריה אברמסון',
                    'canonical_old_url': '/מאגר-השיעורים-והמאמרים/נביאים/מלכים-ב',
                    'resolved_to': res_m,
                    'resolution': 'existing lesson (ktiv-variant title, no insert needed)' if not is_tmp_m
                                  else 'inserted here',
                    'copies_emitted_to': ['נביאים/יחזקאל (row 15)', 'נביאים/ירמיהו (row 19)']})
    if not is_tmp_m:
        add_review('media_mismatch',
                   f'lesson {res_m} "מגלת יהויכין עד חורבן הבית" (הרב אריה אברמסון) carries an audio_url pointing at '
                   f'a הרב-חנניה-מלכה מלכים-ב file, while the old site serves '
                   f's3…/bneyzion/ימי עיון תשעד/הרב אריה אברמסון - מגלות יהויכין ועד חורבן הבית.mp3 on every page '
                   f'showing this row. Two ושננתם rows (33a7b41c, 63645763) also hold that mp3 in '
                   f'legacy_attachment_url with rabbi "ושננתם - אוצר התורה" (mis-attribution artifacts). '
                   f'Verify + fix audio_url by hand (no op emitted to avoid cross-plan double-write).',
                   lesson_id=res_m)
else:
    add_review('inbound_ref_unresolved',
               'aharonim cross_plan_dependency "מגלות יהויכין עד חורבן הבית" expected an insert/binding here '
               '(מלכים-ב) but none was found — verify', title='מגלות יהויכין עד חורבן הבית')

# ---------------- emptied series check ----------------
for sid, n in move_sources.items():
    if sid in series and len(series_rows.get(sid, [])) - n <= 0:
        add_review('emptied_series', series_id=sid, series_title=series[sid].get('title'),
                   detail=f'after {n} move_lesson ops this series is emptied; no old-site counterpart documents it. '
                          f'Already {series[sid].get("status")}, flag for cleanup.')

# ---------------- draft series with items but no tree coverage ----------------
for u, p in sorted(scope_pages.items(), key=lambda kv: unq(kv[0])):
    path = unq(u)
    if path not in planned_paths:
        continue
    tgt = page_target[path]
    S = series.get(tgt) if isinstance(tgt, str) and not tgt.startswith(('tmp:', 'old_url:')) else None
    if S and S.get('status') == 'draft' and 'update_series' not in tree_series_ops.get(tgt, []):
        add_review('draft_container_needs_activation',
                   f'page {short(path)} maps to draft series "{S["title"]}" ({tgt}) which tree_plan does not '
                   f'activate — old public page exists with {p.get("n_items", 0)} rows; needs update_series '
                   f'status=active (tree domain, referenced not duplicated here)',
                   series_id=tgt, old_url=path)
        classification['draft_container_flagged'] += 1

# ---------------- golden event-series table ----------------
after_plan_adds = collections.Counter()
for o in ops:
    if o['op'] in ('copy_lesson', 'move_lesson', 'insert_lesson'):
        t = o.get('to_series_ref') or (o.get('payload') or {}).get('series_ref')
        if t:
            after_plan_adds[str(t)] += 1
for u, p in sorted(scope_pages.items(), key=lambda kv: unq(kv[0])):
    path = unq(u)
    if path not in planned_paths:
        continue
    tgt = page_target[path]
    S_t = series.get(tgt, {}) if isinstance(tgt, str) else {}
    is_golden = (isinstance(tgt, str) and SYNTH.match(tgt)) or \
                (isinstance(tgt, str) and tgt.startswith('tmp:')) or \
                ('| פרק' in (S_t.get('title') or ''))
    if not is_golden:
        continue
    cov = page_cover.get(path, {})
    S = series.get(tgt, {}) if not str(tgt).startswith('tmp:') else {}
    golden_rows.append({
        'book': BOOK_DISPLAY[book_of(u)],
        'page': short(path),
        'series_ref': str(tgt),
        'series_title': S.get('title') or '(tree_plan create)',
        'old_count': cov.get('rows', 0),
        'matched': p.get('n_matched', 0),
        'db_published_now': pub_count.get(str(tgt), 0),
        'added_by_plan': after_plan_adds.get(str(tgt), 0),
        'covered_after_plan': cov.get('covered', 0),
        'exact_parity_after_plan': cov.get('covered', 0) == cov.get('rows', 0),
    })

# ---------------- standing notes ----------------
n_copies = sum(1 for o in ops if o['op'] == 'copy_lesson')
add_review('copy_inflation_note',
           f'this plan creates {n_copies} copy_lesson rows to reproduce old cross-listings (book pages aggregating '
           f'intro/cross-section lessons + chapter-event pages double-homing rows that live in per-rabbi series). '
           f'Mirrors the night-session COPY pattern; UI dedup is per-series only so no visible dupes, but rabbi '
           f'lesson_counts inflate — same caveat as NIGHT-LOG-20260610.')
n_qa = classification.get('insert_lesson_qa', 0)
add_review('qa_dedup_note',
           f'{n_qa} inserted Q&A rows (insert_lesson source_type=qa) may also be generated by the rabbis plan from '
           f'old rav pages. Dedup key before apply: normalized (title, rabbi_name). All carry old_url under '
           f'/נביאים/<book>/….')
add_review('alias_pages_note',
           'the 6 "כל-השיעורים-בספר-X" pages are flat aggregations (alias nodes in tree_map); their new-UI '
           'equivalent is /category/:bookId code-level descendant aggregation. No ops emitted from them; their '
           'rows are covered via the canonical pages (verified identical item sets).')

# ---------------- code_asks ----------------
code_asks.extend([
    'ORDERING (blocker, same as the other lessons plans / CODE-SPEC §0): /series/:id and /category/:id must order '
    'lessons by lessons.sort_order ASC NULLS LAST — all set_lesson_sort ops here assume it (R-SER5/R-CAT3).',
    'Child-series cards must order by series.sort_order (R-SER1/2, R-CAT2) — set_series_sort ops here use the '
    'old book-page card order (1-based among cards), same semantics as tree_plan sidebar positions.',
    'Lift the 50-row cap + published_at DESC on direct lessons of /category/:id (R-CAT5) — the 6 book pages here '
    'receive direct rows + ~190 Q&A inserts whose old order exceeds the cap.',
    'Title+rabbi dedup must key on id once sort_order lands (R-SER4) — recorded-chapter (מוקלט) and ושננתם series '
    'in this scope have legitimate same-title rows, and this plan binds night-session copies instead of deleting.',
    'Audience guard on /lessons/:id + LessonDialog (R-LES1) so teachers rows never leak via direct URL — this plan '
    'retags only rows proven public-only by old ground truth.',
    'MERGE RE-RUN REQUIRED: this plan was generated after merge_check/APPLY-ORDER/CODE-SPEC were synthesized from '
    'the other 8 plans. Re-run merge_check.py including lessons_plan_neviim_rishonim.json (tmp namespace '
    'tmp_*_rish_*, references tree_plan tmp:<segment> containers) before applying — set_series_sort overlaps with '
    'tree_plan resolve per the existing policy (tree band semantics win).',
])

# ---------------- stats + parity simulation ----------------
ops_by_type = collections.Counter(o['op'] for o in ops)
parity = {}
thin_pages = []
for b in BOOKS:
    pages = [c for pth, c in page_cover.items() if c['book'] == b]
    rows = sum(c['rows'] for c in pages)
    cov = sum(c['covered'] for c in pages)
    exact = sum(1 for c in pages if c['covered'] == c['rows'])
    parity[BOOK_DISPLAY[b]] = {'pages_planned': len(pages), 'rows_total': rows, 'rows_covered_after_plan': cov,
                               'pages_exact_after_plan': exact,
                               'coverage_pct': round(100.0 * cov / rows, 1) if rows else 100.0}
for pth, c in sorted(page_cover.items()):
    if c['gap_titles']:
        thin_pages.append({'page': full_url(pth), 'old_rows': c['rows'], 'covered': c['covered'],
                           'gap_after_plan': c['gap_titles']})

stats_out = {
    'pages_in_scope': len(scope_pages),
    'pages_planned': len(page_cover),
    'alias_pages_skipped': len(skipped_alias),
    'duplicate_view_pages_skipped': len(skipped_dup_view),
    'old_item_rows_on_planned_pages': sum(c['rows'] for c in page_cover.values()),
    'matched_rows_on_planned_pages': sum(v['matched'] for v in per_book.values()),
    'ops_total': len(ops),
    'ops_by_type': dict(ops_by_type),
    'classification': dict(classification),
    'per_book': {BOOK_DISPLAY[b]: dict(per_book[b]) for b in BOOKS},
    'parity_simulation': parity,
    'golden_event_series': golden_rows,
    'thin_pages': thin_pages,
    'extras_bookkeeping': {k: v for k, v in stats.items() if k.startswith('extras_') or k.startswith('old_items_')},
}

meta = {
    'plan': 'lessons_plan_neviim_rishonim',
    'generated': datetime.datetime.now().isoformat(timespec='seconds'),
    'generated_by': 'scripts/gen_lessons_plan_neviim_rishonim.py',
    'scope': {
        'books': [BOOK_DISPLAY[b] for b in BOOKS],
        'source': 'old_listings_neviim_moadim.json',
        'pages_total': len(scope_pages),
        'pages_planned': len(page_cover),
        'alias_pages_skipped': len(skipped_alias),
        'duplicate_view_pages_skipped': [p for p, _o, _v in skipped_dup_view],
        'alias_note': "'כל-השיעורים-בספר-X' pages are flat aggregations; their new-UI equivalent is "
                      "/category/:bookId (code-level descendant aggregation). No ops emitted from them; "
                      "their items are covered via canonical pages.",
    },
    'method': [
        'Ground truth = old listing rows (old_listings_neviim_moadim.json) joined to match/item_match.json '
        '(deterministic global matcher, see match/MATCH-README.md).',
        'Page-to-series mapping = item_match mapped_series_id; draft 0-published placeholders remapped to their '
        'populated same-title twins (aharonim placeholder rule); the 12 containers missing from newdb are created '
        'by tree_plan and referenced here via its stable tmp:<old-url-segment> namespace (reference, not duplicate).',
        'Canonical home of an item = nearest existing listing page above its old href (alias segments stripped).',
        'Matched lesson already in page series = set_lesson_sort only. Synonym rule: identical normalized '
        '(title,rabbi) published row already in target series (night-session copies) = bind to it instead of '
        'moving/copying.',
        'Current placement old-justified (series documented by any old page / sidebar node / series card) = '
        'copy_lesson; unjustified = move_lesson. Target an ancestor of the current series = no op (new UI '
        'aggregates descendants).',
        'Unmatched old items: second-chance recovery (page-extras skeleton title, then global title index with '
        'rabbi-token containment) → bind; else insert_lesson at the canonical in-scope page (Rule 13: '
        'bneyzion.co.il-hosted media only into attachment_url_old with rehost:true; S3-bucket URLs kept direct); '
        'Q&A rows insert with source_type=qa + rabbi_page_item(kind=qa). Canonical out of scope = yoav_review '
        'cross_plan_dependency, no insert.',
        'Inbound cross-plan dependencies owned here: 5 moadim_misc lesson_ref_old rows (resolved to tmp inserts) '
        '+ aharonim "מגלות יהויכין עד חורבן הבית" (insert at מלכים-ב + copies to יחזקאל/ירמיהו rows 15/19).',
        'sort_order = the row position (order column) on its old page, unique per (lesson,series); '
        'set_series_sort = card position among series cards, emitted only from the series canonical parent page '
        'and only when not covered by tree_plan.',
        'Rabbi attribution: old non-empty vs new empty = set_lesson_rabbi(high); spelling variant '
        '(SequenceMatcher>0.85 on rabbi keys) = op(med); real conflict = yoav_review only. "(לנשים)" suffix '
        'stripped (old-site audience label).',
        'Extras policy (per task): draft only exact-dups of bound rows with clean FK (no lesson_topics links) and '
        'navigation artifacts; everything else kept published + flagged.',
        'normalize_he everywhere: NFC + niqqud strip + quote/separator strip + whitespace collapse + lowercase.',
    ],
    'ref_semantics': "ops may reference not-yet-existing rows: insert_lesson carries tmp_id (namespace "
                     "tmp_lesson_rish_NNN / tmp_qa_rish_NNN, plan-unique); later ops reference them via "
                     "lesson_ref. Containers created by tree_plan are referenced via series_ref 'tmp:<segment>' "
                     "(its stable namespace). Real rows use series_id/lesson_id UUIDs. series_ref on "
                     "set_lesson_sort disambiguates which copy of a copied lesson the sort applies to.",
    'cross_plan_inbound': inbound,
    'depends_on_tree_plan': sorted({t['ref'] for pth, t in tree_tmp.items()
                                    if book_of('https://www.bneyzion.co.il' + pth)}),
    'depends_on_code_spec': True,
    'post_merge_note': 'generated AFTER plans/merge_report.json + APPLY-ORDER.md — merge_check must be re-run '
                       'with this file included.',
}

plan = {'_meta': meta, 'ops': ops, 'yoav_review': yoav, 'code_asks': code_asks, 'stats': stats_out}

# ---------------- self-validation ----------------
defined_tmp = {o['tmp_id'] for o in ops if o['op'] == 'insert_lesson'}
tree_tmp_refs = {t['ref'] for t in tree_tmp.values()}
dangling = []
for o in ops:
    for fld in ('series_ref', 'to_series_ref'):
        v = o.get(fld)
        if isinstance(v, str):
            if v.startswith('tmp:'):
                if v not in tree_tmp_refs:
                    dangling.append((o['op'], fld, v))
            elif v.startswith('tmp_'):
                if v not in defined_tmp:
                    dangling.append((o['op'], fld, v))
            elif v.startswith('old_url:'):
                dangling.append((o['op'], fld, v))
            elif v not in series:
                dangling.append((o['op'], fld, v))
    v = o.get('lesson_ref')
    if isinstance(v, str) and v.startswith('tmp_') and v not in defined_tmp:
        dangling.append((o['op'], 'lesson_ref', v))
    v = o.get('lesson_id')
    if isinstance(v, str) and not v.startswith('tmp') and v not in lessons:
        dangling.append((o['op'], 'lesson_id', v))

sort_slots = collections.defaultdict(set)
sort_coll = []
for o in ops:
    if o['op'] == 'set_lesson_sort':
        key = (str(o.get('series_ref')), o['sort_order'])
        who = o.get('lesson_id') or o.get('lesson_ref')
        if key in sort_slots and who not in sort_slots[key]:
            sort_coll.append((key, who, sort_slots[key]))
        sort_slots[key].add(who)
ss_slots = collections.defaultdict(set)
ss_coll = []
for o in ops:
    if o['op'] == 'set_series_sort':
        sid = o.get('series_id') or o.get('series_ref')
        S = series.get(sid, {})
        parent = S.get('parent_id') or 'tmp'
        key = (parent, o['sort_order'])
        if key in ss_slots and sid not in ss_slots[key]:
            ss_coll.append((key, sid, ss_slots[key]))
        ss_slots[key].add(sid)

stats_out['self_validation'] = {
    'dangling_refs': len(dangling),
    'lesson_sort_collisions_same_scope': len(sort_coll),
    'series_sort_collisions_same_parent': len(ss_coll),
}

OUT.write_text(json.dumps(plan, ensure_ascii=False, indent=1))
print('WROTE', OUT, f'({OUT.stat().st_size:,} bytes)')
print('ops:', len(ops), '| yoav:', len(yoav), '| code_asks:', len(code_asks))
print('ops_by_type:', json.dumps(dict(ops_by_type), ensure_ascii=False))
print('classification:', json.dumps(dict(classification), ensure_ascii=False))
print('per_book:', json.dumps(stats_out['per_book'], ensure_ascii=False))
print('parity:', json.dumps(parity, ensure_ascii=False))
print('VALIDATION dangling:', len(dangling), dangling[:5])
print('VALIDATION lesson sort collisions:', len(sort_coll), sort_coll[:3])
print('VALIDATION series sort collisions:', len(ss_coll), ss_coll[:3])
print('golden rows:', len(golden_rows), '| exact:', sum(1 for g in golden_rows if g['exact_parity_after_plan']))
print('thin pages:', len(thin_pages))
