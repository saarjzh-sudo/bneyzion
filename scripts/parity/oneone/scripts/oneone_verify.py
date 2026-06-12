#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
oneone_verify.py — 1:1 parity VERIFICATION HARNESS for bnei-zion (old site vs new site).

READ-ONLY. Simulates the EXACT anon-REST queries the new UI runs (per the current
working-tree hooks, post-CODE-SPEC fixes) and diffs the rendered result against the
old-site ground truth scraped into scripts/parity/oneone/old_*.json.

Sections:
  1. sidebar   — useContentSidebar/useTopicsSidebar simulation vs old_sidebar_tree.json
                 (r2: band cutoff 1..999, commit 7420b265)
  2. listings  — per old listing page: /series/:id semantics (useSeriesChildren +
                 useLessonsBySeries) vs old_listings_*.json (~1,300 pages).
                 r2: category/book nodes simulated via CategoryPage (useSeriesForNode
                 canonical series + direct + descendant roll-up lessons, commit 4a1c3691)
  3. rabbis    — rabbi_page_items (fallback: useRabbiSeries+useRabbiLessons) vs
                 old_rabbi_pages.json (154 rabbis)
  4. topics    — topics sidebar order + per-topic page (useTopicLessons) vs old 127
  5. teachers  — content-type pages (22, teacher_listing_items, NO page fallback),
                 creators (31, rabbi_page_items + lessons-by-rabbi fallback),
                 by-book tree (tree-driven useTeacherSidebar)

r2 harness fix: rest_get now merges chained order keys into ONE comma-joined `order`
param (postgrest-js emission). The old multi-param form silently dropped secondary
sort keys → false order failures.
  6. guards    — teachers-leak / draft-leak / popup-content sampling (60 lessons)

Usage:
  python3 oneone_verify.py                          # full run, all sections
  python3 oneone_verify.py --sections sidebar,topics
  python3 oneone_verify.py --md VERIFY-BASELINE-preapply.md --label "BASELINE (pre-apply)"
  python3 oneone_verify.py --limit-pages 40         # quick smoke run
  python3 oneone_verify.py --no-cache               # force fresh REST calls

Resumability: every REST response is cached under /tmp/oneone_verify_cache (keyed by
sha1 of method+url+range+body). Re-runs only hit the network for uncached queries.
"""
import argparse
import base64
import difflib
import hashlib
import json
import os
import re
import subprocess
import sys
import threading
import time
import unicodedata
import urllib.parse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ONEONE = os.path.dirname(HERE)
REPORTS = os.path.join(ONEONE, "reports")
CACHE_DIR = "/tmp/oneone_verify_cache"

# ── Supabase anon REST (same values the browser uses, from src/integrations/supabase/client.ts) ──
SUPABASE_URL = base64.b64decode(
    "aHR0cHM6Ly9wenZtd2ZleGVpcnVlbHdpdWp4bi5zdXBhYmFzZS5jbw=="
).decode()
ANON_KEY = base64.b64decode(
    "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CNmRtMTNabVY0WldseWRXVnNkMmwxYW5odUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpVMU5UTTFOelVzSW1WNGNDSTZNakE1TVRFeU9UVTNOWDAuVTVhZ0xrZjZqZkxVZzdVamZkblRKZmF2VXN4LWR5enhzMmZ4SmdXQXA4bw=="
).decode()

# ── Root IDs (useContentSidebar.ts / useTeacherSidebar.ts) ──
ROOT_IDS = {
    "torah": "bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b",
    "neviim": "a0472c9f-8212-44ff-8937-ace5fea4b4dc",
    "ketuvim": "5cdd770c-9593-4b0d-9f9e-cda50cf5ef41",
    "howToLearn": "62590949-6187-4e17-b84d-65a518467521",
    "generalTopics": "2d6d28c1-3c5c-4d61-9283-410bc56cd351",
    "moadim": "92130154-e96a-4f98-b032-5a20ac385f63",
    "haftarot": "3327c721-7bc9-471c-878f-0b3aef98b090",
    "riddles": "c852edd8-d959-4c8d-bf7e-17b5881275fa",
    "tools": "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7",
    "yemeiIyun": "f4040001-0001-4000-8000-000000000000",
    "livuyTatim": "7cbd261e-03b0-43da-a708-e8ae4402105f",
    "maps": "4d78557b-da8b-4b1f-8d8e-09d74ff3070a",
    "howToTeach": "26e30725-d5d0-4d88-8f73-f7a279801241",
}
TORAH_BOOK_ORDER = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"]
TEACHER_KETUVIM_ORDER = ["תהלים", "משלי", "איוב", "שיר השירים", "רות", "איכה", "קהלת", "אסתר", "דניאל", "עזרא", "נחמיה"]

# Fixed 31-creator list — mirrors CREATOR_IDS_ORDERED in useTeacherSidebar.ts (CODE-SPEC §11 CA5/CA6).
# name (old sidebar label) → rabbi id. Used by the creators sim to resolve the page id
# exactly like the app does (fixed list, NOT name matching / lesson_count heuristics).
TEACHER_CREATOR_IDS = {
    "אוריה כראדי": "a1b2c3d4-1111-4444-aaaa-111111111111",
    "הרב אורי שטמלר": "e1111111-1111-1111-1111-111111111105",
    "הרב אשי בלייכר": "167ed180-6ced-45af-b5d7-e97a916fa93a",
    "הרב בניה כהן": "e1111111-1111-1111-1111-111111111121",
    "הרב גדי שר שלום": "80fefb33-e324-4eee-9e47-0502724ae149",
    "הרב דביר אפלבוים": "e1111111-1111-1111-1111-111111111101",
    "הרב חסדאי בר אור": "1371e495-c30b-44f5-b3d7-8b3d08f4ca75",
    "הרב ידידיה שילה": "c3d4e5f6-3333-4444-cccc-333333333333",
    "הרב יהודה בשושה": "7443c208-f2f2-42f5-bf05-af2554855fbd",
    "הרב יונתן לוי": "356f3470-86cf-4da4-8c34-ba76370ebe4d",
    "הרב יורם אליהו": "47569464-d3c7-4e9d-93c5-8ceaebdb031f",
    "הרב יצחק עמראני": "e97e2b67-5f0f-436f-9fc1-54f706a7a20e",
    "הרב מאיר גרשונזון": "9f357f02-5557-4dba-a941-fdb1ef681f4a",
    "הרב מאיר הילביץ'": "71aa933c-5548-4ea7-8be0-dfb659202660",
    "הרב מנחם אליהו": "21815917-0c20-4ad2-b6ab-3943956c9a55",
    "הרב נחום אריאל": "e1111111-1111-1111-1111-111111111120",
    "הרב ניסים כהן": "d6666666-6666-6666-6666-666666666666",
    "הרב עדי איצקוביץ'": "e1111111-1111-1111-1111-111111111102",
    "הרב עמוס נתנאל": "e1111111-1111-1111-1111-111111111104",
    "הרב עמירם אלבה": "3da1df9d-4ed5-48ba-9ffa-e3c5271d40e1",
    "הרב עמנואל בן ארצי": "744da303-22be-4062-a822-4ba8e8f1b02d",
    "הרב שלמה כץ": "d4e5f6a7-4444-4444-dddd-444444444444",
    "הרב שמעון לוי והרב נתן מולאיוף": "0ae09e02-2089-4a99-a1d5-8a6b0a503f81",
    "הרב שמעון שוהם": "d4e5f6a7-6666-6666-ffff-666666666666",
    "ושננתם - אוצר התורה": "6f4b2572-b019-4832-9547-de7e8bc6d909",
    "ישקו העדרים": "7fcd7014-5eef-4e9b-b792-e6460d75e720",
    "מחבר לא ידוע": "d4e5f6a7-5555-5555-eeee-555555555555",
    "מכון דעת סופרים": "1be980e3-a688-47aa-9eaf-adfa23b105b6",
    "נתן מארגל": "e1111111-1111-1111-1111-111111111103",
    "סידור שים שלום": "b2c3d4e5-2222-4444-bbbb-222222222222",
    "תלמוד תורה מורשה": "b5555555-5555-5555-5555-555555555555",
}

# ── biblicalOrder.ts replication ──
TORAH_PARSHIOT = [
    "בראשית", "נח", "לך לך", "וירא", "חיי שרה", "תולדות",
    "ויצא", "וישלח", "וישב", "מקץ", "ויגש", "ויחי",
    "שמות", "וארא", "בא", "בשלח", "יתרו", "משפטים",
    "תרומה", "תצוה", "כי תשא", "ויקהל", "פקודי",
    "ויקרא", "צו", "שמיני", "תזריע", "מצורע", "אחרי מות",
    "קדושים", "אמור", "בהר", "בחוקותי",
    "במדבר", "נשא", "בהעלותך", "שלח", "שלח לך", "קרח", "חוקת", "בלק",
    "פנחס", "מטות", "מסעי",
    "דברים", "ואתחנן", "עקב", "ראה", "שופטים", "כי תצא", "כי תבוא",
    "ניצבים", "נצבים", "וילך", "האזינו", "וזאת הברכה", "וזאת הבכרה",
]
NEVIIM_BOOKS = [
    "יהושע", "שופטים", "שמואל", "שמואל א", "שמואל ב",
    "מלכים", "מלכים א", "מלכים ב",
    "ישעיהו", "ישעיה", "ירמיהו", "ירמיה", "יחזקאל",
    "הושע", "יואל", "עמוס", "עובדיה", "יונה", "מיכה",
    "נחום", "חבקוק", "צפניה", "חגי", "זכריה", "מלאכי",
    "תרי עשר",
]
KETUVIM_BOOKS = [
    "תהלים", "תהילים", "משלי", "איוב",
    "שיר השירים", "רות", "איכה", "קהלת", "אסתר",
    "דניאל", "עזרא", "עזרא ונחמיה", "נחמיה",
    "דברי הימים", "דברי הימים א", "דברי הימים ב",
]
PARSHIOT_MAP, BOOKS_MAP = {}, {}
for _i, _n in enumerate(TORAH_PARSHIOT):
    PARSHIOT_MAP.setdefault(_n, _i)
for _i, _n in enumerate(NEVIIM_BOOKS + KETUVIM_BOOKS):
    BOOKS_MAP.setdefault(_n, _i)


def _extract_biblical(title):
    m = re.search(r"פרשת\s+([^|–\-]+)", title or "")
    if m:
        name = m.group(1).strip()
        if name in PARSHIOT_MAP:
            return PARSHIOT_MAP[name]
        for k in PARSHIOT_MAP:
            if name.startswith(k):
                return PARSHIOT_MAP[k]
    for k in BOOKS_MAP:
        if title == k or title.startswith(k + " ") or title.startswith(k + " |") or title.startswith(k + " –"):
            return 100000 + BOOKS_MAP[k]
    for k in PARSHIOT_MAP:
        if title == k or title.startswith(k + " ") or title.startswith(k + " |") or title.startswith(k + " –"):
            return PARSHIOT_MAP[k]
    return None


def sort_by_biblical_order(items, key=lambda x: x["title"]):
    """sortByBiblicalOrder replication: stable sort; unknown → Infinity keeps original order.
    NOTE biblicalOrder.ts mixes the two maps; we replicate book-vs-parsha priority."""
    def idx(it):
        v = _extract_biblical(key(it))
        return float("inf") if v is None else v
    return sorted(items, key=idx)  # python sort is stable like JS

# ── normalization (same as global_match.py) ──
NIQQUD_RE = re.compile("[֑-ׇ]")
QUOTE_RE = re.compile("[׳״\"'`]")
SEP_RE = re.compile("[|–—‒‐‑\\-_,:;!?()\\[\\]{}<>./\\\\]")
HONORIFICS = {"זצל", "שליטא", "זל", "זצוקל", "היד"}


def normalize_he(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFC", str(s))
    s = NIQQUD_RE.sub("", s)
    s = QUOTE_RE.sub("", s)
    s = SEP_RE.sub(" ", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def norm_rabbi(s):
    n = normalize_he(s)
    toks = n.split()
    while toks and toks[-1] in HONORIFICS:
        toks.pop()
    return " ".join(toks)


def app_norm(t):
    """The APP's dedup key (quote-strip + ws collapse ONLY — no niqqud/NFC)."""
    return re.sub(r"\s+", " ", re.sub(r"[״\"'׳`|]", "", (t or "").strip()))


