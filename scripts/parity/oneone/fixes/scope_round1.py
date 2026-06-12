#!/usr/bin/env python3
"""ROUND1 scoping — READ-ONLY. Builds the evidence sets for fixes/ROUND1.sql.
Outputs fixes/round1_scope.json with every id set + diff used by the SQL author."""
import json, re, sys, unicodedata, os
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # oneone/
sys.path.insert(0, os.path.join(BASE, "..", ""))
SBQ = os.path.join(BASE, "..", "sbq.py")

# import sbq.run
import importlib.util
spec = importlib.util.spec_from_file_location("sbq", SBQ)
sbq = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sbq)

def q(sql):
    out = sbq.run(sql)
    parsed = json.loads(out)
    if isinstance(parsed, dict) and parsed.get("message"):
        raise RuntimeError(f"SQL error: {parsed}\n--- for: {sql[:300]}")
    return parsed

NIQQUD_RE = re.compile(r"[֑-ׇ]")
QUOTE_RE = re.compile(r"[״\"'׳`]")
SEP_RE = re.compile(r"[\-–—_/|,:;().\[\]]+")

def normalize_he(s):
    if not s: return ""
    s = unicodedata.normalize("NFC", str(s))
    s = NIQQUD_RE.sub("", s); s = QUOTE_RE.sub("", s); s = SEP_RE.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip().lower()

def tok_overlap(a, b):
    ta, tb = set(normalize_he(a).split()), set(normalize_he(b).split())
    if not ta or not tb: return 0.0
    return len(ta & tb) / min(len(ta), len(tb))

def load(p):
    return json.load(open(os.path.join(BASE, p), encoding="utf-8"))

ROOT_IDS = {
    "תורה": "bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b",
    "נביאים": "a0472c9f-8212-44ff-8937-ace5fea4b4dc",
    "כתובים": "5cdd770c-9593-4b0d-9f9e-cda50cf5ef41",
    'איך לומדים תנ"ך': "62590949-6187-4e17-b84d-65a518467521",
    'נושאים כלליים בתנ"ך': "2d6d28c1-3c5c-4d61-9283-410bc56cd351",
    "מועדים": "92130154-e96a-4f98-b032-5a20ac385f63",
    "הפטרות": "3327c721-7bc9-471c-878f-0b3aef98b090",
    "כלי עזר - טבלאות זמני המאורעות ומפות": "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7",
    'ימי עיון בתנ"ך': "f4040001-0001-4000-8000-000000000000",
    'ליווי ת"תים': "7cbd261e-03b0-43da-a708-e8ae4402105f",
}
HOWTOTEACH = "26e30725-d5d0-4d88-8f73-f7a279801241"  # teachers child under howToLearn — excluded from public band per CODE-SPEC §2.1

tm = load("match/tree_map.json")["nodes"]
tmp_map = load("state/tmp_map.json")
tp = load("plans/tree_plan.json")
old_tree = load("old_sidebar_tree.json")["tree"]
old_topics = load("old_topics_sidebar.json")["items"]

def norm_url(u):
    if not u: return None
    u = unicodedata.normalize("NFC", u)
    return u.rstrip("/")

# alias slots (rendered by CODE §2.4) — never band members
alias_urls = {norm_url(a["old_url"]) for a in tp["code_asks_data"]["alias_slots"]}

# old_url -> series_id : tree_map matches, OVERRIDDEN by tree_plan ops (authoritative), + creates (tmp resolved)
url2sid = {}
for n in tm:
    if n.get("source") != "sidebar": continue
    u = norm_url(n.get("old_url_norm") or n.get("old_url"))
    if n.get("matched_series_id") and n.get("method") != "alias_of_parent":
        url2sid.setdefault(u, n["matched_series_id"])
for op in tp["ops"]:
    u = norm_url((op.get("evidence") or {}).get("old_url"))
    if not u: continue
    if op["op"] == "create_series":
        sid = tmp_map.get(op.get("tmp_id"))
        if sid: url2sid[u] = sid
    elif op["op"] == "set_series_sort" and op.get("series_id") and (op.get("sort_order") or 0) >= 1 \
            and "old sibling position" in (op.get("evidence", {}).get("detail") or ""):
        url2sid[u] = op["series_id"]
    elif op["op"] == "reparent_series" and op.get("series_id"):
        url2sid[u] = op["series_id"]

# sidebar nodes by parent url
sidebar_nodes = [n for n in tm if n.get("source") == "sidebar"]
children_by_parent = defaultdict(list)
node_by_url = {}
for n in sidebar_nodes:
    u = norm_url(n.get("old_url_norm") or n.get("old_url"))
    node_by_url[u] = n
    pu = norm_url(n.get("parent_old_url"))
    children_by_parent[pu].append(n)
