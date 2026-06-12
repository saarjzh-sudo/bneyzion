#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deterministic GLOBAL MATCHER — bnei-zion 1:1 migration parity.

Maps every OLD-site sidebar/tree node -> NEW series row (tree_map.json)
and every OLD listing/rabbi/topic/teachers item -> NEW lesson row (item_match.json).

READ-ONLY: reads the ground-truth + newdb JSON dumps in oneone/, writes ONLY under oneone/match/.
Re-runnable, pure python, dict-index based (no O(n^2)).

Inputs (oneone/):
  old_sidebar_tree.json, old_teachers_tree.json,
  old_listings_torah_ketuvim.json, old_listings_neviim_moadim.json,
  old_rabbi_pages.json, old_topic_pages.json, old_teachers_listings.json,
  newdb_series.json, newdb_lessons.json, newdb_lessons_media.json,
  newdb_rabbis.json, newdb_topics.json, newdb_tree.json

Outputs (oneone/match/):
  tree_map.json, item_match.json, MATCH-STATS.json (machine stats used by MATCH-README.md)
"""
import json
import os
import re
import sys
import unicodedata
import urllib.parse
from collections import defaultdict, Counter
from difflib import SequenceMatcher

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)              # .../oneone
OUT = os.path.join(BASE, "match")
os.makedirs(OUT, exist_ok=True)

# ----------------------------------------------------------------------------
# Normalization
# ----------------------------------------------------------------------------
NIQQUD_RE = re.compile("[֑-ׇ]")
# quote-family chars are REMOVED (ט"ו == טו, מנוביץ' == מנוביץ׳) — like the app's dedup key;
# separator-family chars become a space (פרק א-ב -> פרק א ב)
QUOTE_RE = re.compile("[׳״\"'`]")
SEP_RE = re.compile("[|–—‒‐‑\\-_,:;!?()\\[\\]{}<>./\\\\]")

def normalize_he(s):
    """strip niqqud + NFC + collapse ws + lowercase + strip punct variants."""
    if not s:
        return ""
    s = unicodedata.normalize("NFC", str(s))
    s = NIQQUD_RE.sub("", s)
    s = QUOTE_RE.sub("", s)
    s = SEP_RE.sub(" ", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s

def skeleton(s_norm):
    """ktiv male/haser-insensitive key: drop ו/י after the first char of each token
    (קורח==קרח, מצורע==מצרע). Input must already be normalize_he'd."""
    toks = []
    for t in s_norm.split():
        toks.append(t[0] + re.sub("[וי]", "", t[1:]) if len(t) > 1 else t)
    return " ".join(toks)

HONORIFICS = {
    "הרב", "רב", "הרה\"ג", "הרהג", "ד\"ר", "דר", "פרופ", "מרן", "הרבנית",
    "זצ\"ל", "זצל", "זצוק\"ל", "זצוקל", "שליט\"א", "שליטא", "ז\"ל", "זל", "הי\"ד", "היד",
}

def norm_rabbi(s):
    """loose rabbi key: normalize_he then drop honorific tokens; token-sorted join."""
    n = normalize_he(s)
    if not n:
        return ""
    toks = [t for t in n.split() if t not in HONORIFICS]
    return " ".join(sorted(toks))

def norm_url(u):
    """old-site page url -> canonical path key."""
    if not u:
        return ""
    u = urllib.parse.unquote(str(u))
    u = unicodedata.normalize("NFC", u)
    u = re.sub(r"^https?://(www\.)?bneyzion\.co\.il", "", u)
    u = u.split("#")[0]
    # keep querystring (rav=/subject= pages) but strip trailing slash of path part
    if "?" in u:
        path, q = u.split("?", 1)
        return path.rstrip("/") + "?" + q.strip()
    return u.rstrip("/")

def norm_media(u):
    """media/attachment url -> canonical path (gold key) ; returns (path, basename)."""
    if not u:
        return None, None
    u = str(u).strip()
    if not u:
        return None, None
    u = urllib.parse.unquote(u)
    u = u.replace("+", " ")
    u = unicodedata.normalize("NFC", u)
    u = re.sub(r"^https?://", "", u)
    # strip hosts
    u = re.sub(r"^(www\.)?bneyzion\.co\.il", "", u)
    u = re.sub(r"^s3[.\-a-z0-9]*\.amazonaws\.com", "", u)
    u = re.sub(r"^bneyzion\.s3[.\-a-z0-9]*\.amazonaws\.com", "", u)
    u = re.sub(r"^[a-z0-9\-]+\.supabase\.co", "", u)
    if u.startswith("/bneyzion/"):
        u = u[len("/bneyzion"):]
    if not u.startswith("/"):
        u = "/" + u
    u = u.split("?")[0].rstrip("/")
    u = re.sub(r"\s+", " ", u).strip().casefold()
    if not u or u == "/":
        return None, None
    base = u.rsplit("/", 1)[-1].strip()
    return u, (base or None)

HEB_NUM_CHARS = set("אבגדהוזחטיכלמנסעפצקרשת")

def chapter_sig(tn):
    """set of Hebrew-numeral tokens following פרק/פרקים (chapter refs). normalize_he'd input."""
    toks = tn.split()
    out = set()
    for i, t in enumerate(toks):
        if t in ("פרק", "פרקים"):
            for j in range(i + 1, min(i + 4, len(toks))):
                tj = toks[j]
                if 1 <= len(tj) <= 3 and all(c in HEB_NUM_CHARS for c in tj):
                    out.add(tj)
                else:
                    break
    return out

BOOK_TOKENS = {
    "בראשית", "שמות", "ויקרא", "במדבר", "דברים", "יהושע", "שופטים", "שמואל", "מלכים",
    "ישעיהו", "ישעיה", "ירמיהו", "ירמיה", "יחזקאל", "הושע", "יואל", "עמוס", "עובדיה",
    "יונה", "מיכה", "נחום", "חבקוק", "צפניה", "חגי", "זכריה", "מלאכי", "תהלים", "משלי",
    "איוב", "רות", "איכה", "קהלת", "אסתר", "דניאל", "עזרא", "נחמיה",
}

