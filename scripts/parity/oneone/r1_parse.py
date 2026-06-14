#!/usr/bin/env python3
"""Parse bneyzion old-site categoryTable rows in order.
Each <tr> in tbody: td0=kind, td1=media icon, td2=h3>a title, td3=author a, td4=length/'N שיעורים', td5=download links.
"""
import re, unicodedata, html as htmlmod

def strip_niqqud(s):
    return "".join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))

def norm(s):
    if s is None:
        return ""
    s = htmlmod.unescape(s)
    s = strip_niqqud(s)
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    for ch in ['"', '"', '"', "'", "׳", "`", "|", "(", ")", "-", "–", "—", ":", ",", ".", "!", "?"]:
        s = s.replace(ch, " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s

def clean_text(s):
    if s is None:
        return ""
    s = re.sub(r"<[^>]+>", "", s)
    s = htmlmod.unescape(s)
    return re.sub(r"\s+", " ", s).strip()

def get_table_body(html):
    i = html.find("categoryTable")
    if i < 0:
        return None
    tb = html.find("<tbody>", i)
    if tb < 0:
        return None
    te = html.find("</tbody>", tb)
    return html[tb + len("<tbody>"):te]

def split_rows(body):
    # rows separated by <tr ...> ... </tr>
    return re.findall(r"<tr\b.*?</tr>", body, re.S)

def split_cells(row):
    return re.findall(r"<td\b[^>]*>(.*?)</td>", row, re.S)

KIND_MAP = {"סדרה": "series", "שיעור": "lesson", 'שו"ת': "shut", "שו״ת": "shut", "שו”ת": "shut"}

def media_from_icon(cell):
    m = []
    if "fa-volume-up" in cell:
        m.append("audio")
    if "fa-video-camera" in cell:
        m.append("video")
    if "fa-file-text" in cell or "fa-files-o" in cell:
        m.append("text")
    if "fa-youtube" in cell:
        m.append("youtube")
    return m

def media_from_links(cell):
    out = []
    for href, title in re.findall(r'<a[^>]+href="([^"]+)"[^>]*title="([^"]*)"', cell):
        out.append({"href": htmlmod.unescape(href), "title": clean_text(title)})
    if not out:
        for href in re.findall(r'<a[^>]+href="([^"]+)"', cell):
            out.append({"href": htmlmod.unescape(href), "title": ""})
    return out

def parse_category(html, base="https://www.bneyzion.co.il"):
    body = get_table_body(html)
    rows_out = []
    if body is None:
        return rows_out
    for idx, row in enumerate(split_rows(body)):
        cells = split_cells(row)
        if len(cells) < 5:
            continue
        kind_raw = clean_text(cells[0])
        kind = KIND_MAP.get(kind_raw, kind_raw)
        media_icon = media_from_icon(cells[1]) if len(cells) > 1 else []
        title_cell = cells[2] if len(cells) > 2 else ""
        ma = re.search(r'<h3>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', title_cell, re.S)
        if ma:
            href = htmlmod.unescape(ma.group(1))
            title = clean_text(ma.group(2))
        else:
            am = re.search(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', title_cell, re.S)
            href = htmlmod.unescape(am.group(1)) if am else None
            title = clean_text(am.group(2)) if am else clean_text(title_cell)
        if href and href.startswith("/"):
            href = base + href
        author_cell = cells[3] if len(cells) > 3 else ""
        author = clean_text(re.sub(r"<[^>]+>", " ", author_cell))
        length_cell = clean_text(cells[4]) if len(cells) > 4 else ""
        lesson_count = None
        cm = re.search(r"(\d+)\s*שיעור", length_cell)
        if cm:
            lesson_count = int(cm.group(1))
        download = media_from_links(cells[5]) if len(cells) > 5 else []
        rows_out.append({
            "idx": idx,
            "kind": kind if kind in ("series", "lesson", "shut") else ("series" if kind_raw == "סדרה" else "lesson"),
            "kind_raw": kind_raw,
            "title": title,
            "title_norm": norm(title),
            "author": author,
            "href": href,
            "lesson_count": lesson_count,
            "length": length_cell,
            "media": media_icon,
            "download": download,
        })
    return rows_out

def parse_series_lessons(html, base="https://www.bneyzion.co.il"):
    """A series page is itself a categoryTable of lessons. Reuse parse_category, keep lesson/shut rows."""
    rows = parse_category(html, base)
    lessons = []
    for r in rows:
        lessons.append({
            "idx": len(lessons),
            "kind": r["kind"],
            "title": r["title"],
            "title_norm": r["title_norm"],
            "author": r["author"],
            "media": r["media"],
            "attachment_href": (r["download"][0]["href"] if r["download"] else None),
            "href": r["href"],
            "length": r["length"],
        })
    return lessons

if __name__ == "__main__":
    import sys, json
    html = open(sys.argv[1], encoding="utf-8", errors="replace").read()
    rows = parse_category(html)
    print(json.dumps(rows, ensure_ascii=False, indent=2))