def he_sort_key(s):
    """approximation of localeCompare('he') for pure-Hebrew strings (codepoint order)."""
    return [ord(c) for c in (s or "")]

# ── REST layer (curl-backed, NetSpark-safe, cached, thread-safe) ──
_cache_lock = threading.Lock()
USE_CACHE = True
_stats = {"rest_calls": 0, "cache_hits": 0, "errors": 0}


def _curl_env():
    env = dict(os.environ)
    for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
        env.pop(k, None)
    env["NO_PROXY"] = "*"
    return env


def _cache_path(key):
    return os.path.join(CACHE_DIR, hashlib.sha1(key.encode()).hexdigest() + ".json")


def _rest_raw(method, url, body=None, range_hdr=None):
    key = f"{method}|{url}|{range_hdr}|{body}"
    cp = _cache_path(key)
    if USE_CACHE and os.path.exists(cp):
        with open(cp, encoding="utf-8") as f:
            _stats["cache_hits"] += 1
            return json.load(f)["body"]
    cmd = ["curl", "-s", "--noproxy", "*", "-X", method,
           "-H", f"apikey: {ANON_KEY}", "-H", f"Authorization: Bearer {ANON_KEY}"]
    if range_hdr:
        cmd += ["-H", f"Range: {range_hdr}", "-H", "Range-Unit: items"]
    if body is not None:
        cmd += ["-H", "Content-Type: application/json", "--data-binary", body]
    cmd.append(url)
    for attempt in range(3):
        p = subprocess.run(cmd, capture_output=True, text=True, env=_curl_env(), timeout=180)
        out = p.stdout
        if p.returncode == 0 and out:
            break
        time.sleep(1.5 * (attempt + 1))
    _stats["rest_calls"] += 1
    try:
        parsed = json.loads(out)
    except Exception:
        parsed = {"_curl_error": True, "raw": out[:500], "stderr": p.stderr[:300]}
    if USE_CACHE:
        with _cache_lock:
            os.makedirs(CACHE_DIR, exist_ok=True)
            with open(cp, "w", encoding="utf-8") as f:
                json.dump({"url": url, "range": range_hdr, "body": parsed}, f, ensure_ascii=False)
    return parsed


def q(v, safe="(),.*:"):
    return urllib.parse.quote(str(v), safe=safe)


def rest_get(table, params, range_hdr=None):
    """params: list of (key, value) — value is encoded; key kept raw.

    r2 FIX: supabase-js (postgrest-js) merges chained .order() calls into ONE
    comma-joined `order` query param. PostgREST honors only a single `order`
    param per request — repeated `order` params silently drop all but one, so
    the harness's old multi-param emission dropped the secondary/tertiary sort
    keys (bible_chapter, title) and produced FALSE order failures wherever ties
    existed. We now merge exactly like the app client does. (Repeated FILTER
    params, e.g. sort_order=gte.1&sort_order=lte.999, are valid ANDs — kept.)"""
    merged, orders = [], []
    for k, v in params:
        if k == "order":
            orders.append(str(v))
        else:
            merged.append((k, v))
    if orders:
        merged.append(("order", ",".join(orders)))
    qs = "&".join(f"{k}={q(v)}" for k, v in merged)
    url = f"{SUPABASE_URL}/rest/v1/{table}?{qs}"
    out = _rest_raw("GET", url, range_hdr=range_hdr)
    if isinstance(out, dict):  # PostgREST error object
        _stats["errors"] += 1
        return {"_error": out}
    return out


def rest_rpc(fn, payload):
    url = f"{SUPABASE_URL}/rest/v1/rpc/{fn}"
    out = _rest_raw("POST", url, body=json.dumps(payload))
    if isinstance(out, dict):
        _stats["errors"] += 1
        return {"_error": out}
    return out


def is_err(x):
    return isinstance(x, dict) and ("_error" in x)

# ── audience helpers ──
PUBLIC_AUD_OR = "(audience_tags.cs.{general},audience_tags.not.cs.{teachers})"

# ── PGRST201 embed-ambiguity handling ──────────────────────────────────────────
# The DB now has lesson_rabbis / series_rabbis m2m tables ALONGSIDE the rabbi_id
# fkeys. PostgREST therefore rejects the app's own `rabbis(name)` embeds with
# PGRST201 (ambiguous relationship). The app code sends the ambiguous form, so the
# REAL UI query fails (lists render empty). The harness records this as a P0
# finding (probe_embed_ambiguity) and uses the DISAMBIGUATED embed for the data
# diff, so we can still verify content parity underneath the embed bug.
EMBED_BUG = {"lessons_rabbis": False, "series_rabbis": False}
LESSON_RABBI_EMBED = "rabbis(name)"
SERIES_RABBI_EMBED = "rabbis(name)"


def probe_embed_ambiguity():
    global LESSON_RABBI_EMBED, SERIES_RABBI_EMBED
    out = rest_get("lessons", [("select", "id,rabbis(name)"), ("limit", "1")])
    if is_err(out) and out["_error"].get("code") == "PGRST201":
        EMBED_BUG["lessons_rabbis"] = True
        LESSON_RABBI_EMBED = "rabbis!lessons_rabbi_id_fkey(name)"
    out = rest_get("series", [("select", "id,rabbis(name)"), ("limit", "1")])
    if is_err(out) and out["_error"].get("code") == "PGRST201":
        EMBED_BUG["series_rabbis"] = True
        SERIES_RABBI_EMBED = "rabbis!series_rabbi_id_fkey(name)"
    if EMBED_BUG["lessons_rabbis"] or EMBED_BUG["series_rabbis"]:
        print("⚠️  PGRST201: rabbis(name) embeds are AMBIGUOUS (lesson_rabbis/series_rabbis m2m exist) — "
              "the app's own queries fail; harness continues with disambiguated embeds.")


def teachers_only(tags):
    tags = tags or []
    return ("teachers" in tags) and ("general" not in tags)

# ── sequence comparison ──


def compare_seq(old_items, new_items, old_key=lambda x: x["key"], new_key=lambda x: x["key"]):
    """Order-sensitive multiset diff. Returns metrics + indices of extra new items."""
    ok = [old_key(x) for x in old_items]
    nk = [new_key(x) for x in new_items]
    sm = difflib.SequenceMatcher(a=ok, b=nk, autojunk=False)
    blocks = [b for b in sm.get_matching_blocks() if b.size]
    matched_in_order = sum(b.size for b in blocks)
    co, cn = Counter(ok), Counter(nk)
    matched = sum(min(co[k], cn[k]) for k in co)
    missing = list((co - cn).elements())
    # identify EXTRA new item indices (occurrences beyond old multiplicity)
    allow = dict(co)
    extra_idx = []
    for i, k in enumerate(nk):
        if allow.get(k, 0) > 0:
            allow[k] -= 1
        else:
            extra_idx.append(i)
    return {
        "old_count": len(ok), "new_count": len(nk),
        "matched": matched, "matched_in_order": matched_in_order,
        "order_ok": matched_in_order == matched,
        "missing": missing, "extra_idx": extra_idx,
        "blocks": [(b.a, b.b, b.size) for b in blocks],
    }

# ── ground truth loaders ──


def load_json(name):
    with open(os.path.join(ONEONE, name), encoding="utf-8") as f:
        return json.load(f)


def load_planned_ops():
    """planned_in[series_id] = set(lesson ids the plan places/sorts there);
       planned_out = set(lesson ids the plan drafts or moves away)."""
    planned_in = defaultdict(set)
    planned_out = set()
    moved_to = {}
    path = os.path.join(ONEONE, "plans", "RESOLVED-OPS.jsonl")
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            b = json.loads(line).get("body", {})
            op = b.get("op")
            if op == "set_lesson_sort" and b.get("series_ref") and b.get("lesson_id"):
                planned_in[b["series_ref"]].add(b["lesson_id"])
            elif op == "copy_lesson" and b.get("to_series_ref") and b.get("lesson_id"):
                planned_in[b["to_series_ref"]].add(b["lesson_id"])
            elif op == "move_lesson" and b.get("to_series_ref") and b.get("lesson_id"):
                planned_in[b["to_series_ref"]].add(b["lesson_id"])
                moved_to[b["lesson_id"]] = b["to_series_ref"]
            elif op == "draft_lesson" and b.get("lesson_id"):
                planned_out.add(b["lesson_id"])
    return planned_in, planned_out, moved_to

# ═════════════════════════ 1. SIDEBAR ═════════════════════════


def sim_sidebar():
    """Replicates useContentSidebar() sidebarQuery exactly (current working tree)."""
    cat_ids = [ROOT_IDS["torah"], ROOT_IDS["ketuvim"]]
    tk_books = rest_get("series", [
        ("select", "id,title,parent_id"),
        ("parent_id", f"in.({','.join(cat_ids)})"),
        ("status", "in.(active,published,category)"),
        ("order", "title"),
    ])
    nev_books = rest_get("series", [
        ("select", "id,title,parent_id"),
        ("parent_id", f"eq.{ROOT_IDS['neviim']}"),
        ("status", "eq.category"),
        ("order", "title"),
    ])
    all_books = (tk_books if not is_err(tk_books) else []) + (nev_books if not is_err(nev_books) else [])

    def children_of(parent_ids):
        if not parent_ids:
            return []
        out = rest_get("series", [
            ("select", "id,title,parent_id,sort_order,status,audience_tags"),
            ("parent_id", f"in.({','.join(parent_ids)})"),
            ("status", "in.(active,published)"),
            # §2.1 band: 1..999 (was 1..99; raised in commit 7420b265 — תהלים has 150 children)
            ("sort_order", "gte.1"),
            ("sort_order", "lte.999"),
            ("or", PUBLIC_AUD_OR),
            ("order", "sort_order"),
            ("order", "title"),
        ])
        return out if not is_err(out) else []

    torah_book_ids = [b["id"] for b in all_books if b["parent_id"] == ROOT_IDS["torah"]]
    nk_book_ids = [b["id"] for b in all_books if b["parent_id"] in (ROOT_IDS["neviim"], ROOT_IDS["ketuvim"])]
    torah_children = children_of(torah_book_ids)
    nk_children = children_of(nk_book_ids)

    # "איך לומדים" is now a flat section like the others (direct band-1..999 children only).
    # Previous deep-RPC approach fetched all descendants (20+), breaking parity.
    # Mirrors the updated useContentSidebar.ts (code-round-3).
    flat_ids = [ROOT_IDS[k] for k in ("howToLearn", "generalTopics", "moadim", "haftarot", "tools", "yemeiIyun", "livuyTatim")]
    expandable_children = children_of(flat_ids)

    children_by_book = defaultdict(list)
    for c in (torah_children + nk_children):
        children_by_book[c["parent_id"]].append(c)
    for k in children_by_book:
        children_by_book[k].sort(key=lambda c: ((c.get("sort_order") or 0), he_sort_key(c["title"])))

    torah_books = []
    for name in TORAH_BOOK_ORDER:
        b = next((x for x in all_books if x["title"] == name and x["parent_id"] == ROOT_IDS["torah"]), None)
        if b:
            torah_books.append({"id": b["id"], "title": b["title"], "children": children_by_book.get(b["id"], [])})
    # §2.5 tree CA8: synthetic 6th Torah entry (useContentSidebar.ts, fixed 12.6.2026)
    torah_books.append({"id": ROOT_IDS["riddles"], "title": 'חידות לילדים פ״ש', "children": []})
    nev = sort_by_biblical_order([b for b in all_books if b["parent_id"] == ROOT_IDS["neviim"]])
    ket = sort_by_biblical_order([b for b in all_books if b["parent_id"] == ROOT_IDS["ketuvim"]])
    neviim_books = [{"id": b["id"], "title": b["title"], "children": children_by_book.get(b["id"], [])} for b in nev]
    ketuvim_books = [{"id": b["id"], "title": b["title"], "children": children_by_book.get(b["id"], [])} for b in ket]

    def get_children(pid):
        return [c for c in expandable_children if c["parent_id"] == pid]

    extra_sections = [
        {"id": ROOT_IDS["howToLearn"], "title": 'איך לומדים תנ"ך', "children": get_children(ROOT_IDS["howToLearn"])},
        {"id": ROOT_IDS["generalTopics"], "title": 'נושאים כלליים בתנ"ך', "children": get_children(ROOT_IDS["generalTopics"])},
        {"id": ROOT_IDS["moadim"], "title": "המועדים", "children": get_children(ROOT_IDS["moadim"])},
        {"id": ROOT_IDS["haftarot"], "title": "הפטרות", "children": get_children(ROOT_IDS["haftarot"])},
        {"id": ROOT_IDS["tools"], "title": "כלי עזר - טבלאות זמני המאורעות ומפות", "children": get_children(ROOT_IDS["tools"])},
        {"id": ROOT_IDS["yemeiIyun"], "title": 'ימי עיון בתנ"ך', "children": get_children(ROOT_IDS["yemeiIyun"])},
        {"id": ROOT_IDS["livuyTatim"], "title": 'ליווי ת"תים', "children": get_children(ROOT_IDS["livuyTatim"])},
    ]
    return {
        "categories": [
            {"id": ROOT_IDS["torah"], "title": "תורה", "books": torah_books},
            {"id": ROOT_IDS["neviim"], "title": "נביאים", "books": neviim_books},
            {"id": ROOT_IDS["ketuvim"], "title": "כתובים", "books": ketuvim_books},
        ],
        "extraSections": extra_sections,
    }


