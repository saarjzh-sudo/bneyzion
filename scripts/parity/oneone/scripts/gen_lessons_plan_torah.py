#!/usr/bin/env python3
"""
gen_lessons_plan_torah.py — READ-ONLY plan generator (no DB writes, no src/ edits).

Produces plans/lessons_plan_torah.json covering ALL old listing pages under:
  איך לומדים תנ"ך · תורה (5 chumashim + חידות לילדים פ"ש) · ניווט באתר לפי ספר ופרק · פרשת השבוע

Inputs (ground truth + match, all under scripts/parity/oneone/):
  old_listings_torah_ketuvim.json  (wrapper: {_meta, pages})
  old_listings_neviim_moadim.json  (flat: url -> page)   [needed for global href->match + home-page resolution]
  match/item_match.json, match/tree_map.json
  newdb_lessons.json, newdb_series.json

Core model (hierarchy-aware, mirrors NIGHT-LOG consolidate semantics):
  * every old item href has ONE canonical "home page" = the deepest listing page whose URL is a
    strict prefix of the href. The lesson row must LIVE in the home page's mapped series.
  * an item listed on a page that is an ANCESTOR of its home page = hierarchical aggregation
    (old categoryTable lists descendants; new /category/:id aggregates descendants) -> NO op.
  * an item listed on a page that is NOT an ancestor (cross-listing, e.g. parasha event pages
    aggregating rabbi-series lessons) -> copy_lesson into that page's mapped series (+ sort),
    guarded against pre-existing consolidate-copies (same norm title+rabbi already in target).
  * unmatched-anywhere items -> insert_lesson at the home page (tmp_id), copies elsewhere.

Sort: set_lesson_sort.sort_order = old item order_index (per-page document order).
Extension to ops vocabulary (documented in _meta): insert_lesson carries tmp_id; set_lesson_sort /
copy_lesson may use lesson_ref = "tmp_..." (a tmp_id) or {"old_url": ...} for cross-plan refs.
"""
import json, re, sys, os, unicodedata, hashlib, subprocess, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ONEONE = os.path.dirname(HERE)
PLANS = os.path.join(ONEONE, 'plans')
os.makedirs(PLANS, exist_ok=True)
SBQ = os.path.join(os.path.dirname(ONEONE), 'sbq.py')

PFX = 'https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/'
SCOPE_SECTIONS = {'איך-לומדים-תנך', 'תורה', 'ניווט-באתר-לפי-ספר-ופרק', 'פרשת-השבוע'}
CHUMASHIM = ['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים']

NIQQUD = re.compile('[֑-ׇ]')
QUOTES = re.compile('[״"\'׳`]')
SEPS = re.compile('[|–—\\-_,:;!?()\\[\\]{}<>./]')
HONORIFICS = {'הרב', 'רב', 'הרבנית', 'ד"ר', 'דר', 'דוקטור', 'פרופ', "פרופ'", 'זצ"ל', 'זצל', 'שליט"א', 'שליטא', 'הגאון', 'מו"ר', 'מור'}