for pu in children_by_parent:
    children_by_parent[pu].sort(key=lambda x: x.get("order_index", 0))

# top-level: map old top titles to ROOT ids
top_url2root = {}
for t in old_tree:
    if t["title"] in ROOT_IDS:
        top_url2root[norm_url(t["url"])] = ROOT_IDS[t["title"]]

def parent_series_id(pu):
    if pu in top_url2root: return top_url2root[pu]
    return url2sid.get(pu)

# expected band membership: parent_sid -> [(pos, member_sid, old_label, old_url, kind, method)]
expected = {}
unresolved_members = []
for pu, kids in children_by_parent.items():
    if pu is None: continue
    psid = parent_series_id(pu)
    if not psid: continue
    members = []
    pos = 0
    for k in kids:
        ku = norm_url(k.get("old_url_norm") or k.get("old_url"))
        if k.get("node_kind") == "alias" or k.get("method") == "alias_of_parent" or ku in alias_urls:
            continue
        pos += 1
        u = norm_url(k.get("old_url_norm") or k.get("old_url"))
        sid = url2sid.get(u)
        if sid:
            members.append({"pos": pos, "sid": sid, "old_label": k["old_title"],
                            "old_url": u, "kind": k.get("node_kind"), "method": k.get("method")})
        else:
            unresolved_members.append({"parent_url": pu, "pos": pos, "old_label": k["old_title"], "old_url": u})
    if members:
        expected[psid] = members

# ALSO: sidebar CONTAINER nodes with ZERO old children (e.g. עובדיה book, כלי-עזר root):
# every live band child there is an extra. Containers = top roots + depth-2 books/sections.
for n in sidebar_nodes:
    u = norm_url(n.get("old_url_norm") or n.get("old_url"))
    if children_by_parent.get(u):           # has old children → already policed
        continue
    if n.get("depth") not in (1, 2):        # leaf collections keep their page-order children
        continue
    psid = top_url2root.get(u) or url2sid.get(u)
    if psid and psid not in expected:
        expected[psid] = []                  # zero expected members → all band children demote

# ALSO: top-level band on roots themselves is code-driven (13 fixed entries) — skip roots-as-members.

all_parents = sorted(expected.keys())
print(f"policed parents: {len(all_parents)}, unresolved old members: {len(unresolved_members)}", file=sys.stderr)

# live children of all policed parents
rows = []
CH = 80
for i in range(0, len(all_parents), CH):
    ids = ",".join(f"'{x}'" for x in all_parents[i:i+CH])
    rows += q(f"SELECT id,title,parent_id,sort_order,status,audience_tags,lesson_count FROM series WHERE parent_id IN ({ids})")
live_by_parent = defaultdict(list)
for r in rows:
    live_by_parent[r["parent_id"]].append(r)

member_ids_all = {m["sid"] for ms in expected.values() for m in ms}

band_demote = []      # extras with band 1..99 → 0
renames = []          # member title != old label (overlap>=0.6)
rename_flags = []     # overlap < 0.6 — do NOT rename
order_fixes = []      # member with wrong sort_order → expected pos
status_fixes = []     # member with status draft/category that must render (active)
missing_members = []  # expected member not under parent / wrong parent
for psid, members in expected.items():
    live = live_by_parent.get(psid, [])
    live_by_id = {r["id"]: r for r in live}
    mset = {m["sid"] for m in members}
    for r in live:
        so = r.get("sort_order")
        if so is not None and 1 <= so <= 99 and r["id"] not in mset and r["id"] not in member_ids_all:
            band_demote.append({"id": r["id"], "title": r["title"], "parent_id": psid,
                                "sort_order": so, "status": r["status"], "lesson_count": r.get("lesson_count")})
    for m in members:
        r = live_by_id.get(m["sid"])
        if r is None:
            missing_members.append(m | {"parent_sid": psid})
            continue
        if normalize_he(r["title"]) != normalize_he(m["old_label"]):
            ov = tok_overlap(r["title"], m["old_label"])
            rec = {"id": r["id"], "current": r["title"], "old_label": m["old_label"],
                   "overlap": round(ov, 2), "parent_id": psid, "old_url": m["old_url"]}
            (renames if ov >= 0.6 else rename_flags).append(rec)
        if r.get("sort_order") != m["pos"]:
            order_fixes.append({"id": r["id"], "title": r["title"], "parent_id": psid,
                                "current_sort": r.get("sort_order"), "expected": m["pos"]})
        if r.get("status") not in ("active", "published"):
            status_fixes.append({"id": r["id"], "title": r["title"], "status": r["status"], "parent_id": psid})