def fuzzy_guard_ok(tn_a, tn_b, max_subset_extra=1):
    """blocks token_set_ratio failure modes:
    - both titles carry chapter refs but disjoint ones (פרק ט vs פרק א)
    - token diff contains a single-letter token (שמואל א vs שמואל ב) or a book name
      (ספר במדבר עם ביאור ושננתם vs ספר דברים עם ביאור ושננתם)
    - one title's tokens are a strict subset of the other with >1 extra token
      (פילגש בגבעה vs איך הגיעו ישראל לשפל של פילגש בגבעה)"""
    ca, cb = chapter_sig(tn_a), chapter_sig(tn_b)
    if ca and cb and not (ca & cb):
        return False
    sa, sb = set(tn_a.split()), set(tn_b.split())
    diff = sa ^ sb
    # single-letter diff tokens distinguish books (שמואל א vs ב) — but chapter numerals
    # (already cleared by the chapter-sig intersection above) are exempt
    if any(len(t) == 1 and t not in (ca | cb) for t in diff):
        return False
    if diff & BOOK_TOKENS:
        return False
    if sa < sb and len(sb - sa) > max_subset_extra:
        return False
    if sb < sa and len(sa - sb) > max_subset_extra:
        return False
    return True

def token_set_ratio(a, b):
    """fuzzywuzzy-style token_set_ratio on already-normalized strings, 0..1."""
    ta, tb = set(a.split()), set(b.split())
    if not ta or not tb:
        return 0.0
    inter = " ".join(sorted(ta & tb))
    s1 = inter
    s2 = (inter + " " + " ".join(sorted(ta - tb))).strip()
    s3 = (inter + " " + " ".join(sorted(tb - ta))).strip()
    def r(x, y):
        if not x and not y:
            return 0.0
        return SequenceMatcher(None, x, y).ratio()
    return max(r(s1, s2), r(s1, s3), r(s2, s3))

def load(name):
    with open(os.path.join(BASE, name), encoding="utf-8") as f:
        return json.load(f)

# ----------------------------------------------------------------------------
# Load NEW DB
# ----------------------------------------------------------------------------
print("loading newdb ...", flush=True)
series_rows = load("newdb_series.json")
lesson_rows = load("newdb_lessons.json")
if not os.path.exists(os.path.join(BASE, "newdb_lessons_media.json")):
    sys.exit("missing newdb_lessons_media.json — run scripts/dump_lessons_media.py first (read-only dump)")
media_sup = {r["id"]: r for r in load("newdb_lessons_media.json")}
rabbi_rows = load("newdb_rabbis.json")
topics_blob = load("newdb_topics.json")
topic_rows = topics_blob["topics"]
lesson_topic_rows = topics_blob["lesson_topics"]

SERIES = {s["id"]: s for s in series_rows}
for s in series_rows:
    s["_tn"] = normalize_he(s["title"])
    tags = s.get("audience_tags") or []
    s["_teachers_only"] = ("teachers" in tags) and ("general" not in tags)

series_children = defaultdict(list)
for s in series_rows:
    if s.get("parent_id"):
        series_children[s["parent_id"]].append(s["id"])

_desc_memo = {}
def descendants(sid):
    """set of descendant series ids (NOT incl. self)."""
    if sid in _desc_memo:
        return _desc_memo[sid]
    out = set()
    stack = list(series_children.get(sid, []))
    while stack:
        x = stack.pop()
        if x in out:
            continue
        out.add(x)
        stack.extend(series_children.get(x, []))
    _desc_memo[sid] = out
    return out

series_title_idx = defaultdict(list)
for s in series_rows:
    if s["_tn"]:
        series_title_idx[s["_tn"]].append(s["id"])

LESSONS = {}
for l in lesson_rows:
    l["_tn"] = normalize_he(l["title"])
    l["_rn"] = norm_rabbi(l.get("rabbi_name"))
    tags = l.get("audience_tags") or []
    l["_teachers_only"] = ("teachers" in tags) and ("general" not in tags)
    l["_has_teachers"] = "teachers" in tags
    LESSONS[l["id"]] = l

# media indexes (gold keys)
media_path_idx = defaultdict(set)   # canonical path -> lesson ids
media_base_idx = defaultdict(set)   # basename -> lesson ids
def _index_media(lid, url):
    p, b = norm_media(url)
    if p:
        media_path_idx[p].add(lid)
    if b:
        media_base_idx[b].add(lid)

for l in lesson_rows:
    lid = l["id"]
    if l.get("attachment_url"):
        _index_media(lid, l["attachment_url"])
    sup = media_sup.get(lid)
    if sup:
        for k in ("legacy_attachment_url", "audio_url", "video_url"):
            if sup.get(k):
                _index_media(lid, sup[k])
        for extra in (sup.get("additional_attachments") or []):
            if isinstance(extra, str):
                _index_media(lid, extra)
            elif isinstance(extra, dict) and extra.get("url"):
                _index_media(lid, extra["url"])

title_rabbi_idx = defaultdict(list)
title_idx = defaultdict(list)
rabbi_lessons_idx = defaultdict(list)
series_lessons = defaultdict(list)
for l in lesson_rows:
    if l["_tn"]:
        title_idx[l["_tn"]].append(l["id"])
        if l["_rn"]:
            title_rabbi_idx[(l["_tn"], l["_rn"])].append(l["id"])
    if l["_rn"]:
        rabbi_lessons_idx[l["_rn"]].append(l["id"])
    if l.get("series_id"):
        series_lessons[l["series_id"]].append(l["id"])

RABBIS = {r["id"]: r for r in rabbi_rows}
rabbi_name_idx = defaultdict(list)
for r in rabbi_rows:
    k = norm_rabbi(r["name"])
    if k:
        rabbi_name_idx[k].append(r["id"])

TOPICS = {t["id"]: t for t in topic_rows}
topic_title_idx = defaultdict(list)
for t in topic_rows:
    k = normalize_he(t["title"])
    if k:
        topic_title_idx[k].append(t["id"])
topic_lessons = defaultdict(list)
for lt in lesson_topic_rows:
    topic_lessons[lt["topic_id"]].append(lt["lesson_id"])

