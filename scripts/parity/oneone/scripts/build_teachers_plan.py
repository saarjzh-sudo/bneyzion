#!/usr/bin/env python3
"""
build_teachers_plan.py — READ-ONLY plan builder for the teachers wing (1:1 vs old site).
Inputs:  oneone/old_teachers_tree.json, old_teachers_listings.json, match/item_match.json,
         match/tree_map.json, newdb_lessons.json, newdb_lessons_media.json, newdb_rabbis.json
Output:  oneone/plans/teachers_plan.json   (plan file only — no DB writes)
Re-runnable, deterministic.
"""
import json, re, unicodedata, urllib.parse
from collections import Counter, defaultdict
from datetime import date

P = '/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/oneone/'
OUT = P + 'plans/teachers_plan.json'

# ---------- normalization (same family as global_match.py) ----------
NIQQUD = re.compile('[֑-ׇ]')
SEPS = re.compile(r'[|–—\-_,:;!?()\[\]{}<>./]')
QUOTES = '״"\'׳`“”‘’'
HONORIFICS = {'הרב', 'רב', 'הרה"ג', 'ד"ר', 'דר', 'זצ"ל', 'שליט"א', 'הר"ב'}

def normalize_he(s):
    if not s:
        return ''
    s = unicodedata.normalize('NFC', s)
    s = NIQQUD.sub('', s)
    for q in QUOTES:
        s = s.replace(q, '')
    s = SEPS.sub(' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()

def rabbi_key(s):
    n = normalize_he(s)
    toks = [t for t in n.split() if t not in HONORIFICS]
    return ' '.join(sorted(toks))

def media_basename(url):
    if not url:
        return ''
    u = urllib.parse.unquote(str(url)).replace('+', ' ')
    u = unicodedata.normalize('NFC', u)
    return u.rstrip('/').split('/')[-1].casefold()

# ---------- load ----------
J = lambda f: json.load(open(P + f))
tt       = J('old_teachers_tree.json')
listings = J('old_teachers_listings.json')
im       = J('match/item_match.json')['teachers']
tree     = J('match/tree_map.json')
lessons  = {l['id']: l for l in J('newdb_lessons.json')}
media    = {m['id']: m for m in J('newdb_lessons_media.json')}
rabbis   = J('newdb_rabbis.json')

tree_nodes = tree['nodes'] if isinstance(tree, dict) and 'nodes' in tree else tree

def lesson_media_basenames(lid):
    out = set()
    l = lessons.get(lid) or {}
    for u in (l.get('attachment_url'),):
        if u: out.add(media_basename(u))
    m = media.get(lid) or {}
    for u in (m.get('legacy_attachment_url'), m.get('audio_url'), m.get('video_url')):
        if u: out.add(media_basename(u))
    for u in (m.get('additional_attachments') or []):
        if u: out.add(media_basename(u))
    return out

# rabbi index by normalized key
rabbi_idx = defaultdict(list)
for r in rabbis:
    rabbi_idx[rabbi_key(r['name'])].append(r)

def same_rabbi(a, b):
    """True if same person/creator, incl. short display aliases:
    'ושננתם' vs 'ושננתם - אוצר התורה' — token-subset either way."""
    ka, kb = rabbi_key(a), rabbi_key(b)
    if not ka or not kb:
        return False
    if ka == kb:
        return True
    sa, sb = set(ka.split()), set(kb.split())
    return sa <= sb or sb <= sa

OLD_CREATOR_NAMES = {c['title'] for c in json.load(open(P + 'old_teachers_tree.json'))['by_creator']}

def canonical_rabbi_name(author):
    """resolve a short old author form to the full rabbis.name when unambiguous;
    prefer the rabbis row whose name is one of the 31 old-sidebar creators."""
    ka = set(rabbi_key(author).split())
    if not ka:
        return author
    hits = [r for r in rabbis if ka <= set(rabbi_key(r['name']).split())]
    names = sorted({r['name'] for r in hits})
    if len(names) == 1:
        return names[0]
    sidebar = sorted(n for n in names if n in OLD_CREATOR_NAMES)
    return sidebar[0] if len(sidebar) == 1 else author

# ---------- cross-page reuse index (avoid duplicate inserts) ----------
# old item URL -> matched lesson_id, and (title_norm, rabbi_key) -> set(ids),
# built from EVERY matched occurrence across teachers + public listings.
url2id = {}
tk2ids = defaultdict(set)

def _index_page(old_items, match_items):
    mi = {i['idx']: i for i in (match_items or [])}
    for it in (old_items or []):
        m = mi.get(it.get('order_index'))
        lid = m.get('matched_lesson_id') if m else None
        if not lid:
            continue
        u = normalize_he(it.get('url') or '')
        if u:
            url2id.setdefault(u, lid)
        tk2ids[(normalize_he(it.get('title') or ''), rabbi_key(it.get('author') or ''))].add(lid)

def build_reuse_index():
    full_im = json.load(open(P + 'match/item_match.json'))
    # teachers facets
    for T, pg in listings['content_types'].items():
        _index_page(pg.get('items'), (full_im['teachers'].get(f'content_type::{T}') or {}).get('items'))
    for nm, pg in listings['creators'].items():
        _index_page(pg.get('items'), (full_im['teachers'].get(f'creator::{nm}') or {}).get('items'))
    for bk, pg in listings['by_book'].items():
        _index_page(pg.get('items'), (full_im['teachers'].get(f'by_book::{bk}') or {}).get('items'))
        for sub, spg in (pg.get('sub_series') or {}).items():
            _index_page(spg.get('items'), (full_im['teachers'].get(f'by_book::{bk}::{sub}') or {}).get('items'))
    # public listings (urls keyed)
    old_pub = {}
    for f in ('old_listings_torah_ketuvim.json', 'old_listings_neviim_moadim.json'):
        d = J(f)
        pages = d.get('pages') or {k: v for k, v in d.items() if k != '_meta'}
        if isinstance(pages, dict):
            for k, v in pages.items():
                if isinstance(v, dict) and 'items' in v:
                    old_pub[v.get('url') or k] = v
                elif isinstance(v, list):
                    for p2 in v:
                        if isinstance(p2, dict) and 'items' in p2:
                            old_pub[p2.get('url')] = p2
        elif isinstance(pages, list):
            for p2 in pages:
                if isinstance(p2, dict) and 'items' in p2:
                    old_pub[p2.get('url')] = p2
    for u, mp in full_im.get('listings', {}).items():
        op_ = old_pub.get(u) or old_pub.get(mp.get('url'))
        if op_:
            _index_page(op_.get('items'), mp.get('items'))

build_reuse_index()

# public lesson count per rabbi_id (non-teachers, published)
pub_count = Counter()
teach_count = Counter()
for l in lessons.values():
    if l['status'] != 'published':
        continue
    tags = l.get('audience_tags') or []
    if 'teachers' in tags:
        if l.get('rabbi_id'): teach_count[l['rabbi_id']] += 1
    else:
        if l.get('rabbi_id'): pub_count[l['rabbi_id']] += 1

ops, yoav, code_asks = [], [], []
stats = defaultdict(int)
tmp_n = 0
seen_field_ops = {}          # (lesson_id, field) -> value   (dedup + conflict detect)
seen_rabbi_ops = {}          # lesson_id -> rabbi_name
seen_retag = set()
seen_sort = set()            # avoid dup listing items

def add_op(o):
    ops.append(o)
    stats['ops_' + o['op']] += 1

def ev(old_url, detail):
    return {'old_url': old_url, 'detail': detail}

def add_update_field(lid, field, value, old_url, detail, confidence='high', extra=None):
    key = (lid, field)
    if key in seen_field_ops:
        if seen_field_ops[key] != value:
            yoav.append({'kind': 'conflicting_field_fix', 'lesson_id': lid, 'field': field,
                         'values': [seen_field_ops[key], value], 'old_url': old_url,
                         'note': 'same lesson gets two different values from two old pages — needs a human pick'})
        return
    seen_field_ops[key] = value
    o = {'op': 'update_lesson_field', 'lesson_id': lid, 'field': field, 'value': value,
         'evidence': ev(old_url, detail), 'confidence': confidence}
    if extra: o.update(extra)
    add_op(o)

def add_set_rabbi(lid, name, old_url, detail):
    if lid in seen_rabbi_ops:
        if rabbi_key(seen_rabbi_ops[lid]) != rabbi_key(name):
            yoav.append({'kind': 'conflicting_rabbi_fix', 'lesson_id': lid,
                         'values': [seen_rabbi_ops[lid], name], 'old_url': old_url,
                         'note': 'two old pages attribute this lesson to different authors'})
        return
    seen_rabbi_ops[lid] = name
    add_op({'op': 'set_lesson_rabbi', 'lesson_id': lid, 'rabbi_name': name,
            'evidence': ev(old_url, detail), 'confidence': 'high'})

def lesson_checks(lid, old_item, page_url, page_type=None):
    """data-fix ops for a matched lesson row; old wins on author/type/file."""
    l = lessons.get(lid)
    if not l:
        yoav.append({'kind': 'matched_id_not_in_dump', 'lesson_id': lid, 'old_url': page_url})
        return
    tags = l.get('audience_tags') or []
    if 'teachers' not in tags:
        if lid not in seen_retag:
            seen_retag.add(lid)
            add_op({'op': 'retag_lesson', 'lesson_id': lid,
                    'audience_tags': sorted(set(tags) | {'teachers'}),
                    'reason': 'row appears on an old teachers-wing listing page but lesson is not teachers-tagged',
                    'evidence': ev(page_url, f"old row: {old_item.get('title')}"), 'confidence': 'high'})
    if l.get('status') != 'published':
        add_update_field(lid, 'status', 'published', page_url,
                         f"old page lists this row ({old_item.get('title')}) but new status={l.get('status')}",
                         confidence='med')
    if page_type is not None and (l.get('content_type') or None) != page_type:
        add_update_field(lid, 'content_type', page_type, page_url,
                         f"old content-type page '{page_type}' lists this row; new content_type={l.get('content_type')!r}")
    author = (old_item.get('author') or '').strip()
    if author and not same_rabbi(author, l.get('rabbi_name') or ''):
        add_set_rabbi(lid, canonical_rabbi_name(author), page_url,
                      f"old listing author column='{author}' vs new rabbi_name={l.get('rabbi_name')!r} — old wins (known teachers-wing data debt)")
    dls = old_item.get('downloads') or []
    if dls:
        new_bn = lesson_media_basenames(lid)
        old_bn = {media_basename(d) for d in dls}
        if new_bn and old_bn and not (new_bn & old_bn):
            add_update_field(lid, 'attachment_url_old', dls[0], page_url,
                             f"old file {sorted(old_bn)} not among new media {sorted(new_bn)[:4]} — old file wins",
                             confidence='med', extra={'rehost': True,
                             'additional_attachments_old': dls[1:] if len(dls) > 1 else []})

def resolve_series_row(srow, page_url):
    """series-type row on a listing page -> series_id or None (+ tree_map fallback)."""
    sid = srow.get('matched_series_id')
    if sid:
        return sid, srow.get('method'), srow.get('score')
    href = normalize_he(srow.get('old_href') or '')
    for n in tree_nodes:
        if normalize_he(n.get('old_url') or '') == href and n.get('matched_series_id'):
            return n['matched_series_id'], 'tree_map:' + n.get('method', ''), n.get('score')
    return None, None, None

def new_tmp():
    global tmp_n
    tmp_n += 1
    return f't_teachers_{tmp_n:03d}'

def cross_page_lookup(it):
    """same old lesson matched on another page? -> (lesson_id, method) or (None, None)."""
    u = normalize_he(it.get('url') or '')
    if u and u in url2id:
        return url2id[u], 'cross_page_url'
    ids = tk2ids.get((normalize_he(it.get('title') or ''), rabbi_key(it.get('author') or '')))
    if ids and len(ids) == 1:
        return next(iter(ids)), 'cross_page_title_rabbi'
    if ids and len(ids) > 1:
        return None, 'cross_page_ambiguous'
    return None, None

tmp_registry = {}   # url_norm or (title_norm, rabbi_key) -> tmp_id (one insert per old item)

def insert_from_row(it, page_url, content_type=None):
    u = normalize_he(it.get('url') or '')
    tkey = (normalize_he(it.get('title') or ''), rabbi_key(it.get('author') or ''))
    prior = tmp_registry.get(u) or tmp_registry.get(tkey)
    if prior:
        return prior
    tmp = new_tmp()
    if u: tmp_registry[u] = tmp
    tmp_registry[tkey] = tmp
    dls = it.get('downloads') or []
    med = (it.get('media') or '').lower()
    source_type = 'audio' if med == 'audio' else ('video' if med in ('video', 'vimeo', 'youtube') else 'text')
    author = (it.get('author') or '').strip()
    payload = {'title': it['title'], 'rabbi_name': canonical_rabbi_name(author) if author else None,
               'series_ref': None, 'source_type': source_type, 'content_type': content_type,
               'audio_url': None, 'video_url': None,
               'attachment_url_old': dls[0] if dls else None,
               'additional_attachments_old': dls[1:] if len(dls) > 1 else [],
               'rehost': bool(dls),
               'bible_book': None, 'bible_chapter': None,
               'audience_tags': ['teachers'], 'status': 'published'}
    add_op({'op': 'insert_lesson', 'tmp_id': tmp, 'payload': payload, 'old_url': it.get('url') or page_url,
            'evidence': ev(page_url, f"old row #{it.get('order_index')} '{it['title']}' has no match in new DB"),
            'confidence': 'high' if dls else 'med'})
    return tmp

# =====================================================================
# 1. CONTENT-TYPE PAGES (22)
# =====================================================================
ct_order = [c['title'] for c in tt['by_content_type']]
ct_sidebar_counts = {c['title']: c['count'] for c in tt['by_content_type']}
ct_pages_stats = []
for T in ct_order:
    old_pg = listings['content_types'][T]
    mt = im.get(f'content_type::{T}') or {}
    mitems = {i['idx']: i for i in mt.get('items', [])}
    msers = {s['idx']: s for s in mt.get('sub_series_match', [])}
    n_rows = n_m = 0
    for it in sorted(old_pg['items'], key=lambda x: x['order_index']):
        oi = it['order_index']
        n_rows += 1
        if it['kind'] == 'series':
            srow = msers.get(oi) or {}
            sid, method, score = resolve_series_row({**it, **srow, 'old_href': it.get('url')}, old_pg['url'])
            if sid:
                n_m += 1
                k = ('content_type', T, 'series', sid)
                if k not in seen_sort:
                    seen_sort.add(k)
                    add_op({'op': 'teacher_listing_item', 'scope': 'content_type', 'key': T,
                            'kind': 'series', 'series_id': sid, 'sort_order': oi,
                            'evidence': ev(old_pg['url'], f"old row #{oi} series '{it['title']}' ({method})"),
                            'confidence': 'high' if (score or 0) >= 0.95 else 'med'})
            else:
                yoav.append({'kind': 'unmatched_series_row', 'page': f'content_type::{T}',
                             'old_url': it.get('url'), 'title': it['title'],
                             'note': 'series row on old content-type page with no new-DB series; container likely handled by tree_plan — do not invent here'})
        else:
            mi = mitems.get(oi) or {}
            lid = mi.get('matched_lesson_id')
            if lid:
                n_m += 1
                lesson_checks(lid, it, old_pg['url'], page_type=T)
                k = ('content_type', T, 'lesson', lid)
                if k not in seen_sort:
                    seen_sort.add(k)
                    l = lessons.get(lid) or {}
                    add_op({'op': 'teacher_listing_item', 'scope': 'content_type', 'key': T,
                            'kind': 'lesson', 'lesson_id': lid, 'sort_order': oi,
                            'standalone': not l.get('series_id'),
                            'evidence': ev(old_pg['url'], f"old row #{oi} '{it['title']}' ({mi.get('method')})"),
                            'confidence': 'high'})
            else:
                xid, xmethod = cross_page_lookup(it)
                if xid:
                    n_m += 1
                    lesson_checks(xid, it, old_pg['url'], page_type=T)
                    k = ('content_type', T, 'lesson', xid)
                    if k not in seen_sort:
                        seen_sort.add(k)
                        l = lessons.get(xid) or {}
                        add_op({'op': 'teacher_listing_item', 'scope': 'content_type', 'key': T,
                                'kind': 'lesson', 'lesson_id': xid, 'sort_order': oi,
                                'standalone': not l.get('series_id'),
                                'evidence': ev(old_pg['url'], f"old row #{oi} '{it['title']}' ({xmethod}: same old lesson matched on another page)"),
                                'confidence': 'high' if xmethod == 'cross_page_url' else 'med'})
                elif mi.get('candidates') or xmethod == 'cross_page_ambiguous':
                    cands = ([{'id': c['id'], 'title': c['title'], 'rabbi': c.get('rabbi')} for c in (mi.get('candidates') or [])[:5]]
                             or [{'id': i} for i in sorted(tk2ids.get((normalize_he(it.get('title') or ''), rabbi_key(it.get('author') or '')), []))[:5]])
                    yoav.append({'kind': 'ambiguous_item', 'page': f'content_type::{T}', 'old_url': it.get('url'),
                                 'title': it['title'], 'author': it.get('author'), 'candidates': cands,
                                 'note': 'matcher found several equal candidates — human pick, then add teacher_listing_item + content_type fix'})
                else:
                    tmp = insert_from_row(it, old_pg['url'], content_type=T)
                    add_op({'op': 'teacher_listing_item', 'scope': 'content_type', 'key': T,
                            'kind': 'lesson', 'lesson_ref': tmp, 'sort_order': oi,
                            'evidence': ev(old_pg['url'], f"old row #{oi} '{it['title']}' — inserted"), 'confidence': 'high'})
    ct_pages_stats.append({'type': T, 'old_rows': n_rows, 'resolved': n_m,
                           'sidebar_count_old': ct_sidebar_counts.get(T)})

# new-only content_type values (teacher lessons) — never shown on old sidebar
old_types = set(ct_order)
new_only = Counter()
for l in lessons.values():
    tags = l.get('audience_tags') or []
    if 'teachers' in tags and l['status'] == 'published':
        ctv = l.get('content_type')
        if ctv and ctv not in old_types:
            new_only[ctv] += 1
for ctv, n in new_only.most_common():
    yoav.append({'kind': 'new_only_content_type', 'content_type': ctv, 'n_lessons': n,
                 'note': 'content_type value exists only in new DB (not one of the 22 old types). Sidebar must render only the 22; decide whether to remap these lessons or leave them reachable via series/book pages only.'})

# =====================================================================
# 2. CREATORS (31)
# =====================================================================
creator_order = [c['title'] for c in tt['by_creator']]
creator_sidebar = {c['title']: c['count'] for c in tt['by_creator']}

# canonical mapping old creator name -> rabbi row (most-populated row wins deterministically)
creator_map = {}
for name in creator_order:
    hits = rabbi_idx.get(rabbi_key(name), [])
    if not hits:
        creator_map[name] = None
        continue
    if len(hits) > 1:
        hits = sorted(hits, key=lambda r: (-(r.get('lesson_count') or 0), r['id']))
    creator_map[name] = hits[0]

# duplicate/alias rabbis rows for the 31 creators -> merge into the canonical row.
# Safe rules only: (a) exact same normalized key (הרב עדי איצקוביץ ×2), or
# (b) token-subset alias where BOTH rows are content_creator (ושננתם ⊂ ושננתם - אוצר התורה).
# Subset between person rabbis is NOT merged (would wrongly merge an individual into a duo).
for name in creator_order:
    canon = creator_map.get(name)
    if not canon:
        continue
    for r2 in rabbis:
        if r2['id'] == canon['id'] or not same_rabbi(r2['name'], name):
            continue
        exact = rabbi_key(r2['name']) == rabbi_key(name)
        both_creators = r2['entity_type'] == 'content_creator' and canon['entity_type'] == 'content_creator'
        if exact or both_creators:
            add_op({'op': 'merge_rabbi', 'from_id': r2['id'], 'into_id': canon['id'],
                    'evidence': ev(f"https://www.bneyzion.co.il/מאגר-עזרי-הלמידה/יוצרים/?rav={name}",
                                   f"old sidebar has a single creator '{name}'; new DB also holds alias row '{r2['name']}' (lc={r2.get('lesson_count')}) vs canonical '{canon['name']}' (lc={canon.get('lesson_count')})"),
                    'confidence': 'high' if exact else 'med'})
        else:
            yoav.append({'kind': 'possible_alias_rabbi', 'creator': name,
                         'canonical_id': canon['id'], 'other_id': r2['id'], 'other_name': r2['name'],
                         'note': 'name-subset alias between non-creator rows — NOT merged automatically (could be an individual vs a duo); human decision'})

creators_meta = []
for name in creator_order:
    r = creator_map[name]
    if r is None:
        yoav.append({'kind': 'creator_missing_rabbi_row', 'creator': name,
                     'note': 'no rabbis row matches this old creator — needs create_rabbi (op defined in _meta.new_ops)'})
        add_op({'op': 'create_rabbi', 'tmp_id': new_tmp(), 'name': name,
                'entity_type': 'content_creator', 'status': 'active',
                'evidence': ev(f"https://www.bneyzion.co.il/מאגר-עזרי-הלמידה/יוצרים/?rav={name}",
                               'creator exists on old יוצרים sidebar but not in new rabbis table'),
                'confidence': 'high'})
        continue
    rid = r['id']
    pubn, tchn = pub_count.get(rid, 0), teach_count.get(rid, 0)
    creators_meta.append({'creator': name, 'rabbi_id': rid, 'entity_type': r['entity_type'],
                          'status': r['status'], 'public_lessons': pubn, 'teacher_lessons': tchn,
                          'sidebar_count_old': creator_sidebar[name]})
    if r['entity_type'] != 'content_creator':
        if pubn == 0:
            add_op({'op': 'set_entity_type', 'rabbi_id': rid, 'entity_type': 'content_creator',
                    'evidence': ev(f"https://www.bneyzion.co.il/מאגר-עזרי-הלמידה/יוצרים/?rav={name}",
                                   f'old creator; rabbi has 0 public lessons / {tchn} teacher lessons'),
                    'confidence': 'high'})
        else:
            yoav.append({'kind': 'dual_role_rabbi', 'creator': name, 'rabbi_id': rid,
                         'public_lessons': pubn, 'teacher_lessons': tchn,
                         'note': 'appears on old יוצרים sidebar AND has public lessons. Flipping entity_type to content_creator could drop him from the public /rabbis page. Recommend keeping entity_type=rabbi and including him in the creators tab via the fixed 31-name list (code_ask).'})
    if r['status'] == 'hidden':
        add_op({'op': 'update_rabbi_field', 'rabbi_id': rid, 'field': 'status', 'value': 'active',
                'evidence': ev(f"https://www.bneyzion.co.il/מאגר-עזרי-הלמידה/יוצרים/?rav={name}",
                               'creator is visible on the old site sidebar but rabbis.status=hidden in new DB'),
                'confidence': 'med'})
        yoav.append({'kind': 'hidden_creator_unhide', 'creator': name, 'rabbi_id': rid,
                     'note': 'status=hidden in new DB; old site shows the creator. Unhide is safe for /rabbis only if entity_type=content_creator (public RPC excludes creators); confirm.'})

# creator listing pages -> rabbi_page_item ops
creator_pages_stats = []
for name in creator_order:
    r = creator_map.get(name)
    rid = r['id'] if r else None
    old_pg = listings['creators'][name]
    mt = im.get(f'creator::{name}') or {}
    mitems = {i['idx']: i for i in mt.get('items', [])}
    msers = {s['idx']: s for s in mt.get('sub_series_match', [])}
    n_rows = n_m = 0
    for it in sorted(old_pg.get('items', []), key=lambda x: x['order_index']):
        oi = it['order_index']
        n_rows += 1
        if rid is None:
            continue
        if it['kind'] == 'series':
            srow = msers.get(oi) or {}
            sid, method, score = resolve_series_row({**it, **srow, 'old_href': it.get('url')}, old_pg['url'])
            if sid:
                n_m += 1
                add_op({'op': 'rabbi_page_item', 'rabbi_id': rid, 'kind': 'series', 'series_id': sid,
                        'sort_order': oi,
                        'evidence': ev(old_pg['url'], f"old creator row #{oi} series '{it['title']}' ({method})"),
                        'confidence': 'high' if (score or 0) >= 0.95 else 'med'})
            else:
                yoav.append({'kind': 'unmatched_series_row', 'page': f'creator::{name}',
                             'old_url': it.get('url'), 'title': it['title'],
                             'note': 'series row on old creator page with no new-DB series (tree_plan owns containers)'})
        else:
            mi = mitems.get(oi) or {}
            lid = mi.get('matched_lesson_id')
            if lid:
                n_m += 1
                lesson_checks(lid, it, old_pg['url'])  # no content_type forcing here
                add_op({'op': 'rabbi_page_item', 'rabbi_id': rid, 'kind': 'lesson', 'lesson_id': lid,
                        'sort_order': oi,
                        'evidence': ev(old_pg['url'], f"old creator row #{oi} '{it['title']}' ({mi.get('method')})"),
                        'confidence': 'high'})
            else:
                xid, xmethod = cross_page_lookup(it)
                if xid:
                    n_m += 1
                    lesson_checks(xid, it, old_pg['url'])
                    add_op({'op': 'rabbi_page_item', 'rabbi_id': rid, 'kind': 'lesson', 'lesson_id': xid,
                            'sort_order': oi,
                            'evidence': ev(old_pg['url'], f"old creator row #{oi} '{it['title']}' ({xmethod}: same old lesson matched on another page)"),
                            'confidence': 'high' if xmethod == 'cross_page_url' else 'med'})
                elif mi.get('candidates') or xmethod == 'cross_page_ambiguous':
                    cands = ([{'id': c['id'], 'title': c['title'], 'rabbi': c.get('rabbi')} for c in (mi.get('candidates') or [])[:5]]
                             or [{'id': i} for i in sorted(tk2ids.get((normalize_he(it.get('title') or ''), rabbi_key(it.get('author') or '')), []))[:5]])
                    yoav.append({'kind': 'ambiguous_item', 'page': f'creator::{name}', 'old_url': it.get('url'),
                                 'title': it['title'], 'author': it.get('author'), 'candidates': cands,
                                 'note': 'human pick, then rabbi_page_item'})
                else:
                    tmp = insert_from_row(it, old_pg['url'])
                    add_op({'op': 'rabbi_page_item', 'rabbi_id': rid, 'kind': 'lesson', 'lesson_ref': tmp,
                            'sort_order': oi,
                            'evidence': ev(old_pg['url'], f"old creator row #{oi} '{it['title']}' — inserted"),
                            'confidence': 'high'})
    creator_pages_stats.append({'creator': name, 'rabbi_id': rid, 'old_rows': n_rows, 'resolved': n_m,
                                'sidebar_count_old': creator_sidebar[name]})

# old-site bugs in creators (policy: do NOT replicate bugs)
bsh = creator_map.get('הרב יהודה בשושה')
yoav.append({'kind': 'old_site_bug_empty_creator_page', 'creator': 'הרב יהודה בשושה',
             'rabbi_id': bsh['id'] if bsh else None,
             'old_rows': 0, 'sidebar_count_old': 18,
             'teacher_lessons_in_newdb': teach_count.get(bsh['id'], 0) if bsh else None,
             'note': "old creator page renders an empty table (verified: header row only) while the sidebar says 18 — old CMS bug. Per policy we do NOT replicate: the new creator page should fall back to the rabbi's actual teacher content when no rabbi_page_items exist (code_ask #7). Yoav to confirm."})
yoav.append({'kind': 'old_count_anomaly', 'creator': "הרב מאיר הילביץ'",
             'note': 'old sidebar count=3 but the page renders 5 rows (3x rule inverted). Plan follows the page rows (5 rabbi_page_item ops).'})
yoav.append({'kind': 'old_count_anomaly', 'creator': 'הרב עמנואל בן ארצי',
             'note': 'old sidebar count=18 but the page renders 48 rows. Plan follows the page rows.'})
yoav.append({'kind': 'sidebar_counts_3x_bug', 'scope': 'teachers sidebar (content types + creators)',
             'note': 'old sidebar counts are ~3x the real distinct rows (CMS bug, 16/22 content types exactly 3.0x). The new site shows REAL counts — sane behavior, intentionally NOT replicating the bug.'})
yoav.append({'kind': 'newdb_teacher_surplus', 'old_unique_lessons_on_listings': listings['summary']['unique_lesson_urls_across_all_listings'],
             'newdb_teacher_published_lessons': sum(1 for l in lessons.values() if l['status'] == 'published' and 'teachers' in (l.get('audience_tags') or [])),
             'note': 'new DB holds ~5.3K teacher lessons vs ~1.0K unique lessons itemized on old listing pages — the rest live inside book/series pages (old pages list series cards, not every member). NOT extras to delete; the explicit teacher_listing_items model keeps content-type pages 1:1 without destructive ops.'})

# =====================================================================
# 3. BY-BOOK facet — verification + reference to tree_plan
# =====================================================================
def walk(nodes, depth=1, acc=None):
    if acc is None: acc = Counter()
    for n in nodes:
        acc[depth] += 1
        walk(n.get('children', []), depth + 1, acc)
    return acc

bb_depths = walk(tt['by_book'])
tb_nodes = [n for n in tree_nodes if n.get('source') == 'teachers_by_book']
tb_unmatched = [n for n in tb_nodes if not n.get('matched_series_id') and n.get('node_kind') not in ('external_link',)]
by_book_verify = {
    'old_tree_counts': {'top_level': bb_depths.get(1, 0), 'books_level2': bb_depths.get(2, 0),
                        'collections_level3plus': sum(v for k, v in bb_depths.items() if k >= 3)},
    'expected_per_task': {'top': 5, 'books': 35, 'collections': 69},
    'tree_map_teachers_by_book': {'nodes': len(tb_nodes),
                                  'matched': sum(1 for n in tb_nodes if n.get('matched_series_id')),
                                  'unmatched': len(tb_unmatched)},
    'unmatched_nodes_owned_by_tree_plan': [
        {'old_url': n['old_url'], 'title': n['old_title'], 'kind': n.get('node_kind')} for n in tb_unmatched],
    'reference': 'plans/tree_plan.json owns create_series/reparent for the by-book containers (incl. the 48 per-parsha nodes + פרשת השבוע top). This plan emits NO duplicate structural ops for by_book.',
    'note_parsha': 'the 48 unmatched nodes are per-parsha containers (תורה/<ספר>/פרשת-X). The new wing already has code-level parasha routes (/teachers/parasha/:book/:parasha, title matching). tree_plan decides: create real series vs keep the code-level filter; either way the sidebar must show the parsha entries per book in old order.'
}

# =====================================================================
# 4. code_asks
# =====================================================================
code_asks = [
    {'id': 'CA1', 'status': 'verified_done',
     'ask': 'Sidebar tabs must be exactly ראשי (לפי ספר) / סוג תוכן / יוצרים.',
     'where': 'src/components/teachers/TeacherSidebar.tsx:539-541,682-684',
     'note': 'already renamed (ד2) — keep as is.'},
    {'id': 'CA2', 'status': 'verified_done',
     'ask': 'Remove the in-page FilterPanel from the teachers wing.',
     'where': 'src/pages/teachers/TeachersSeriesPage.tsx (ד1 — replaced by SimpleSearchBar)',
     'note': 'only remaining reference is the preview-only src/pages/DesignPreviewTeacherSeriesPage.tsx — clean or ignore.'},
    {'id': 'CA3', 'status': 'required',
     'ask': "NEW TABLE teacher_listing_items(scope text, key text, kind text check in ('series','lesson'), series_id uuid null, lesson_id uuid null, sort_order int) — drives /teachers/content-type/:type 1:1. Page = rows where scope='content_type' AND key=:type, ordered by sort_order, rendering series rows as series cards (link to /teachers/series/:id) and lesson rows as lesson rows (modal).",
     'why': "old content-type pages interleave series cards and lesson rows in a fixed server order; 73% of the lesson rows (610/838) are series members, so the single lessons.sort_order int CANNOT express both the in-series order (owned by the series/listings plans) and the content-type page order. A scoped item table is the only conflict-free 1:1 representation. This replaces the task's provisional 'lessons.sort_order scoped by content_type' idea — documented here per instruction.",
     'where': 'replaces useTeacherContentTypeContent flat title-ordered dump (src/hooks/useTeacherBookContent.ts:191-258)'},
    {'id': 'CA4', 'status': 'required',
     'ask': 'Sidebar סוג תוכן tab: render exactly the 22 old content types, in the old order (list below), with REAL counts = number of teacher_listing_items rows per type (NOT raw count of all teacher lessons with that content_type, and NOT the old 3x-inflated sidebar numbers).',
     'content_type_order': ct_order,
     'where': 'src/components/teachers/TeacherSidebar.tsx:41-79 (current raw REST count of ALL published teacher lessons per content_type — shows 25+ types incl. new-only מבחן/מפות וציר זמן/מדריכי הוראה and inflated numbers)'},
    {'id': 'CA5', 'status': 'required',
     'ask': 'Sidebar יוצרים tab: render exactly the 31 old creators, in the old sidebar order (he-alphabetical list below), sourced from the fixed rabbi-id list (rabbi_page_items presence / the mapping in stats.creators), NOT derived by lesson_count desc from teacher-tagged series. Counts = real distinct rows on the creator page.',
     'creator_order': creator_order,
     'where': 'src/hooks/useTeacherSidebar.ts:236-260 (current: distinct rabbi_id of teacher series, order lesson_count desc)'},
    {'id': 'CA6', 'status': 'required',
     'ask': 'The creators-tab query must include dual-role rabbis (entity_type=rabbi with public content, e.g. הרב יורם אליהו) and content_creators regardless of rabbis.status used for the public /rabbis page; do not filter the 31-list by entity_type.',
     'where': 'src/hooks/useTeacherSidebar.ts'},
    {'id': 'CA7', 'status': 'required',
     'ask': '/teachers/creator/:id must render from rabbi_page_items (kind+sort_order: series rows as cards, lesson rows as modal rows) instead of raw lessons?rabbi_id=eq&order=title; FALLBACK: when a creator has zero rabbi_page_items rows (only הרב יהודה בשושה — old page is an empty-table CMS bug), render his actual teacher-tagged content (sane behavior per policy, see yoav_review).',
     'where': 'src/hooks/useTeacherBookContent.ts:288-358 (useTeacherCreatorContent)'},
    {'id': 'CA8', 'status': 'required',
     'ask': 'Popup (TeacherLessonModal) must show the FULL lesson content text plus the attachment download button on every entry point (content-type page, creator page, book page, series page) — no excerpt truncation; fetch full content lazily by lesson id if the listing query omits it.',
     'where': 'src/components/teachers/TeacherLessonModal.tsx + all useTeacher* hooks'},
    {'id': 'CA9', 'status': 'required',
     'ask': '/teachers/series/:id must filter lessons to status=published and keep the wing chrome only for teachers-audience series (guard against public/draft leakage, R-TCH4); order within series comes from lessons.sort_order (set by the series/listings plans), fallback title.',
     'where': 'src/pages/teachers/TeachersSeriesPage.tsx:69-126'},
    {'id': 'CA10', 'status': 'reference',
     'ask': 'By-book facet: structural ops (books/collections/per-parsha containers) are owned by plans/tree_plan.json — teachers sidebar ראשי tab must render that tree in old order (order_index), not the current bible_book+title-match bucketing with 500/300 caps (R-TCH1/R-TCH3).',
     'where': 'src/hooks/useTeacherSidebar.ts:97-176'},
]

# =====================================================================
# stats + write
# =====================================================================
op_counts = Counter(o['op'] for o in ops)
plan = {
    '_meta': {
        'generated_by': 'scripts/build_teachers_plan.py',
        'generated_at': str(date.today()),
        'stage': 'plan-only (READ-ONLY; no DB writes)',
        'targets': 'teachers wing 1:1 vs old_teachers_tree.json + old_teachers_listings.json',
        'normalization': 'normalize_he: NFC + strip niqqud 0591-05C7 + drop quote family + separators->space + collapse ws + lowercase; rabbi keys drop honorifics + token-sort; media compared by percent-decoded NFC casefolded basename',
        'new_ops': {
            'update_lesson_field': '{lesson_id, field, value[, rehost, additional_attachments_old]} — generic single-field fix (content_type / status / attachment_url_old). attachment_url_old + rehost:true == Rule 13: apply stage must rehost any bneyzion.co.il media to Storage.',
            'teacher_listing_item': "{scope:'content_type', key, kind:'series'|'lesson', series_id|lesson_id|lesson_ref(tmp), sort_order} — row of a content-type page in exact old order; requires table per code_ask CA3. Used instead of set_lesson_sort because 610/838 rows are series members (single sort_order column would clash with in-series order).",
            'create_rabbi': '{tmp_id, name, entity_type, status} — only if a creator has no rabbis row (currently: none needed, kept for completeness)',
            'update_rabbi_field': '{rabbi_id, field, value} — unhide creators that are visible on the old site',
        },
        'policy': 'never delete; old-site bugs not replicated (empty בשושה page, 3x sidebar counts); doubt -> yoav_review; old wins on author/file disagreements (known teachers-wing data debt per Saar).',
    },
    'ops': ops,
    'yoav_review': yoav,
    'code_asks': code_asks,
    'by_book_verification': by_book_verify,
    'stats': {
        'op_counts': dict(op_counts),
        'total_ops': len(ops),
        'content_type_pages': ct_pages_stats,
        'creators': creators_meta,
        'creator_pages': creator_pages_stats,
        'old_rows': {'content_type_lesson_rows': sum(1 for T in ct_order for i in listings['content_types'][T]['items'] if i['kind'] != 'series'),
                     'content_type_series_rows': sum(1 for T in ct_order for i in listings['content_types'][T]['items'] if i['kind'] == 'series'),
                     'creator_rows_total': sum(len(listings['creators'][n].get('items', [])) for n in creator_order)},
        'yoav_review_items': len(yoav),
    },
}
json.dump(plan, open(OUT, 'w'), ensure_ascii=False, indent=1)
print('WROTE', OUT)
print('total ops:', len(ops))
for k, v in sorted(op_counts.items()):
    print(f'  {k}: {v}')
print('yoav_review:', len(yoav))
print('by_book:', by_book_verify['old_tree_counts'], '| tree_map:', by_book_verify['tree_map_teachers_by_book'])
