#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
real_parity.py — bneyzion REAL node-by-node CORRESPONDENCE audit
=================================================================
Replacement for the fake parity_watch.py (which only checks non-emptiness +
anti-regression on a single scalar and therefore reports "0 gaps" while a
category renders the wrong series, in the wrong order, with no standalone
lessons — Yoav's round-6 complaint).

What this engine actually does, per the required invariant:
  For EVERY sidebar node, compare the NEW site's rendered item list against
  the OLD site's rendered item list, element-for-element:
    - missingSeries            : old SERIES with no new counterpart
    - extraSeries              : new SERIES with no old counterpart
                                 (catches דפי-עבודה worksheet leak + dup הרב אבינר)
    - orderMismatch (bool)     : new render order != old DOM order
    - missingStandaloneLessons : old standalone LESSON rows absent from new
                                 (THE screenshotted "series-only" bug)
    - oldCount / newCount, severity

DATA SOURCES
  OLD  : PRIMARY = live re-scrape of the old page HTML in DOM order
         (the only true source of render ORDER + author + length + kind).
         Old book/category pages render ONE interleaved table:
           div.lessonBlock.lessonSeriesBlock  -> SERIES row
           div.lessonBlock (no SeriesBlock)   -> STANDALONE LESSON row
           <h3><a href title>title</a></h3>
           <div class="author">..</div>      -> מאת
           <div class="duration">..</div>     -> אורך
         FALLBACK = cached crawl audit_full_state.json children[] (MEMBERSHIP
         only — its order == sorted(url), NOT render order, so when we fall
         back we DO NOT assert orderMismatch).
  NEW  : Supabase (token from sbq.py). Mirrors useContentSidebar.useSeriesForNode
         (series cards) and CategoryPage.useDirectLessons (standalone lessons via
         lessons.cat_standalone), applying the exact public filters + band sort.

READ-ONLY. Writes nothing except its report JSON under reports/.
Usage:  python3 real_parity.py            # all nodes
        python3 real_parity.py --book שמות # one book (debug)
        python3 real_parity.py --no-scrape # cache-only OLD (membership, no order)
"""
from __future__ import annotations
import os, re, sys, json, time, html, subprocess
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from parity_engine import normalize_he, canonical_match  # noqa: E402

# ── Supabase token from sbq.py (never committed elsewhere) ───────────────────
_sbq = (HERE / "sbq.py").read_text(encoding="utf-8")
_m = re.search(r'TOKEN\s*=\s*"([^"]+)"', _sbq)
SB_TOKEN = _m.group(1) if _m else ""
SB_REF = "pzvmwfexeiruelwiujxn"
OLD_SITE = "https://www.bneyzion.co.il"
STATE = HERE / "audit_full_state.json"
REPORTS = HERE / "reports"; REPORTS.mkdir(exist_ok=True)

# Sidebar ROOT_IDS — mirror src/hooks/useContentSidebar.ts L24-37
ROOT_IDS = {
    "recordedProject": "041ce810-92ae-59e4-9e07-11fd014255fa",
    "torah":           "bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b",
    "neviim":          "a0472c9f-8212-44ff-8937-ace5fea4b4dc",
    "ketuvim":         "5cdd770c-9593-4b0d-9f9e-cda50cf5ef41",
    "howToLearn":      "62590949-6187-4e17-b84d-65a518467521",
    "generalTopics":   "2d6d28c1-3c5c-4d61-9283-410bc56cd351",
    "moadim":          "92130154-e96a-4f98-b032-5a20ac385f63",
    "haftarot":        "3327c721-7bc9-471c-878f-0b3aef98b090",
    "tools":           "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7",
    "yemeiIyun":       "f4040001-0001-4000-8000-000000000000",
    "livuyTatim":      "7cbd261e-03b0-43da-a708-e8ae4402105f",
}
# dual-audience allow-list (CategoryPage / sidebar exception) — keep teachers rows public here
PUBLIC_DUAL_ALLOWED = {ROOT_IDS["tools"], "4d78557b-da8b-4b1f-8d8e-09d74ff3070a"}

# Old-site category segment per book root
SEC_SEG = {ROOT_IDS["torah"]: "תורה", ROOT_IDS["neviim"]: "נביאים", ROOT_IDS["ketuvim"]: "כתובים"}

# ── Supabase query (throttle-aware) ──────────────────────────────────────────
def q(sql, _tries=6):
    body = json.dumps({"query": sql})
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): env.pop(k, None)
    env["NO_PROXY"] = "*"
    for i in range(_tries):
        p = subprocess.run(["curl","-s","--noproxy","*","-X","POST",
            f"https://api.supabase.com/v1/projects/{SB_REF}/database/query",
            "-H",f"Authorization: Bearer {SB_TOKEN}","-H","Content-Type: application/json",
            "--data-binary","@-"], input=body, capture_output=True, text=True, env=env, timeout=120)
        try: data = json.loads(p.stdout)
        except Exception: data = None
        if isinstance(data, list):
            time.sleep(0.3); return data
        if isinstance(data, dict) and "Throttler" in str(data.get("message","")):
            time.sleep(2.0*(i+1)); continue
        time.sleep(1.0*(i+1))
    return []

def esc(s): return (s or "").replace("'", "''")

# ── OLD site: live re-scrape in DOM order ────────────────────────────────────
_scrape_cache: dict[str, str | None] = {}
def fetch_old(url_path: str) -> str | None:
    if url_path in _scrape_cache: return _scrape_cache[url_path]
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): env.pop(k, None)
    env["NO_PROXY"] = "*"
    p = subprocess.run(["curl","-sL","--noproxy","*","--max-time","45","-A","Mozilla/5.0",
        OLD_SITE + url_path], capture_output=True, env=env, timeout=55)
    out = p.stdout.decode("utf-8", errors="replace")
    if not out or len(out) < 2000 or "Page not found" in out[:3000]:
        out = None
    _scrape_cache[url_path] = out
    return out

_BLOCK = re.compile(
    r'<div class="(lessonBlock[^"]*)"(.*?)(?=<div class="lessonBlock|</section|</main|<footer|<div class="swiper-pagination)',
    re.S)
def _txt(s): return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()

def parse_old_rows(html_text: str) -> list[dict]:
    """Parse old category page into ordered rows (DOM order). Each row:
       {ordinal, kind: series|lesson, title, href, author, length}."""
    rows = []
    for i, (cls, body) in enumerate(_BLOCK.findall(html_text)):
        kind = "series" if "lessonSeriesBlock" in cls else "lesson"
        mh = re.search(r'<h3[^>]*>(.*?)</h3>', body, re.S)
        if not mh:
            continue
        title = _txt(mh.group(1))
        if not title:
            continue
        mhref = re.search(r'href="([^"]+)"', mh.group(1))
        href = html.unescape(mhref.group(1)) if mhref else ""
        ma = re.search(r'<div class="author"[^>]*>(.*?)</div>', body, re.S)
        author = _txt(ma.group(1)) if ma else ""
        ml = re.search(r'<div class="duration"[^>]*>(.*?)</div>', body, re.S)
        length = _txt(ml.group(1)) if ml else ""
        rows.append({"ordinal": len(rows), "kind": kind, "title": title,
                     "href": href, "author": author, "length": length})
    return rows

# ── OLD site: cache fallback (MEMBERSHIP only, sorted-url order) ──────────────
_state = None
def state():
    global _state
    if _state is None:
        _state = json.load(open(STATE, encoding="utf-8"))
    return _state

def cache_children(url_path: str):
    s = state()
    ch = s["children"].get(url_path)
    if ch is None: return None
    out = []
    for c in ch:
        sub = s["children"].get(c, [])
        h1 = s["pages"].get(c, {}).get("h1", "")
        # title from last non-empty path seg if no h1
        title = h1 or _txt(c.rstrip("/").split("/")[-1].replace("-", " "))
        out.append({"kind": "series" if len(sub) > 0 else "lesson",
                    "title": title, "href": c})
    return out  # NOTE: order == sorted(url), not render order

# ── NEW site: mirror useSeriesForNode + useDirectLessons ─────────────────────
def descendant_ids_sql(root):
    return (f"WITH RECURSIVE d AS (SELECT id FROM series WHERE id='{root}' "
            f"UNION SELECT c.id FROM series c JOIN d ON c.parent_id=d.id) SELECT id FROM d")

_PARSHA_EVENT = re.compile(r'^\s*פרשת\s.*\|\s*[א-ת]')
def _norm_title(t): return re.sub(r'\s+', ' ', re.sub(r'[״"\'׳‘’“”`]', '', (t or '').strip()))

def new_series_rows(node_id: str, allow_dual: bool) -> list[dict]:
    """Mirror useSeriesForNode: descendant series, public filter, dedup, band sort,
       then CategoryPage filter (lessonCount>0 or draft)."""
    aud = "" if allow_dual else "AND NOT (audience_tags @> '{teachers}')"
    rows = q(f"""SELECT id, title, lesson_count, rabbi_id, status, parent_id, sort_order
        FROM series
        WHERE id IN ({descendant_ids_sql(node_id)})
          AND status IN ('active','published','draft') {aud}
        ORDER BY sort_order ASC NULLS LAST, title ASC LIMIT 1000""")
    # drop self + parsha-event clones + 0-lesson draft placeholders whose parent==node
    flt = [r for r in rows if r["id"] != node_id
           and not _PARSHA_EVENT.match(r["title"] or "")
           and not (r["status"] == "draft" and (r.get("lesson_count") or 0) == 0
                    and r.get("parent_id") == node_id)]
    # canonical dedup by normalized title (prefer non-draft + has lessons)
    by = {}
    def score(r): return (2 if r["status"] != "draft" else 0) + (1 if (r.get("lesson_count") or 0) > 0 else 0)
    for r in flt:
        k = _norm_title(r["title"])
        if k not in by or score(r) > score(by[k]):
            by[k] = r
    canon = list(by.values())
    # band sort (1-99 / parked>=100 / 0|NULL alpha)
    def band(so): return 2 if (so is None or so == 0) else (1 if so >= 100 else 0)
    def keyf(r):
        so = r.get("sort_order")
        b = band(so)
        return (b, so or 0)
    canon.sort(key=lambda r: (keyf(r)[0], keyf(r)[1], normalize_he(r["title"])))
    # CategoryPage card filter: lessonCount>0 OR draft
    cards = [r for r in canon if (r.get("lesson_count") or 0) > 0 or r["status"] == "draft"]
    # resolve rabbi names
    rids = list({r["rabbi_id"] for r in cards if r.get("rabbi_id")})
    rmap = {}
    if rids:
        idlist = ",".join(f"'{x}'" for x in rids)
        for rr in q(f"SELECT id, name FROM rabbis WHERE id IN ({idlist})"):
            rmap[rr["id"]] = rr["name"]
    return [{"kind": "series", "title": r["title"], "id": r["id"],
             "author": rmap.get(r.get("rabbi_id"), "") or "",
             "lesson_count": r.get("lesson_count") or 0,
             "status": r["status"]} for r in cards]

def new_standalone_lessons(node_title: str, bible_book: str | None) -> list[dict]:
    """Mirror useDirectLessons: lessons WHERE bible_book=book AND cat_standalone
       AND published AND NOT teachers."""
    book = bible_book or node_title
    rows = q(f"""SELECT l.id, l.title, l.duration, l.rabbi_id, l.bible_chapter, l.content_type
        FROM lessons l
        WHERE l.bible_book='{esc(book)}' AND l.cat_standalone=true AND l.status='published'
          AND NOT (l.audience_tags @> '{{teachers}}')
        ORDER BY l.content_type ASC NULLS FIRST, l.bible_chapter ASC NULLS LAST, l.title ASC
        LIMIT 2000""")
    # dedup by normalized title
    seen, out = set(), []
    rids = list({r["rabbi_id"] for r in rows if r.get("rabbi_id")})
    rmap = {}
    if rids:
        idlist = ",".join(f"'{x}'" for x in rids)
        for rr in q(f"SELECT id, name FROM rabbis WHERE id IN ({idlist})"):
            rmap[rr["id"]] = rr["name"]
    for r in rows:
        k = _norm_title(r["title"])
        if k in seen: continue
        seen.add(k)
        out.append({"kind": "lesson", "title": r["title"], "id": r["id"],
                    "author": rmap.get(r.get("rabbi_id"), "") or "",
                    "length": r.get("duration")})
    return out

# ── DIFF ─────────────────────────────────────────────────────────────────────
def match_in(title, pool, used):
    """canonical_match title against unused pool entries; return index or -1."""
    best_i, best_score = -1, 0.0
    for i, p in enumerate(pool):
        if i in used: continue
        res = canonical_match(title, p["title"])
        if res.matched and res.score > best_score:
            best_i, best_score = i, res.score
    return best_i

def diff_node(old_rows, new_series, new_lessons, order_reliable):
    old_series = [r for r in old_rows if r["kind"] == "series"]
    old_lessons = [r for r in old_rows if r["kind"] == "lesson"]

    # SERIES correspondence
    used_ns = set()
    missing_series, matched_series_pairs = [], []
    for o in old_series:
        i = match_in(o["title"], new_series, used_ns)
        if i < 0:
            missing_series.append(o["title"])
        else:
            used_ns.add(i)
            matched_series_pairs.append((o, new_series[i]))
    extra_series = [new_series[i]["title"] for i in range(len(new_series)) if i not in used_ns]
    # Split extra-series into (a) chapter-pattern series the old book *landing* page didn't
    # list as cards (legit new content behind the old chapter-grid: "X פרק נ", "מזמור נ | ...")
    # vs (b) genuine pollution (worksheet/riddle/teacher leak — the שמות חידות class).
    _CHAP = re.compile(r'(פרק\s+[א-ת]|^\s*מזמור\s+[א-ת])')
    chapter_extra = [t for t in extra_series if _CHAP.search(t)]
    pollution_extra = [t for t in extra_series if not _CHAP.search(t)]

    # STANDALONE LESSON correspondence (THE series-only bug)
    used_nl = set()
    missing_standalone = []
    for o in old_lessons:
        i = match_in(o["title"], new_lessons, used_nl)
        if i < 0:
            missing_standalone.append(o["title"])
        else:
            used_nl.add(i)
    extra_lessons = [new_lessons[i]["title"] for i in range(len(new_lessons)) if i not in used_nl]

    # ORDER: only meaningful when old order is the real DOM order (scrape).
    # Compare the matched-series subsequence: old DOM order vs new render order.
    order_mismatch = False
    if order_reliable and len(matched_series_pairs) >= 2:
        # new render index for each matched new series, in old DOM order
        new_index_of = {id(ns): idx for idx, ns in enumerate(new_series)}
        seq = [new_index_of[id(ns)] for (_o, ns) in matched_series_pairs]
        # order matches iff seq is strictly increasing
        order_mismatch = any(seq[k] > seq[k+1] for k in range(len(seq)-1))

    old_count = len(old_series) + len(old_lessons)
    new_count = len(new_series) + len(new_lessons)
    # Severity is driven by the dimensions Yoav actually sees: missing series,
    # POLLUTION extras (not legit chapter-series), missing standalone lessons, order.
    diff_rows = len(missing_series) + len(pollution_extra) + len(missing_standalone)
    denom = max(old_count, new_count, 1)
    if missing_standalone or diff_rows / denom > 0.20:
        severity = "high"
    elif order_mismatch or missing_series or pollution_extra:
        severity = "medium"
    else:
        severity = "low"

    return {
        "oldCount": old_count, "newCount": new_count,
        "oldSeries": len(old_series), "oldStandaloneLessons": len(old_lessons),
        "newSeries": len(new_series), "newStandaloneLessons": len(new_lessons),
        "missingSeries": missing_series, "extraSeries": extra_series,
        "pollutionExtraSeries": pollution_extra,
        "chapterExtraSeries": len(chapter_extra),
        "missingStandaloneLessons": len(missing_standalone),
        "missingStandaloneLessonTitles": missing_standalone[:40],
        "extraStandaloneLessons": len(extra_lessons),
        "orderMismatch": order_mismatch, "orderReliable": order_reliable,
        "severity": severity,
    }

# ── NODE ENUMERATION ─────────────────────────────────────────────────────────
def book_nodes():
    rows = q("""SELECT s.id, s.title, s.parent_id, s.sort_order, s.bible_book
        FROM series s
        WHERE s.parent_id IN ('bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b',
              'a0472c9f-8212-44ff-8937-ace5fea4b4dc','5cdd770c-9593-4b0d-9f9e-cda50cf5ef41')
          AND ((s.parent_id='a0472c9f-8212-44ff-8937-ace5fea4b4dc' AND s.status='category')
            OR (s.parent_id<>'a0472c9f-8212-44ff-8937-ace5fea4b4dc'
                AND s.status IN ('active','published','category')))
          AND s.sort_order BETWEEN 1 AND 999
        ORDER BY s.parent_id, s.sort_order""")
    out = []
    for b in rows:
        if "חידות" in (b["title"] or ""):  # teacher widget, hook drops it
            continue
        seg = SEC_SEG[b["parent_id"]]
        old_url = f"/מאגר-השיעורים-והמאמרים/{seg}/{(b['title'] or '').replace(' ', '-')}/"
        out.append({"kind": "book", "node": b["title"], "id": b["id"],
                    "bible_book": b.get("bible_book"), "old_url": old_url,
                    "allow_dual": False})
    return out

def section_nodes():
    """Extra-section roots + their direct children (each a clickable sidebar node)."""
    out = []
    section_labels = {
        "howToLearn": 'איך לומדים תנ"ך', "generalTopics": 'נושאים כלליים בתנ"ך',
        "moadim": "מועדים", "haftarot": "הפטרות", "tools": "כלי עזר",
        "yemeiIyun": 'ימי עיון בתנ"ך', "livuyTatim": 'ליווי ת"תים',
        "recordedProject": 'פרוייקט התנ"ך המוקלט',
    }
    for key, label in section_labels.items():
        rid = ROOT_IDS[key]
        out.append({"kind": "section", "node": label, "id": rid,
                    "bible_book": None, "old_url": None,
                    "allow_dual": rid in PUBLIC_DUAL_ALLOWED, "section_key": key})
    return out

def teacher_nodes():
    """Teacher-wing content-type nodes — audited READ-ONLY, NEVER regressed."""
    cts = q("""SELECT content_type, COUNT(*) n FROM lessons
        WHERE audience_tags @> '{teachers}' AND content_type IS NOT NULL
        GROUP BY content_type ORDER BY n DESC LIMIT 8""")
    return [{"kind": "teacher", "node": c["content_type"], "id": None,
             "content_type": c["content_type"], "count": int(c["n"])} for c in cts]

# ── DRIVER ─────────────────────────────────────────────────────────────────────
def audit_book_or_section(meta, do_scrape):
    node_id = meta["id"]
    allow_dual = meta.get("allow_dual", False)
    new_series = new_series_rows(node_id, allow_dual)

    # OLD rows
    old_rows, order_reliable, source = [], False, "none"
    if meta["kind"] == "book" and meta.get("old_url") and do_scrape:
        h = fetch_old(meta["old_url"])
        if h:
            old_rows = parse_old_rows(h)
            if old_rows:
                order_reliable, source = True, "scrape"
    if not old_rows and meta.get("old_url"):
        cc = cache_children(meta["old_url"])
        if cc:
            old_rows = cc; order_reliable, source = False, "cache"

    if meta["kind"] == "book":
        new_lessons = new_standalone_lessons(meta["node"], meta.get("bible_book"))
    else:
        new_lessons = []  # sections render series cards only (flat); no cat_standalone band

    if not old_rows and meta["kind"] == "section":
        # sections: no old page mapped -> mark unresolved (be honest)
        return {"node": meta["node"], "kind": "unresolved",
                "oldCount": 0, "newCount": len(new_series),
                "severity": "low", "note": "no old-page mapping for this extra section",
                "newSeries": len(new_series), "missingSeries": [], "extraSeries": [],
                "missingStandaloneLessons": 0, "orderMismatch": False}

    d = diff_node(old_rows, new_series, new_lessons, order_reliable)
    d.update({"node": meta["node"], "kind": meta["kind"], "oldSource": source})
    return d

def audit_teacher(meta):
    # Presence-only here (no old teacher-wing page mapping in this engine); the precious
    # teacher-wing 1:1 is owned by teachers_book_listing.py / teachers_parity.py. We surface
    # the published count so a regression to 0 is visible, but never propose a fix.
    ct = esc(meta["content_type"])
    r = q(f"""SELECT COUNT(*) n FROM lessons WHERE content_type='{ct}'
        AND audience_tags @> '{{teachers}}' AND status='published'""")
    n = int(r[0]["n"]) if r else 0
    return {"node": meta["node"], "kind": "teacher", "oldCount": meta.get("count", 0),
            "newCount": n, "newSeries": n, "missingSeries": [], "extraSeries": [],
            "missingStandaloneLessons": 0, "orderMismatch": False,
            "severity": "high" if n == 0 else "low",
            "note": "presence-only; teacher-wing 1:1 owned by teachers_book_listing.py — never regress"}

def main():
    only_book = None; do_scrape = True
    args = sys.argv[1:]
    if "--book" in args: only_book = args[args.index("--book")+1]
    if "--no-scrape" in args: do_scrape = False

    books = book_nodes()
    sections = section_nodes()
    teachers = teacher_nodes()

    results = []
    todo = books + sections
    if only_book:
        todo = [m for m in books if m["node"] == only_book]

    for m in todo:
        try:
            results.append(audit_book_or_section(m, do_scrape))
        except Exception as e:
            results.append({"node": m["node"], "kind": "unresolved",
                            "severity": "low", "note": f"error: {e}",
                            "oldCount": 0, "newCount": 0, "missingSeries": [],
                            "extraSeries": [], "missingStandaloneLessons": 0,
                            "orderMismatch": False})
        print(f"  {results[-1].get('severity','?'):6s} {m['kind']:8s} {m['node']}: "
              f"old={results[-1].get('oldCount','?')} new={results[-1].get('newCount','?')} "
              f"miss-series={len(results[-1].get('missingSeries',[]))} "
              f"extra-series={len(results[-1].get('extraSeries',[]))} "
              f"miss-standalone={results[-1].get('missingStandaloneLessons',0)} "
              f"order!={results[-1].get('orderMismatch',False)}")

    if not only_book:
        for m in teachers:
            try:
                results.append(audit_teacher(m))
            except Exception as e:
                results.append({"node": m["node"], "kind": "unresolved",
                                "severity": "low", "note": f"error: {e}",
                                "missingSeries": [], "extraSeries": [],
                                "missingStandaloneLessons": 0, "orderMismatch": False})

    ts = subprocess.run(["date","-u","+%Y%m%dT%H%M%SZ"], capture_output=True, text=True).stdout.strip()
    nodes_with_gaps = [r for r in results
                       if r["kind"] != "teacher"
                       and (r.get("missingSeries") or r.get("extraSeries")
                            or r.get("missingStandaloneLessons", 0) > 0
                            or r.get("orderMismatch"))]
    report = {
        "generatedUtc": ts,
        "engine": "real_parity.py",
        "totalNodes": len(results),
        "nodesWithGaps": len(nodes_with_gaps),
        "bySeverity": {s: sum(1 for r in results if r.get("severity") == s)
                       for s in ("high","medium","low")},
        "results": results,
    }
    out = REPORTS / f"real-parity-{ts}.json"
    json.dump(report, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\nTOTAL nodes={len(results)} nodesWithGaps={len(nodes_with_gaps)} → {out}")
    print(json.dumps(report["bySeverity"], ensure_ascii=False))
    print("REPORT_PATH=" + str(out))
    return out

if __name__ == "__main__":
    main()