print(f"  series={len(series_rows)} lessons={len(lesson_rows)} media_paths={len(media_path_idx)} "
      f"rabbis={len(rabbi_rows)} topics={len(topic_rows)}", flush=True)

# ----------------------------------------------------------------------------
# Load OLD ground truth
# ----------------------------------------------------------------------------
print("loading old ground truth ...", flush=True)
old_sidebar = load("old_sidebar_tree.json")["tree"]
old_teachers_tree = load("old_teachers_tree.json")["by_book"]
tk_blob = load("old_listings_torah_ketuvim.json")
tk_pages = tk_blob["pages"]
nm_pages = load("old_listings_neviim_moadim.json")
rabbi_pages = load("old_rabbi_pages.json")
topic_pages = load("old_topic_pages.json")
teachers_listings = load("old_teachers_listings.json")

# page item-count index (for node_kind='empty')
page_n_items = {}
for url, p in tk_pages.items():
    page_n_items[norm_url(url)] = len(p.get("items", []))
for url, p in nm_pages.items():
    if isinstance(p, dict):
        page_n_items[norm_url(url)] = len(p.get("items", []))

# ----------------------------------------------------------------------------
# Candidate picking (deterministic)
# ----------------------------------------------------------------------------
def _series_sort_key(sid, parent_sid, prefer_teachers):
    s = SERIES[sid]
    in_parent = 1 if (parent_sid and SERIES[sid].get("parent_id") == parent_sid) else 0
    in_subtree = 1 if (parent_sid and sid in descendants(parent_sid)) else 0
    aud = 1 if (s["_teachers_only"] == bool(prefer_teachers)) else 0
    live = 1 if s.get("status") in ("active", "published", "category") else 0
    lc = min(int(s.get("lesson_count") or 0), 99999)  # numeric: a 45-lesson series beats its 5-lesson dup
    return (-in_parent, -in_subtree, -aud, -live, -lc, sid)

def pick_series(cands, parent_sid, prefer_teachers):
    """returns (sid|None, ambiguous_bool, ordered_cands). Strict winner on non-id prefix required."""
    cands = sorted(set(cands), key=lambda x: _series_sort_key(x, parent_sid, prefer_teachers))
    if not cands:
        return None, False, []
    if len(cands) == 1:
        return cands[0], False, cands
    k0 = _series_sort_key(cands[0], parent_sid, prefer_teachers)[:-1]
    k1 = _series_sort_key(cands[1], parent_sid, prefer_teachers)[:-1]
    if k0 != k1:
        return cands[0], True, cands
    return None, True, cands

def match_series_node(tn, parent_sid, prefer_teachers, fuzzy_floor=0.85):
    """match one old node title (normalized) -> series id.
    returns (sid|None, method, score, candidates[])"""
    if not tn:
        return None, "no_title", 0.0, []
    # (a) exact in mapped parent: direct children, then full subtree
    if parent_sid:
        direct = [c for c in series_children.get(parent_sid, []) if SERIES[c]["_tn"] == tn]
        sid, amb, cands = pick_series(direct, parent_sid, prefer_teachers)
        if sid:
            return sid, "exact_in_parent", 1.0, (cands if amb else [])
        sub = [c for c in descendants(parent_sid) if SERIES[c]["_tn"] == tn]
        sid, amb, cands = pick_series(sub, parent_sid, prefer_teachers)
        if sid:
            return sid, "exact_in_subtree", 0.97, (cands if amb else [])
        if direct or sub:
            return None, "ambiguous_exact", 0.0, sorted(set(direct + sub))
    # (b) exact global-unique
    g = series_title_idx.get(tn, [])
    if len(g) == 1:
        return g[0], "exact_global_unique", 0.95, []
    if len(g) > 1:
        sid, amb, cands = pick_series(g, parent_sid, prefer_teachers)
        if sid and parent_sid and sid in descendants(parent_sid):
            return sid, "exact_global_in_subtree", 0.93, (cands if amb else [])
        # global ambiguous without parent anchor -> only accept strict audience/status winner
        if sid and not amb:
            return sid, "exact_global_picked", 0.9, []
        if sid:
            return sid, "exact_global_picked", 0.88, cands
        return None, "ambiguous_global", 0.0, g
    # (c) fuzzy within parent subtree
    if parent_sid:
        pool = list(descendants(parent_sid))
        best = []
        for c in pool:
            ctn = SERIES[c]["_tn"]
            if not ctn or not fuzzy_guard_ok(tn, ctn):
                continue
            r = token_set_ratio(tn, ctn)
            if r >= fuzzy_floor:
                best.append((r, c))
        if best:
            best.sort(key=lambda x: (-x[0],) + _series_sort_key(x[1], parent_sid, prefer_teachers))
            top_r = best[0][0]
            top = [c for r, c in best if abs(r - top_r) < 1e-9]
            sid, amb, cands = pick_series(top, parent_sid, prefer_teachers)
            if sid:
                return sid, "fuzzy_in_parent", round(top_r, 3), ([c for _, c in best[:5]] if len(best) > 1 else [])
        # (c2) ktiv male/haser skeleton equality within parent subtree (קרח == קורח),
        # chapter-guarded (skeleton strips ו/י so פרק כ"ו would otherwise collide with פרק כ')
        sk = skeleton(tn)
        skel = [c for c in pool if SERIES[c]["_tn"] and skeleton(SERIES[c]["_tn"]) == sk
                and fuzzy_guard_ok(tn, SERIES[c]["_tn"])]
        if skel:
            sid, amb, cands = pick_series(skel, parent_sid, prefer_teachers)
            if sid:
                return sid, "skeleton_in_parent", 0.88, (cands if amb else [])
        # (d) containment within parent subtree (chapter-guarded; comparable lengths only)
        cont = []
        for c in pool:
            ctn = SERIES[c]["_tn"]
            if not ctn or len(tn) < 4 or len(ctn) < 4:
                continue
            if min(len(tn), len(ctn)) / max(len(tn), len(ctn)) < 0.5:
                continue
            ca, cb = chapter_sig(tn), chapter_sig(ctn)
            if ca and cb and not (ca & cb):
                continue
            if tn in ctn or ctn in tn:
                cont.append(c)
        if cont:
            sid, amb, cands = pick_series(cont, parent_sid, prefer_teachers)
            if sid:
                return sid, "containment_in_parent", 0.86, (cands if amb else [])
            return None, "ambiguous_containment", 0.0, cands
    return None, "unmatched", 0.0, []