def book_alias_label(cat_title, book_title):
    """Mirrors bookAliasLabel() in DesignSidebar.tsx — per-book exact label."""
    if cat_title == "תורה":
        return f"כל השיעורים בחומש {book_title}"
    if book_title in ("איכה", "קהלת"):
        return f"כל השיעורים במגילת {book_title}"
    if book_title == "אסתר":
        return f"כל השיעורים על מגילת {book_title}"
    if book_title == "דניאל":
        return f"כל התכנים בספר {book_title}"
    if book_title == "עזרא ונחמיה":
        return "כל עזרא ונחמיה"
    return f"כל השיעורים בספר {book_title}"


def render_book_children(cat_title, book):
    """What DesignSidebar actually renders inside an open book accordion."""
    rows = []
    if len(book["children"]) > 1:
        rows.append({"title": book_alias_label(cat_title, book["title"]), "kind": "alias"})
    for c in book["children"]:
        rows.append({"title": c["title"], "kind": "child", "id": c.get("id"),
                     "status": c.get("status"), "audience_tags": c.get("audience_tags")})
    # riddles row removed from בראשית — now a synthetic 6th Torah-level book (useContentSidebar.ts)
    # It shows up in the books_ok check under תורה, not inside בראשית children (fixed 12.6.2026)
    return rows


def render_section_children(section):
    rows = [{"title": f"כל השיעורים ב{section['title']}", "kind": "alias"}]
    for c in section["children"]:
        rows.append({"title": c["title"], "kind": "child", "id": c.get("id"),
                     "status": c.get("status"), "audience_tags": c.get("audience_tags")})
    return rows


def run_sidebar(results):
    t0 = time.time()
    old = load_json("old_sidebar_tree.json")["tree"]
    sim = sim_sidebar()
    cat_by_title = {c["title"]: c for c in sim["categories"]}
    sec_by_root = {s["id"]: s for s in sim["extraSections"]}
    SEC_MAP = {  # old top title → new section root id
        'איך לומדים תנ"ך': "howToLearn",
        'נושאים כלליים בתנ"ך': "generalTopics",
        "מועדים": "moadim",
        "הפטרות": "haftarot",
        'ימי עיון בתנ"ך': "yemeiIyun",
        "כלי עזר - טבלאות זמני המאורעות ומפות": "tools",
        'ליווי ת"תים': "livuyTatim",
    }
    QUICK_LINKS = ["ניווט באתר לפי ספר ופרק", "פרשת השבוע", 'איך לומדים תנ"ך']  # DesignSidebar.tsx:198-201 (label fixed 12.6.2026)
    per_cat = []
    for top in old:
        name = top["title"]
        oc = top.get("children", [])
        entry = {"old_top": name, "old_children": len(oc)}
        if name in cat_by_title:
            cat = cat_by_title[name]
            # level 1: book list
            cmp1 = compare_seq(
                [{"key": normalize_he(b["title"])} for b in oc],
                [{"key": normalize_he(b["title"])} for b in cat["books"]],
            )
            book_fails, book_details = 0, []
            old_books = {normalize_he(b["title"]): b for b in oc}
            for book in cat["books"]:
                ob = old_books.get(normalize_he(book["title"]))
                if ob is None:
                    continue
                rendered = render_book_children(cat["title"], book)
                cmp2 = compare_seq(
                    [{"key": normalize_he(x["title"])} for x in ob.get("children", [])],
                    [{"key": normalize_he(x["title"])} for x in rendered],
                )
                ok = (not cmp2["missing"]) and (not cmp2["extra_idx"]) and cmp2["order_ok"]
                if not ok:
                    book_fails += 1
                    book_details.append({
                        "book": book["title"],
                        "old_count": cmp2["old_count"], "new_count": cmp2["new_count"],
                        "missing": cmp2["missing"][:15],
                        "extra": [normalize_he(rendered[i]["title"]) for i in cmp2["extra_idx"]][:15],
                        "order_ok": cmp2["order_ok"],
                    })
            books_ok = (not cmp1["missing"]) and (not cmp1["extra_idx"]) and cmp1["order_ok"]
            entry.update({
                "kind": "category",
                "books_ok": books_ok,
                "books_missing": cmp1["missing"][:10],
                "books_extra": [normalize_he(cat["books"][i]["title"]) for i in cmp1["extra_idx"]][:10],
                "books_order_ok": cmp1["order_ok"],
                "book_children_fail": book_fails,
                "book_children_total": len(cat["books"]),
                "book_details": book_details[:10],
                "pass": books_ok and book_fails == 0,
            })
        elif name in SEC_MAP:
            sec = sec_by_root[ROOT_IDS[SEC_MAP[name]]]
            rendered = render_section_children(sec)
            cmp1 = compare_seq(
                [{"key": normalize_he(x["title"])} for x in oc],
                [{"key": normalize_he(x["title"])} for x in rendered],
            )
            # depth gap: old grandchildren that the new sidebar cannot render (one level only)
            grand = sum(len(x.get("children", [])) for x in oc)
            entry.update({
                "kind": "section",
                "missing": cmp1["missing"][:20],
                "extra": [normalize_he(rendered[i]["title"]) for i in cmp1["extra_idx"]][:20],
                "order_ok": cmp1["order_ok"],
                "old_grandchildren_not_renderable": grand,
                "pass": (not cmp1["missing"]) and (not cmp1["extra_idx"]) and cmp1["order_ok"] and grand == 0,
            })
        else:
            # link-only top rows (ניווט / פרשת השבוע / פרוייקט התנ"ך המוקלט)
            nk = normalize_he(name)
            found = any(normalize_he(qk).startswith(nk[:12]) or nk.startswith(normalize_he(qk)[:12]) for qk in QUICK_LINKS)
            entry.update({"kind": "static_link", "rendered_as_quick_link": found, "pass": found})
        per_cat.append(entry)
    n_pass = sum(1 for e in per_cat if e.get("pass"))
    results["sidebar"] = {
        "per_category": per_cat,
        "pass": n_pass, "total": len(per_cat),
        "runtime_s": round(time.time() - t0, 1),
        "sim_draft_children": sum(
            1 for s in sim["extraSections"] for c in s["children"] if c.get("status") == "draft"
        ),
        "sim_teacher_only_children": sum(
            1 for s in sim["extraSections"] for c in s["children"] if teachers_only(c.get("audience_tags"))
        ),
    }
    print(f"[sidebar] {n_pass}/{len(per_cat)} top-categories PASS ({results['sidebar']['runtime_s']}s)")

# ═════════════════════════ 2. LISTING PAGES ═════════════════════════


def sim_series_page(series_id):
    """Replicates /series/:id — useSeriesChildren + useLessonsBySeries (current code)."""
    children = rest_get("series", [
        ("select", "id,title,description,image_url,lesson_count,status,audience_tags,rabbi_id,sort_order," + SERIES_RABBI_EMBED + ""),
        ("parent_id", f"eq.{series_id}"),
        ("status", "in.(active,published,category)"),
        ("audience_tags", "not.cs.{teachers}"),
        ("order", "sort_order.asc.nullslast"),
        ("order", "title"),
    ])
    if is_err(children):
        children = []
    rendered_children = [c for c in children if (c.get("lesson_count") or 0) > 0]

    def fetch_page(frm, to):
        # §0.3 dual-audience: useLessonsBySeries now filters teacher-only (code-round-3)
        out = rest_get("lessons", [
            ("select", "id,title,sort_order,bible_chapter,status,audience_tags,attachment_url,audio_url,video_url,rabbi_id," + LESSON_RABBI_EMBED),
            ("series_id", f"eq.{series_id}"),
            ("status", "eq.published"),
            ("or", PUBLIC_AUD_OR),
            ("order", "sort_order.asc.nullslast"),
            ("order", "bible_chapter.asc.nullslast"),
            ("order", "title.asc"),
        ], range_hdr=f"{frm}-{to}")
        return out if not is_err(out) else []

    page1 = fetch_page(0, 999)
    page2 = fetch_page(1000, 1999) if len(page1) == 1000 else []
    seen, lessons = set(), []
    for l in page1 + page2:
        if l["id"] in seen:
            continue
        seen.add(l["id"])
        lessons.append(l)
    return rendered_children, lessons


def rpc_descendant_ids(node_id):
    desc = rest_rpc("get_series_descendant_ids", {"root_id": node_id})
    return [d["series_id"] for d in desc] if not is_err(desc) else []


