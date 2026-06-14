#!/usr/bin/env python3
"""R1 ground-truth builder for ויקרא category page + all rabbi-series.
READ-ONLY old-site scrape. Caches raw HTML under r1cache/ (sha1 of url).
Outputs r1/gt_ויקרא.json + r1/gt_ויקרא_manifest.json."""
import re, os, sys, json, hashlib, html as H, subprocess, time, unicodedata

BASE = "https://www.bneyzion.co.il"
HERE = os.path.dirname(os.path.abspath(__file__))
R1CACHE = os.path.join(HERE, "r1cache")
R1 = os.path.join(HERE, "r1")
os.makedirs(R1CACHE, exist_ok=True)
os.makedirs(R1, exist_ok=True)

CAT_URL = "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/ויקרא/"

NIQQUD = re.compile(r"[֑-ׇ]")
STRIP_PUNCT = '״"\'׳`|()-–—:,.!?'

def norm(s):
    if not s: return ""
    s = H.unescape(s)
    s = NIQQUD.sub("", s)
    s = unicodedata.normalize("NFC", s)
    for ch in STRIP_PUNCT:
        s = s.replace(ch, " ")
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s

def sha1(u):
    return hashlib.sha1(u.encode("utf-8")).hexdigest()

def fetch(url):
    """Fetch url with curl --noproxy, cache by sha1. Returns (html, final_url)."""
    h = sha1(url)
    fp = os.path.join(R1CACHE, h + ".html")
    mp = fp + ".meta.json"
    if os.path.exists(fp) and os.path.getsize(fp) > 0:
        meta = {}
        if os.path.exists(mp):
            try: meta = json.load(open(mp, encoding="utf-8"))
            except Exception: pass
        return open(fp, encoding="utf-8").read(), meta.get("final_url", url)
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
        env.pop(k, None)
    env["NO_PROXY"] = "*"
    p = subprocess.run(
        ["curl","-s","--noproxy","*","-L","-w","\n@@HTTP@@%{http_code}@@%{url_effective}@@", url],
        capture_output=True, text=True, env=env, timeout=120)
    out = p.stdout
    mm = re.search(r"\n@@HTTP@@(\d+)@@(.*?)@@$", out, re.S)
    code = mm.group(1) if mm else "?"
    final = mm.group(2).strip() if mm else url
    body = out[:mm.start()] if mm else out
    with open(fp, "w", encoding="utf-8") as f:
        f.write(body)
    json.dump({"url": url, "final_url": final, "status": code},
              open(mp, "w", encoding="utf-8"), ensure_ascii=False)
    time.sleep(0.4)
    return body, final

def abs_url(href):
    if not href: return href
    if href.startswith("http"): return href
    if href.startswith("/"): return BASE + href
    return href

def get_category_table(html):
    i = html.find("categoryTable")
    if i < 0: return None
    ti = html.find("<table", i)
    te = html.find("</table>", ti)
    if ti < 0 or te < 0: return None
    return html[ti:te+8]

def parse_rows(tbl):
    """Return list of row dicts from a categoryTable. First tr is header."""
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", tbl, re.S)
    out = []
    for r in rows:
        cells = re.findall(r"<td[^>]*>(.*?)</td>", r, re.S)
        if not cells:  # header row uses <th>
            continue
        kind_raw = re.sub(r"<[^>]+>", "", cells[0]).strip()
        # title + href from h3>a
        title = href = ""
        if len(cells) > 2:
            tm = re.search(r'<h3>\s*<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', cells[2], re.S)
            if tm:
                href = abs_url(H.unescape(tm.group(1)))
                title = H.unescape(re.sub(r"<[^>]+>", "", tm.group(2))).strip()
        # author from cell 3
        author = ""
        if len(cells) > 3:
            author = H.unescape(re.sub(r"<[^>]+>", "", cells[3])).strip()
        # cell 4: count (series) or length (lesson)
        c4 = re.sub(r"<[^>]+>", "", cells[4]).strip() if len(cells) > 4 else ""
        c4 = H.unescape(re.sub(r"\s+", " ", c4))
        # media icons from cell1 (the icon col) + download links cell5
        media = []
        if len(cells) > 1:
            for ic in re.findall(r'fa fa-([a-z-]+)', cells[1]):
                media.append(ic)
        dl = []
        if len(cells) > 5:
            for am in re.findall(r'<a[^>]*href="([^"]*)"[^>]*>', cells[5]):
                dl.append(abs_url(H.unescape(am)))
        out.append({
            "kind_raw": kind_raw, "title": title, "href": href,
            "author": author, "c4": c4, "media": media, "dl": dl,
        })
    return out

