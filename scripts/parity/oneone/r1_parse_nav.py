#!/usr/bin/env python3
"""Parse old chapter-nav page -> bible_nav.json
Structure per book on the old page:
  <a href=CATEGORY><strong>BOOK</strong></a> <strong> | </strong>
  <a href=CHAPTER_SERIES title="פרשת X | range">label [range],</a> ...
until the next bold book anchor.
Each chapter link = a parsha/chapter event-series page.
"""
import re, html, json, os, unicodedata, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "r1cache")
NAV_URL = "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/ניווט-באתר-לפי-ספר-ופרק/"

def cache_path(url):
    return os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest() + ".html")

NIQQUD = re.compile(r"[֑-ׇ]")
def norm(s):
    s = NIQQUD.sub("", s)
    s = unicodedata.normalize("NFC", s)
    s = s.lower()
    for ch in '״"\'׳`|()-–—:,.!?':
        s = s.replace(ch, " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s

# Hebrew gematria for chapter numbering (used to map ranges to numbers)
HEB_VAL = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
           'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,
           'ק':100,'ר':200,'ש':300,'ת':400}
def heb_to_num(tok):
    tok = tok.strip()
    # final letters
    tok = tok.replace('ך','כ').replace('ם','מ').replace('ן','נ').replace('ף','פ').replace('ץ','צ')
    if not tok or any(c not in HEB_VAL for c in tok):
        return None
    return sum(HEB_VAL[c] for c in tok)

def expand_range(a, b):
    """expand inclusive numeric range a..b -> list."""
    if a is None or b is None or b < a or b - a > 60:
        return [a] if a is not None else []
    return list(range(a, b + 1))

def parse_chapter_nums(label, rng_brackets):
    """From a visible label, extract list of chapter numbers.
    Torah: label is parsha name; the chapter range lives in [..] brackets (rng_brackets).
    Neviim/Ketuvim: label IS the chapter letters, possibly comma-list 'ד, ה' or range 'יד-טו'.
    """
    nums = []
    # Prefer bracket range (Torah parsha range like 'א-ו'); else parse the label
    # itself (Neviim/Ketuvim labels ARE chapter letters: 'א', 'ד, ה', 'יד-טו').
    # Never use a theme subtitle as the chapter source.
    src = rng_brackets if (rng_brackets and re.search(r'[א-ת]', rng_brackets)
                           and not re.search(r'\bפרק', rng_brackets)) else label
    # split comma-separated chapter tokens
    parts = re.split(r'[,،]', src)
    for p in parts:
        p = p.strip()
        if not p:
            continue
        # a hyphen range inside a part -> expand
        rsplit = re.split(r'[-–—]', p)
        if len(rsplit) == 2:
            a, b = heb_to_num(rsplit[0]), heb_to_num(rsplit[1])
            if a is not None and b is not None:
                nums.extend(expand_range(a, b))
                continue
        n = heb_to_num(p)
        if n is not None:
            nums.append(n)
    # dedup preserve order
    out = []
    for n in nums:
        if n not in out:
            out.append(n)
    return out

BOOK_ANCHOR = re.compile(
    r'<a [^>]*href="([^"]+)"[^>]*>\s*<strong>([^<]+)</strong>\s*</a>')
CHAP_ANCHOR = re.compile(
    r'<a [^>]*href="([^"]+)"[^>]*?(?:title="([^"]*)")?[^>]*>([^<]*?)</a>')

def main():
    h = open(cache_path(NAV_URL), encoding="utf-8", errors="replace").read()
    m = re.search(r'<h1[^>]*>\s*ניווט לפי ספר ופרק', h)
    start = m.start()
    end = h.find('<footer', start)
    if end < 0:
        end = h.find('</body>', start)
    body = h[start:end]

    # Find bold book anchors with positions
    bolds = list(BOOK_ANCHOR.finditer(body))
    result = {}
    for idx, bm in enumerate(bolds):
        book = html.unescape(bm.group(2)).strip()
        cat_href = html.unescape(bm.group(1)).strip()
        seg_start = bm.end()
        seg_end = bolds[idx+1].start() if idx+1 < len(bolds) else len(body)
        seg = body[seg_start:seg_end]
        chapters = []
        seen = set()
        for cm in re.finditer(r'<a\s+([^>]*?)>([^<]*?)</a>', seg):
            attrs = cm.group(1)
            label_raw = html.unescape(re.sub(r'<[^>]+>', '', cm.group(2))).strip()
            href_m = re.search(r'href="([^"]+)"', attrs)
            title_m = re.search(r'title="([^"]*)"', attrs)
            if not href_m:
                continue
            href = html.unescape(href_m.group(1)).strip()
            title = html.unescape(title_m.group(1)).strip() if title_m else ""
            # skip empty / strong-only
            if not label_raw:
                continue
            label = label_raw.rstrip(',').strip()
            # extract bracket range from label "[א-ו]" (Torah parsha range)
            rng = None
            rm = re.search(r'\[([^\]]+)\]', label)
            if rm:
                rng = rm.group(1).strip()
            clean_label = re.sub(r'\s*\[[^\]]*\]\s*', '', label).strip()
            # title may carry "... | range"
            title_range = title.split('|')[-1].strip() if '|' in title else None
            chapter_nums = parse_chapter_nums(clean_label, rng)
            num = chapter_nums[0] if chapter_nums else None
            key = href
            if key in seen:
                continue
            seen.add(key)
            chapters.append({
                "label": clean_label,
                "range": rng or title_range,
                "num": num,
                "chapter_nums": chapter_nums,
                "href": href,
                "title": title,
            })
        covered = []
        for c in chapters:
            for n in c["chapter_nums"]:
                if n not in covered:
                    covered.append(n)
        result[book] = {
            "category_href": cat_href,
            "chapters": chapters,
            "total": len(chapters),
            "covered_chapters": sorted(covered),
        }
    out = os.path.join(HERE, "r1", "bible_nav.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    # summary
    tot = sum(v["total"] for v in result.values())
    print(f"books={len(result)} total_chapter_links={tot}")
    for b, v in result.items():
        print(f"  {b}: {v['total']}")
    print("wrote", out)

if __name__ == "__main__":
    main()