# ----------------------------------------------------------------------------
# 1. TREE MAP
# ----------------------------------------------------------------------------
print("building tree_map ...", flush=True)

ALIAS_PREFIXES = ("כל השיעורים ב", "כל התכנים ב", "כל המאמרים ב", "כל הפטרות", "כל ההפטרות")
TOP_BOOK_PARENTS = {"תורה", "נביאים", "כתובים"}

tree_entries = []
page_series_map = {}     # norm_url -> sid  (used later for listings)

def classify_node(title, depth, url, parent_title, n_children, source, ancestors):
    t = title.strip()
    if any(t.startswith(p) for p in ALIAS_PREFIXES):
        return "alias"
    if url and re.match(r"^https?://", url) and "bneyzion.co.il" not in url:
        return "external_link"
    if depth == 1:
        return "category"
    if depth == 2 and parent_title in TOP_BOOK_PARENTS:
        return "book"
    if any("ימי עיון" in a for a in ancestors):
        return "event_series"
    nurl = norm_url(url)
    if n_children == 0 and page_n_items.get(nurl) == 0:
        return "empty"
    return "collection"

def walk_tree(nodes, source, parent_entry, prefer_teachers, ancestors):
    for node in nodes:
        title = node.get("title", "")
        url = node.get("url", "")
        nurl = norm_url(url)
        depth = node.get("depth", len(ancestors) + 1)
        children = node.get("children", [])
        order = node.get("order_index", node.get("order"))
        parent_sid = parent_entry["matched_series_id"] if parent_entry else None
        parent_title = parent_entry["old_title"] if parent_entry else None
        kind = classify_node(title, depth, url, parent_title, len(children), source, ancestors)
        tn = normalize_he(title)

        if kind == "alias":
            # alias maps to the same target as its book/section (= parent)
            sid, method, score, cands = parent_sid, "alias_of_parent", 1.0, []
            if not parent_sid:
                sid, method, score, cands = None, "alias_parent_unmatched", 0.0, []
        else:
            sid, method, score, cands = match_series_node(tn, parent_sid, prefer_teachers)

        entry = {
            "source": source,
            "old_url": url,
            "old_url_norm": nurl,
            "old_title": title,
            "depth": depth,
            "order_index": order,
            "parent_old_url": parent_entry["old_url"] if parent_entry else None,
            "node_kind": kind,
            "matched_series_id": sid,
            "matched_title": SERIES[sid]["title"] if sid else None,
            "method": method,
            "score": score,
            "candidates": [
                {"id": c, "title": SERIES[c]["title"], "status": SERIES[c]["status"],
                 "parent_id": SERIES[c].get("parent_id"), "lesson_count": SERIES[c].get("lesson_count")}
                for c in cands[:6]
            ],
        }
        tree_entries.append(entry)
        if sid and nurl and nurl not in page_series_map:
            page_series_map[nurl] = sid
        walk_tree(children, source, entry, prefer_teachers, ancestors + [title])

# --- public sidebar tree (prefer non-teachers) ---
walk_tree(old_sidebar, "sidebar", None, prefer_teachers=False, ancestors=[])

# --- teachers by_book tree (restrict under מאגר עזרי הלמידה root) ---
TEACHERS_ROOT = None
for s in series_rows:
    if s["_tn"] == normalize_he("מאגר עזרי הלמידה") and not s.get("parent_id"):
        TEACHERS_ROOT = s["id"]
        break

teachers_root_entry = {"matched_series_id": TEACHERS_ROOT, "old_title": "מאגר עזרי הלמידה",
                       "old_url": "/מאגר-עזרי-הלמידה"} if TEACHERS_ROOT else None
walk_tree(old_teachers_tree, "teachers_by_book", teachers_root_entry, prefer_teachers=True,
          ancestors=["מאגר עזרי הלמידה"])
# remove the synthetic root from page map? (it was never added as entry — fine)

tree_stats = {
    "total_nodes": len(tree_entries),
    "by_source": dict(Counter(e["source"] for e in tree_entries)),
    "matched": sum(1 for e in tree_entries if e["matched_series_id"]),
    "by_method": dict(Counter(e["method"] for e in tree_entries)),
    "by_kind": dict(Counter(e["node_kind"] for e in tree_entries)),
    "unmatched_by_kind": dict(Counter(e["node_kind"] for e in tree_entries if not e["matched_series_id"])),
}
tree_stats["match_rate"] = round(tree_stats["matched"] / tree_stats["total_nodes"], 4)
# match rate excluding nodes that genuinely have no series counterpart (external/empty/alias-unparented)
core = [e for e in tree_entries if e["node_kind"] not in ("external_link", "empty")]
tree_stats["match_rate_core"] = round(sum(1 for e in core if e["matched_series_id"]) / max(1, len(core)), 4)

with open(os.path.join(OUT, "tree_map.json"), "w", encoding="utf-8") as f:
    json.dump({"_meta": {"generated_by": "global_match.py", "stats": tree_stats}, "nodes": tree_entries},
              f, ensure_ascii=False, indent=1)
print("  tree nodes:", tree_stats["total_nodes"], "matched:", tree_stats["matched"],
      "rate:", tree_stats["match_rate"], "core-rate:", tree_stats["match_rate_core"], flush=True)

# ----------------------------------------------------------------------------
# 2. ITEM MATCH
# ----------------------------------------------------------------------------
print("matching items ...", flush=True)

