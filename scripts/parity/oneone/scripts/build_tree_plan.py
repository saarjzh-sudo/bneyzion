#!/usr/bin/env python3
"""
build_tree_plan.py — generates plans/tree_plan.json (READ-ONLY planning stage).

Goal: ops that make the rendered PUBLIC sidebar tree IDENTICAL to old_sidebar_tree.json
(13 top categories, exact order, exact children, max depth 3) + align the teachers
by_book tree (old_teachers_tree.json), using match/tree_map.json.

Key conventions chosen (documented in the plan's _meta and code_asks):
- SIDEBAR BAND: series.sort_order 1..99 = "this row is a sidebar child at this old
  position (1-based, counting REAL series siblings only — alias slots are rendered by
  code at their recorded position)". sort_order 0/null = not in the sidebar (but
  accessible on /category and /series pages). sort_order >=100 = junk/extra rows
  parked at the end (kept accessible, never rendered in the sidebar).
  This is required because the old site distinguishes nav-membership from
  page-membership: e.g. בראשית book page lists ~35 series while the old sidebar
  shows only 13 children. The 238 public "extra" children under matched parents are
  REAL old page content — they keep their parent and stay out of the band.
- status: depth-1 roots = 'category'; books (depth-2 under תורה/נביאים/כתובים) with
  children = 'category' (the Neviim sidebar query REQUIRES category); leaf books keep
  whatever visible status they have (active/published/category), draft -> promoted;
  collections / event-series = 'active' or 'published' (promote draft/category).
- audience: public tree rows -> ['general'] (exceptions: dual-use rows wired into the
  teachers wing by hard-coded UUID are left as-is and flagged).
"""
import json, re, unicodedata, sys, os
from collections import OrderedDict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../oneone

def load(name):
    with open(os.path.join(BASE, name), encoding='utf-8') as f:
        return json.load(f)