def sim_series_for_node(node_id):
    """Replicates useContentSidebar.useSeriesForNode (CategoryPage series cards):
    descendants via RPC → series in(ids), status in (active,published,draft),
    audience OR, order sort_order nullslast + title, limit 1000 → JS canonical
    dedup (drop direct-child empty drafts; best-score per app_norm title) →
    JS band sort (1-99 main / >=100 parked / 0,NULL page-only)."""
    ids = rpc_descendant_ids(node_id)
    if not ids:
        return []
    series = rest_get("series", [
        ("select", "id,title,lesson_count,rabbi_id,description,status,image_url,parent_id,sort_order"),
        ("id", f"in.({','.join(ids)})"),
        ("status", "in.(active,published,draft)"),
        ("or", PUBLIC_AUD_OR),
        ("order", "sort_order.asc.nullslast"),
        ("order", "title.asc"),
        ("limit", "1000"),
    ])
    if is_err(series):
        return []
    filtered = [s for s in series
                if not (s["status"] == "draft" and (s.get("lesson_count") or 0) == 0
                        and s.get("parent_id") == node_id)]
    by_title = {}
    for s in filtered:
        key = app_norm(s["title"])
        ex = by_title.get(key)
        if ex is None:
            by_title[key] = s
        else:
            ex_score = (2 if ex["status"] != "draft" else 0) + (1 if (ex.get("lesson_count") or 0) > 0 else 0)
            new_score = (2 if s["status"] != "draft" else 0) + (1 if (s.get("lesson_count") or 0) > 0 else 0)
            if new_score > ex_score:
                by_title[key] = s
    canonical = list(by_title.values())

    import functools

    def _cmp(a, b):
        ao, bo = a.get("sort_order"), b.get("sort_order")
        band_a = 2 if (ao is None or ao == 0) else (1 if ao >= 100 else 0)
        band_b = 2 if (bo is None or bo == 0) else (1 if bo >= 100 else 0)
        if band_a != band_b:
            return band_a - band_b
        if band_a == 0 and (ao or 0) != (bo or 0):
            return (ao or 0) - (bo or 0)
        a_act = 1 if (a["status"] != "draft" and (a.get("lesson_count") or 0) > 0) else 0
        b_act = 1 if (b["status"] != "draft" and (b.get("lesson_count") or 0) > 0) else 0
        if b_act != a_act:
            return b_act - a_act
        return (b.get("lesson_count") or 0) - (a.get("lesson_count") or 0)

    canonical.sort(key=functools.cmp_to_key(_cmp))  # python sort stable like JS
    return canonical


# NOTE: audience_tags is NOT in the app's select — added here as harness-only telemetry
# for the guards section (extra column cannot change the row set or the order).
CATEGORY_LESSON_SELECT = ("id,title,duration,thumbnail_url,video_url,audio_url,attachment_url,"
                          "bible_chapter,rabbi_id,series_id,audience_tags,rabbis!lessons_rabbi_id_fkey(name)")


def sim_category_page(node_id):
    """Replicates CategoryPage (/category/:id, post commit 4a1c3691):
      series cards = useSeriesForNode (canonical dedup)
      lessons      = useDirectLessons (series_id=eq.node, NO audience filter, limit 1000)
                     + useRollupLessons (descendants in chunks of 40, audience OR filter,
                       limit 1000/chunk) — combined direct-first, dedup by id.
    Order per query: sort_order NULLS LAST, bible_chapter NULLS LAST, title ASC."""
    series = sim_series_for_node(node_id)
    # §0.3 dual-audience: useDirectLessons now filters teacher-only (code-round-3)
    direct = rest_get("lessons", [
        ("select", CATEGORY_LESSON_SELECT),
        ("series_id", f"eq.{node_id}"),
        ("status", "eq.published"),
        ("or", PUBLIC_AUD_OR),
        ("order", "sort_order.asc.nullslast"),
        ("order", "bible_chapter.asc.nullslast"),
        ("order", "title.asc"),
        ("limit", "1000"),
    ])
    if is_err(direct):
        direct = []
    rollup = []
    if series:  # hasChildSeries gate (page enables roll-up only when seriesList non-empty)
        desc_ids = rpc_descendant_ids(node_id)
        for i in range(0, len(desc_ids), 40):
            chunk = desc_ids[i:i + 40]
            out = rest_get("lessons", [
                ("select", CATEGORY_LESSON_SELECT),
                ("series_id", f"in.({','.join(chunk)})"),
                ("status", "eq.published"),
                ("or", PUBLIC_AUD_OR),
                ("order", "sort_order.asc.nullslast"),
                ("order", "bible_chapter.asc.nullslast"),
                ("order", "title.asc"),
                ("limit", "1000"),
            ])
            if not is_err(out):
                rollup.extend(out)
    seen, lessons = set(), []
    for l in direct + rollup:
        if l["id"] in seen:
            continue
        seen.add(l["id"])
        lessons.append(l)
    return series, lessons


def page_section(url):
    u = urllib.parse.unquote(url).replace("https://www.bneyzion.co.il", "")
    parts = [p for p in u.split("/") if p]
    if len(parts) >= 2 and parts[0] in ("מאגר-השיעורים-והמאמרים", "מאגר-עזרי-הלמידה"):
        return parts[1]
    return parts[0] if parts else "?"


def run_listings(results, limit_pages=None, workers=8):
    t0 = time.time()
    im = load_json("match/item_match.json")["listings"]
    old_tk = load_json("old_listings_torah_ketuvim.json")["pages"]
    old_nm = load_json("old_listings_neviim_moadim.json")
    old_pages = {}
    for u, p in old_tk.items():
        if u != "_meta":
            old_pages[u] = ("tk", p)
    for u, p in old_nm.items():
        if u != "_meta" and isinstance(p, dict):
            old_pages[u] = ("nm", p)
    planned_in, planned_out, moved_to = load_planned_ops()

    # tree_map node kinds — category/book pages are rendered by CategoryPage in the app
    # (descendant aggregation), NOT /series/:id; flag them so diffs are read in context.
    def _norm_url(u):
        u = urllib.parse.unquote(u or "").replace("https://www.bneyzion.co.il", "")
        u = unicodedata.normalize("NFC", u)
        return u.rstrip("/")
    kind_by_url = {}
    try:
        for n in load_json("match/tree_map.json")["nodes"]:
            kind_by_url[_norm_url(n.get("old_url_norm") or n.get("old_url"))] = n.get("node_kind")
    except Exception:
        pass

    # twin re-pick: if the mapped series is an empty draft and a same-parent sibling with the
    # same normalized title has published lessons, follow the sibling (that's what the UI links to).
    twin_fix = {}
    try:
        rows = rest_get("series", {"select": "id,title,parent_id,status,lesson_count"})
        byparent = defaultdict(list)
        for r in rows: byparent[r.get("parent_id")].append(r)
        byid = {r["id"]: r for r in rows}
        def _repick(sid):
            r = byid.get(sid)
            if not r: return sid
            if (r.get("lesson_count") or 0) > 0 and r.get("status") in ("active","published","category"): return sid
            nt = normalize_he(r.get("title") or "")
            sib = [x for x in byparent.get(r.get("parent_id"), [])
                   if x["id"] != sid and normalize_he(x.get("title") or "") == nt
                   and (x.get("lesson_count") or 0) > 0 and x.get("status") in ("active","published")]
            if sib:
                twin_fix[sid] = sib[0]["id"]
                return sib[0]["id"]
            return sid
    except Exception:
        def _repick(sid): return sid

    jobs = []
    unmapped = 0
    for url, m in im.items():
        sid = m.get("mapped_series_id")
        if not sid:
            unmapped += 1
            continue
        sid = _repick(sid)
        src = old_pages.get(url)
        if not src:
            unmapped += 1
            continue
        jobs.append((url, sid, src))
    if limit_pages:
        jobs = jobs[:limit_pages]

    lock = threading.Lock()
    page_results = []
    lesson_id_pool = defaultdict(list)  # section → lesson ids (for guards sampling)

    def work(job):
        url, sid, (kind, p) = job
        items = p.get("items", [])
        if kind == "tk":
            items = sorted(items, key=lambda x: x.get("order_index", 0))
            old_lessons = [{"key": normalize_he(it["title_norm"]), "rabbi": norm_rabbi(it.get("rabbi_norm", ""))}
                           for it in items if it.get("type") in ("שיעור", 'שו"ת')]
            old_series = []  # tk scrape has no series-card items (sub-series live in sub_links)
        else:
            items = sorted(items, key=lambda x: x.get("order", 0))
            old_lessons = [{"key": normalize_he(it["title_norm"]), "rabbi": norm_rabbi(it.get("author_norm", ""))}
                           for it in items if it.get("type") in ("שיעור", 'שו"ת')]
            old_series = [{"key": normalize_he(it["title_norm"]), "rabbi": norm_rabbi(it.get("author_norm", ""))}
                          for it in items if it.get("type") == "סדרה"]
        # r2: category/book nodes are rendered by CategoryPage (descendant roll-up,
        # commit 4a1c3691) — simulate that; everything else stays /series/:id semantics.
        node_kind = kind_by_url.get(_norm_url(url)) or "collection"
        sim_mode = "category_page" if node_kind in ("category", "book") else "series_page"
        if sim_mode == "category_page":
            children, lessons = sim_category_page(sid)
        else:
            children, lessons = sim_series_page(sid)
        new_lessons = [{"key": normalize_he(l["title"]),
                        "rabbi": norm_rabbi((l.get("rabbis") or {}).get("name", "") if isinstance(l.get("rabbis"), dict) else ""),
                        "id": l["id"], "tags": l.get("audience_tags")} for l in lessons]
        new_series = [{"key": normalize_he(c["title"]),
                       "rabbi": norm_rabbi((c.get("rabbis") or {}).get("name", "") if isinstance(c.get("rabbis"), dict) else ""),
                       "id": c["id"], "status": c.get("status")} for c in children]

        cl = compare_seq(old_lessons, new_lessons)
        # rabbi mismatches on aligned positions
        rmm = 0
        for a, b, size in cl["blocks"]:
            for t in range(size):
                orb = old_lessons[a + t]["rabbi"]
                nrb = new_lessons[b + t]["rabbi"]
                if orb and nrb and orb != nrb:
                    rmm += 1
        extras = [new_lessons[i] for i in cl["extra_idx"]]
        planned_keep = [e["id"] for e in extras if e["id"] in planned_in.get(sid, ())]
        planned_remove = [e["id"] for e in extras
                          if e["id"] not in planned_in.get(sid, ())
                          and (e["id"] in planned_out or (e["id"] in moved_to and moved_to[e["id"]] != sid))]
        unexplained = len(extras) - len(planned_keep) - len(planned_remove)

        rec = {
            "url": url, "series_id": sid, "section": page_section(url),
            "node_kind": node_kind, "sim_mode": sim_mode,
            "old_count": cl["old_count"], "new_count": cl["new_count"],
            "matched": cl["matched"], "matched_in_order": cl["matched_in_order"],
            "order_ok": cl["order_ok"],
            "missing": cl["missing"][:25], "n_missing": len(cl["missing"]),
            "n_extra": len(extras),
            "planned_extras": len(planned_keep), "planned_removals": len(planned_remove),
            "extra_unexplained": unexplained,
            "extra_sample": [e["key"] for e in extras[:15]],
            "rabbi_mismatches": rmm,
            "teacher_only_lessons": sum(1 for l in new_lessons if teachers_only(l.get("tags"))),
        }
        if old_series:
            cs = compare_seq(old_series, new_series)
            rec.update({
                "series_old": cs["old_count"], "series_new": cs["new_count"],
                "series_missing": cs["missing"][:15], "series_n_missing": len(cs["missing"]),
                "series_n_extra": len(cs["extra_idx"]), "series_order_ok": cs["order_ok"],
            })
            series_ok = (not cs["missing"]) and (not cs["extra_idx"]) and cs["order_ok"]
        else:
            rec["series_new_unchecked"] = len(new_series)
            series_ok = True
        rec["pass"] = (rec["n_missing"] == 0 and unexplained == 0 and len(planned_remove) == 0
                       and rec["order_ok"] and rmm == 0 and series_ok)
        with lock:
            page_results.append(rec)
            sec = rec["section"]
            for l in new_lessons[:8]:
                lesson_id_pool[sec].append(l["id"])
            if len(page_results) % 200 == 0:
                print(f"  [listings] {len(page_results)}/{len(jobs)} pages…", flush=True)
        return rec

    with ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(work, jobs))

    page_results.sort(key=lambda r: r["url"])
    by_section = defaultdict(lambda: {"pages": 0, "pass": 0, "old_items": 0, "new_items": 0,
                                      "missing": 0, "extra_unexplained": 0, "planned_extras": 0,
                                      "planned_removals": 0, "order_fail": 0, "rabbi_mm": 0})
    for r in page_results:
        s = by_section[r["section"]]
        s["pages"] += 1
        s["pass"] += 1 if r["pass"] else 0
        s["old_items"] += r["old_count"]
        s["new_items"] += r["new_count"]
        s["missing"] += r["n_missing"]
        s["extra_unexplained"] += r["extra_unexplained"]
        s["planned_extras"] += r["planned_extras"]
        s["planned_removals"] += r["planned_removals"]
        s["order_fail"] += 0 if r["order_ok"] else 1
        s["rabbi_mm"] += r["rabbi_mismatches"]
    is_agg = lambda r: r.get("node_kind") in ("category", "book")
    # r2: agg pages are now simulated with their real renderer (CategoryPage) — rank purely by badness.
    worst = sorted(page_results,
                   key=lambda r: -(r["n_missing"] + r["extra_unexplained"] + r["planned_removals"]))[:20]
    n_agg_pages = sum(1 for r in page_results if is_agg(r))
    n_pass = sum(1 for r in page_results if r["pass"])
    results["listings"] = {
        "pages_simulated": len(page_results), "pages_unmapped_skipped": unmapped,
        "aggregation_pages": n_agg_pages,
        "pass": n_pass, "total": len(page_results),
        "by_section": dict(by_section),
        "worst20": worst,
        "pages": page_results,
        "lesson_id_pool": {k: v[:400] for k, v in lesson_id_pool.items()},
        "runtime_s": round(time.time() - t0, 1),
    }
    print(f"[listings] {n_pass}/{len(page_results)} pages PASS ({results['listings']['runtime_s']}s)")