def collect_old_media(item):
    urls = []
    m = item.get("media")
    if isinstance(m, list):
        for x in m:
            if isinstance(x, str):
                urls.append(x)
            elif isinstance(x, dict) and x.get("href"):
                urls.append(x["href"])
    for k in ("attachment_href",):
        if item.get(k) and isinstance(item[k], str):
            urls.append(item[k])
    ah = item.get("attachment_hrefs")
    if isinstance(ah, list):
        for x in ah:
            if isinstance(x, str):
                urls.append(x)
            elif isinstance(x, dict) and x.get("href"):
                urls.append(x["href"])
    dl = item.get("downloads")
    if isinstance(dl, list):
        for x in dl:
            if isinstance(x, str):
                urls.append(x)
    return urls

def _lesson_sort_key(lid, mapped_sid, mapped_subtree, prefer_teachers, rn, tn=None):
    l = LESSONS[lid]
    tit = 1 if (tn and l["_tn"] == tn) else 0
    in_series = 1 if (mapped_sid and l.get("series_id") == mapped_sid) else 0
    in_sub = 1 if (mapped_subtree and l.get("series_id") in mapped_subtree) else 0
    if prefer_teachers:
        aud = 1 if l["_has_teachers"] else 0
    else:
        aud = 1 if not l["_teachers_only"] else 0
    rab = 1 if (rn and l["_rn"] == rn) else 0
    pub = 1 if l.get("status") == "published" else 0
    return (-tit, -in_series, -in_sub, -rab, -aud, -pub, lid)

def pick_lesson(cands, mapped_sid, mapped_subtree, prefer_teachers, rn, tn=None):
    """returns (lid|None, dup_flag, ordered)"""
    key = lambda x: _lesson_sort_key(x, mapped_sid, mapped_subtree, prefer_teachers, rn, tn)
    cands = sorted(set(cands), key=key)
    if not cands:
        return None, False, []
    if len(cands) == 1:
        return cands[0], False, cands
    if key(cands[0])[:-1] != key(cands[1])[:-1]:
        return cands[0], False, cands
    # equivalent-duplicate detection: same title+rabbi -> COPY-inflated duplicates of the same
    # content row (night-session display-dedup hides these in the UI) -> deterministic pick
    l0 = LESSONS[cands[0]]
    if all(LESSONS[c]["_tn"] == l0["_tn"] and LESSONS[c]["_rn"] == l0["_rn"] for c in cands):
        return cands[0], True, cands
    # last resort: fuzzy-title margin among the tied candidates
    if tn:
        scored = sorted(((token_set_ratio(tn, LESSONS[c]["_tn"]), c) for c in cands),
                        key=lambda x: (-x[0], x[1]))
        if len(scored) > 1 and scored[0][0] - scored[1][0] > 0.03 and scored[0][0] >= 0.8:
            return scored[0][1], False, [c for _, c in scored]
    return None, False, cands

def match_item(title, rabbi, media_urls, mapped_sid, prefer_teachers, fuzzy_pool=None):
    """returns (lesson_id|None, method, score, candidates[])"""
    tn = normalize_he(title)
    rn = norm_rabbi(rabbi)
    mapped_subtree = None
    if mapped_sid:
        mapped_subtree = descendants(mapped_sid) | {mapped_sid}

    # --- key 1+2: media path (gold), then basename ---
    path_cands, base_cands = set(), set()
    for u in media_urls:
        p, b = norm_media(u)
        if p and p in media_path_idx:
            path_cands |= media_path_idx[p]
        if b and b in media_base_idx:
            base_cands |= media_base_idx[b]
    pending_amb = None  # (method, cands) — media matched a shared file but couldn't disambiguate;
                        # fall through to title keys before giving up
    if path_cands:
        lid, dup, cands = pick_lesson(path_cands, mapped_sid, mapped_subtree, prefer_teachers, rn, tn)
        if lid:
            return lid, ("media_path_dup" if dup else "media_path"), 1.0, (cands[:5] if len(cands) > 1 else [])
        pending_amb = ("ambiguous_media_path", cands[:8])
    elif base_cands:
        lid, dup, cands = pick_lesson(base_cands, mapped_sid, mapped_subtree, prefer_teachers, rn, tn)
        if lid:
            return lid, ("media_basename_dup" if dup else "media_basename"), 0.98, (cands[:5] if len(cands) > 1 else [])
        pending_amb = ("ambiguous_media_basename", cands[:8])

    def amb_or(method, cands):
        """prefer reporting the media ambiguity (stronger signal) over a later weak ambiguity."""
        if pending_amb:
            return None, pending_amb[0], 0.0, pending_amb[1]
        return None, method, 0.0, cands

    if not tn:
        return amb_or("no_title", [])

    suffix = "_after_media_amb" if pending_amb else ""

    # --- key 3: exact title + exact rabbi ---
    if rn:
        c = title_rabbi_idx.get((tn, rn), [])
        if c:
            lid, dup, cands = pick_lesson(c, mapped_sid, mapped_subtree, prefer_teachers, rn, tn)
            if lid:
                return lid, ("title_rabbi_dup" if dup else "title_rabbi") + suffix, 0.96, (cands[:5] if len(cands) > 1 else [])
            return amb_or("ambiguous_title_rabbi", cands[:8])

    # --- key 4: exact title, rabbi missing on one side ---
    c = title_idx.get(tn, [])
    if c:
        if rn:
            filt = [x for x in c if not LESSONS[x]["_rn"] or LESSONS[x]["_rn"] == rn]
        else:
            filt = list(c)
        if filt:
            lid, dup, cands = pick_lesson(filt, mapped_sid, mapped_subtree, prefer_teachers, rn, tn)
            method = "title_only" if not rn else "title_rabbi_oneside"
            if lid:
                return lid, (method + "_dup" if dup else method) + suffix, 0.9, (cands[:5] if len(cands) > 1 else [])
            return amb_or("ambiguous_" + method, cands[:8])

    # --- key 5: fuzzy title >= 0.92 within pool (mapped series subtree, else rabbi lessons) ---
    pool = []
    if fuzzy_pool:
        pool = list(fuzzy_pool)
    elif mapped_subtree:
        for sid2 in mapped_subtree:
            pool.extend(series_lessons.get(sid2, []))
    if not pool and rn:
        pool = rabbi_lessons_idx.get(rn, [])
    best = []
    sk = skeleton(tn)
    for lid in set(pool):
        ltn = LESSONS[lid]["_tn"]
        if not ltn:
            continue
        lrn = LESSONS[lid]["_rn"]
        if skeleton(ltn) == sk and fuzzy_guard_ok(tn, ltn):
            # ktiv male/haser equality (קרח == קורח): rabbi must not contradict
            if rn and lrn and lrn != rn:
                continue
            r = 0.93
        else:
            # plain fuzzy requires SAME rabbi on both sides (spec key 5)
            if not rn or lrn != rn:
                continue
            if not fuzzy_guard_ok(tn, ltn):
                continue
            r = token_set_ratio(tn, ltn)
        if r >= 0.92:
            best.append((r, lid))
    if best:
        best.sort(key=lambda x: (-x[0],) + _lesson_sort_key(x[1], mapped_sid, mapped_subtree, prefer_teachers, rn, tn))
        top_r = best[0][0]
        top = [lid for r, lid in best if abs(r - top_r) < 1e-9]
        lid, dup, cands = pick_lesson(top, mapped_sid, mapped_subtree, prefer_teachers, rn, tn)
        if lid:
            return lid, ("fuzzy_title_dup" if dup else "fuzzy_title") + suffix, round(top_r, 3), ([x for _, x in best[:5]] if len(best) > 1 else [])
        return amb_or("ambiguous_fuzzy", [x for _, x in best[:8]])

    return amb_or("unmatched", [])