NIQQUD = re.compile('[֑-ׇ]')
PUNCT = re.compile(r'[״"\'׳`|–—\-_,:;!?()\[\]{}<>./]')
def norm(s):
    if not s: return ''
    s = unicodedata.normalize('NFC', s)
    s = NIQQUD.sub('', s)
    s = PUNCT.sub(' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()

old_tree = load('old_sidebar_tree.json')['tree']
teachers_tree = load('old_teachers_tree.json')['by_book']
tree_map = load('match/tree_map.json')['nodes']
allseries = load('newdb_series.json')
series = {r['id']: r for r in allseries}
db_children = {}
for r in allseries:
    db_children.setdefault(r['parent_id'], []).append(r)

tm_by_key = {(n['source'], n['old_url']): n for n in tree_map}

# ---- hard-coded UI root UUIDs (src/hooks/useContentSidebar.ts / useTeacherSidebar.ts) ----
ROOT = {
    'torah':        'bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b',
    'neviim':       'a0472c9f-8212-44ff-8937-ace5fea4b4dc',
    'ketuvim':      '5cdd770c-9593-4b0d-9f9e-cda50cf5ef41',
    'howToLearn':   '62590949-6187-4e17-b84d-65a518467521',
    'generalTopics':'2d6d28c1-3c5c-4d61-9283-410bc56cd351',
    'moadim':       '92130154-e96a-4f98-b032-5a20ac385f63',
    'haftarot':     '3327c721-7bc9-471c-878f-0b3aef98b090',
    'yemeiIyun':    'f4040001-0001-4000-8000-000000000000',
    'tools':        '27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7',
    'livuyTatim':   '7cbd261e-03b0-43da-a708-e8ae4402105f',
    'riddles':      'c852edd8-d959-4c8d-bf7e-17b5881275fa',
    'maps':         '4d78557b-da8b-4b1f-8d8e-09d74ff3070a',
    'howToTeach':   '26e30725-d5d0-4d88-8f73-f7a279801241',
    'teachersRoot': '6bfb7aaa-cd9e-4562-b087-a37fcc24d295',
}
MEKOROT_ROOT = '68582fdf-9d89-4327-9d50-a87147604103'  # מקורות על חשיבות לימוד תנ"ך (junk root with the real content)
MEKOROT_EMPTY = 'e577cd74'  # אוסף מקורות... draft empty placeholder (prefix, resolved below)
# resolve full id of the draft placeholder
MEKOROT_EMPTY = next(i for i in series if i.startswith('e577cd74'))

# rows wired into the teachers wing by hard-coded UUID -> never touch audience
DUAL_USE_KEEP_AUDIENCE = {ROOT['livuyTatim'], ROOT['maps'], ROOT['howToTeach']}

ops = []
yoav = []
code_asks = []
decisions = []   # every junk/extra placement decision, as required by the task
counters = dict(matched=0, created=0, reparented=0, resorted=0, status_fixed=0,
                audience_fixed=0, alias_links=0, extras_public=0, extras_teachers=0,
                extras_draft=0, extras_dup=0)

def ev(old_url, detail):
    return {'old_url': old_url, 'detail': detail}

def add(op):
    ops.append(op)

# ---------- pass 0: depth-1 special handling ----------
TOP_OVERRIDE = {
    norm('איך לומדים תנ"ך'): ROOT['howToLearn'],
}
STANDALONE_LINKS = {
    norm('ניווט באתר לפי ספר ופרק'): '/bible (book-and-chapter navigation index; ADD the index route — only /bible/:book exists today)',
    norm('פרשת השבוע'): '/parasha',
}

# ---------- target assignment for the public sidebar ----------
# returns (target_series_id | ('tmp', tmp_id) | None-for-alias/link, kind)
assigned = {}          # old_url -> target ref ('id' or 'tmp:..')
used_targets = {}      # series_id -> old_url (collision guard)
creates = []

def slug_of(url):
    parts = [p for p in url.strip('/').split('/') if p]
    return 'tmp:' + parts[-1][:80]

def is_alias_node(entry, node):
    if entry['node_kind'] == 'alias':
        return True
    # pseudo-aliases the matcher left as collections/event_series but are "all lessons of the section" links
    if entry['matched_series_id'] is None and norm(node['title']).startswith('כל '):
        return True
    return False

def bible_book_for(path_titles):
    # nearest ancestor that is a book under תורה/נביאים/כתובים
    if len(path_titles) >= 2 and norm(path_titles[0]) in (norm('תורה'), norm('נביאים'), norm('כתובים')):
        b = path_titles[1]
        if norm(b) == norm('עזרא ונחמיה'):
            return None
        return b
    return None

alias_slots = []   # collected for code_asks

def assign(node, depth, parent_url, parent_ref, path_titles, pos_real, pos_all):
    """pos_real = 1-based index among REAL (non-alias) siblings; pos_all = 1-based among all entries."""
    entry = tm_by_key[('sidebar', node['url'])]
    key = norm(node['title'])

    if depth == 1 and key in STANDALONE_LINKS:
        code_asks.append({
            'ask': 'standalone_sidebar_link',
            'label': node['title'], 'position_top': pos_all,
            'target_route': STANDALONE_LINKS[key],
            'evidence': ev(node['url'], 'old depth-1 entry is a plain link, no series semantics'),
        })
        counters['alias_links'] += 1
        return None

    if is_alias_node(entry, node):
        alias_slots.append({
            'label': node['title'],
            'parent_old_url': parent_url,
            'parent_ref': parent_ref,
            'position_among_all_siblings': pos_all,
            'old_url': node['url'],
        })
        counters['alias_links'] += 1
        if entry['node_kind'] != 'alias':
            yoav.append({
                'topic': 'pseudo-alias reclassified',
                'detail': f"old node '{node['title']}' ({node['url']}) was unmatched; it is a 'all lessons of the section' link — rendered as a code link to /category/{parent_ref}, no series row created.",
            })
        return None

    # explicit overrides
    target = None
    if depth == 1 and key in TOP_OVERRIDE:
        target = TOP_OVERRIDE[key]
    elif key == norm('אוסף מקורות על חשיבות לימוד תנ"ך'):
        target = MEKOROT_ROOT   # consume the junk root that holds the real content
    elif entry['matched_series_id']:
        target = entry['matched_series_id']

    if target and target in used_targets:
        yoav.append({
            'topic': 'match collision',
            'detail': f"series {target} already assigned to {used_targets[target]}; old node '{node['title']}' ({node['url']}) needs its own row -> created instead.",
        })
        target = None

    if target:
        used_targets[target] = node['url']
        assigned[node['url']] = target
        counters['matched'] += 1
        return target

    # create
    tmp = slug_of(node['url'])
    # ensure unique tmp ids
    base_tmp, k = tmp, 2
    existing = {c['tmp_id'] for c in creates}
    while tmp in existing:
        tmp = f'{base_tmp}~{k}'; k += 1
    has_children_real = any(not is_alias_node(tm_by_key[('sidebar', c['url'])], c) for c in node['children'])
    status = 'category' if (depth == 1 or (entry['node_kind'] == 'book' and node['children'])) else 'active'
    creates.append({'tmp_id': tmp})
    conf = 'high'
    note = ''
    if entry['node_kind'] == 'empty':
        conf = 'med'
        note = ' (old listing page had 0 items — label parity only)'
        yoav.append({'topic': 'empty old node created',
                     'detail': f"'{node['title']}' ({node['url']}) is shown in the old sidebar but its old page lists 0 items. Created as an empty active series for label parity — confirm or demote."})
    add({
        'op': 'create_series', 'tmp_id': tmp, 'title': node['title'],
        'parent_ref': parent_ref, 'status': status,
        'audience_tags': ['general'], 'sort_order': pos_all if depth == 1 else pos_real,
        'bible_book': bible_book_for(path_titles),
        'evidence': ev(node['url'], f"old sidebar node (kind={entry['node_kind']}, depth={depth}) with no counterpart in newdb{note}"),
        'confidence': conf,
    })
    counters['created'] += 1
    assigned[node['url']] = tmp
    return tmp

# ---------- walk the public tree ----------
TOP_POSITIONS = {}  # depth-1 sort_order among the 13
def walk_assign(nodes, depth, parent_url, parent_ref, path_titles):
    pos_real = 0
    for pos_all, node in enumerate(nodes, start=1):
        entry = tm_by_key[('sidebar', node['url'])]
        alias = is_alias_node(entry, node) or (depth == 1 and norm(node['title']) in STANDALONE_LINKS)
        if not alias:
            pos_real += 1
        ref = assign(node, depth, parent_url, parent_ref, path_titles, pos_real, pos_all)
        if depth == 1:
            TOP_POSITIONS[node['url']] = pos_all
        if ref and node['children']:
            walk_assign(node['children'], depth + 1, node['url'], ref, path_titles + [node['title']])

walk_assign(old_tree, 1, None, None, [])

# ---------- pass 2: ops for matched nodes (parent / sort / status / audience) ----------
def expected_status(entry, node, depth, cur):
    kind = entry['node_kind']
    if depth == 1:
        return 'category'
    if kind == 'book':
        if node['children']:
            return 'category'
        # leaf book: Neviim books MUST be category for the sidebar query; others keep visible status
        if norm(node.get('_top','')) == norm('נביאים'):
            return 'category'
        return cur if cur in ('active', 'published', 'category') else 'active'
    # collection / event_series / empty
    return cur if cur in ('active', 'published') else 'active'

def visit_ops(nodes, depth, parent_url, parent_ref, top_title):
    pos_real = 0
    for node in nodes:
        entry = tm_by_key[('sidebar', node['url'])]
        node['_top'] = top_title or node['title']
        alias = is_alias_node(entry, node) or (depth == 1 and norm(node['title']) in STANDALONE_LINKS)
        if not alias:
            pos_real += 1
        ref = assigned.get(node['url'])
        if ref and not ref.startswith('tmp:'):
            cur = series[ref]
            exp_parent = None if depth == 1 else parent_ref
            # parent
            cur_parent = cur['parent_id']
            if depth == 1:
                if cur_parent is not None:
                    add({'op': 'reparent_series', 'series_id': ref, 'new_parent_ref': None,
                         'evidence': ev(node['url'], f"'{node['title']}' is a top-level sidebar category on the old site; currently nested under {cur_parent}"),
                         'confidence': 'high'})
                    counters['reparented'] += 1
            else:
                exp = parent_ref if not str(parent_ref).startswith('tmp:') else parent_ref
                if str(exp).startswith('tmp:'):
                    if True:  # parent will be created; emit reparent against tmp ref
                        if cur_parent != exp:
                            add({'op': 'reparent_series', 'series_id': ref, 'new_parent_ref': exp,
                                 'evidence': ev(node['url'], f"old parent '{parent_url}' is a created node"),
                                 'confidence': 'high'})
                            counters['reparented'] += 1
                elif cur_parent != exp:
                    add({'op': 'reparent_series', 'series_id': ref, 'new_parent_ref': exp,
                         'evidence': ev(node['url'], f"old sidebar places '{node['title']}' under '{parent_url}' (-> {exp}); currently under {cur_parent}"),
                         'confidence': 'high'})
                    counters['reparented'] += 1
            # sort (sidebar band)
            want_sort = TOP_POSITIONS[node['url']] if depth == 1 else pos_real
            if cur['sort_order'] != want_sort:
                add({'op': 'set_series_sort', 'series_id': ref, 'sort_order': want_sort,
                     'evidence': ev(node['url'], f"old sibling position {want_sort} (1-based among real series siblings{' / top-level among 13' if depth==1 else ''}); current sort_order={cur['sort_order']}"),
                     'confidence': 'high'})
                counters['resorted'] += 1
            # status + audience
            fields = {}
            exp_status = expected_status(entry, node, depth, cur['status'])
            if cur['status'] != exp_status:
                fields['status'] = exp_status
            tags = sorted(cur['audience_tags'] or [])
            if tags != ['general'] and ref not in DUAL_USE_KEEP_AUDIENCE:
                fields['audience_tags'] = ['general']
            if ref == MEKOROT_ROOT and norm(cur['title']) != norm(node['title']):
                fields['title'] = node['title']
            if fields:
                conf = 'high'
                if 'title' in fields: conf = 'med'
                if 'audience_tags' in fields and 'teachers' in (cur['audience_tags'] or []):
                    conf = 'med'
                    yoav.append({'topic': 'audience retag on public node',
                                 'detail': f"'{cur['title']}' ({ref}) is in the old PUBLIC sidebar but tagged {cur['audience_tags']} in newdb -> set to ['general']. Confirm it is not needed by the teachers wing."})
                add({'op': 'update_series', 'series_id': ref, 'fields': fields,
                     'evidence': ev(node['url'], f"target state per old sidebar (kind={entry['node_kind']}, depth={depth}); current status={cur['status']}, audience={cur['audience_tags']}"),
                     'confidence': conf})
                counters['status_fixed'] += 1 if 'status' in fields else 0
                counters['audience_fixed'] += 1 if 'audience_tags' in fields else 0
        if node['children'] and ref:
            visit_ops(node['children'], depth + 1, node['url'], ref, node['_top'])

visit_ops(old_tree, 1, None, None, None)

# ---------- pass 3: extras under matched parents ----------
def expected_children_ids(node):
    out, titles = set(), set()
    for c in node['children']:
        r = assigned.get(c['url'])
        if r and not r.startswith('tmp:'):
            out.add(r)
        titles.add(norm(c['title']))
    return out, titles

extra_public_rows = []
def scan_extras(nodes, depth):
    for node in nodes:
        ref = assigned.get(node['url'])
        if ref and not ref.startswith('tmp:') and node['children']:
            exp_ids, exp_titles = expected_children_ids(node)
            for db in db_children.get(ref, []):
                if db['id'] in exp_ids:
                    continue
                tags = db['audience_tags'] or []
                if 'teachers' in tags:
                    counters['extras_teachers'] += 1
                elif db['status'] == 'draft':
                    counters['extras_draft'] += 1
                elif norm(db['title']) in exp_titles:
                    counters['extras_dup'] += 1
                else:
                    counters['extras_public'] += 1
                    extra_public_rows.append({'parent_old_url': node['url'], 'parent_ref': ref,
                                              'series_id': db['id'], 'title': db['title'],
                                              'status': db['status'], 'sort_order': db['sort_order'],
                                              'lesson_count': db['lesson_count']})
                    # only force out of the sidebar band if it currently sits inside it
                    if db['sort_order'] and 1 <= db['sort_order'] <= 99:
                        add({'op': 'set_series_sort', 'series_id': db['id'], 'sort_order': 0,
                             'evidence': ev(node['url'], f"'{db['title']}' is NOT an old sidebar child of '{node['title']}' but its sort_order={db['sort_order']} sits inside the sidebar band 1..99 -> move to 0 (page-only)"),
                             'confidence': 'med'})
                        counters['resorted'] += 1
        if node['children']:
            scan_extras(node['children'], depth + 1)

scan_extras(old_tree, 1)

decisions.append({
    'decision': 'page-only children stay under their parent, OUT of the sidebar band',
    'detail': f"{counters['extras_public']} public series under matched parents are not old-sidebar children but ARE real old page content (e.g. 'מאמרים - חומש בראשית' is on the old בראשית book page). They keep parent + sort_order outside 1..99 (band rule in code_asks). Per-page ordering belongs to the listings plan.",
    'confidence': 'high',
})

# ---------- pass 4: junk roots / known stray nodes ----------
ISAIAH_BOOK = tm_by_key[('sidebar', '/מאגר-השיעורים-והמאמרים/נביאים/ישעיהו/')]['matched_series_id']

def junk(series_id, new_parent, sort_order, why, old_url, conf='med', extra_fields=None, keep_status_note=None):
    cur = series[series_id]
    if cur['parent_id'] != new_parent:
        add({'op': 'reparent_series', 'series_id': series_id, 'new_parent_ref': new_parent,
             'evidence': ev(old_url, why), 'confidence': conf})
        counters['reparented'] += 1
    if cur['sort_order'] != sort_order:
        add({'op': 'set_series_sort', 'series_id': series_id, 'sort_order': sort_order,
             'evidence': ev(old_url, why + ' — parked at sort>=100 (out of the sidebar band, end of category page)'),
             'confidence': conf})
        counters['resorted'] += 1
    if extra_fields:
        add({'op': 'update_series', 'series_id': series_id, 'fields': extra_fields,
             'evidence': ev(old_url, why), 'confidence': conf})
    d = {'decision': f"junk root '{cur['title']}' ({series_id[:8]}) -> parent {new_parent}", 'detail': why, 'confidence': conf}
    if keep_status_note:
        d['note'] = keep_status_note
    decisions.append(d)

# חמאה ודבש - ישעיהו: real old location known from the old ישעיהו book page
junk('10e20007-1475-4156-ae34-44483c4f5eae', ISAIAH_BOOK, 100,
     "old site lists 'חמאה ודבש - ישעיהו' as a series ON the ישעיהו book page (not in the old sidebar) -> correct parent is the ישעיהו book; out of sidebar band",
     '/מאגר-השיעורים-והמאמרים/נביאים/ישעיהו/חמאה-ודבש-ישעיהו/', conf='high')

# the 3 parsha-article roots — hard-coded in PARASHA_ARTICLE_SERIES (exact title + status='active' required)
for i, (sid, title) in enumerate([
    ('a1111111-1111-1111-1111-111111111111', 'הפרשה במבט רחב'),
    ('a2222222-2222-2222-2222-222222222222', 'סימן לבנים'),
    ('a3333333-3333-3333-3333-333333333333', 'מידות בפרשה'),
]):
    junk(sid, ROOT['torah'], 100 + i,
         f"'{title}' is a weekly parsha article series thrown to root level by migration; not in the old sidebar tree. Closest category = תורה. MUST keep status='active' and exact title (hard-coded in src/lib/parashaCalendar.ts PARASHA_ARTICLE_SERIES, status filter in useParasha.ts:193).",
         None, conf='med',
         keep_status_note="do NOT change status/title — /parasha page lookups depend on them")
    yoav.append({'topic': 'junk root placement',
                 'detail': f"'{title}' ({sid[:8]}) reparented under תורה root at sort {100+i} (kept out of the sidebar). Old site served it via the פרשת-השבוע page. Confirm placement."})

# דרך לימוד התנ"ך — migration-era alternative organization of איך-לומדים content
junk('a8e770fd-6967-4628-893c-342f7a817feb', ROOT['howToLearn'], 100,
     "root-level junk; its 10 children (בעלי מקרא, הדרכות בדרך הלימוד, פשט מול דרש...) are how-to-learn content. Closest category = איך לומדים תנ\"ך. Possible overlap with the empty old node 'אוסף הדרכות בלימוד תנ\"ך'.",
     None, conf='med')
yoav.append({'topic': 'junk root placement',
             'detail': "'דרך לימוד התנ\"ך' (a8e770fd) parked under איך לומדים תנ\"ך at sort 100 (out of sidebar). The old sidebar node 'אוסף הדרכות בלימוד תנ\"ך' (matched f8a82688, empty draft) may be the intended container for this content — decide whether to merge/point the label at it."})

# מקורות על חשיבות לימוד תנ"ך — consumed as the match for the old 'אוסף מקורות...' node (ops emitted in pass 2)
decisions.append({
    'decision': "old node 'אוסף מקורות על חשיבות לימוד תנ\"ך' -> series 68582fdf (junk root 'מקורות על חשיבות לימוד תנ\"ך')",
    'detail': "the matcher matched the old node to e577cd74 (draft, 0 lessons, exact title) but the junk root 68582fdf holds the REAL content (4 sub-series, 76 lessons). Policy: do not replicate the old empty-page bug -> sidebar entry points at the content; title updated to the old label; e577cd74 stays draft (no delete).",
    'confidence': 'med',
})
yoav.append({'topic': 'duplicate placeholder', 'detail': f"e577cd74 ('אוסף מקורות על חשיבות לימוד תנ\"ך', draft, empty) is superseded by 68582fdf — candidate for future merge; left as draft."})

# מקומות בספר מלכים א — maps/tools teacher content at root level
junk('d6a13cc3-71bd-4d6c-8b80-c9306d8a1a5a', ROOT['maps'], 100,
     "root-level junk; map-collection content. Closest home = מפות עזר לתנ\"ך (teachers maps root 4d78557b, hard-coded in useTeacherSidebar.ts). audience kept ['teachers','general'].",
     None, conf='med')
yoav.append({'topic': 'junk root placement',
             'detail': "'מקומות בספר מלכים א (לפי א-ב)' (d6a13cc3) parked under מפות עזר לתנ\"ך. Not found on the old public כלי-עזר page listing — confirm it is teachers-wing material."})

# שיעורים כלליים — migration catch-all, left as a root (not in the hard-coded sidebar roots)
decisions.append({
    'decision': "'שיעורים כלליים' (cab4229a) left at root level, no ops",
    'detail': "migration catch-all with no old-tree counterpart and no sensible category. It is already excluded from the sidebar (roots are explicit) and dropped by title in SeriesLibrary. Flag only.",
    'confidence': 'med',
})
yoav.append({'topic': 'catch-all root', 'detail': "'שיעורים כלליים' (cab4229a) remains a root outside the sidebar — confirm or pick a home."})

# מאגר עזרי הלמידה — legit teachers root
decisions.append({
    'decision': "'מאגר עזרי הלמידה' (6bfb7aaa) kept as the teachers-wing root",
    'detail': "audience=['teachers'] already correct; it mirrors the old מאגר-עזרי-הלמידה tree. No ops.",
    'confidence': 'high',
})

# ---------- pass 5: teachers by_book tree ----------
t_matched = 0; t_sort = 0; t_parsha_nodes = 0; t_alias = 0; t_links = []
def teachers_visit(nodes, parent_entry_ref, parent_url):
    global t_matched, t_sort, t_parsha_nodes, t_alias
    for node in nodes:
        e = tm_by_key.get(('teachers_by_book', node['url']))
        if e is None:
            continue
        if e['node_kind'] == 'alias':
            t_alias += 1
            alias_slots.append({'label': node['title'], 'parent_old_url': parent_url,
                                'parent_ref': parent_entry_ref, 'wing': 'teachers',
                                'position_among_all_siblings': node['order'], 'old_url': node['url']})
            continue
        if e['matched_series_id'] is None:
            # all 48 unmatched teachers nodes are per-parsha (or the top 'פרשת השבוע') -> code route
            t_parsha_nodes += 1
            t_links.append({'label': node['title'], 'parent_old_url': parent_url, 'order': node['order'], 'old_url': node['url']})
            continue
        sid = e['matched_series_id']; cur = series[sid]
        t_matched += 1
        if parent_entry_ref and not str(parent_entry_ref).startswith('tmp:') and cur['parent_id'] != parent_entry_ref:
            add({'op': 'reparent_series', 'series_id': sid, 'new_parent_ref': parent_entry_ref,
                 'evidence': ev(node['url'], f"teachers by_book tree places '{node['title']}' under '{parent_url}'"),
                 'confidence': 'high'})
            counters['reparented'] += 1
        want = node['order']  # old per-sibling order (1-based, alias slots included — matches code-rendered slots)
        if cur['sort_order'] != want:
            add({'op': 'set_series_sort', 'series_id': sid, 'sort_order': want,
                 'evidence': ev(node['url'], f"old teachers tree sibling order {want}; current {cur['sort_order']}"),
                 'confidence': 'high'})
            counters['resorted'] += 1; t_sort += 1
        tags = cur['audience_tags'] or []
        fields = {}
        if 'teachers' not in tags:
            fields['audience_tags'] = sorted(set(tags) | {'teachers'})
        if cur['status'] == 'draft':
            fields['status'] = 'published'
        if fields:
            add({'op': 'update_series', 'series_id': sid, 'fields': fields,
                 'evidence': ev(node['url'], 'teachers-wing node must be audience teachers + visible'),
                 'confidence': 'high'})
            counters['audience_fixed'] += 1 if 'audience_tags' in fields else 0
            counters['status_fixed'] += 1 if 'status' in fields else 0
        if node['children']:
            teachers_visit(node['children'], sid, node['url'])

teachers_visit(teachers_tree, ROOT['teachersRoot'], 'https://www.bneyzion.co.il/מאגר-עזרי-הלמידה/')

# ---------- dependency + label-parity flags ----------
# (a) draft->active promotions on empty containers depend on the listings plan filling them
empty_promotions = []
for o in ops:
    if o['op'] == 'update_series' and o.get('fields', {}).get('status') in ('active', 'published'):
        cur = series.get(o['series_id'])
        if cur and cur['lesson_count'] == 0 and series.get(o['series_id']) and not db_children.get(o['series_id']):
            empty_promotions.append(f"{o['series_id'][:8]} '{cur['title'][:40]}'")
if empty_promotions:
    yoav.append({'topic': 'empty containers promoted to visible',
                 'detail': f"{len(empty_promotions)} matched old sidebar nodes are currently EMPTY draft/category placeholders (0 lessons, 0 children) promoted to 'active' for sidebar parity. Their old pages DO have items — the listings plan must populate them (same tmp/id refs). If a container stays empty after apply, demote it back. Sample: " + '; '.join(empty_promotions[:10])})

# (b) fuzzy/containment matches where the new title differs from the old sidebar label
label_diffs = []
def collect_label_diffs(nodes):
    for node in nodes:
        e = tm_by_key[('sidebar', node['url'])]
        ms = e['matched_series_id']
        if ms and e['method'] in ('fuzzy_in_parent', 'skeleton_in_parent', 'containment_in_parent') \
           and norm(node['title']) != norm(e.get('matched_title') or ''):
            label_diffs.append(f"old '{node['title']}' -> new '{e['matched_title']}' ({ms[:8]}, {e['method']})")
        for c in node['children']:
            collect_label_diffs([c])
collect_label_diffs(old_tree)
if label_diffs:
    yoav.append({'topic': 'sidebar label differs from old (fuzzy matches)',
                 'detail': f"{len(label_diffs)} nodes matched fuzzily keep the NEW title — strict label parity would need a rename. Decide per item: " + '; '.join(label_diffs)})

# ---------- consistency guards + near-duplicate flags ----------
# 1) depth-1 matched ids must equal the hard-coded UI roots
EXPECT_TOP = {
    norm('תורה'): ROOT['torah'], norm('נביאים'): ROOT['neviim'], norm('כתובים'): ROOT['ketuvim'],
    norm('איך לומדים תנ"ך'): ROOT['howToLearn'], norm('נושאים כלליים בתנ"ך'): ROOT['generalTopics'],
    norm('מועדים'): ROOT['moadim'], norm('הפטרות'): ROOT['haftarot'],
    norm('ימי עיון בתנ"ך'): ROOT['yemeiIyun'],
    norm('כלי עזר - טבלאות זמני המאורעות ומפות'): ROOT['tools'],
    norm('ליווי ת"תים'): ROOT['livuyTatim'],
}
for top in old_tree:
    k = norm(top['title'])
    if k in EXPECT_TOP:
        got = assigned.get(top['url'])
        assert got == EXPECT_TOP[k], f"top-level mapping mismatch for {top['title']}: {got} != {EXPECT_TOP[k]}"

# 2) flag page-only extras that are near-duplicates (ktiv male/haser) of sidebar siblings
def skeleton(s):
    toks = []
    for t in norm(s).split():
        toks.append(t[0] + re.sub('[וי]', '', t[1:]) if t else t)
    return ' '.join(toks)

exp_skel_by_parent = {}
def collect_skel(nodes):
    for node in nodes:
        ref = assigned.get(node['url'])
        if ref and node['children']:
            exp_skel_by_parent[ref] = {skeleton(c['title']): c['title'] for c in node['children']}
        if node['children']:
            collect_skel(node['children'])
collect_skel(old_tree)
near_dups = []
for row in extra_public_rows:
    sk = skeleton(row['title'])
    sibs = exp_skel_by_parent.get(row['parent_ref'], {})
    if sk in sibs:
        near_dups.append(f"{row['series_id'][:8]} '{row['title']}' ~= sidebar child '{sibs[sk]}' (parent {row['parent_old_url']})")
if near_dups:
    yoav.append({'topic': 'near-duplicate page-only extras (ktiv male/haser)',
                 'detail': 'these kept extras are skeleton-equal to a sidebar sibling — candidates for merge: ' + '; '.join(near_dups)})

# 3) עזרא/נחמיה split-book rows are emptied by the chapter reparents
yoav.append({'topic': 'עזרא/נחמיה split books emptied',
             'detail': "aa111111 'עזרא' and bb222222 'נחמיה' (night-session split under כתובים) lose their chapter children to the old combined book 'עזרא ונחמיה' (5896c267) per the old sidebar; they keep only 2/1 direct lessons and stay page-only (sort 0). Candidates for merge into 5896c267."})

# ---------- code_asks ----------
code_asks.extend([
    {
        'ask': 'sidebar_membership_band',
        'detail': "Public sidebar must render, per parent, ONLY children with sort_order in 1..99, ordered by sort_order asc (then he-locale title for safety). sort_order 0/null/>=100 children stay accessible on /category/:id and /series/:id but are NOT sidebar entries. This replaces the current mixed logic in useContentSidebar.ts (sortByBiblicalOrder fallback, forced Torah order, sortByCustomOrder, lesson_count-desc for howToLearn). Old site nav-membership != page-membership: this plan encodes nav membership in the 1..99 band; ~238 page-only series keep sort 0/100+.",
    },
    {
        'ask': 'sidebar_top_level_order',
        'detail': "Render the 13 top entries in the exact old order: 1 ניווט באתר לפי ספר ופרק (link), 2 פרשת השבוע (link -> /parasha), 3 איך לומדים תנ\"ך, 4 תורה, 5 נביאים, 6 כתובים, 7 נושאים כלליים בתנ\"ך, 8 מועדים, 9 הפטרות, 10 ימי עיון בתנ\"ך, 11 כלי עזר - טבלאות זמני המאורעות ומפות, 12 פרוייקט התנ\"ך המוקלט - מתעדכן (created series, ref tmp:פרוייקט-התנך-המוקלט-מתעדכן), 13 ליווי ת\"תים. Roots are hard-coded UUIDs in useContentSidebar.ts:17-29 — add tools (27ca7dec, becomes a root after reparent) and the new פרוייקט root; drop the dead /how-to-learn-tanach quick link (DesignSidebar.tsx:198 — 404 today).",
    },
    {
        'ask': 'alias_links_render_as_plain_links',
        'detail': "Every alias node ('כל השיעורים ב-X' / 'כל התכנים ב-X' + 3 pseudo-aliases) renders as a plain LINK to the section/book category page (/category/{parent_ref}; teachers wing -> /teachers/book/:book) at the recorded position among siblings — no accordion, no series row. Positions are 1-based among ALL old siblings. Full slot list in code_asks_data.alias_slots.",
        'count': len(alias_slots),
    },
    {
        'ask': 'status_category_unification',
        'detail': "Sidebar child queries must treat status uniformly: books accordion level accepts status='category' everywhere (today Neviim requires category-only while Torah/Ketuvim accept active|published|category — useContentSidebar.ts:40-54); section-children queries (generalTopics/moadim/haftarot/tools/yemeiIyun/livuyTatim, :100-106) must ALSO accept 'category' and must EXCLUDE audience teachers; haftarot section needs depth-3 rendering (its 6 book-children have 83 grandchildren in the old tree) — today only one level is fetched.",
    },
    {
        'ask': 'how_to_learn_section',
        'detail': "איך לומדים תנ\"ך section: render the direct children of root 62590949 by the sidebar band (5 real children sort 1..5 + alias link at slot 1), NOT the current RPC-descendants + lesson_count-desc heuristic (useContentSidebar.ts:111-148). Exclude audience-teachers children (26e30725 איך מלמדים תנ\"ך is the teachers howToTeach root).",
    },
    {
        'ask': 'riddles_under_torah',
        'detail': "חידות לילדים פ\"ש (c852edd8) must render as the 6th child of תורה (old position after דברים), not hard-coded under בראשית (DesignSidebar.tsx:901-934). Keep its hard-coded id usages (/parasha riddle query) intact.",
    },
    {
        'ask': 'teachers_by_book_parshiot',
        'detail': f"The {t_parsha_nodes} unmatched old teachers nodes are all per-parsha pages (plus the top 'פרשת השבוע') — serve via the existing /teachers/parasha/:book/:parasha route and PARSHIOT_BY_BOOK links instead of creating empty series. VERIFY PARSHIOT_BY_BOOK covers exactly the old per-book lists in old order (list in code_asks_data.teachers_parsha_slots), and add a top 'פרשת השבוע' teachers link (old order 1) -> current-parasha teachers page.",
    },
    {
        'ask': 'teachers_by_book_order',
        'detail': "Teachers by_book tab: top sections in old order — פרשת השבוע (link, 1), איך מלמדים תנ\"ך (26a5e728, 2), תורה (2e248097, 3), נביאים (4), כתובים (5); books and book-children by sort_order (set by this plan, alias/parsha slots are code links at their recorded order). Today the sidebar buckets by title alpha (useTeacherSidebar.ts).",
    },
])

# ---------- assemble ----------
def cat_counts():
    out = OrderedDict()
    for top in old_tree:
        out[top['title']] = len(top['children'])
    return out

plan = OrderedDict()
plan['_meta'] = {
    'generated_by': 'scripts/build_tree_plan.py',
    'task': 'public sidebar tree + teachers by_book tree parity (old_sidebar_tree.json 894 nodes / old_teachers_tree.json by_book 109 nodes)',
    'sort_convention': 'series.sort_order 1..99 = sidebar position (1-based among real series siblings; alias slots are code links at recorded positions); 0/null = page-only; >=100 = parked extras (end of category page, never in sidebar). Top-level sort = position among the 13 old entries.',
    'tmp_ref_namespace': "create_series tmp_id = 'tmp:<last old-url segment>' — stable refs other plans (listings) may reuse",
    'policy': 'no deletes; old-site bugs not replicated (empty אוסף-מקורות page -> pointed at real content); doubts in yoav_review',
}
plan['ops'] = ops
plan['code_asks'] = code_asks
plan['code_asks_data'] = {
    'alias_slots': alias_slots,
    'teachers_parsha_slots': t_links,
}
plan['yoav_review'] = yoav
plan['decisions'] = decisions
plan['stats'] = {
    'old_nodes_total': {'sidebar': 894, 'teachers_by_book': 109},
    'sidebar_real_series_nodes_targeted': counters['matched'],
    'teachers_real_series_nodes_targeted': t_matched,
    'nodes_matched': counters['matched'] + t_matched,
    'nodes_created': counters['created'],
    'nodes_reparented': counters['reparented'],
    'nodes_resorted': counters['resorted'],
    'status_fixes': counters['status_fixed'],
    'audience_fixes': counters['audience_fixed'],
    'alias_and_link_slots': counters['alias_links'] + t_alias,
    'teachers_parsha_code_slots': t_parsha_nodes,
    'new_side_extras': {
        'public_page_only_kept': counters['extras_public'],
        'teachers_tagged_hidden_by_audience_filter': counters['extras_teachers'],
        'draft_hidden': counters['extras_draft'],
        'title_dup_display_deduped': counters['extras_dup'],
    },
    'ops_total': len(ops),
    'ops_by_type': {},
    'final_sidebar_child_counts_per_top_category (incl. alias/link slots)': cat_counts(),
}
from collections import Counter
plan['stats']['ops_by_type'] = dict(Counter(o['op'] for o in ops))

out_path = os.path.join(BASE, 'plans', 'tree_plan.json')
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(plan, f, ensure_ascii=False, indent=1)
print('WROTE', out_path)
print(json.dumps(plan['stats'], ensure_ascii=False, indent=1))