# ═════════════════════════ 3. RABBI PAGES ═════════════════════════


def run_rabbis(results, workers=8):
    t0 = time.time()
    old = load_json("old_rabbi_pages.json")
    im = load_json("match/item_match.json")["rabbi_pages"]
    names = [n for n in old.keys() if n != "_summary"]

    # probe rabbi_page_items once
    probe = rest_get("rabbi_page_items", [("select", "id"), ("limit", "1")])
    rpi_available = not is_err(probe)

    lock = threading.Lock()
    out_rows = []

    def work(name):
        op = old[name]
        m = im.get(name) or {}
        rid = m.get("mapped_rabbi_id")
        rec = {"rabbi": name, "old_items": op.get("n_items", 0)}
        if not rid:
            rec.update({"status": "unmapped", "pass": False})
            with lock:
                out_rows.append(rec)
            return
        used_rpi = False
        rpi_rows = []
        if rpi_available:
            rpi_rows = rest_get("rabbi_page_items", [
                ("select", "id,kind,series_id,lesson_id,sort_order,series(id,title,lesson_count),lessons(id,title,audio_url,video_url,attachment_url)"),
                ("rabbi_id", f"eq.{rid}"),
                ("sort_order", "lt.9000"),
                ("order", "sort_order.asc"),
            ])
            if is_err(rpi_rows):
                rpi_rows = []
        if rpi_rows:
            used_rpi = True
            new_series = [{"key": normalize_he((r.get("series") or {}).get("title", ""))}
                          for r in rpi_rows if r.get("kind") == "series" and r.get("series")]
            new_lessons = [{"key": normalize_he((r.get("lessons") or {}).get("title", "")),
                            "id": (r.get("lessons") or {}).get("id"), "tags": None}
                           for r in rpi_rows if r.get("kind") in ("lesson", "qa") and r.get("lessons")]
        else:
            sr = rest_get("series", [
                ("select", "id,title,lesson_count,status,audience_tags,sort_order"),
                ("rabbi_id", f"eq.{rid}"),
                ("status", "in.(active,published)"),
                ("audience_tags", "not.cs.{teachers}"),
                ("order", "sort_order.asc.nullslast"),
                ("order", "lesson_count.desc"),
            ])
            if is_err(sr):
                sr = []
            lr = rest_get("lessons", [
                ("select", "id,title,attachment_url,audio_url,video_url,bible_chapter,audience_tags,series(id,title)"),
                ("rabbi_id", f"eq.{rid}"),
                ("status", "eq.published"),
                ("order", "bible_chapter.asc.nullslast"),
                ("order", "title.asc"),
            ])
            if is_err(lr):
                lr = []
            # enriched-key dedup (useRabbiLessons)
            seen, dedup = set(), []
            for l in lr:
                st = (l.get("series") or {}).get("title", "") if isinstance(l.get("series"), dict) else ""
                att = (l.get("attachment_url") or "").split("/")[-1].split("?")[0] if l.get("attachment_url") else ""
                key = f"{app_norm(l.get('title'))}|{app_norm(st)}|{att}|{l.get('audio_url') or ''}|{l.get('video_url') or ''}"
                if key in seen:
                    continue
                seen.add(key)
                dedup.append(l)
            new_series = [{"key": normalize_he(s["title"])} for s in sr]
            new_lessons = [{"key": normalize_he(l["title"]), "id": l["id"], "tags": l.get("audience_tags")} for l in dedup]

        items = sorted(op.get("items", []), key=lambda x: x.get("order_index", 0))
        old_series = [{"key": normalize_he(it["title_norm"])} for it in items if it.get("item_type") == "סדרה"]
        old_lessons = [{"key": normalize_he(it["title_norm"])} for it in items if it.get("item_type") in ("שיעור", 'שו"ת')]
        cs = compare_seq(old_series, new_series)
        cl = compare_seq(old_lessons, new_lessons)
        rec.update({
            "rabbi_id": rid, "used_rpi": used_rpi,
            "series_old": cs["old_count"], "series_new": cs["new_count"],
            "series_missing": cs["missing"][:10], "series_n_missing": len(cs["missing"]),
            "series_n_extra": len(cs["extra_idx"]), "series_order_ok": cs["order_ok"],
            "lessons_old": cl["old_count"], "lessons_new": cl["new_count"],
            "lessons_missing": cl["missing"][:10], "lessons_n_missing": len(cl["missing"]),
            "lessons_n_extra": len(cl["extra_idx"]), "lessons_order_ok": cl["order_ok"],
            "teacher_only_lessons": sum(1 for l in new_lessons if teachers_only(l.get("tags"))),
        })
        rec["pass"] = (cs["old_count"] == cs["new_count"] == cs["matched"] and cs["order_ok"]
                       and cl["old_count"] == cl["new_count"] == cl["matched"] and cl["order_ok"])
        with lock:
            out_rows.append(rec)

    with ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(work, names))
    out_rows.sort(key=lambda r: r["rabbi"])
    n_pass = sum(1 for r in out_rows if r.get("pass"))
    results["rabbis"] = {
        "rpi_table_available": rpi_available,
        "rpi_used_count": sum(1 for r in out_rows if r.get("used_rpi")),
        "pass": n_pass, "total": len(out_rows),
        "rows": out_rows,
        "runtime_s": round(time.time() - t0, 1),
    }
    print(f"[rabbis] {n_pass}/{len(out_rows)} rabbi pages PASS ({results['rabbis']['runtime_s']}s)")

# ═════════════════════════ 4. TOPICS ═════════════════════════


def run_topics(results, workers=8):
    t0 = time.time()
    old_sidebar = load_json("old_topics_sidebar.json")["items"]
    old_pages = load_json("old_topic_pages.json")
    im = load_json("match/item_match.json")["topic_pages"]

    # — sidebar sim (useTopicsSidebar) —
    parent = rest_get("topics", [("select", "id"), ("slug", "eq.themes-root")])
    sidebar_rec = {}
    if is_err(parent) or not parent:
        sidebar_rec = {"pass": False, "error": "themes-root not found"}
        children = []
    else:
        pid = parent[0]["id"]
        children = rest_get("topics", [
            ("select", "id,name,slug,sort_order"),
            ("parent_id", f"eq.{pid}"),
            ("order", "sort_order.asc.nullslast"),
            ("order", "name.asc"),
        ])
        if is_err(children):
            children = []
        counts_rows = []
        if children:
            ids = ",".join(c["id"] for c in children)
            counts_rows = rest_get("lesson_topics", [
                ("select", "topic_id,lessons!inner(status,audience_tags)"),
                ("topic_id", f"in.({ids})"),
                ("lessons.status", "eq.published"),
                ("lessons.audience_tags", "not.cs.{teachers}"),
            ])  # NOTE: app sends NO limit → server caps at 1000 rows (faithful replication)
            if is_err(counts_rows):
                counts_rows = []
        cmap = Counter(r["topic_id"] for r in counts_rows)
        # Sort by sort_order ASC (curated 1..127), then name — mirrors updated useTopicsSidebar
        new_items = sorted(
            [{"name": c["name"], "slug": c["slug"], "count": cmap.get(c["id"], 0),
              "sort_order": c.get("sort_order")} for c in children],
            key=lambda x: (x["sort_order"] if x["sort_order"] is not None else 99999, x["name"]),
        )
        cmp1 = compare_seq(
            [{"key": normalize_he(i["title_norm"])} for i in sorted(old_sidebar, key=lambda x: x["order_index"])],
            [{"key": normalize_he(i["name"])} for i in new_items],
        )
        count_diffs = []
        old_counts = {normalize_he(i["title_norm"]): i["count"] for i in old_sidebar}
        for ni in new_items:
            k = normalize_he(ni["name"])
            if k in old_counts and old_counts[k] != ni["count"]:
                count_diffs.append({"topic": ni["name"], "old": old_counts[k], "new": ni["count"]})
        sidebar_rec = {
            "old_count": cmp1["old_count"], "new_count": cmp1["new_count"],
            "missing": cmp1["missing"][:20], "n_missing": len(cmp1["missing"]),
            "n_extra": len(cmp1["extra_idx"]),
            "extra": [normalize_he(new_items[i]["name"]) for i in cmp1["extra_idx"]][:20],
            "order_ok": cmp1["order_ok"],
            "count_rows_fetched": len(counts_rows),
            "count_rows_capped_at_1000": len(counts_rows) == 1000,
            "count_mismatches": len(count_diffs), "count_diff_sample": count_diffs[:15],
            "pass": (not cmp1["missing"]) and (not cmp1["extra_idx"]) and cmp1["order_ok"],
        }

    # — series_topics availability —
    st_probe = rest_get("series_topics", [("select", "series_id"), ("limit", "1")])
    st_available = not is_err(st_probe)
    st_nonempty = st_available and bool(st_probe)

    # — per-topic pages —
    lock = threading.Lock()
    rows = []
    topic_names = [n for n in old_pages.keys() if n != "__index__"]

    def work(name):
        op = old_pages[name]
        m = im.get(name) or {}
        tid = m.get("mapped_topic_id")
        rec = {"topic": name, "old_items": op.get("n_items", 0)}
        if not tid:
            rec.update({"status": "unmapped", "pass": False})
            with lock:
                rows.append(rec)
            return
        data = rest_get("lesson_topics", [
            ("select", "lesson_id,sort_order,lessons!inner(id,title,rabbi_id,status,audience_tags," + LESSON_RABBI_EMBED + ")"),
            ("topic_id", f"eq.{tid}"),
            ("lessons.status", "eq.published"),
            # r2: TopicPage.tsx now sends .or(..., { referencedTable: "lessons" }) →
            # lessons.or=(...) — identical to this emission (old PGRST100 bug fixed).
            ("lessons.or", "(audience_tags.cs.{general},audience_tags.not.cs.{teachers})"),
            ("limit", "500"),
        ])
        if is_err(data):
            rec.update({"status": "query_error", "error": str(data["_error"])[:200], "pass": False})
            with lock:
                rows.append(rec)
            return
        seen, flat = set(), []
        for r in data:
            l = r.get("lessons")
            if not l or l["id"] in seen:
                continue
            seen.add(l["id"])
            flat.append({"id": l["id"], "title": l["title"], "tags": l.get("audience_tags"),
                         "_so": r.get("sort_order")})
        flat.sort(key=lambda x: (x["_so"] is None, x["_so"] if x["_so"] is not None else 0))
        items = sorted(op.get("items", []), key=lambda x: x.get("order_index", 0))
        old_lessons = [{"key": normalize_he(it["title_norm"])} for it in items if it.get("type") == "lesson"]
        old_series_cards = [it for it in items if it.get("type") == "series"]
        cl = compare_seq(old_lessons, [{"key": normalize_he(x["title"])} for x in flat])
        rec.update({
            "topic_id": tid,
            "lessons_old": cl["old_count"], "lessons_new": cl["new_count"],
            "missing": cl["missing"][:15], "n_missing": len(cl["missing"]),
            "n_extra": len(cl["extra_idx"]), "order_ok": cl["order_ok"],
            "old_series_cards": len(old_series_cards),
            "series_cards_checked": st_nonempty,
            "teacher_only": sum(1 for x in flat if teachers_only(x.get("tags"))),
        })
        rec["pass"] = (cl["old_count"] == cl["new_count"] == cl["matched"] and cl["order_ok"]
                       and (len(old_series_cards) == 0 or st_nonempty))
        with lock:
            rows.append(rec)

    with ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(work, topic_names))
    rows.sort(key=lambda r: r["topic"])
    n_pass = sum(1 for r in rows if r.get("pass"))
    results["topics"] = {
        "sidebar": sidebar_rec,
        "series_topics_table": "present" if st_available else "missing",
        "series_topics_nonempty": st_nonempty,
        "pages_pass": n_pass, "pages_total": len(rows),
        "rows": rows,
        "runtime_s": round(time.time() - t0, 1),
    }
    sb = "PASS" if sidebar_rec.get("pass") else "FAIL"
    print(f"[topics] sidebar {sb} · {n_pass}/{len(rows)} topic pages PASS ({results['topics']['runtime_s']}s)")

