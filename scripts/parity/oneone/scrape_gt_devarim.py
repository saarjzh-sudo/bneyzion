#!/usr/bin/env python3
"""R1 ground-truth scraper for OLD bneyzion category page + all its series pages.
Book = דברים. READ-ONLY network (curl --noproxy, NetSpark-safe). Caches raw HTML
under r1cache/<sha1(url)>.html. Writes gt_דברים.json + gt_דברים_manifest.json.
"""
import re, json, os, sys, hashlib, subprocess, unicodedata, time, html as _html

BASE = "https://www.bneyzion.co.il"
BOOK = "דברים"
CAT_URL = f"{BASE}/מאגר-השיעורים-והמאמרים/תורה/{BOOK}/"
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "r1cache")
OUTDIR = os.path.join(HERE, "r1")
os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUTDIR, exist_ok=True)

NIQQUD = re.compile(r'[֑-ׇ]')
STRIP_CHARS = '״"\'׳`|()-–—:,.!?'

def norm(s):
    if not s: return ""
    s = unicodedata.normalize("NFC", s)
    s = NIQQUD.sub('', s)
    s = re.sub(r'\s+', ' ', s).strip().lower()
    for c in STRIP_CHARS:
        s = s.replace(c, ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def sha1(u): return hashlib.sha1(u.encode('utf-8')).hexdigest()

def fetch(url):
    """Fetch with redirect-follow, cache by sha1 of the canonical (input) url."""
    cpath = os.path.join(CACHE, sha1(url) + ".html")
    if os.path.exists(cpath) and os.path.getsize(cpath) > 2000:
        return open(cpath, encoding='utf-8', errors='replace').read()
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
        env.pop(k, None)
    env["NO_PROXY"] = "*"
    for attempt in range(3):
        p = subprocess.run([
            "curl","-s","--noproxy","*","-L",
            "-A","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            url],
            capture_output=True, text=True, env=env, timeout=120)
        if p.stdout and "categoryTable" in p.stdout:
            open(cpath, "w", encoding='utf-8').write(p.stdout)
            return p.stdout
        if p.stdout and len(p.stdout) > 5000 and "Object Moved" not in p.stdout:
            open(cpath, "w", encoding='utf-8').write(p.stdout)
            return p.stdout
        time.sleep(1.5)
    # save whatever we got
    open(cpath, "w", encoding='utf-8').write(p.stdout or "")
    return p.stdout or ""

def abs_url(href):
    if not href: return ""
    if href.startswith("http"): return href
    return BASE + href

def text_of(html):
    s = re.sub(r'<[^>]+>', '', html)
    s = _html.unescape(s)
    s = s.replace('\xa0', ' ')
    return re.sub(r'\s+', ' ', s).strip()

def parse_category_table(html):
    """Return list of rows in DOM order from the FIRST categoryTable tbody."""
    i = html.find('categoryTable')
    if i < 0: return []
    tbody_start = html.find('<tbody>', i)
    tbody_end = html.find('</tbody>', tbody_start)
    block = html[tbody_start:tbody_end]
    raw_rows = re.split(r'<tr\b', block)[1:]
    rows = []
    for r in raw_rows:
        tds = re.findall(r'<td[^>]*>(.*?)</td>', '<td' + r if not r.lstrip().startswith('>') else r, re.S)
        # the split removed '<tr'; td regex still works on the remainder
        tds = re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)
        if len(tds) < 4:
            continue
        kind_txt = text_of(tds[0])
        # media icon
        micon = ''
        m = re.search(r'<i class="([^"]+)"', tds[1])
        if m: micon = m.group(1)
        # title + href from col3 (h3>a)
        h3 = tds[2]
        am = re.search(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', h3, re.S)
        title = text_of(am.group(2)) if am else text_of(h3)
        href = am.group(1) if am else ''
        # author from col4
        author_html = tds[3]
        aa = re.search(r'<a[^>]*>(.*?)</a>', author_html, re.S)
        author = text_of(aa.group(1)) if aa else text_of(author_html)
        # length / lesson count from col5
        length_txt = text_of(tds[4]) if len(tds) > 4 else ''
        lesson_count = None
        lc = re.search(r'(\d+)\s*שיעור', length_txt)
        if lc: lesson_count = int(lc.group(1))
        # download links from col6
        media = []
        if len(tds) > 5:
            for ma in re.finditer(r'<a[^>]*href="([^"]+)"[^>]*>', tds[5]):
                media.append(ma.group(1))
        kind = 'series' if kind_txt == 'סדרה' else ('shut' if 'שו' in kind_txt else 'lesson')
        rows.append({
            'kind': kind, 'kind_txt': kind_txt, 'title': title,
            'title_norm': norm(title), 'author': author, 'author_norm': norm(author),
            'href': abs_url(href), 'media_icon': micon, 'length_txt': length_txt,
            'lesson_count': lesson_count, 'download': media,
        })
    return rows

def parse_series_lessons(html):
    """Parse the categoryTable of a series page → list of lesson dicts in order."""
    rows = parse_category_table(html)
    lessons = []
    for r in rows:
        lessons.append({
            'title': r['title'], 'title_norm': r['title_norm'],
            'author': r['author'], 'media': r['media_icon'],
            'kind_txt': r['kind_txt'],
            'attachment_href': (r['download'][0] if r['download'] else ''),
            'all_download': r['download'],
        })
    return lessons

def main():
    print("Fetching category page:", CAT_URL, file=sys.stderr)
    chtml = fetch(CAT_URL)
    cat_rows = parse_category_table(chtml)
    print(f"Category rows: {len(cat_rows)}", file=sys.stderr)

    out = {'url': CAT_URL, 'book': BOOK, 'rows': []}
    series_rows = [r for r in cat_rows if r['kind'] == 'series']
    lesson_rows = [r for r in cat_rows if r['kind'] == 'lesson']
    shut_rows   = [r for r in cat_rows if r['kind'] == 'shut']

    series_blobs = []
    for idx, r in enumerate(cat_rows):
        row = {
            'idx': idx, 'kind': r['kind'], 'title': r['title'],
            'title_norm': r['title_norm'], 'author': r['author'],
            'href': r['href'], 'media': r['media_icon'],
        }
        if r['kind'] == 'series':
            row['lesson_count'] = r['lesson_count']
            print(f"  [{idx}] series: {r['title']} ({r['lesson_count']}) -> fetch", file=sys.stderr)
            shtml = fetch(r['href'])
            lessons = parse_series_lessons(shtml)
            row['lessons'] = lessons
            row['lessons_found'] = len(lessons)
            row['count_match'] = (r['lesson_count'] == len(lessons))
            series_blobs.append(row)
        else:
            row['length_txt'] = r['length_txt']
        out['rows'].append(row)

    outpath = os.path.join(OUTDIR, f"gt_{BOOK}.json")
    json.dump(out, open(outpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print("WROTE", outpath, file=sys.stderr)

    # manifest
    manifest = {
        'book': BOOK,
        'series': [{
            'title': s['title'], 'author': s['author'], 'href': s['href'],
            'old_count': s['lesson_count'], 'lessons_found': s['lessons_found'],
            'count_match': s['count_match'],
            'lessons': [{'title': l['title'], 'author': l['author']} for l in s['lessons']],
        } for s in series_blobs],
        'standalone': [{'title': r['title'], 'author': r['author'], 'href': r['href']} for r in lesson_rows],
        'shut': [{'title': r['title'], 'author': r['author'], 'href': r['href']} for r in shut_rows],
    }
    mpath = os.path.join(OUTDIR, f"gt_{BOOK}_manifest.json")
    json.dump(manifest, open(mpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print("WROTE", mpath, file=sys.stderr)

    # summary to stdout
    mismatches = [(s['title'], s['lesson_count'], s['lessons_found']) for s in series_blobs if not s['count_match']]
    parsha_rows = [r for r in cat_rows if re.match(r'^פרשת.* \| ', r['title'].strip())]
    summary = {
        'category_rows_total': len(cat_rows),
        'series_rows': len(series_rows),
        'standalone_lesson_rows': len(lesson_rows),
        'shut_rows': len(shut_rows),
        'count_mismatches': mismatches,
        'parsha_event_series_rows_on_category_page': [r['title'] for r in parsha_rows],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