# draft children currently leaking into sidebar sections (sim_draft_children=4):
draft_in_sidebar = q("""
SELECT s.id, s.title, s.parent_id, s.sort_order, s.status, s.lesson_count
FROM series s
WHERE s.status='draft' AND (
  (s.parent_id IN ('2d6d28c1-3c5c-4d61-9283-410bc56cd351','92130154-e96a-4f98-b032-5a20ac385f63',
                   '3327c721-7bc9-471c-878f-0b3aef98b090','27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7',
                   'f4040001-0001-4000-8000-000000000000','7cbd261e-03b0-43da-a708-e8ae4402105f')
   AND s.sort_order BETWEEN 1 AND 99)
  OR s.id IN (SELECT series_id FROM (
        WITH RECURSIVE d AS (
          SELECT id AS series_id FROM series WHERE parent_id='62590949-6187-4e17-b84d-65a518467521'
          UNION ALL
          SELECT s2.id FROM series s2 JOIN d ON s2.parent_id=d.series_id)
        SELECT series_id FROM d) hd)
)""")

# ── leaks: teacher-only published lessons inside public listing series ──
leak_series = ["58e49444-38cf-455c-8d83-5af19d0e1cb0","08a87de3-2938-43aa-962f-8ea95096e564",
 "743cfeeb-c82d-458e-83f8-98d40629ea1b","a14dbc35-1caf-4675-9eba-75b5df118925",
 "381ebb6c-8c16-43d6-bd61-7e96445efa34","cc7825e1-67a3-49b8-b632-9543f3aa3787",
 "ea110001-0001-4000-8000-000000000001","ed200001-0002-4000-8000-000000000001",
 "75b7c62c-50e2-4874-bcf5-2d8ddf646771","a1010001-0001-4000-8000-000000000023",
 "a1010001-0001-4000-8000-000000000029","02539385-aaaa-4c7f-9d85-d1af6e1cdd96",
 "b2020001-0001-4000-8000-000000000007","b2020001-0001-4000-8000-000000000012",
 "2d6d28c1-3c5c-4d61-9283-410bc56cd351","5f298ac3-b98a-4822-9ed6-45b01b2905fe",
 "bf16434c-3391-4566-a854-9b055d8825e2","9cb69292-166f-4114-98d3-ca8812c81787",
 "b082cb95-cec2-4fb4-9d92-4dceb7ce2706","6267feb7-de69-4106-aa02-172411e070cd",
 "531a3635-53d0-4fac-b9c2-ee37086e499a"]
ids = ",".join(f"'{x}'" for x in leak_series)
leaks = q(f"""SELECT l.id,l.title,l.series_id,s.title AS series_title,l.audience_tags,l.status,l.sort_order
FROM lessons l JOIN series s ON s.id=l.series_id
WHERE l.series_id IN ({ids}) AND l.status='published'
  AND l.audience_tags @> ARRAY['teachers']::text[] AND NOT (l.audience_tags @> ARRAY['general']::text[])
ORDER BY s.title, l.title""")

# cross-check each leaked lesson title against the OLD public listing of its page(s)
old_tk = load("old_listings_torah_ketuvim.json")["pages"]
old_nm = load("old_listings_neviim_moadim.json")
im = load("match/item_match.json")["listings"]
sid2urls = defaultdict(list)
for u, m in im.items():
    if m.get("mapped_series_id"):
        sid2urls[m["mapped_series_id"]].append(u)
def old_titles_for_url(u):
    p = old_tk.get(u)
    if p and u != "_meta":
        return {normalize_he(it.get("title_norm") or it.get("title")) for it in p.get("items", [])}
    p = old_nm.get(u)
    if isinstance(p, dict):
        return {normalize_he(it.get("title_norm") or it.get("title")) for it in p.get("items", [])}
    return set()
for l in leaks:
    found = False
    for u in sid2urls.get(l["series_id"], []):
        if normalize_he(l["title"]) in old_titles_for_url(u):
            found = True; break
    l["on_old_public_page"] = found