# ═════════════════════════ 5. TEACHERS ═════════════════════════


def fetch_paginated(table, params):
    out, frm = [], 0
    while True:
        page = rest_get(table, params, range_hdr=f"{frm}-{frm + 999}")
        if is_err(page) or not page:
            break
        out.extend(page)
        if len(page) < 1000:
            break
        frm += 1000
    return out


def run_teachers(results, workers=8):
    t0 = time.time()
    old = load_json("old_teachers_listings.json")
    old_tree = load_json("old_teachers_tree.json")
    # r2: parsha-slot injection retired — useTeacherSidebar is tree-driven (DB rows), no hard-coded slots.

    tli_probe = rest_get("teacher_listing_items", [("select", "id"), ("limit", "1")])
    tli_available = not is_err(tli_probe)

    # — rabbis lookup for creators —
    all_rabbis = fetch_paginated("rabbis", [("select", "id,name,slug,status,entity_type,lesson_count")])
    rabbi_by_norm = {}
    for r in all_rabbis:
        rabbi_by_norm.setdefault(norm_rabbi(r["name"]), r["id"])

    lock = threading.Lock()
    ct_rows, cr_rows = [], []

    def work_ct(name):
        """Replicates TeachersContentTypePage + useTeacherListingItems (commit 4a1c3691):
        teacher_listing_items WHERE scope=content_type AND key=:type ORDER sort_order;
        kind='series' renders the embedded series title, kind='lesson' the embedded
        lesson title. NOTE the page has NO data fallback — empty TLI ⇒ empty page."""
        entry = old["content_types"][name]
        items = sorted(entry.get("items", []), key=lambda x: x.get("order_index", 0))
        old_keys = [{"key": normalize_he(it["title_norm"])} for it in items]
        rows = []
        if tli_available:
            rows = rest_get("teacher_listing_items", [
                ("select", "id,kind,sort_order,series_id,lesson_id,"
                           "series(id,title,description,image_url,lesson_count),"
                           "lessons(id,title,description,content,duration,audio_url,video_url,"
                           "attachment_url,thumbnail_url,rabbi_id,series_id)"),
                ("scope", "eq.content_type"), ("key", f"eq.{name}"), ("order", "sort_order.asc"),
            ])
            if is_err(rows):
                rows = []
        new_keys = []
        for r in rows:
            if r.get("kind") == "series" and r.get("series"):
                new_keys.append({"key": normalize_he(r["series"]["title"])})
            elif r.get("kind") == "lesson" and r.get("lessons"):
                new_keys.append({"key": normalize_he(r["lessons"]["title"])})
        mode = "teacher_listing_items" if rows else "tli_empty→page_renders_empty"
        c = compare_seq(old_keys, new_keys)
        rec = {"content_type": name, "mode": mode,
               "old_count": c["old_count"], "new_count": c["new_count"],
               "matched": c["matched"], "n_missing": len(c["missing"]), "missing": c["missing"][:10],
               "n_extra": len(c["extra_idx"]), "order_ok": c["order_ok"],
               "pass": (not c["missing"]) and (not c["extra_idx"]) and c["order_ok"]}
        with lock:
            ct_rows.append(rec)

    def work_cr(name):
        """Replicates TeachersCreatorPage + useTeacherCreatorContent (commit 4a1c3691):
        PRIMARY: rabbi_page_items WHERE rabbi_id ORDER sort_order, kind='series'/'lesson'
        render embedded titles (kind='qa' rows are DROPPED by the hook — counted here).
        FALLBACK (no rpi rows): teacher-tagged lessons by rabbi, order=title, paginated."""
        entry = old["creators"][name]
        items = sorted(entry.get("items", []), key=lambda x: x.get("order_index", 0))
        old_keys = [{"key": normalize_he(it["title_norm"])} for it in items]
        # id resolution mirrors the app's fixed CREATOR_IDS_ORDERED list (CA5/CA6)
        rid = TEACHER_CREATOR_IDS.get(name)
        if not rid:
            byn = {norm_rabbi(k): v for k, v in TEACHER_CREATOR_IDS.items()}
            rid = byn.get(norm_rabbi(name)) or rabbi_by_norm.get(norm_rabbi(name))
        if not rid:
            rec = {"creator": name, "status": "rabbi_not_matched", "old_count": len(old_keys), "pass": False}
            with lock:
                cr_rows.append(rec)
            return
        rpi = rest_get("rabbi_page_items", [
            ("select", "id,kind,sort_order,series_id,lesson_id,"
                       "series(id,title,description,image_url,lesson_count),"
                       "lessons(id,title,description,content,duration,audio_url,video_url,"
                       "attachment_url,thumbnail_url,series_id,content_type)"),
            ("rabbi_id", f"eq.{rid}"),
            ("sort_order", "lt.9000"),
            ("order", "sort_order.asc"),
        ])
        if is_err(rpi):
            rpi = []
        n_qa_dropped = 0
        if rpi:
            mode = "rabbi_page_items"
            new_keys = []
            for r in rpi:
                if r.get("kind") == "series" and r.get("series"):
                    new_keys.append({"key": normalize_he(r["series"]["title"])})
                elif r.get("kind") == "lesson" and r.get("lessons"):
                    new_keys.append({"key": normalize_he(r["lessons"]["title"])})
                else:
                    n_qa_dropped += 1
        else:
            mode = "fallback_lessons_by_rabbi"
            lessons = fetch_paginated("lessons", [
                ("select", "id,title,description,content,duration,audio_url,video_url,"
                           "attachment_url,thumbnail_url,series_id,content_type"),
                ("rabbi_id", f"eq.{rid}"),
                ("audience_tags", "cs.{teachers}"),
                ("status", "eq.published"),
                ("order", "title"),
            ])
            new_keys = [{"key": normalize_he(l["title"])} for l in lessons]
        c = compare_seq(old_keys, new_keys)
        rec = {"creator": name, "rabbi_id": rid, "mode": mode,
               "rpi_rows": len(rpi), "qa_rows_dropped_by_hook": n_qa_dropped,
               "old_count": c["old_count"], "new_count": c["new_count"],
               "matched": c["matched"], "n_missing": len(c["missing"]), "missing": c["missing"][:8],
               "n_extra": len(c["extra_idx"]), "order_ok": c["order_ok"],
               "pass": (not c["missing"]) and (not c["extra_idx"]) and c["order_ok"]}
        # teachers CA7 (CODE-SPEC §11): the old בשושה page was empty (old CMS bug); the
        # fallback intentionally renders his real teacher-tagged content — sanctioned deviation.
        if not rec["pass"] and mode == "fallback_lessons_by_rabbi" and c["old_count"] == 0:
            rec["pass"] = True
            rec["accepted_deviation"] = "teachers-CA7: old page empty (CMS bug) — fallback renders real content by design"
        with lock:
            cr_rows.append(rec)

    with ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(work_ct, list(old["content_types"].keys())))
        list(ex.map(work_cr, list(old["creators"].keys())))

    # — by-book tree (useTeacherSidebar + TeacherSidebar.tsx render, commit 4a1c3691) —
    # Hook (tree-driven): book LIST = direct children of the 3 main roots (no status
    # filter), ordered sort_order NULLS LAST then title; Torah/Ketuvim re-ordered by the
    # hard-coded canonical name lists, Neviim = banded rows first then biblical order.
    # COMPONENT render (TeacherSidebar.renderBookGroup — "Per Saar"): under each book the
    # sidebar shows EXACTLY (a) 'כל התכנים ב<book>', (b) 'דפי עבודה — <book>', and for
    # Torah only (c) 'פרשת <p>' per PARSHIOT_BY_BOOK — the hook's children[] is NOT
    # rendered in the sidebar. The sim mirrors the rendered rows.
    books = rest_get("series", [
        ("select", "id,title,parent_id,sort_order"),
        ("parent_id", f"in.({ROOT_IDS['torah']},{ROOT_IDS['neviim']},{ROOT_IDS['ketuvim']})"),
        ("order", "sort_order.asc.nullslast"),
        ("order", "title.asc"),
    ])
    if is_err(books):
        books = []

    # ordered book list exactly like the hook builds it
    torah_raw = [b for b in books if b["parent_id"] == ROOT_IDS["torah"]]
    nev_raw = [b for b in books if b["parent_id"] == ROOT_IDS["neviim"]]
    ket_raw = [b for b in books if b["parent_id"] == ROOT_IDS["ketuvim"]]
    sim_books = [b for n in TORAH_BOOK_ORDER for b in [next((x for x in torah_raw if x["title"] == n), None)] if b]
    sim_books += [b for b in nev_raw if (b.get("sort_order") or 0) > 0]
    sim_books += sort_by_biblical_order([b for b in nev_raw if not ((b.get("sort_order") or 0) > 0)])
    sim_books += [b for n in TEACHER_KETUVIM_ORDER for b in [next((x for x in ket_raw if x["title"] == n), None)] if b]

    # PARSHIOT_BY_BOOK — mirrors src/hooks/useTeacherParashaContent.ts
    PARSHIOT_BY_BOOK = {
        "בראשית": ["בראשית", "נח", "לך לך", "וירא", "חיי שרה", "תולדות", "ויצא", "וישלח", "וישב", "מקץ", "ויגש", "ויחי"],
        "שמות": ["שמות", "וארא", "בא", "בשלח", "יתרו", "משפטים", "תרומה", "תצוה", "כי תשא", "ויקהל", "פקודי"],
        "ויקרא": ["ויקרא", "צו", "שמיני", "תזריע", "מצורע", "אחרי מות", "קדושים", "אמור", "בהר", "בחוקותי"],
        "במדבר": ["במדבר", "נשא", "בהעלותך", "שלח", "קרח", "חוקת", "בלק", "פנחס", "מטות", "מסעי"],
        "דברים": ["דברים", "ואתחנן", "עקב", "ראה"],
    }

    TORAH_BOOKS_SET = {"בראשית", "שמות", "ויקרא", "במדבר", "דברים"}

    def all_content_label(book_title):
        if book_title in TORAH_BOOKS_SET:
            return f"כל התכנים בחומש {book_title}"
        return f"כל התכנים בספר {book_title}"

    def worksheet_label(book_title):
        if book_title == "מלכים א":
            return "דפי עבודה ומבחנים - מלכים א"
        return f"דפי עבודה - {book_title}"

    BOOKS_WITH_ROWS = {"בראשית", "שמות", "ויקרא", "במדבר", "דברים",
                       "יהושע", "שופטים", "שמואל א", "שמואל ב", "מלכים א", "מלכים ב"}

    def rendered_teacher_book_rows(title):
        # mirrors TeacherSidebar.tsx commit 84de9091: row-less books = plain links
        if title not in BOOKS_WITH_ROWS:
            return []
        rows = [all_content_label(title), worksheet_label(title)]
        rows += [f"פרשת {p}" for p in PARSHIOT_BY_BOOK.get(title, [])]
        return rows

    bb_rows = []
    old_by_book = {}
    for top in old_tree.get("by_book", []):
        for b in top.get("children", []):
            old_by_book[normalize_he(b["title_norm"])] = b
    for b in sim_books:
        ob = old_by_book.get(normalize_he(b["title"]))
        if not ob:
            continue
        sim_children = rendered_teacher_book_rows(b["title"])
        c = compare_seq(
            [{"key": normalize_he(x["title_norm"])} for x in ob.get("children", [])],
            [{"key": normalize_he(x)} for x in sim_children],
        )
        bb_rows.append({"book": b["title"],
                        "old_count": c["old_count"], "new_count": c["new_count"],
                        "matched": c["matched"], "n_missing": len(c["missing"]),
                        "missing": c["missing"][:8], "n_extra": len(c["extra_idx"]),
                        "order_ok": c["order_ok"],
                        "pass": (not c["missing"]) and (not c["extra_idx"]) and c["order_ok"]})

    ct_rows.sort(key=lambda r: r["content_type"])
    cr_rows.sort(key=lambda r: r.get("creator", ""))
    results["teachers"] = {
        "tli_table_available": tli_available,
        "content_types": {"pass": sum(1 for r in ct_rows if r["pass"]), "total": len(ct_rows), "rows": ct_rows},
        "creators": {"pass": sum(1 for r in cr_rows if r.get("pass")), "total": len(cr_rows), "rows": cr_rows},
        "by_book": {"pass": sum(1 for r in bb_rows if r["pass"]), "total": len(bb_rows), "rows": bb_rows},
        "runtime_s": round(time.time() - t0, 1),
    }
    tt = results["teachers"]
    print(f"[teachers] ct {tt['content_types']['pass']}/{tt['content_types']['total']} · "
          f"creators {tt['creators']['pass']}/{tt['creators']['total']} · "
          f"by-book {tt['by_book']['pass']}/{tt['by_book']['total']} ({tt['runtime_s']}s)")

