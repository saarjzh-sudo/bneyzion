#!/usr/bin/env python3
"""R1 parser for bnei-zion old category pages + series pages. Read-only network via curl --noproxy."""
import re, os, sys, json, hashlib, subprocess, unicodedata, html as htmlmod

BASE = "https://www.bneyzion.co.il"
CACHE = os.path.join(os.path.dirname(__file__), "r1cache")
os.makedirs(CACHE, exist_ok=True)

def norm(s):
    if s is None:
        return ""
    s = htmlmod.unescape(s)
    s = unicodedata.normalize("NFC", s)
    # strip niqqud / cantillation
    s = "".join(ch for ch in s if not (0x0591 <= ord(ch) <= 0x05C7))
    s = s.lower()
    # collapse ws
    s = re.sub(r"\s+", " ", s).strip()
    # strip punctuation listed in rules
    for ch in ['״','"',"'",'׳','`','|','(',')','-','–','—',':',',','.','!','?']:
        s = s.replace(ch, " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s

def fetch(url):
    sha = hashlib.sha1(url.encode("utf-8")).hexdigest()
    path = os.path.join(CACHE, sha + ".html")
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return open(path, encoding="utf-8").read()
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
        env.pop(k, None)
    env["NO_PROXY"] = "*"
    p = subprocess.run(["curl","-sL","--noproxy","*","--compressed",
                        "-A","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                        url], capture_output=True, text=True, env=env, timeout=120)
    html = p.stdout
    open(path,"w",encoding="utf-8").write(html)
    return html

def get_table(html):
    i = html.find('<div class="categoryTable')
    if i < 0:
        return None
    j = html.find('</table>', i)
    return html[i:j]

def split_rows(table):
    # tbody only
    tb = table.find('<tbody>')
    body = table[tb:] if tb >= 0 else table
    # split on <tr ; keep rows that contain <td>
    parts = re.split(r'(?=<tr\b)', body)
    return [p for p in parts if '<td' in p and '<th' not in p]

def text_of(s):
    s = re.sub(r'<[^>]+>', '', s)
    return htmlmod.unescape(s).strip()

def parse_category_row(tr, idx):
    # td list
    tds = re.findall(r'<td\b[^>]*>(.*?)</td>', tr, re.S)
    if not tds:
        return None
    kind_raw = text_of(tds[0])
    if kind_raw == 'סדרה':
        kind = 'series'
    elif kind_raw == 'שו"ת' or kind_raw == 'שו”ת' or 'שו' in kind_raw and 'ת' in kind_raw and 'שיעור' not in kind_raw and len(kind_raw) <= 5:
        kind = 'shut'
    elif kind_raw == 'שיעור':
        kind = 'lesson'
    else:
        kind = kind_raw  # unknown, keep raw
    # title + href : find first h3>a
    m = re.search(r'<h3>\s*<a\s+href="([^"]+)"[^>]*>(.*?)</a>', tr, re.S)
    href = htmlmod.unescape(m.group(1)) if m else ""
    title = text_of(m.group(2)) if m else ""
    # author : the <td> with <a href=...rbanim?rav=...>  OR plain author text
    author = ""
    ma = re.search(r'<a\s+href="[^"]*rav=[^"]*"[^>]*>(.*?)</a>', tr, re.S)
    if ma:
        author = text_of(ma.group(1))
    else:
        # author td is usually index 3 (0 kind,1 icon,2 title,3 author,4 length,5 dl)
        if len(tds) >= 4:
            author = text_of(tds[3])
    # length / lesson_count
    length_raw = ""
    lesson_count = None
    if len(tds) >= 5:
        length_raw = text_of(tds[4])
    mc = re.search(r'(\d+)\s*שיעור', length_raw)
    if mc:
        lesson_count = int(mc.group(1))
    # media icons in row
    media = re.findall(r'<i class="(fa [^"]+)"></i>', tr)
    # download links
    dls = re.findall(r'<a\s+href="([^"]+)"[^>]*>(?:(?!</a>).)*?</a>', tr, re.S)
    return {
        "idx": idx,
        "kind": kind,
        "kind_raw": kind_raw,
        "title": title,
        "title_norm": norm(title),
        "author": author,
        "author_norm": norm(author),
        "href": href,
        "lesson_count": lesson_count,
        "length_raw": length_raw,
        "media": media,
    }

def parse_series_lessons(html):
    table = get_table(html)
    if table is None:
        return None
    rows = split_rows(table)
    out = []
    for idx, tr in enumerate(rows):
        tds = re.findall(r'<td\b[^>]*>(.*?)</td>', tr, re.S)
        m = re.search(r'<h3>\s*<a\s+href="([^"]+)"[^>]*>(.*?)</a>', tr, re.S)
        if not m:
            # some lesson rows may not have h3>a if it's a sub-series; still capture title text
            m2 = re.search(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>', tr, re.S)
            href = htmlmod.unescape(m2.group(1)) if m2 else ""
            title = text_of(m2.group(2)) if m2 else text_of(tr)
        else:
            href = htmlmod.unescape(m.group(1)); title = text_of(m.group(2))
        author = ""
        ma = re.search(r'<a\s+href="[^"]*rav=[^"]*"[^>]*>(.*?)</a>', tr, re.S)
        if ma:
            author = text_of(ma.group(1))
        elif len(tds) >= 4:
            author = text_of(tds[3])
        kind_raw = text_of(tds[0]) if tds else ""
        # attachment href: prefer download links to /media or s3 or mp3/pdf
        att = ""
        for href2 in re.findall(r'href="([^"]+)"', tr):
            hl = href2.lower()
            if any(x in hl for x in ['/media/', 's3.', '.mp3', '.pdf', '.mp4', 'amazonaws']):
                att = htmlmod.unescape(href2); break
        media = re.findall(r'<i class="(fa [^"]+)"></i>', tr)
        out.append({
            "idx": idx, "kind_raw": kind_raw,
            "title": title, "title_norm": norm(title),
            "author": author, "author_norm": norm(author),
            "media": media, "attachment_href": att, "href": href,
        })
    return out

def main():
    book = "בראשית"
    cat_url = f"{BASE}/מאגר-השיעורים-והמאמרים/תורה/{book}/"
    html = fetch(cat_url)
    table = get_table(html)
    rows_raw = split_rows(table)
    cat_rows = []
    for idx, tr in enumerate(rows_raw):
        r = parse_category_row(tr, idx)
        if r:
            cat_rows.append(r)
    series_rows = [r for r in cat_rows if r["kind"] == "series"]
    lesson_rows = [r for r in cat_rows if r["kind"] == "lesson"]
    shut_rows = [r for r in cat_rows if r["kind"] == "shut"]
    print(f"CATEGORY rows: total={len(cat_rows)} series={len(series_rows)} lessons={len(lesson_rows)} shut={len(shut_rows)}")

    # parsha event-series detection on category rows
    parsha_on_cat = [r for r in cat_rows if re.match(r'^\s*פרשת\s', r["title"]) and '|' in r["title"]]
    print(f"PARSHA-on-category rows (title 'פרשת% | %'): {len(parsha_on_cat)}")
    for r in parsha_on_cat:
        print("   ", r["title"])

    # fetch each series page and parse lessons
    series_out = []
    for r in series_rows:
        href = r["href"]
        surl = href if href.startswith("http") else BASE + href
        shtml = fetch(surl)
        lessons = parse_series_lessons(shtml) or []
        actual = len(lessons)
        mismatch = (r["lesson_count"] is not None and actual != r["lesson_count"])
        series_out.append({
            **r, "series_url": surl, "lessons": lessons,
            "actual_lessons": actual, "count_mismatch": mismatch,
        })
        flag = "  <-- MISMATCH" if mismatch else ""
        print(f"  SERIES '{r['title']}' [{r['author']}] cat={r['lesson_count']} actual={actual}{flag}")

    gt = {
        "url": cat_url,
        "book": book,
        "counts": {
            "series": len(series_rows),
            "standalone": len(lesson_rows),
            "shut": len(shut_rows),
            "total": len(cat_rows),
            "parsha_on_category": len(parsha_on_cat),
        },
        "rows": cat_rows,
        "series": series_out,
        "standalone": lesson_rows,
        "shut": shut_rows,
        "parsha_on_category_rows": [{"title": r["title"], "href": r["href"]} for r in parsha_on_cat],
    }
    outdir = os.path.join(os.path.dirname(__file__), "r1")
    os.makedirs(outdir, exist_ok=True)
    op = os.path.join(outdir, f"gt_{book}.json")
    json.dump(gt, open(op,"w",encoding="utf-8"), ensure_ascii=False, indent=2)
    print("WROTE", op)

    # manifest
    manifest = {
        "book": book,
        "series": [{
            "title": s["title"], "author": s["author"],
            "old_count": s["lesson_count"], "actual_lessons": s["actual_lessons"],
            "count_mismatch": s["count_mismatch"],
            "lessons": [{"title": l["title"], "author": l["author"]} for l in s["lessons"]],
        } for s in series_out],
        "standalone": [{"title": r["title"], "author": r["author"]} for r in lesson_rows],
        "shut": [{"title": r["title"], "author": r["author"]} for r in shut_rows],
    }
    mp = os.path.join(outdir, f"gt_{book}_manifest.json")
    json.dump(manifest, open(mp,"w",encoding="utf-8"), ensure_ascii=False, indent=2)
    print("WROTE", mp)

if __name__ == "__main__":
    main()