# ── empty audience_tags lessons ──
empties = q("""SELECT l.id, l.title, l.status, l.series_id, s.title AS series_title, s.audience_tags AS series_aud,
 s.parent_id, p.title AS parent_title
FROM lessons l LEFT JOIN series s ON s.id=l.series_id LEFT JOIN series p ON p.id=s.parent_id
WHERE l.audience_tags = '{}'::text[]
ORDER BY s.title NULLS LAST, l.title""")
# classification signal: series audience + appearance in old public listings + teachers context
teach_listing = load("old_teachers_listings.json")
teach_titles = set()
def collect_titles(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("title", "title_norm") and isinstance(v, str):
                teach_titles.add(normalize_he(v))
            else:
                collect_titles(v)
    elif isinstance(o, list):
        for x in o: collect_titles(x)
collect_titles(teach_listing)
# global old-PUBLIC title pool: all public listing pages + topic pages + rabbi pages
pub_titles = set()
for u in list(old_tk.keys()):
    if u != "_meta":
        pub_titles |= old_titles_for_url(u)
for u, p in old_nm.items():
    if isinstance(p, dict) and u != "_meta":
        pub_titles |= old_titles_for_url(u)
otp = load("old_topic_pages.json")
for name, p in otp.items():
    if isinstance(p, dict):
        for it in p.get("items", []):
            t = it.get("title_norm") or it.get("title")
            if t: pub_titles.add(normalize_he(t))
orp = load("old_rabbi_pages.json")
def collect_pub(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("title", "title_norm") and isinstance(v, str):
                pub_titles.add(normalize_he(v))
            else:
                collect_pub(v)
    elif isinstance(o, list):
        for x in o: collect_pub(x)
collect_pub(orp)

for e in empties:
    saud = e.get("series_aud") or []
    nk = normalize_he(e["title"])
    on_pub_same_series = any(nk in old_titles_for_url(u) for u in sid2urls.get(e["series_id"], []))
    on_pub = nk in pub_titles
    on_teach = nk in teach_titles
    e["on_old_public_page"] = on_pub_same_series
    e["on_old_public_anywhere"] = on_pub
    e["on_old_teachers_listing"] = on_teach
    if on_pub and on_teach:
        e["verdict"] = "dual"
    elif on_pub:
        e["verdict"] = "general"
    elif on_teach:
        e["verdict"] = "teachers"
    elif "teachers" in saud and "general" not in saud:
        e["verdict"] = "teachers"
    else:
        e["verdict"] = "general_flag"   # no old-site signal — defaulting to general, listed in report

# ── topics sidebar ──
themes = q("SELECT id FROM topics WHERE slug='themes-root'")
troot = themes[0]["id"]
live_topics = q(f"SELECT id,name,slug,parent_id,sort_order FROM topics WHERE parent_id='{troot}' ORDER BY sort_order NULLS LAST, name")
old_by_norm = {normalize_he(i["title_norm"]): i for i in old_topics}
live_by_norm = {normalize_he(t["name"]): t for t in live_topics}
topics_missing = [old_by_norm[k] for k in old_by_norm if k not in live_by_norm]
topics_extra = [live_by_norm[k] for k in live_by_norm if k not in old_by_norm]
# find the missing ones anywhere in topics table
missing_lookup = {}
for mt in topics_missing:
    nm = mt["title_norm"].replace("'", "''")
    hits = q(f"SELECT id,name,slug,parent_id,sort_order FROM topics WHERE name='{nm}'")
    if not hits:
        # ktiv variants — search loose
        hits = q(f"SELECT id,name,slug,parent_id,sort_order FROM topics WHERE name ILIKE '%{nm}%' LIMIT 5")
    missing_lookup[mt["title_norm"]] = hits
topics_order = []
for i in sorted(old_topics, key=lambda x: x["order_index"]):
    k = normalize_he(i["title_norm"])
    t = live_by_norm.get(k)
    expected_so = i["order_index"] + 1
    topics_order.append({"old_title": i["title_norm"], "expected_sort": expected_so,
                         "id": (t or {}).get("id"), "live_sort": (t or {}).get("sort_order"),
                         "live_name": (t or {}).get("name")})

out = {
 "expected_parents": len(expected),
 "unresolved_members": unresolved_members,
 "band_demote": band_demote,
 "renames": renames,
 "rename_flags": rename_flags,
 "order_fixes": order_fixes,
 "status_fixes": status_fixes,
 "missing_members": missing_members,
 "draft_in_sidebar": draft_in_sidebar,
 "leaks": leaks,
 "empties": empties,
 "topics": {"root": troot, "live_count": len(live_topics), "missing": topics_missing,
            "extra": topics_extra, "missing_lookup": missing_lookup, "order": topics_order},
}
with open(os.path.join(BASE, "fixes", "round1_scope.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print(json.dumps({k: (len(v) if isinstance(v, list) else v) for k, v in out.items() if k != "topics"}, ensure_ascii=False, indent=1))
print("topics:", json.dumps({"missing": len(topics_missing), "extra": len(topics_extra)}, ensure_ascii=False))