def cand_info(lids):
    out = []
    for x in lids[:6]:
        l = LESSONS[x]
        out.append({"id": x, "title": l["title"], "rabbi": l.get("rabbi_name"),
                    "series_id": l.get("series_id"), "tags": l.get("audience_tags")})
    return out

# ---------- generic listing-page processor ----------
SERIES_ITEM_TYPES = {"סדרה", "series"}

def get_item_fields(item):
    title = item.get("title", "")
    rabbi = item.get("rabbi") or item.get("author") or item.get("rabbi_shown") or ""
    href = item.get("href") or item.get("url") or ""
    typ = item.get("type") or item.get("item_type") or item.get("kind") or ""
    is_series = (typ in SERIES_ITEM_TYPES) or (item.get("series_lesson_count") not in (None, "", 0) and typ == "סדרה")
    return title, rabbi, href, typ, typ in SERIES_ITEM_TYPES

def process_page(url, h1, items, mapped_sid, prefer_teachers, fuzzy_pool=None,
                 extras_source="series"):
    """returns page result dict; also registers matched series-row hrefs into page_series_map."""
    out_items, sub_series, matched_ids = [], [], set()
    for i, item in enumerate(items):
        title, rabbi, href, typ, is_series = get_item_fields(item)
        order = item.get("order_index", item.get("order", i))
        if is_series:
            tn = normalize_he(title)
            sid, method, score, cands = match_series_node(tn, mapped_sid, prefer_teachers)
            sub_series.append({
                "idx": order, "title": title, "rabbi": rabbi, "old_href": href,
                "matched_series_id": sid,
                "matched_title": SERIES[sid]["title"] if sid else None,
                "method": method, "score": score,
                "candidates": [{"id": c, "title": SERIES[c]["title"]} for c in cands[:5]],
            })
            nh = norm_url(href)
            if sid and nh and nh not in page_series_map:
                page_series_map[nh] = sid
            continue
        media_urls = collect_old_media(item)
        lid, method, score, cands = match_item(title, rabbi, media_urls, mapped_sid,
                                               prefer_teachers, fuzzy_pool=fuzzy_pool)
        if lid:
            matched_ids.add(lid)
        out_items.append({
            "idx": order, "title": title, "rabbi": rabbi, "type": typ,
            "matched_lesson_id": lid, "method": method, "score": score,
            **({"candidates": cand_info(cands)} if cands else {}),
        })
    # new_extras
    new_extras = []
    if extras_source == "series" and mapped_sid:
        for lid in series_lessons.get(mapped_sid, []):
            l = LESSONS[lid]
            if prefer_teachers and not l["_has_teachers"]:
                continue
            if not prefer_teachers and l["_teachers_only"]:
                continue
            if lid not in matched_ids:
                new_extras.append(lid)
    return {
        "url": url, "h1": h1, "mapped_series_id": mapped_sid,
        "n_items": len(out_items), "n_matched": sum(1 for x in out_items if x["matched_lesson_id"]),
        "items": out_items,
        "sub_series_match": sub_series,
        "new_extras": sorted(new_extras),
    }, matched_ids

def resolve_page_series(nurl, h1, prefer_teachers):
    """page url -> mapped series id (tree_map / earlier series rows / parent+h1 fallback)."""
    if nurl in page_series_map:
        return page_series_map[nurl], "tree_or_listing"
    # parent fallback
    parent = nurl.rsplit("/", 1)[0] if "/" in nurl else ""
    psid = page_series_map.get(parent)
    if psid:
        tn = normalize_he(h1 or nurl.rsplit("/", 1)[-1])
        sid, method, score, cands = match_series_node(tn, psid, prefer_teachers)
        if sid:
            page_series_map[nurl] = sid
            return sid, "h1_in_parent:" + method
        # try last path segment as title
        seg = normalize_he(urllib.parse.unquote(nurl.rsplit("/", 1)[-1]).replace("-", " "))
        sid, method, score, cands = match_series_node(seg, psid, prefer_teachers)
        if sid:
            page_series_map[nurl] = sid
            return sid, "slug_in_parent:" + method
    # global by h1
    tn = normalize_he(h1)
    if tn:
        g = series_title_idx.get(tn, [])
        if len(g) == 1:
            page_series_map[nurl] = g[0]
            return g[0], "h1_global_unique"
    return None, "unresolved"

item_match = {"listings": {}, "rabbi_pages": {}, "topic_pages": {}, "teachers": {}}
src_stats = {}

# ---------- A. public listings (both files) ----------
all_listing_pages = []
for url, p in tk_pages.items():
    all_listing_pages.append((url, p, "torah_ketuvim"))
for url, p in nm_pages.items():
    if isinstance(p, dict):
        all_listing_pages.append((url, p, "neviim_moadim"))