def norm_he(s):
    if not s:
        return ''
    s = unicodedata.normalize('NFC', s)
    s = NIQQUD.sub('', s)
    s = QUOTES.sub('', s)
    s = SEPS.sub(' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()


def norm_rabbi(s):
    n = norm_he(s)
    toks = [t for t in n.split() if t not in {norm_he(h) for h in HONORIFICS}]
    return ' '.join(sorted(toks))


def load(name):
    with open(os.path.join(ONEONE, name), encoding='utf-8') as f:
        return json.load(f)


def main():
    old_t = load('old_listings_torah_ketuvim.json')['pages']
    old_n = load('old_listings_neviim_moadim.json')          # flat url -> page
    all_pages = {}
    all_pages.update(old_t)
    all_pages.update(old_n)

    im = load('match/item_match.json')
    lm = im['listings']
    tm = im['teachers']
    tree = load('match/tree_map.json')['nodes']
    tree_by_url = {}
    for nd in tree:
        u = nd.get('old_url') or ''
        full = u if u.startswith('http') else 'https://www.bneyzion.co.il' + u
        if not full.endswith('/'):
            full += '/'
        tree_by_url[full] = nd

    lessons = load('newdb_lessons.json')
    by_id = {l['id']: l for l in lessons}
    series = {s['id']: s for s in load('newdb_series.json')}

    # lessons indexed per series + identity index per series for dup-guard
    ser_lessons = collections.defaultdict(list)
    for l in lessons:
        if l['series_id']:
            ser_lessons[l['series_id']].append(l)
    ser_ident = {}
    def ident_index(sid):
        if sid not in ser_ident:
            d = collections.defaultdict(list)
            for l in ser_lessons.get(sid, []):
                d[(norm_he(l['title']), norm_rabbi(l.get('rabbi_name') or ''))].append(l)
                d[(norm_he(l['title']), None)].append(l)   # title-only fallback
            ser_ident[sid] = d
        return ser_ident[sid]

    # ---- page sets -------------------------------------------------------
    # alias = redirect WITHIN the repository ("כל-השיעורים-ב…" → parent listing): items duplicate
    # the target page. Redirects to OTHER wings (e.g. חידות לילדים → מאגר-עזרי-הלמידה) are real
    # content pages and ARE processed.
    alias_pages = {u for u, p in all_pages.items()
                   if p.get('redirected_to') and str(p['redirected_to']).startswith(PFX)}
    nonalias = set(all_pages) - alias_pages

    def home_page(href):
        """deepest non-alias listing page whose URL is a strict prefix of href"""
        h = href.rstrip('/')
        parts = h.split('/')
        for i in range(len(parts) - 1, 4, -1):       # 4 = scheme//host/מאגר segment floor
            cand = '/'.join(parts[:i]) + '/'
            if cand in nonalias and len(cand) < len(href):
                return cand
        return None

    # ---- global href -> matches across ALL listings pages ---------------
    BASE = 'https://www.bneyzion.co.il'

    def item_href(it):
        h = it.get('href') or ''
        return h if h.startswith('http') else BASE + h

    def item_idx(it):
        return it['order_index'] if 'order_index' in it else it.get('order')

    href_matches = collections.defaultdict(list)   # href -> [{page, lesson_id, method}]
    page_items_byidx = {}
    for u, e in lm.items():
        op = all_pages.get(u)
        if not op:
            continue
        oid = {item_idx(it): it for it in op['items']}
        page_items_byidx[u] = oid
        for mit in e['items']:
            oi = oid.get(mit['idx'])
            if not oi:
                continue
            if mit.get('matched_lesson_id'):
                href_matches[item_href(oi)].append({
                    'page': u, 'lesson_id': mit['matched_lesson_id'], 'method': mit['method']})

    # anchor: lesson_id -> set of mapped series ids of pages where it matched
    anchor = collections.defaultdict(set)
    for src in (lm, tm):
        for u, e in src.items():
            ms = e.get('mapped_series_id')
            if not ms:
                continue
            for mit in e['items']:
                if mit.get('matched_lesson_id'):
                    anchor[mit['matched_lesson_id']].add(ms)

    # matched ANYWHERE (all four sources) — an "extra" that is matched on a sibling old page
    # (cross-book shared series, topic page, rabbi page…) is NOT a new-only lesson
    matched_anywhere = set()
    for srcname in ('listings', 'teachers', 'topic_pages', 'rabbi_pages'):
        for e in im[srcname].values():
            for mit in e['items']:
                if mit.get('matched_lesson_id'):
                    matched_anywhere.add(mit['matched_lesson_id'])

    # series mapped by >1 item-bearing listing page (e.g. לשון הקודש בפרשה: one new series,
    # five per-chumash old pages). Their per-page sorts get a per-book offset so the combined
    # series order = chumash order then old per-page order.
    series_page_count = collections.Counter()
    series_pages = collections.defaultdict(list)
    for u, e in lm.items():
        if e.get('mapped_series_id') and e.get('n_items', 0) > 0 and u not in alias_pages:
            series_page_count[e['mapped_series_id']] += 1
            series_pages[e['mapped_series_id']].append(u)
    shared_series = {k for k, v in series_page_count.items() if v > 1}

    # rank pages that share BOTH a series and a book (e.g. הרב-אבינר-על-פרשיות-שמות +
    # הרב-אבינר-שיחות-על-פרשיות-שמות → one new series) by old sidebar order, so their
    # per-page sorts don't collide: so = book*1000 + rank*500 + idx
    def book_of_url(u):
        if u.startswith(PFX + 'תורה/'):
            seg = u[len(PFX) + len('תורה/'):].split('/')[0]
            if seg in CHUMASHIM:
                return seg
        return None

    page_rank = {}
    for sid, urls in series_pages.items():
        if sid not in shared_series:
            continue
        bybook = collections.defaultdict(list)
        for u in urls:
            bybook[book_of_url(u)].append(u)
        for b, us in bybook.items():
            us.sort(key=lambda x: (tree_by_url.get(x, {}).get('order_index', 9999), x))
            for r, u in enumerate(us):
                page_rank[(sid, u)] = r

    # ---- scope -----------------------------------------------------------
    def section_of(u):
        return u[len(PFX):].split('/')[0] if u.startswith(PFX) else None

    in_scope = [u for u in old_t if section_of(u) in SCOPE_SECTIONS]

    def group_of(u):
        sec = section_of(u)
        if sec == 'תורה':
            rest = u[len(PFX) + len('תורה/'):]
            seg = rest.split('/')[0] if rest else '(top)'
            if seg in CHUMASHIM:
                return 'תורה/' + seg
            if 'חידות' in seg:
                return 'תורה/חידות-לילדים-פש'
            return 'תורה/(top)' if not rest else 'תורה/(other)'
        return sec

    # ---- op machinery ----------------------------------------------------
    ops, yoav, code_asks, cross_plan = [], [], [], []
    seen_sort, seen_copy, seen_move, seen_retag = set(), set(), {}, set()
    seen_rabbi_fix = set()
    inserted_href = {}
    extras_done_series = set()
    salvaged_rows = set()            # in-series rows consumed by title-salvage (not extras)
    salvaged_href = {}               # old item href -> salvaged row id (for cross-listing copies)
    salvage_used = collections.defaultdict(set)   # series -> row ids already assigned
    shared_flagged = set()
    dup_candidates = []      # (lesson_id, page, matched_counterpart, series)
    stats = collections.defaultdict(lambda: collections.defaultdict(int))

    BOOK_OFFSET = {b: i for i, b in enumerate(CHUMASHIM)}

    def page_sort(u, M, so, g):
        """sort_order for an item: raw old order_index, book-offset when the series is shared
        by several per-book old pages (1000*book + idx keeps chumash order then page order)"""
        if M in shared_series:
            book = g.split('/')[1] if g.startswith('תורה/') and g.split('/')[1] in BOOK_OFFSET else None
            off = BOOK_OFFSET.get(book, 5)
            return off * 1000 + page_rank.get((M, u), 0) * 500 + idx
        return idx

    def salvage_in_series(oi, M):
        """unmatched old item: unique norm-title row inside the mapped series = the same lesson
        with divergent rabbi attribution (e.g. הרב יהושע שפירא ↔ הרב חיים שפירא) or matcher
        ambiguity. Returns the row or None."""
        rows = [x for x in ident_index(M).get((norm_he(oi['title']), None), [])
                if x['id'] not in salvage_used[M]]
        # unique by id
        uniq = {x['id']: x for x in rows}
        if len(uniq) == 1:
            row = next(iter(uniq.values()))
            salvage_used[M].add(row['id'])
            salvaged_rows.add(row['id'])
            return row
        return None

    def maybe_fix_rabbi(row, oi, u):
        old_r = (oi.get('rabbi') or '').strip()
        if not old_r:
            return
        if norm_rabbi(old_r) != norm_rabbi(row.get('rabbi_name') or ''):
            if row['id'] in seen_rabbi_fix:
                return
            seen_rabbi_fix.add(row['id'])
            ops.append({'op': 'set_lesson_rabbi', 'lesson_id': row['id'], 'rabbi_name': old_r,
                        'evidence': {'old_url': u,
                                     'detail': f"old site attributes '{oi['title']}' to '{old_r}', new row says '{row.get('rabbi_name')}' — old site is ground truth"},
                        'confidence': 'med'})
            yoav.append({'issue': 'rabbi_attribution_differs', 'lesson_id': row['id'], 'old_url': u,
                         'detail': f"'{oi['title']}': old='{old_r}' vs new='{row.get('rabbi_name')}' — plan follows the old site; confirm"})

    def add_sort(lesson_ref, series_ref, sort_order, ev, conf='high'):
        key = (str(lesson_ref), series_ref)
        if key in seen_sort:
            return
        seen_sort.add(key)
        ops.append({'op': 'set_lesson_sort', 'lesson_id': lesson_ref, 'series_ref': series_ref,
                    'sort_order': sort_order, 'evidence': ev, 'confidence': conf})

    def add_copy(lesson_ref, series_ref, ev, conf='high'):
        key = (str(lesson_ref), series_ref)
        if key in seen_copy:
            return False
        seen_copy.add(key)
        ops.append({'op': 'copy_lesson', 'lesson_id': lesson_ref, 'to_series_ref': series_ref,
                    'evidence': ev, 'confidence': conf})
        return True

    def media_payload(oi):
        audio = video = None
        attach_old = []
        rehost = False
        for mref in oi.get('media', []):
            href = mref.get('href') or ''
            full = href if href.startswith('http') else 'https://www.bneyzion.co.il' + href
            onsite = 'bneyzion.co.il' in full or href.startswith('/')
            if mref.get('kind') == 'audio' and not audio:
                audio = full
                rehost = rehost or onsite
            elif mref.get('kind') == 'video' and not video:
                video = full
                rehost = rehost or onsite
            else:
                attach_old.append(full)
                rehost = rehost or onsite
        if oi.get('attachment_href'):
            a = oi['attachment_href']
            full = a if a.startswith('http') else 'https://www.bneyzion.co.il' + a
            if full not in attach_old:
                attach_old.insert(0, full)
            rehost = rehost or ('bneyzion.co.il' in full or a.startswith('/'))
        return audio, video, attach_old, rehost

    def insert_for(oi, M, page_url, book):
        href = oi['href']
        if href in inserted_href:
            return inserted_href[href]
        tmp = 'tmp_' + hashlib.sha1(href.encode()).hexdigest()[:10]
        inserted_href[href] = tmp
        audio, video, attach_old, rehost = media_payload(oi)
        payload = {
            'title': oi['title'],
            'rabbi_name': oi.get('rabbi') or None,
            'series_ref': M,
            'source_type': ('video' if video else 'audio' if audio else 'text'),
            'content_type': ('שו"ת' if oi.get('type') == 'שו"ת' else None),
            'audio_url': audio,
            'video_url': video,
            'attachment_url_old': (attach_old[0] if attach_old else None),
            'additional_attachments_old': attach_old[1:] or None,
            'rehost': rehost,
            'description': oi.get('promo') or None,
            'fetch_content_from_old_url': True,
            'cache_hint': (lambda h: 'cache/' + h + '.html' if os.path.exists(os.path.join(ONEONE, 'cache', h + '.html')) else None)(hashlib.sha1(href.encode()).hexdigest()),
            'duration': oi.get('duration') or None,
            'bible_book': book,
            'bible_chapter': None,
            'audience_tags': ['general'],
            'status': 'published',
        }
        ops.append({'op': 'insert_lesson', 'tmp_id': tmp, 'payload': payload, 'old_url': href,
                    'evidence': {'old_url': page_url,
                                 'detail': f"old item idx={oi['order_index']} '{oi['title']}' unmatched in new DB (global)"},
                    'confidence': 'high'})
        return tmp

    # ---------------------------------------------------------------------
    # PASS 1: home-page ops (placement of every old item at its canonical home)
    # PASS 2: cross-listing copies + per-page sorts + extras
    # We iterate in_scope pages twice with a role filter.
    # ---------------------------------------------------------------------
    matched_global_one = {h: v[0] for h, v in href_matches.items()}

    def lesson_for_href(href, page_entry_item):
        """resolve new lesson id for an old item: this-page match first, then global by href"""
        if page_entry_item and page_entry_item.get('matched_lesson_id'):
            return page_entry_item['matched_lesson_id'], page_entry_item['method'], 'this_page'
        g = matched_global_one.get(href)
        if g:
            return g['lesson_id'], g['method'], g['page']
        return None, None, None

    scope_pages = []
    for u in in_scope:
        if u in alias_pages:
            stats[group_of(u)]['alias_pages_skipped'] += 1
            continue
        e = lm.get(u)
        p = old_t[u]
        scope_pages.append((u, p, e))

    for phase in (1, 2, 3):
        for u, p, e in scope_pages:
            g = group_of(u)
            M = e.get('mapped_series_id') if e else None
            if phase == 1:
                stats[g]['pages'] += 1
                stats[g]['old_items'] += len(p['items'])
            if not M:
                if phase == 1 and (p['items'] or u in (PFX + 'ניווט-באתר-לפי-ספר-ופרק/', PFX + 'פרשת-השבוע/')):
                    stats[g]['unresolved_pages'] += 1
                    if p['items']:
                        yoav.append({'issue': 'page_unmapped', 'old_url': u, 'h1': p['h1'],
                                     'n_items': len(p['items']),
                                     'detail': 'listing page has items but no mapped series — tree_plan must create/match the series first; item ops deferred'})
                continue
            oid = page_items_byidx.get(u, {it['order_index']: it for it in p['items']})
            mby = {it['idx']: it for it in e['items']}
            book = None
            if g.startswith('תורה/') and g.split('/')[1] in CHUMASHIM:
                book = g.split('/')[1]

            for oi in (sorted(p['items'], key=lambda x: x['order_index']) if phase < 3 else []):
                href = item_href(oi)
                idx = oi['order_index']
                mit = mby.get(idx)
                hp = home_page(href)
                is_home = (hp == u) or (hp is None)
                is_desc = (not is_home) and hp.startswith(u)
                lid, method, msrc = lesson_for_href(href, mit)
                ev = {'old_url': u, 'detail': f"item idx={idx} '{oi['title']}' rabbi='{oi.get('rabbi','')}' href={href}"}

                so = page_sort(u, M, idx, g)
                if phase == 1:
                    if not is_home:
                        if is_desc:
                            stats[g]['aggregated_descendant_items'] += 1
                        continue
                    # --- home placement ---
                    if lid is None:
                        row = salvage_in_series(oi, M)
                        if row is not None:
                            sev = {**ev, 'detail': ev['detail'] + f" | matcher missed it but unique same-title row {row['id']} already in mapped series (rabbi attribution divergence)"}
                            add_sort(row['id'], M, so, sev)
                            maybe_fix_rabbi(row, oi, u)
                            salvaged_href[href] = row['id']
                            stats[g]['salvaged_title_in_series'] += 1
                            continue
                        tmp = insert_for(oi, M, u, book)
                        add_sort(tmp, M, so, ev)
                        stats[g]['inserts'] += 1
                        continue
                    l = by_id.get(lid)
                    if not l:
                        continue
                    cur = l['series_id']
                    if cur == M:
                        add_sort(lid, M, so, ev)
                        stats[g]['sorts_in_place'] += 1
                    else:
                        dup = next((x for x in ident_index(M).get((norm_he(l['title']), norm_rabbi(l.get('rabbi_name') or '')), []) if x['id'] != lid), None)
                        if dup:
                            add_sort(dup['id'], M, so, {**ev, 'detail': ev['detail'] + f" | existing same-identity row {dup['id']} already in target series"})
                            stats[g]['sort_on_existing_copy'] += 1
                        elif cur and cur in (anchor.get(lid, set()) - {M}):
                            cev = {**ev, 'detail': ev['detail'] + f" | lesson anchored in series {cur} ({series.get(cur,{}).get('title')}) by another old page → copy"}
                            add_copy(lid, M, cev)
                            add_sort(lid, M, so, cev)
                            stats[g]['copies_home'] += 1
                        else:
                            if lid in seen_move and seen_move[lid] != M:
                                add_copy(lid, M, ev, conf='med')
                                add_sort(lid, M, so, ev, conf='med')
                                yoav.append({'issue': 'move_conflict', 'lesson_id': lid, 'old_url': u,
                                             'detail': f"two home pages claim this lesson (first move → {seen_move[lid]}); copied instead"})
                                stats[g]['move_conflicts'] += 1
                            else:
                                curinfo = series.get(cur, {})
                                mev = {**ev, 'detail': ev['detail'] + f" | current series {cur} ({curinfo.get('title')}, status={curinfo.get('status')}) is not this lesson's home on any old page → move"}
                                ops.append({'op': 'move_lesson', 'lesson_id': lid, 'to_series_ref': M,
                                            'evidence': mev, 'confidence': 'high'})
                                seen_move[lid] = M
                                add_sort(lid, M, so, mev)
                                stats[g]['moves'] += 1
                    if 'teachers' in (l.get('audience_tags') or []) and lid not in seen_retag:
                        seen_retag.add(lid)
                        ops.append({'op': 'retag_lesson', 'lesson_id': lid, 'audience_tags': ['general'],
                                    'reason': 'listed on public old page; teachers tag would hide/redirect it',
                                    'evidence': ev, 'confidence': 'med'})
                        stats[g]['retags'] += 1
                    if l.get('status') != 'published':
                        yoav.append({'issue': 'lesson_not_published', 'lesson_id': lid, 'status': l.get('status'),
                                     'old_url': u, 'detail': f"matched old public item '{oi['title']}' but new row status={l.get('status')} — needs publish (no op in vocabulary)"})
                        stats[g]['unpublished_matched'] += 1
                else:
                    # PASS 2: cross-listing copies (item listed here, home elsewhere, not ancestor-aggregation)
                    if is_home or is_desc:
                        continue
                    stats[g]['cross_listed_items'] += 1
                    if lid is None:
                        tmp = inserted_href.get(href)
                        if tmp:
                            cev = {**ev, 'detail': ev['detail'] + ' | copy of lesson inserted at home page ' + (hp or '?')}
                            add_copy(tmp, M, cev, conf='med')
                            add_sort(tmp, M, so, cev, conf='med')
                            stats[g]['copies_of_inserts'] += 1
                        else:
                            rid = salvaged_href.get(href)
                            if rid is not None:
                                cev = {**ev, 'detail': ev['detail'] + f" | cross-listed; row {rid} salvaged at home page → copy"}
                                add_copy(rid, M, cev, conf='med')
                                add_sort(rid, M, so, cev, conf='med')
                                stats[g]['copies_of_salvaged'] += 1
                                continue
                            row = salvage_in_series(oi, M)
                            if row is not None:
                                sev = {**ev, 'detail': ev['detail'] + f" | matcher missed it but unique same-title row {row['id']} already in this page's series"}
                                add_sort(row['id'], M, so, sev)
                                maybe_fix_rabbi(row, oi, u)
                                salvaged_href[href] = row['id']
                                stats[g]['salvaged_title_in_series'] += 1
                                continue
                            hp_sec = section_of(hp) if hp else None
                            cross_plan.append({'old_url': u, 'item_href': href, 'title': oi['title'],
                                               'home_page': hp, 'home_section': hp_sec, 'target_series': M,
                                               'sort_order': so,
                                               'detail': 'unmatched item whose home page is outside this plan scope — insert belongs to the sibling plan; apply stage must copy into target_series afterwards'})
                            stats[g]['cross_plan_pending'] += 1
                        continue
                    l = by_id.get(lid)
                    if not l:
                        continue
                    cur = l['series_id']
                    if cur == M:
                        add_sort(lid, M, so, ev)
                        stats[g]['sorts_in_place'] += 1
                    else:
                        dup = next((x for x in ident_index(M).get((norm_he(l['title']), norm_rabbi(l.get('rabbi_name') or '')), []) if x['id'] != lid), None)
                        if dup:
                            add_sort(dup['id'], M, so, {**ev, 'detail': ev['detail'] + f" | consolidate-copy {dup['id']} already in target series"})
                            stats[g]['sort_on_existing_copy'] += 1
                        else:
                            cev = {**ev, 'detail': ev['detail'] + f" | cross-listed on this old page; lesson lives in {cur} ({series.get(cur,{}).get('title')}) → copy"}
                            if add_copy(lid, M, cev):
                                stats[g]['copies_cross'] += 1
                            add_sort(lid, M, so, cev)

            # ---- new extras (phase 3 only — after all salvages, once per series) ----
            if phase == 3 and M not in extras_done_series:
                extras_done_series.add(M)
                if M in shared_series and M not in shared_flagged:
                    shared_flagged.add(M)
                    yoav.append({'issue': 'shared_series_many_old_pages', 'series': M,
                                 'series_title': series.get(M, {}).get('title'),
                                 'n_old_pages': series_page_count[M],
                                 'detail': 'one new series serves several per-book old pages; plan keeps ONE series with book-offset sort (1000*chumash+idx). If Saar wants per-book split like the old sidebar, that is a tree_plan/create_series decision'})
                matched_idents = set()
                for mit in e['items']:
                    ml = by_id.get(mit.get('matched_lesson_id') or '')
                    oi = oid.get(mit['idx'])
                    if oi:
                        matched_idents.add((norm_he(oi['title']), norm_rabbi(oi.get('rabbi') or '')))
                    if ml:
                        matched_idents.add((norm_he(ml['title']), norm_rabbi(ml.get('rabbi_name') or '')))
                max_idx = max([it['order_index'] for it in p['items']], default=0)
                append_base = 6000 if M in shared_series else max_idx + 100
                kept_pos = 0
                for ex_id in e.get('new_extras', []):
                    l = by_id.get(ex_id)
                    if not l:
                        continue
                    if 'teachers' in (l.get('audience_tags') or []):
                        stats[g]['extras_teacher_skipped'] += 1
                        continue
                    if ex_id in salvaged_rows:
                        stats[g]['extras_salvaged_as_items'] += 1
                        continue
                    if ex_id in matched_anywhere:
                        # listed (and matched) on another old page — sibling-book page of a shared
                        # series, a topic/rabbi page, etc. Not a new-only lesson; its placement is
                        # owned by the page where it matched.
                        stats[g]['extras_matched_elsewhere'] += 1
                        continue
                    ident = (norm_he(l['title']), norm_rabbi(l.get('rabbi_name') or ''))
                    if ident in matched_idents:
                        dup_candidates.append({'lesson_id': ex_id, 'page': u, 'series': M, 'group': g,
                                               'title': l['title'], 'rabbi': l.get('rabbi_name')})
                    else:
                        kept_pos += 1
                        add_sort(ex_id, M, append_base + kept_pos,
                                 {'old_url': u, 'detail': f"new-only lesson '{l['title']}' kept, appended after old items"}, conf='med')
                        stats[g]['extras_kept_appended'] += 1

    # ---- FK check for duplicate-extras (bulk, read-only) -----------------
    fk_engaged = set()
    fk_checked = False
    if dup_candidates:
        ids = sorted({d['lesson_id'] for d in dup_candidates})
        idlist = ','.join(f"'{i}'" for i in ids)
        sql = (f"select lesson_id from user_favorites where lesson_id in ({idlist}) "
               f"union select lesson_id from lesson_comments where lesson_id in ({idlist}) "
               f"union select lesson_id from user_history where lesson_id in ({idlist})")
        try:
            out = subprocess.run([sys.executable, SBQ, sql], capture_output=True, text=True, timeout=180)
            rows = json.loads(out.stdout)
            if isinstance(rows, list):
                fk_engaged = {r['lesson_id'] for r in rows}
                fk_checked = True
        except Exception as ex:
            yoav.append({'issue': 'fk_check_failed', 'detail': str(ex),
                         'note': 'all duplicate-extras left as flags, none drafted'})
    for d in dup_candidates:
        g = d['group']
        if fk_checked and d['lesson_id'] not in fk_engaged:
            ops.append({'op': 'draft_lesson', 'lesson_id': d['lesson_id'],
                        'reason': f"exact dup (norm title+rabbi) of a matched old item on {d['page']}; no user FK rows (favorites/comments/history)",
                        'evidence': {'old_url': d['page'], 'detail': f"dup '{d['title']}' / {d['rabbi']} in series {d['series']}"},
                        'confidence': 'high'})
            stats[g]['extras_drafted_dups'] += 1
        else:
            yoav.append({'issue': 'dup_extra_has_engagement' if fk_checked else 'dup_extra_unverified',
                         'lesson_id': d['lesson_id'], 'series': d['series'], 'old_url': d['page'],
                         'detail': f"duplicate of matched item ('{d['title']}' / {d['rabbi']}) but has user favorites/comments/history rows — left visible, review"})
            stats[g]['extras_dups_flagged'] += 1

    # ---- sub-series rows: verify tree/listing coverage (no duplicate ops) -
    # covered when EITHER the sidebar tree matched it (tree_plan owns it) OR the sub-page is a
    # listing page with a mapped series (its lesson ops are emitted in this plan at that page).
    # sub_links whose URL is not a listing page at all are lesson-detail links, not series rows.
    sub_ok_tree, sub_ok_listing, sub_missing, sub_lesson_links = 0, 0, 0, 0
    for u, p, e in scope_pages:
        for sl in p.get('sub_links', []):
            if sl.get('kind') != 'series':
                continue
            su = sl['url']
            tn = tree_by_url.get(su)
            if tn and tn.get('matched_series_id'):
                sub_ok_tree += 1
            elif su in all_pages and (lm.get(su) or {}).get('mapped_series_id'):
                sub_ok_listing += 1
            elif su not in all_pages:
                sub_lesson_links += 1   # link to a lesson page rendered as a row, not a series
            else:
                sub_missing += 1
                yoav.append({'issue': 'sub_series_unmatched_in_tree', 'old_url': u,
                             'sub_series_url': su, 'title': sl['title'],
                             'detail': 'series-card on old page has no matched new series (neither sidebar tree_map nor listing mapping) — tree_plan must create it (create_series); its item ops are deferred (page_unmapped)'})

    # ---- section-level notes / code asks ---------------------------------
    code_asks.extend([
        "category/aggregation pages: old listing pages whose items live in descendant pages (e.g. תורה/, תורה/בראשית/, איך-לומדים-תנך/) rely on /category/:id descendant aggregation. Code-spec must render sub-series by series.sort_order (tree_plan) and lessons by lessons.sort_order (this plan), not lesson_count desc / published_at — otherwise per-page order parity fails (R-CAT2/R-CAT3).",
        "/series/:id must order lessons by new lessons.sort_order (this plan sets it from old order_index) with bible_chapter/title only as fallback, and order children by series.sort_order (R-SER1/R-SER5).",
        "ניווט באתר לפי ספר ופרק: old top-level nav category (sidenav of per-book 'כל-השיעורים-ב…' + per-parasha links). No new route equivalent; sidebar already exposes books→parshiot. Either add a nav landing route or map the sidebar entry to the existing tree — no lesson ops needed (0 items).",
        "פרשת השבוע: old page is dynamic (links to current-parasha קריאה בטעמים/ביאור + event page). New /parasha must resolve via the canonical parasha event series (e.g. 'פרשת קורח | טז-יח') instead of bare ilike '%name%' (R-PAR1); no lesson ops needed here (0 items).",
        "title+rabbi dedup in useLessonsBySeries will hide the intentional copies this plan creates ONLY if a same-title row exists twice in the SAME series — copies go to different series, safe; but R-SER4 still hides legit multi-part same-title lessons inside one series — dedup should key on id list from sort_order, not title.",
        "lessons.sort_order + per-series sort ops assume the apply stage adds lessons.sort_order int (per project brief).",
    ])

    # ---- stats totals -----------------------------------------------------
    totals = collections.defaultdict(int)
    for gstats in stats.values():
        for k, v in gstats.items():
            totals[k] += v
    op_counts = collections.Counter(o['op'] for o in ops)

    plan = {
        '_meta': {
            'generated_by': 'scripts/gen_lessons_plan_torah.py',
            'scope_sections': sorted(SCOPE_SECTIONS),
            'model': 'hierarchy-aware: ops at canonical home page (deepest URL-prefix listing page); '
                     'ancestor listings = aggregation (no ops, rendered via descendant tree); '
                     'non-ancestor listings = copy_lesson into the page series (event-page semantics, '
                     'consolidate-copy dup-guard by norm title+rabbi). sort_order = old order_index.',
            'vocabulary_extensions': {
                'insert_lesson.tmp_id': 'temp handle for the inserted row',
                'set_lesson_sort.lesson_id / copy_lesson.lesson_id': "may be a tmp_id string ('tmp_…') referencing an insert_lesson in this plan",
                'cross_plan_refs': 'items whose home page belongs to the neviim/moadim/ketuvim plans — apply copies after those inserts land, keyed by item_href',
            },
            'fk_check': {'performed': fk_checked, 'engaged_dup_ids': sorted(fk_engaged)},
            'sub_series_rows': {'covered_by_tree_map': sub_ok_tree, 'covered_by_listing_mapping': sub_ok_listing,
                                'lesson_detail_links_skipped': sub_lesson_links, 'missing': sub_missing,
                                'note': 'no series ops emitted here — tree_plan owns series creation/sort'},
        },
        'ops': ops,
        'yoav_review': yoav,
        'code_asks': code_asks,
        'cross_plan_refs': cross_plan,
        'stats': {
            'per_group': {g: dict(s) for g, s in sorted(stats.items())},
            'totals': dict(totals),
            'op_counts': dict(op_counts),
            'n_ops': len(ops),
            'n_yoav': len(yoav),
            'n_cross_plan': len(cross_plan),
        },
    }
    out = os.path.join(PLANS, 'lessons_plan_torah.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(plan, f, ensure_ascii=False, indent=1)
    print('WROTE', out)
    print(json.dumps(plan['stats'], ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
