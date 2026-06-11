#!/usr/bin/env python3
"""
gap2_backfill.py — backfill full `content` (HTML) from the old site for lessons
with content IS NULL (gap2, parallel-protocol: DATA ONLY, content column only).

Ground truth: old lesson page `<div id="lessonText">` (same HTML dialect as the
content already in the DB). Mapping: URL slug (last path component) == title.
Verification: LM_title h1 == title, author vs DB rabbi.

Scope (locked):
  - UPDATE lessons SET content=... WHERE id=... AND content IS NULL   (nothing else)
  - skip teachers-only rows (gap1 territory; worksheets are PDF-based anyway)

Phases:
  python3 gap2_backfill.py export    # pull target rows from DB -> gap2_targets.json
  python3 gap2_backfill.py map       # slug-match titles to old paths -> gap2_map.json
  python3 gap2_backfill.py fetch     # download matched pages (cache, resume-safe)
  python3 gap2_backfill.py plan      # parse + decide -> reports/gap2-plan.json + stats
  python3 gap2_backfill.py apply     # backup table + apply UPDATEs (idempotent)
"""
import sys, os, json, re, html, hashlib, time, subprocess, unicodedata
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sbq

CRAWL = os.path.join(HERE, "audit_full_state.json")
CACHE = os.path.join(HERE, "gap2_cache")
TARGETS = os.path.join(HERE, "gap2_targets.json")
MAPF = os.path.join(HERE, "gap2_map.json")
PLANF = os.path.join(HERE, "reports", "gap2-plan.json")
OLD_HOST = "https://www.bneyzion.co.il"

os.makedirs(CACHE, exist_ok=True)

# ---------- normalization (NFC mandatory — iron rule 5) ----------
def nfc(s):
    return unicodedata.normalize("NFC", s or "")

def norm(s):
    s = nfc(s)
    s = re.sub(r"[֑-ׇ]", "", s)               # niqqud/cantillation
    s = re.sub(r"[\"'״׳`‘’“”|?!,.:;()\[\]…־–—]", "", s)
    s = s.replace("-", " ")
    return re.sub(r"\s+", " ", s).strip()

def q(sql):
    out = sbq.run(sql)
    d = json.loads(out)
    if isinstance(d, dict) and d.get("message"):
        raise RuntimeError("SQL error: " + json.dumps(d, ensure_ascii=False)[:500])
    return d

# ---------- phase: export ----------
def export():
    rows, off = [], 0
    while True:
        chunk = q(f"""
          SELECT l.id, l.title, l.description, l.source_type, l.status,
                 l.audience_tags, r.name AS rabbi
          FROM lessons l LEFT JOIN rabbis r ON r.id = l.rabbi_id
          WHERE l.content IS NULL
            AND NOT ( 'teachers' = ANY(l.audience_tags)
                      AND NOT ('general' = ANY(l.audience_tags)) )
          ORDER BY l.id LIMIT 1500 OFFSET {off};""")
        rows += chunk
        print(f"  exported {len(rows)} rows…")
        if len(chunk) < 1500:
            break
        off += 1500
    json.dump(rows, open(TARGETS, "w"), ensure_ascii=False)
    n_desc = sum(1 for r in rows if r["description"])
    print(f"targets: {len(rows)} rows ({n_desc} with description, "
          f"{len(set(norm(r['title']) for r in rows))} unique norm-titles)")

# ---------- phase: map ----------
def build_slug_index():
    s = json.load(open(CRAWL))
    idx = defaultdict(list)
    for p in s["seen"]:
        seg = p.strip("/").split("/")
        if len(seg) < 4:            # lesson pages live deep; skip nav levels
            continue
        idx[norm(seg[-1])].append(p)
    return idx

def map_phase():
    rows = json.load(open(TARGETS))
    idx = build_slug_index()
    out, miss = {}, []
    for r in rows:
        nt = norm(r["title"])
        paths = idx.get(nt)
        if paths:
            out[nt] = paths
        else:
            miss.append(r["title"])
    json.dump({"map": out, "missing": miss}, open(MAPF, "w"), ensure_ascii=False)
    uniq = len(set(norm(r["title"]) for r in rows))
    print(f"matched {len(out)}/{uniq} unique titles "
          f"({sum(len(v) for v in out.values())} old paths); missing {len(miss)}")

# ---------- phase: fetch ----------
def cache_path(p):
    return os.path.join(CACHE, hashlib.md5(p.encode()).hexdigest() + ".html")