# shallow-first so parent listings register child series hrefs before child pages run
all_listing_pages.sort(key=lambda x: (norm_url(x[0]).count("/"), norm_url(x[0])))

n_items_tot = n_match_tot = 0
method_ctr = Counter()
unresolved_pages = []
for url, p, src in all_listing_pages:
    nurl = norm_url(url)
    prefer_teachers = "מאגר-עזרי-הלמידה" in nurl
    redirected = p.get("redirected_to")
    if redirected:
        rurl = norm_url(redirected)
        if rurl in page_series_map and nurl not in page_series_map:
            page_series_map[nurl] = page_series_map[rurl]
    sid, how = resolve_page_series(nurl, p.get("h1"), prefer_teachers)
    res, matched = process_page(url, p.get("h1"), p.get("items", []), sid, prefer_teachers)
    res["source_file"] = src
    res["mapping_method"] = how
    if redirected:
        res["redirected_to"] = redirected
    item_match["listings"][url] = res
    n_items_tot += res["n_items"]; n_match_tot += res["n_matched"]
    for x in res["items"]:
        method_ctr[x["method"]] += 1
    if sid is None and res["n_items"] > 0:
        unresolved_pages.append(nurl)

src_stats["listings"] = {
    "pages": len(all_listing_pages),
    "pages_with_mapped_series": sum(1 for v in item_match["listings"].values() if v["mapped_series_id"]),
    "items": n_items_tot, "matched": n_match_tot,
    "rate": round(n_match_tot / max(1, n_items_tot), 4),
    "methods": dict(method_ctr),
    "sub_series_rows": sum(len(v["sub_series_match"]) for v in item_match["listings"].values()),
    "sub_series_matched": sum(1 for v in item_match["listings"].values()
                              for s in v["sub_series_match"] if s["matched_series_id"]),
    "new_extras_total": sum(len(v["new_extras"]) for v in item_match["listings"].values()),
    "unresolved_pages_with_items": len(unresolved_pages),
}
print("  listings:", src_stats["listings"]["items"], "items,",
      src_stats["listings"]["rate"], "rate", flush=True)

# ---------- B. rabbi pages ----------
n_items_tot = n_match_tot = 0
method_ctr = Counter()
for name, p in rabbi_pages.items():
    if name == "_summary" or not isinstance(p, dict):
        continue
    rn = norm_rabbi(name)
    rab_ids = rabbi_name_idx.get(rn, [])
    mapped_rabbi = rab_ids[0] if len(rab_ids) == 1 else (sorted(rab_ids)[0] if rab_ids else None)
    pool = rabbi_lessons_idx.get(rn, [])
    res, matched = process_page(p.get("url"), p.get("h1"), p.get("items", []), None, False,
                                fuzzy_pool=pool, extras_source="rabbi")
    res["rabbi_name"] = name
    res["mapped_rabbi_id"] = mapped_rabbi
    res["mapped_rabbi_ambiguous"] = len(rab_ids) > 1
    res["expected_count_old"] = p.get("expected_count")
    res["effective_lesson_count_old"] = p.get("effective_lesson_count")
    # rabbi new_extras = public lessons of this rabbi not matched on this page (informational —
    # old rav items[] are only the table rows; blocks view rows were not itemized by the scraper)
    res["new_extras"] = sorted(lid for lid in pool
                               if not LESSONS[lid]["_teachers_only"] and lid not in matched)
    item_match["rabbi_pages"][name] = res
    n_items_tot += res["n_items"]; n_match_tot += res["n_matched"]
    for x in res["items"]:
        method_ctr[x["method"]] += 1

src_stats["rabbi_pages"] = {
    "pages": len(item_match["rabbi_pages"]),
    "rabbis_mapped": sum(1 for v in item_match["rabbi_pages"].values() if v["mapped_rabbi_id"]),
    "items": n_items_tot, "matched": n_match_tot,
    "rate": round(n_match_tot / max(1, n_items_tot), 4),
    "methods": dict(method_ctr),
    "sub_series_rows": sum(len(v["sub_series_match"]) for v in item_match["rabbi_pages"].values()),
    "sub_series_matched": sum(1 for v in item_match["rabbi_pages"].values()
                              for s in v["sub_series_match"] if s["matched_series_id"]),
}
print("  rabbi pages:", n_items_tot, "items,", src_stats["rabbi_pages"]["rate"], "rate", flush=True)

# ---------- C. topic pages ----------
n_items_tot = n_match_tot = 0
method_ctr = Counter()
for name, p in topic_pages.items():
    if name == "__index__" or not isinstance(p, dict):
        continue
    tn = normalize_he(name)
    t_ids = topic_title_idx.get(tn, [])
    mapped_topic = t_ids[0] if len(t_ids) == 1 else None
    if not mapped_topic and not t_ids:
        # fuzzy unique topic
        best = [(token_set_ratio(tn, normalize_he(t["title"])), t["id"]) for t in topic_rows]
        best = [x for x in best if x[0] >= 0.9]
        best.sort(key=lambda x: (-x[0], x[1]))
        if len(best) == 1 or (len(best) > 1 and best[0][0] - best[1][0] > 1e-9):
            mapped_topic = best[0][1]
    pool = topic_lessons.get(mapped_topic, []) if mapped_topic else None
    res, matched = process_page(p.get("url"), name, p.get("items", []), None, False,
                                fuzzy_pool=pool, extras_source="topic")
    res["topic_name"] = name
    res["mapped_topic_id"] = mapped_topic
    res["mapped_topic_title"] = TOPICS[mapped_topic]["title"] if mapped_topic else None
    res["expected_count_old"] = p.get("expected_count")
    res["new_extras"] = sorted(set(pool) - matched) if pool else []
    item_match["topic_pages"][name] = res
    n_items_tot += res["n_items"]; n_match_tot += res["n_matched"]
    for x in res["items"]:
        method_ctr[x["method"]] += 1