# ═════════════════════════ 6. GUARDS ═════════════════════════


def run_guards(results):
    t0 = time.time()
    g = {"teacher_only_in_public": {}, "draft_in_public": {}}
    # aggregate from earlier sections
    lst = results.get("listings", {})
    g["teacher_only_in_public"]["listing_lessons"] = sum(r.get("teacher_only_lessons", 0) for r in lst.get("pages", []))
    g["teacher_only_in_public"]["topic_lessons"] = sum(r.get("teacher_only", 0) for r in results.get("topics", {}).get("rows", []))
    g["teacher_only_in_public"]["sidebar_children"] = results.get("sidebar", {}).get("sim_teacher_only_children", 0)
    g["teacher_only_in_public"]["rabbi_lessons_info_only"] = sum(
        r.get("teacher_only_lessons", 0) for r in results.get("rabbis", {}).get("rows", []))
    g["draft_in_public"]["sidebar_children"] = results.get("sidebar", {}).get("sim_draft_children", 0)

    # popup sample: 60 lessons spread across sections
    pool = results.get("listings", {}).get("lesson_id_pool", {})
    sample = []
    secs = sorted(pool.keys())
    if secs:
        per = max(1, 60 // len(secs))
        for s in secs:
            ids = pool[s]
            step = max(1, len(ids) // per)
            sample.extend((s, i) for i in ids[::step][:per])
    sample = sample[:60]
    ids = [i for _, i in sample]
    null_content, no_media = set(), set()
    for i in range(0, len(ids), 30):
        chunk = ids[i:i + 30]
        rows = rest_get("lessons", [
            ("select", "id,attachment_url,audio_url,video_url"),
            ("id", f"in.({','.join(chunk)})"),
            ("content", "is.null"),
        ])
        if is_err(rows):
            continue
        for r in rows:
            null_content.add(r["id"])
            if not (r.get("attachment_url") or r.get("audio_url") or r.get("video_url")):
                no_media.add(r["id"])
    per_section = defaultdict(lambda: {"sampled": 0, "content_null": 0, "empty_popup": 0})
    for s, i in sample:
        per_section[s]["sampled"] += 1
        if i in null_content:
            per_section[s]["content_null"] += 1
        if i in no_media:
            per_section[s]["empty_popup"] += 1
    g["popup_sample"] = {
        "sampled": len(sample),
        "content_null_total": len(null_content),
        "empty_popup_total": len(no_media),
        "per_section": dict(per_section),
        "note": "content-null with media = popup falls back to description/player (known-debt, not FAIL)",
    }
    g["pass"] = (g["teacher_only_in_public"]["listing_lessons"] == 0
                 and g["teacher_only_in_public"]["topic_lessons"] == 0
                 and g["teacher_only_in_public"]["sidebar_children"] == 0
                 and g["draft_in_public"]["sidebar_children"] == 0)
    g["runtime_s"] = round(time.time() - t0, 1)
    results["guards"] = g
    print(f"[guards] teacher-only leaks: listings={g['teacher_only_in_public']['listing_lessons']} "
          f"topics={g['teacher_only_in_public']['topic_lessons']} sidebar={g['teacher_only_in_public']['sidebar_children']} "
          f"| drafts(sidebar)={g['draft_in_public']['sidebar_children']} | popup sample {len(sample)}: "
          f"{len(null_content)} content-null, {len(no_media)} fully-empty")

# ═════════════════════════ REPORT ═════════════════════════


def pct(a, b):
    return f"{(100.0 * a / b):.1f}%" if b else "—"


def write_report(results, md_path, label):
    L = []
    L.append(f"# {label} — oneone verification report")
    L.append(f"*Generated {time.strftime('%Y-%m-%d %H:%M')} by oneone_verify.py — read-only anon-REST simulation "
             f"of the CURRENT working-tree UI hooks against the live DB.*\n")
    L.append(f"REST calls: {_stats['rest_calls']} (cache hits {_stats['cache_hits']}, errors {_stats['errors']})\n")
    bug = results.get("_meta", {}).get("pgrst201_rabbis_embed_bug", {})
    if bug.get("lessons_rabbis") or bug.get("series_rabbis"):
        L.append("> 🔴 **P0 HARNESS FINDING — PGRST201:** the DB now contains `lesson_rabbis`/`series_rabbis` m2m tables "
                 "alongside the `rabbi_id` fkeys, so the app's own `rabbis(name)` embeds (useLessonsBySeries, "
                 "useSeriesChildren, TopicPage, search…) are rejected as ambiguous — those UI queries FAIL in "
                 "production right now and lists render empty. The harness verified data parity using the "
                 "disambiguated embed (`rabbis!lessons_rabbi_id_fkey`). Code or DB must be fixed "
                 "(drop/rename m2m or disambiguate every embed).\n")
    if results.get("_meta", {}).get("pgrst100_topicpage_or_bug"):
        L.append("> 🔴 **P0 HARNESS FINDING — PGRST100:** " + results["_meta"]["pgrst100_topicpage_or_bug"] +
                 ". Harness verified topic data with the equivalent foreign-table filter.\n")

    # summary table
    L.append("## Summary\n")
    L.append("| Section | Pass | Total | Pass rate |")
    L.append("|---|---|---|---|")
    if "sidebar" in results:
        s = results["sidebar"]
        L.append(f"| Sidebar (top categories) | {s['pass']} | {s['total']} | {pct(s['pass'], s['total'])} |")
    if "listings" in results:
        s = results["listings"]
        L.append(f"| Listing pages | {s['pass']} | {s['total']} | {pct(s['pass'], s['total'])} |")
    if "rabbis" in results:
        s = results["rabbis"]
        L.append(f"| Rabbi pages | {s['pass']} | {s['total']} | {pct(s['pass'], s['total'])} |")
    if "topics" in results:
        s = results["topics"]
        sb = "PASS" if s["sidebar"].get("pass") else "FAIL"
        L.append(f"| Topics sidebar | {sb} | 1 | — |")
        L.append(f"| Topic pages | {s['pages_pass']} | {s['pages_total']} | {pct(s['pages_pass'], s['pages_total'])} |")
    if "teachers" in results:
        s = results["teachers"]
        L.append(f"| Teachers content-types | {s['content_types']['pass']} | {s['content_types']['total']} | {pct(s['content_types']['pass'], s['content_types']['total'])} |")
        L.append(f"| Teachers creators | {s['creators']['pass']} | {s['creators']['total']} | {pct(s['creators']['pass'], s['creators']['total'])} |")
        L.append(f"| Teachers by-book | {s['by_book']['pass']} | {s['by_book']['total']} | {pct(s['by_book']['pass'], s['by_book']['total'])} |")
    if "guards" in results:
        s = results["guards"]
        L.append(f"| Guards | {'PASS' if s['pass'] else 'FAIL'} | — | — |")
    L.append("")

    if "sidebar" in results:
        L.append("## 1. Sidebar\n")
        for e in results["sidebar"]["per_category"]:
            status = "✅" if e.get("pass") else "❌"
            L.append(f"### {status} {e['old_top']} ({e.get('kind')})")
            if e.get("kind") == "category":
                L.append(f"- books order ok: {e['books_ok']}; missing books: {e['books_missing']}; extra: {e['books_extra']}")
                L.append(f"- book-children failing: {e['book_children_fail']}/{e['book_children_total']}")
                for d in e.get("book_details", []):
                    L.append(f"  - **{d['book']}** old={d['old_count']} new={d['new_count']} order_ok={d['order_ok']}")
                    if d["missing"]:
                        L.append(f"    - missing: {d['missing']}")
                    if d["extra"]:
                        L.append(f"    - extra: {d['extra']}")
            elif e.get("kind") == "section":
                L.append(f"- old={e['old_children'] + 1} (incl. alias) order_ok={e['order_ok']} "
                         f"missing={e['missing']} extra={e['extra']}")
                if e.get("old_grandchildren_not_renderable"):
                    L.append(f"- ⚠️ old grandchildren not renderable by one-level sidebar: {e['old_grandchildren_not_renderable']}")
            else:
                L.append(f"- quick-link rendered: {e.get('rendered_as_quick_link')}")
            L.append("")

    if "listings" in results:
        s = results["listings"]
        L.append("## 2. Listing pages\n")
        L.append(f"Simulated {s['pages_simulated']} pages (skipped {s['pages_unmapped_skipped']} unmapped).\n")
        L.append("| Section | Pages | Pass | Old items | New items | Missing | Unexplained extra | Planned extras | Planned removals | Order fails | Rabbi mism. |")
        L.append("|---|---|---|---|---|---|---|---|---|---|---|")
        for sec, v in sorted(s["by_section"].items(), key=lambda x: -x[1]["pages"]):
            L.append(f"| {sec} | {v['pages']} | {v['pass']} ({pct(v['pass'], v['pages'])}) | {v['old_items']} | "
                     f"{v['new_items']} | {v['missing']} | {v['extra_unexplained']} | {v['planned_extras']} | "
                     f"{v['planned_removals']} | {v['order_fail']} | {v['rabbi_mm']} |")
        L.append(f"\nNote: {s.get('aggregation_pages', 0)} of the pages are category/book aggregation nodes — "
                 "since r2 the harness simulates them with their REAL renderer (CategoryPage: useSeriesForNode "
                 "canonical series + direct + descendant roll-up lessons, dedup by id); all other pages use "
                 "/series/:id semantics (useSeriesChildren + useLessonsBySeries).\n")
        L.append("### Top-20 worst pages\n")
        for r in s["worst20"]:
            L.append(f"- `{urllib.parse.unquote(r['url'])}` *(kind={r.get('node_kind')})*")
            L.append(f"  - old={r['old_count']} new={r['new_count']} matched={r['matched']} in_order={r['matched_in_order']} "
                     f"missing={r['n_missing']} extra={r['n_extra']} (planned keep {r['planned_extras']}, "
                     f"planned remove {r['planned_removals']}, unexplained {r['extra_unexplained']}) "
                     f"order_ok={r['order_ok']} rabbi_mm={r['rabbi_mismatches']}")
            if r["missing"]:
                L.append(f"  - missing sample: {r['missing'][:8]}")
            if r["extra_sample"]:
                L.append(f"  - extra sample: {r['extra_sample'][:8]}")
        L.append("")

    if "rabbis" in results:
        s = results["rabbis"]
        L.append("## 3. Rabbi pages\n")
        L.append(f"rabbi_page_items table: {'available' if s['rpi_table_available'] else 'MISSING'}; "
                 f"used for {s['rpi_used_count']} rabbis (rest = fallback owned-series + lessons).\n")
        fails = [r for r in s["rows"] if not r.get("pass")]
        L.append(f"{s['pass']}/{s['total']} PASS. Worst 15 by missing lessons:\n")
        for r in sorted(fails, key=lambda x: -(x.get("lessons_n_missing", 0) + x.get("series_n_missing", 0)))[:15]:
            L.append(f"- **{r['rabbi']}**: series old={r.get('series_old')} new={r.get('series_new')} "
                     f"missing={r.get('series_n_missing')} | lessons old={r.get('lessons_old')} new={r.get('lessons_new')} "
                     f"missing={r.get('lessons_n_missing')} extra={r.get('lessons_n_extra')} "
                     f"order_ok={r.get('lessons_order_ok')}")
        L.append("")

    if "topics" in results:
        s = results["topics"]
        L.append("## 4. Topics\n")
        sb = s["sidebar"]
        L.append(f"- Sidebar: {'PASS' if sb.get('pass') else 'FAIL'} — old={sb.get('old_count')} new={sb.get('new_count')} "
                 f"missing={sb.get('n_missing')} extra={sb.get('n_extra')} order_ok={sb.get('order_ok')} "
                 f"count-mismatches={sb.get('count_mismatches')}")
        if sb.get("count_rows_capped_at_1000"):
            L.append("- ⚠️ HARNESS FINDING: the sidebar count query returns exactly 1000 rows (PostgREST cap) — "
                     "the app sends NO limit, so the badge counts in production are computed from a truncated row set.")
        L.append(f"- series_topics table: {s['series_topics_table']} (nonempty={s['series_topics_nonempty']}) — "
                 f"series-card checks {'enabled' if s['series_topics_nonempty'] else 'SKIPPED gracefully'}")
        L.append(f"- Topic pages: {s['pages_pass']}/{s['pages_total']} PASS\n")
        fails = [r for r in s["rows"] if not r.get("pass")][:15]
        for r in sorted(fails, key=lambda x: -(x.get("n_missing", 0))):
            L.append(f"- **{r['topic']}**: old={r.get('lessons_old')} new={r.get('lessons_new')} "
                     f"missing={r.get('n_missing')} extra={r.get('n_extra')} order_ok={r.get('order_ok')} "
                     f"old_series_cards={r.get('old_series_cards')}")
        L.append("")

    if "teachers" in results:
        s = results["teachers"]
        L.append("## 5. Teachers wing\n")
        L.append(f"- teacher_listing_items table: {'available' if s['tli_table_available'] else 'MISSING → fallback hooks simulated'}")
        L.append(f"- Content types: {s['content_types']['pass']}/{s['content_types']['total']} PASS")
        for r in s["content_types"]["rows"]:
            mark = "✅" if r["pass"] else "❌"
            L.append(f"  - {mark} {r['content_type']} ({r['mode']}): old={r['old_count']} new={r['new_count']} "
                     f"matched={r['matched']} missing={r['n_missing']} extra={r['n_extra']}")
        L.append(f"- Creators: {s['creators']['pass']}/{s['creators']['total']} PASS")
        for r in s["creators"]["rows"]:
            mark = "✅" if r.get("pass") else "❌"
            extra = r.get("status", "") or r.get("mode", "")
            L.append(f"  - {mark} {r['creator']} ({extra}): old={r.get('old_count')} new={r.get('new_count', '—')} "
                     f"matched={r.get('matched', '—')} missing={r.get('n_missing', '—')} "
                     f"extra={r.get('n_extra', '—')} order_ok={r.get('order_ok', '—')}")
        L.append("- By-book sim = the RENDERED TeacherSidebar rows (per-book: 'כל התכנים ב<book>', "
                 "'דפי עבודה — <book>', + hard-coded parshiot for Torah). KNOWN code-ask: the old sidebar "
                 "labeled the alias 'כל התכנים בחומש/בספר <book>' (with per-book variants like "
                 "'דפי עבודה ומבחנים מלכים א'), and books with 0 old children now show the 2 synthetic rows — "
                 "label parity needs a component fix, not data.")
        L.append(f"- By-book tree: {s['by_book']['pass']}/{s['by_book']['total']} PASS")
        for r in s["by_book"]["rows"]:
            mark = "✅" if r["pass"] else "❌"
            L.append(f"  - {mark} {r['book']}: old={r['old_count']} new={r['new_count']} matched={r['matched']} "
                     f"missing={r['n_missing']} extra={r['n_extra']} order_ok={r['order_ok']}")
        L.append("")

    if "guards" in results:
        s = results["guards"]
        L.append("## 6. Guards\n")
        t = s["teacher_only_in_public"]
        L.append(f"- Teacher-only items in PUBLIC simulations: listings lessons={t['listing_lessons']}, "
                 f"topic lessons={t['topic_lessons']}, sidebar children={t['sidebar_children']} "
                 f"(rabbi-page lessons={t['rabbi_lessons_info_only']} — intentional per code comment, info only)")
        L.append(f"- Draft items in public sidebar: {s['draft_in_public']['sidebar_children']}")
        p = s["popup_sample"]
        L.append(f"- Popup sample ({p['sampled']} lessons): content-null={p['content_null_total']}, "
                 f"fully-empty (no content+no media)={p['empty_popup_total']} — known-debt, not FAIL")
        L.append("| Section | Sampled | content NULL | empty popup |")
        L.append("|---|---|---|---|")
        for sec, v in sorted(p["per_section"].items()):
            L.append(f"| {sec} | {v['sampled']} | {v['content_null']} | {v['empty_popup']} |")
        L.append("")

    L.append("## Harness notes / limitations\n")
    L.append("- Queries replicate supabase-js REST emission of the CURRENT working-tree hooks "
             "(useContentSidebar band 1..999, useSeriesChildren+useLessonsBySeries for /series/:id, "
             "CategoryPage useSeriesForNode+useDirectLessons+useRollupLessons for category/book nodes, "
             "useRabbi*, useTopicsSidebar/useTopicLessons, useTeacherSidebar [tree-driven] / "
             "useTeacherListingItems [content-types, no fallback] / useTeacherCreatorContent "
             "[rabbi_page_items + lessons-by-rabbi fallback]) — including implicit 1000-row PostgREST "
             "caps where the app sends no limit.")
    L.append("- r2: chained .order() keys are merged into one comma-joined `order` param exactly like "
             "postgrest-js; the previous multi-param emission dropped secondary sort keys and produced "
             "false order failures.")
    L.append("- Hebrew collation approximated by codepoint order (browser localeCompare('he') may differ on geresh/maqaf edge cases).")
    L.append("- torah/ketuvim old listing scrape carries lesson rows only (series cards live in sub_links) → "
             "series-card diff for those pages is not checked (reported as series_new_unchecked).")
    L.append("- 'planned_extras' = extra new lessons whose id is placed in this series by RESOLVED-OPS; "
             "'planned_removals' = extras the plan drafts or moves elsewhere (expected to disappear after apply).")
    L.append("- Old rav pages aggregate a series into ONE row; lessons inside series are not listed there — "
             "rabbi lesson diffs compare the old flat rows vs the new flat list (post-fix exhaustive list).")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    print(f"report → {md_path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sections", default="sidebar,listings,rabbis,topics,teachers,guards")
    ap.add_argument("--md", default="VERIFY-REPORT.md")
    ap.add_argument("--label", default="VERIFY")
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--limit-pages", type=int, default=None)
    ap.add_argument("--no-cache", action="store_true")
    args = ap.parse_args()
    global USE_CACHE
    USE_CACHE = not args.no_cache
    os.makedirs(REPORTS, exist_ok=True)
    os.makedirs(CACHE_DIR, exist_ok=True)
    secs = [s.strip() for s in args.sections.split(",") if s.strip()]
    results = {"_meta": {"label": args.label, "generated": time.strftime("%Y-%m-%d %H:%M:%S"),
                         "sections": secs, "limit_pages": args.limit_pages}}
    t0 = time.time()
    probe_embed_ambiguity()
    results["_meta"]["pgrst201_rabbis_embed_bug"] = dict(EMBED_BUG)
    # r2: the PGRST100 TopicPage finding is RESOLVED — TopicPage.tsx now passes
    # { referencedTable: "lessons" } so the app emits lessons.or=(...), same as the harness.
    if "sidebar" in secs:
        run_sidebar(results)
    if "listings" in secs:
        run_listings(results, limit_pages=args.limit_pages, workers=args.workers)
    if "rabbis" in secs:
        run_rabbis(results, workers=args.workers)
    if "topics" in secs:
        run_topics(results, workers=args.workers)
    if "teachers" in secs:
        run_teachers(results, workers=args.workers)
    if "guards" in secs:
        run_guards(results)
    results["_meta"]["runtime_s"] = round(time.time() - t0, 1)
    results["_meta"]["rest_stats"] = dict(_stats)
    out_json = os.path.join(REPORTS, "verify_results.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=1)
    print(f"results → {out_json}")
    write_report(results, os.path.join(REPORTS, args.md), args.label)
    print(f"TOTAL runtime {results['_meta']['runtime_s']}s · REST calls {_stats['rest_calls']} "
          f"(cache {_stats['cache_hits']}, errors {_stats['errors']})")


if __name__ == "__main__":
    main()