def lesson_count_from_c4(c4):
    m = re.search(r"(\d+)\s*שיעור", c4)
    return int(m.group(1)) if m else None

def parse_series_lessons(html):
    """Parse a series page's lesson table -> list of {title,author,media,attachment_href}."""
    tbl = get_category_table(html)
    if not tbl: return []
    rows = parse_rows(tbl)
    out = []
    for idx, r in enumerate(rows):
        # On a series page rows are lessons (kind שיעור / שו"ת / מאמר)
        out.append({
            "idx": idx,
            "title": r["title"],
            "title_norm": norm(r["title"]),
            "author": r["author"],
            "media": r["media"],
            "attachment_href": r["dl"][0] if r["dl"] else None,
            "kind_raw": r["kind_raw"],
            "href": r["href"],
        })
    return out

def classify(kind_raw):
    k = kind_raw.replace(" ", "")
    if "סדרה" in k: return "series"
    if "שו" in k and "ת" in k: return "shut"
    return "lesson"

def main():
    cat_html, cat_final = fetch(CAT_URL)
    tbl = get_category_table(cat_html)
    rows = parse_rows(tbl)
    gt = {"url": CAT_URL, "final_url": cat_final, "rows": []}
    series_rows = []
    n_series = n_lesson = n_shut = 0
    pipe_matches = []
    for i, r in enumerate(rows):
        kind = classify(r["kind_raw"])
        lc = lesson_count_from_c4(r["c4"]) if kind == "series" else None
        row = {
            "idx": i, "kind": kind, "kind_raw": r["kind_raw"],
            "title": r["title"], "title_norm": norm(r["title"]),
            "author": r["author"], "href": r["href"],
            "media": r["media"],
        }
        if kind == "series":
            row["lesson_count"] = lc
            n_series += 1
            series_rows.append(row)
        else:
            row["length"] = r["c4"]
            row["attachment_href"] = r["dl"][0] if r["dl"] else None
            if kind == "shut": n_shut += 1
            else: n_lesson += 1
        # parsha event-series detection: "פרשת ... | <range>"
        if re.match(r"^\s*פרשת\b.*\|", r["title"]):
            pipe_matches.append({"idx": i, "title": r["title"], "kind": kind})
        gt["rows"].append(row)

    # Fetch each series page, parse lessons
    series_out = []
    mismatches = []
    for srow in series_rows:
        s_html, s_final = fetch(srow["href"])
        lessons = parse_series_lessons(s_html)
        # filter out any row that is itself a sub-series (kind_raw סדרה) – series pages shouldn't have, but guard
        real = [l for l in lessons]
        actual = len(real)
        claimed = srow.get("lesson_count")
        if claimed is not None and actual != claimed:
            mismatches.append({
                "series": srow["title"], "href": srow["href"],
                "claimed": claimed, "actual": actual})
        series_out.append({
            "title": srow["title"], "title_norm": srow["title_norm"],
            "author": srow["author"], "href": srow["href"],
            "lesson_count_claimed": claimed, "lesson_count_actual": actual,
            "lessons": real,
        })
    gt["series"] = series_out
    gt["counts"] = {"series": n_series, "lessons": n_lesson, "shut": n_shut,
                    "total_rows": len(rows)}
    gt["pipe_parsha_event_series_on_category_page"] = pipe_matches
    gt["count_mismatches"] = mismatches

    outp = os.path.join(R1, "gt_ויקרא.json")
    json.dump(gt, open(outp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    # manifest
    manifest = {
        "series": [{
            "title": s["title"], "author": s["author"],
            "old_count": s["lesson_count_actual"],
            "old_count_claimed": s["lesson_count_claimed"],
            "lessons": [{"title": l["title"], "author": l["author"]} for l in s["lessons"]],
        } for s in series_out],
        "standalone": [{"title": r["title"], "author": r["author"]}
                       for r in gt["rows"] if r["kind"] == "lesson"],
        "shut": [{"title": r["title"], "author": r["author"]}
                 for r in gt["rows"] if r["kind"] == "shut"],
    }
    json.dump(manifest, open(os.path.join(R1, "gt_ויקרא_manifest.json"), "w",
              encoding="utf-8"), ensure_ascii=False, indent=2)

    print(json.dumps({
        "series_rows": n_series, "standalone_lesson_rows": n_lesson,
        "shut_rows": n_shut, "total_data_rows": len(rows),
        "pipe_parsha_matches": pipe_matches,
        "count_mismatches": mismatches,
    }, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