src_stats["topic_pages"] = {
    "pages": len(item_match["topic_pages"]),
    "topics_mapped": sum(1 for v in item_match["topic_pages"].values() if v["mapped_topic_id"]),
    "items": n_items_tot, "matched": n_match_tot,
    "rate": round(n_match_tot / max(1, n_items_tot), 4),
    "methods": dict(method_ctr),
    "sub_series_rows": sum(len(v["sub_series_match"]) for v in item_match["topic_pages"].values()),
    "sub_series_matched": sum(1 for v in item_match["topic_pages"].values()
                              for s in v["sub_series_match"] if s["matched_series_id"]),
    "new_extras_total": sum(len(v["new_extras"]) for v in item_match["topic_pages"].values()),
}
print("  topic pages:", n_items_tot, "items,", src_stats["topic_pages"]["rate"], "rate", flush=True)

# ---------- D. teachers listings ----------
n_items_tot = n_match_tot = 0
method_ctr = Counter()

def teach_page(key, url, h1, items, mapped_sid, extras="none"):
    global n_items_tot, n_match_tot
    res, matched = process_page(url, h1, items, mapped_sid, True,
                                extras_source=("series" if extras == "series" else "none"))
    item_match["teachers"][key] = res
    n_items_tot += res["n_items"]; n_match_tot += res["n_matched"]
    for x in res["items"]:
        method_ctr[x["method"]] += 1
    return res

for name, v in teachers_listings["content_types"].items():
    r = teach_page("content_type::" + name, v.get("url"), name, v.get("items", []), None)
    r["sidebar_count_old"] = v.get("sidebar_count")
for name, v in teachers_listings["creators"].items():
    rn = norm_rabbi(name)
    rab_ids = rabbi_name_idx.get(rn, [])
    r = teach_page("creator::" + name, v.get("url"), name, v.get("items", []), None)
    r["mapped_rabbi_id"] = rab_ids[0] if len(rab_ids) == 1 else (sorted(rab_ids)[0] if rab_ids else None)
    r["sidebar_count_old"] = v.get("sidebar_count")
for book, v in teachers_listings["by_book"].items():
    nurl = norm_url(v.get("url"))
    sid = page_series_map.get(nurl)
    if not sid:
        sid, _how = resolve_page_series(nurl, book.split("/")[-1], True)
    r = teach_page("by_book::" + book, v.get("url"), book, v.get("items", []), sid, extras="series")
    ss = v.get("sub_series") or {}
    for sname, sv in (ss.items() if isinstance(ss, dict) else []):
        snurl = norm_url(sv.get("url"))
        ssid = page_series_map.get(snurl)
        if not ssid:
            ssid, _how = resolve_page_series(snurl, sname, True)
        teach_page("by_book::" + book + "::" + sname, sv.get("url"), sname,
                   sv.get("items", []), ssid, extras="series")

src_stats["teachers"] = {
    "pages": len(item_match["teachers"]),
    "pages_with_mapped_series": sum(1 for v in item_match["teachers"].values() if v.get("mapped_series_id")),
    "items": n_items_tot, "matched": n_match_tot,
    "rate": round(n_match_tot / max(1, n_items_tot), 4),
    "methods": dict(method_ctr),
    "sub_series_rows": sum(len(v["sub_series_match"]) for v in item_match["teachers"].values()),
    "sub_series_matched": sum(1 for v in item_match["teachers"].values()
                              for s in v["sub_series_match"] if s["matched_series_id"]),
    "new_extras_total": sum(len(v.get("new_extras", [])) for v in item_match["teachers"].values()),
}
print("  teachers:", n_items_tot, "items,", src_stats["teachers"]["rate"], "rate", flush=True)

# ---------- write ----------
grand_items = sum(src_stats[k]["items"] for k in src_stats)
grand_matched = sum(src_stats[k]["matched"] for k in src_stats)
meta = {
    "generated_by": "global_match.py",
    "tree_stats": tree_stats,
    "source_stats": src_stats,
    "grand_total_items": grand_items,
    "grand_total_matched": grand_matched,
    "grand_rate": round(grand_matched / max(1, grand_items), 4),
}
with open(os.path.join(OUT, "item_match.json"), "w", encoding="utf-8") as f:
    json.dump({"_meta": meta, **item_match}, f, ensure_ascii=False, indent=1)
with open(os.path.join(OUT, "MATCH-STATS.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)

print(json.dumps(meta["source_stats"], ensure_ascii=False, indent=1)[:2000])
print("GRAND:", grand_items, "items,", grand_matched, "matched,", meta["grand_rate"], "rate")

# ----------------------------------------------------------------------------
# Spot checks
# ----------------------------------------------------------------------------
print("\n--- SPOT CHECKS ---")
# 1. שופטים golden event series must map to populated series
shoftim_children = [e for e in tree_entries
                    if e["source"] == "sidebar" and e.get("parent_old_url")
                    and "/נביאים/שופטים" in norm_url(e["parent_old_url"])]
print(f"שופטים sidebar children: {len(shoftim_children)}")
for e in shoftim_children:
    sid = e["matched_series_id"]
    lc = SERIES[sid].get("lesson_count") if sid else None
    n_direct = len(series_lessons.get(sid, [])) if sid else 0
    print(f"  {'OK ' if sid and n_direct > 0 else 'WARN'} {e['old_title'][:45]!r:48} -> "
          f"{(sid or 'NULL')[:8]} method={e['method']} direct_lessons={n_direct} lc={lc}")

# 2. מרד אבשלום items mostly matched
for url, v in item_match["listings"].items():
    if "מרד-אבשלום" in norm_url(url) or "מרד אבשלום" in (v.get("h1") or ""):
        print(f"מרד אבשלום page: {v['n_matched']}/{v['n_items']} matched, "
              f"mapped={(v['mapped_series_id'] or 'NULL')[:8]}, extras={len(v['new_extras'])}")

# 3-5: known anchors
for probe in ("פרשת-קורח", "חמאה-ודבש"):
    hits = [(url, v) for url, v in item_match["listings"].items() if probe in norm_url(url)]
    for url, v in hits[:2]:
        print(f"{probe}: {v['n_matched']}/{v['n_items']} mapped={(v['mapped_series_id'] or 'NULL')[:8]} ({v['h1']})")
print("done.")