def fetch_one(p):
    cp = cache_path(p)
    if os.path.exists(cp) and os.path.getsize(cp) > 5000:
        return p, "cached"
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
        env.pop(k, None)
    env["NO_PROXY"] = "*"
    r = subprocess.run(["curl","-s","--noproxy","*","-L","--max-time","60",
                        OLD_HOST + p, "-o", cp],
                       capture_output=True, env=env, timeout=90)
    ok = os.path.exists(cp) and os.path.getsize(cp) > 5000
    if not ok and os.path.exists(cp):
        os.remove(cp)
    return p, ("ok" if ok else "fail")

def fetch_phase():
    m = json.load(open(MAPF))["map"]
    # fetch ALL candidate paths per slug (needed for author disambiguation)
    paths = sorted({p for v in m.values() for p in v})
    todo = [p for p in paths if not os.path.exists(cache_path(p))]
    print(f"{len(paths)} paths total, {len(todo)} to fetch")
    done = fails = 0
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(fetch_one, p): p for p in todo}
        for f in as_completed(futs):
            p, st = f.result()
            done += 1
            if st == "fail":
                fails += 1
            if done % 200 == 0:
                print(f"  {done}/{len(todo)} (fails {fails})")
    print(f"fetch done: {done}, fails {fails}")

# ---------- parsing ----------
RE_LM_TITLE = re.compile(
    r'<div class="LM_title[^"]*"[^>]*>.*?<h1>(.*?)</h1>(.*?)</div>\s*<div class="catNextPrev', re.S)
RE_AUTHOR = re.compile(r'<div class="author">\s*<a[^>]*>(.*?)</a>', re.S)
RE_H2 = re.compile(r'<h2>(.*?)</h2>', re.S)
RE_LESSONTEXT = re.compile(r'<div id="lessonText">(.*?)</div>\s*<div>', re.S)
BOILER = re.compile(r'<p class="visible-xs[^"]*">.*?</p>', re.S)
GTRANS = re.compile(r'</?span[^>]*vertical-align: inherit[^>]*>')

def striptags(x):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", x or ""))).strip()

def parse_page(p):
    cp = cache_path(p)
    if not os.path.exists(cp):
        return None
    h = open(cp, encoding="utf-8", errors="replace").read()
    out = {"path": p, "h1": None, "author": None, "promo": None, "body": None}
    mt = RE_LM_TITLE.search(h)
    if mt:
        out["h1"] = striptags(mt.group(1))
        seg = mt.group(2)
        ma = RE_AUTHOR.search(seg)
        if ma: out["author"] = striptags(ma.group(1))
        mh = RE_H2.search(seg)
        if mh: out["promo"] = striptags(mh.group(1))
    # lessonText: capture div content up to the closing pattern observed on site
    i = h.find('<div id="lessonText">')
    if i != -1:
        # balanced-div scan
        j = i + len('<div id="lessonText">')
        depth, k = 1, j
        while depth > 0:
            nxt_open = h.find("<div", k)
            nxt_close = h.find("</div>", k)
            if nxt_close == -1: break
            if nxt_open != -1 and nxt_open < nxt_close:
                depth += 1; k = nxt_open + 4
            else:
                depth -= 1; k = nxt_close + 6
        body = h[j:k-6] if depth == 0 else h[j:j+200000]
        body = BOILER.sub("", body)
        body = GTRANS.sub("", body)
        body = re.sub(r'<div class="addthis[^"]*"[^>]*>\s*</div>', "", body)
        body = body.strip()
        # NFC-normalize the HTML string itself
        body = nfc(body)
        if striptags(body):
            out["body"] = body
    return out

# ---------- phase: plan ----------
def plan_phase():
    rows = json.load(open(TARGETS))
    m = json.load(open(MAPF))["map"]
    parsed = {}
    for nt, paths in m.items():
        parsed[nt] = [pp for pp in (parse_page(p) for p in paths) if pp]

    plan, stats = [], defaultdict(int)
    doubts = []
    for r in rows:
        nt = norm(r["title"])
        cands = parsed.get(nt) or []
        if not cands:
            stats["no_old_page"] += 1
            continue
        # verify h1 == title (slug collision guard)
        cands_h1 = [c for c in cands if c["h1"] and norm(c["h1"]) == nt]
        if not cands_h1:
            stats["h1_mismatch"] += 1
            doubts.append({"id": r["id"], "title": r["title"], "why": "h1 mismatch",
                           "paths": [c["path"] for c in cands][:3]})
            continue
        # author disambiguation
        rn = norm(r["rabbi"]) if r.get("rabbi") else None
        with_body = [c for c in cands_h1 if c["body"]]
        if not with_body:
            stats["no_lessontext"] += 1
            continue
        pick = None
        if rn:
            byauth = [c for c in with_body if c["author"] and norm(c["author"]) == rn]
            if byauth:
                pick = byauth[0]
        if pick is None:
            bodies = {hashlib.md5(c["body"].encode()).hexdigest() for c in with_body}
            if len(bodies) == 1:
                pick = with_body[0]          # all copies identical -> safe
            else:
                stats["ambiguous_author"] += 1
                doubts.append({"id": r["id"], "title": r["title"], "rabbi": r.get("rabbi"),
                               "why": "multiple distinct bodies, author mismatch",
                               "paths": [c["path"] for c in with_body][:4]})
                continue
        body_txt = striptags(pick["body"])
        desc = r.get("description") or ""
        # decision thresholds (conservative)
        if len(body_txt) < 120:
            stats["body_too_thin"] += 1
            continue
        if desc and norm(body_txt) == norm(desc):
            stats["same_as_desc"] += 1
            continue
        plan.append({"id": r["id"], "title": r["title"], "rabbi": r.get("rabbi"),
                     "path": pick["path"], "author": pick["author"],
                     "body_len": len(pick["body"]), "text_len": len(body_txt),
                     "desc_len": len(desc), "source_type": r["source_type"],
                     "body": pick["body"]})
        stats["update"] += 1
    os.makedirs(os.path.dirname(PLANF), exist_ok=True)
    json.dump({"plan": plan, "stats": dict(stats), "doubts": doubts},
              open(PLANF, "w"), ensure_ascii=False)
    print("STATS:", json.dumps(dict(stats), ensure_ascii=False, indent=1))
    print(f"doubts: {len(doubts)} | plan rows: {len(plan)} -> {PLANF}")

# ---------- phase: apply ----------
def apply_phase(ts):
    data = json.load(open(PLANF))
    plan = data["plan"]
    if not plan:
        print("empty plan; nothing to apply"); return
    bak = f"lessons_bak_gap2_{ts}"
    exists = q(f"SELECT to_regclass('{bak}') AS t;")[0]["t"]
    if not exists:
        q(f"CREATE TABLE {bak} AS SELECT * FROM lessons;")
    bn = q(f"SELECT COUNT(*) AS n FROM {bak};")[0]["n"]
    assert bn > 13000, f"backup too small: {bn}"
    # parallel-protocol-aware check: every row I am about to UPDATE must exist in
    # the backup (live count may legitimately grow — other gap agents INSERT rows)
    ids = ",".join(f"'{it['id']}'" for it in plan)
    covered = q(f"SELECT COUNT(*) AS n FROM {bak} WHERE id IN ({ids});")[0]["n"]
    assert covered == len(plan), f"backup covers {covered}/{len(plan)} target rows"
    print(f"backup {bak} verified: {bn} rows, covers {covered}/{len(plan)} targets")

    before = q("SELECT COUNT(*) AS n FROM lessons WHERE content IS NULL;")[0]["n"]
    done = 0
    for item in plan:
        body = item["body"].replace("$gap2$", "")  # paranoid: kill our own delimiter
        sql = (f"UPDATE lessons SET content = $gap2${body}$gap2$ "
               f"WHERE id = '{item['id']}' AND content IS NULL;")
        q(sql)
        done += 1
        if done % 100 == 0:
            print(f"  applied {done}/{len(plan)}")
    after = q("SELECT COUNT(*) AS n FROM lessons WHERE content IS NULL;")[0]["n"]
    print(f"APPLIED {done}. content IS NULL: {before} -> {after} (delta {before-after})")

if __name__ == "__main__":
    ph = sys.argv[1] if len(sys.argv) > 1 else ""
    if ph == "export": export()
    elif ph == "map": map_phase()
    elif ph == "fetch": fetch_phase()
    elif ph == "plan": plan_phase()
    elif ph == "apply":
        ts = sys.argv[2] if len(sys.argv) > 2 else None
        assert ts, "usage: apply <YYYYMMDD_HHMM>"
        apply_phase(ts)
    else:
        print(__doc__)
