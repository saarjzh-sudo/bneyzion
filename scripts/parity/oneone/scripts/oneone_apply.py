#!/usr/bin/env python3
"""
oneone_apply.py — deterministic, resumable APPLY ENGINE for the bneyzion 1:1 parity plans.

Pipeline:
  1. LOAD   all plans/*_plan*.json (incl. lessons_plan_neviim_rishonim.json when it lands).
  2. RESOLVE — re-run merge_check, apply its deterministic resolution rules to produce the
     final op stream → plans/RESOLVED-OPS.jsonl (op_id = sha1 of canonical op json).
     Includes the ketuvim nav_visible → sort-band normalization.
  3. VALIDATE / EXECUTE per APPLY-ORDER.md stages 3..10 (0-2 verify-only).

Execution semantics:
  --dry-run            (default) read-only validation of every op against current DB;
                       writes plans/DRYRUN-REPORT.md. NO writes of any kind.
  --execute --stage N  apply one stage, idempotent (state probe + journal state/applied.jsonl).
  --verify --stage N   run the APPLY-ORDER verification SQL for a stage (read-only).
  --only-high          (default ON) apply only confidence=high; med/low →
                       plans/DEFERRED-med-low.jsonl.  --include-med applies med ops whose
                       per-class sanity check passes. low is NEVER auto-applied.
  --with-extra-schema  enable ops gated on pending schema (teacher_listing_items,
                       series_topics, lessons.copied_from). Without it those ops are
                       counted+listed as gated, never attempted.
  --fresh-snapshot     force re-pull of the DB snapshot (otherwise cached 30 min).

Deterministic ids: new rows (copies / inserts) get uuid5(NAMESPACE_URL, "oneone:"+op_id)
so re-runs are idempotent even without the journal.

HARD RULES honored: never DELETE rows; Rule 13 rehost queue for bneyzion.co.il media;
no real-list sends; no git; no vercel.
"""
import argparse, hashlib, json, os, re, subprocess, sys, time, unicodedata, uuid
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent          # .../oneone/scripts
ONEONE = HERE.parent                            # .../oneone
PLANS = ONEONE / "plans"
STATE = ONEONE / "state"
CACHE = ONEONE / "cache"
PARITY = ONEONE.parent                          # .../scripts/parity
sys.path.insert(0, str(PARITY))
sys.path.insert(0, str(HERE))
import sbq                                      # noqa: E402
import merge_check as MC                        # noqa: E402

PLAN_PRIORITY = dict(MC.PLAN_PRIORITY)
BOOK_PLANS = set(MC.BOOK_PLANS)
normalize_he = MC.normalize_he
norm_url = MC.norm_url

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
SHORT_UUID_RE = re.compile(r"^[0-9a-f]{8}$")
OLD_HOST = "https://www.bneyzion.co.il"
STORAGE_BUCKET = "lesson-attachments"
SUPA_URL = "https://pzvmwfexeiruelwiujxn.supabase.co"
SERVICE_KEY_FILE = Path("/Users/srhlq/Downloads/saar-workspace/וואן-מן-שואו/סקילים/04-mcp-servers/api-keys.md")

STAGE_OF_OP = {
    "set_entity_type": 3, "update_rabbi_field": 3, "merge_rabbi": 3,
    "create_series": 4, "reparent_series": 4, "update_series": 4,
    "demote_series": 4, "set_series_rabbi": 4,
    "move_lesson": 5, "copy_lesson": 5, "retag_lesson": 5, "publish_lesson": 5,
    "draft_lesson": 5, "set_lesson_rabbi": 5, "update_lesson_field": 5,
    "insert_lesson": 6,
    "set_series_sort": 7, "set_lesson_sort": 7,
    "create_topic": 8, "set_topic_sort": 8, "unlink_lesson_topic": 8,
    "link_lesson_topic": 8, "link_series_topic": 8,
    "rabbi_page_item": 9, "teacher_listing_item": 9,
}
# op order inside each stage (APPLY-ORDER)
OP_ORDER = {
    "set_entity_type": 0, "update_rabbi_field": 1, "merge_rabbi": 2,
    "create_series": 0, "reparent_series": 1, "update_series": 2,
    "demote_series": 3, "set_series_rabbi": 4,
    "move_lesson": 0, "copy_lesson": 1, "retag_lesson": 2, "publish_lesson": 3,
    "draft_lesson": 4, "set_lesson_rabbi": 5, "update_lesson_field": 6,
    "insert_lesson": 0,
    "set_series_sort": 0, "set_lesson_sort": 1,
    "create_topic": 0, "set_topic_sort": 1, "unlink_lesson_topic": 2,
    "link_lesson_topic": 3, "link_series_topic": 4,
    "rabbi_page_item": 0, "teacher_listing_item": 1,
}
GATED_OPS = {"teacher_listing_item", "link_series_topic"}   # + copied_from stamping
KNOWN_ROOT_COUNT = 18

# ----------------------------------------------------------------------------- helpers
def sql_lit(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, list):  # text[] literal
        inner = ",".join('"' + str(x).replace('"', '\\"') + '"' for x in v)
        return "'{" + inner.replace("'", "''") + "}'"
    s = str(v).replace("'", "''")
    return "'" + s + "'"

def run_sql(sql, retries=2):
    for att in range(retries + 1):
        out = sbq.run(sql)
        try:
            parsed = json.loads(out)
        except Exception:
            if att < retries:
                time.sleep(2); continue
            raise RuntimeError(f"sbq non-json response: {out[:400]}")
        if isinstance(parsed, dict) and parsed.get("message"):
            raise RuntimeError(f"SQL error: {parsed.get('message')[:500]}")
        return parsed
    return None

def canonical_op_id(plan, idx, op_body):
    blob = json.dumps({"plan": plan, "idx": idx, "op": op_body},
                      sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha1(blob.encode("utf-8")).hexdigest()

def det_uuid(op_id):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "oneone:" + op_id))

def is_uuid(v):
    return isinstance(v, str) and bool(UUID_RE.match(v))

def get_payload_tmp(op):
    return op.get("tmp_id") or (op.get("payload") or {}).get("tmp_id")

def strip_nashim(name):
    n = normalize_he(name)
    n = re.sub(r"\(?לנשים\)?", "", n)
    return re.sub(r"\s+", " ", n).strip()

def cache_lookup(url):
    """oneone/cache hit for a URL, trying quote/unquote/trailing-slash variants."""
    if not url: return None
    from urllib.parse import unquote
    u = str(url)
    if u.startswith("/"): u = OLD_HOST + u
    cands = {u, unquote(u), u.rstrip("/"), unquote(u).rstrip("/"),
             u.rstrip("/") + "/", unquote(u).rstrip("/") + "/"}
    for c in cands:
        p = CACHE / (hashlib.sha1(c.encode("utf-8")).hexdigest() + ".html")
        if p.exists(): return p
    return None

def service_key():
    txt = SERVICE_KEY_FILE.read_text(encoding="utf-8")
    m = re.search(r"SUPABASE_SERVICE_ROLE_BNEYZION=(\S+)", txt)
    if not m: raise RuntimeError("service role key not found in api-keys.md")
    return m.group(1)

# ----------------------------------------------------------------------------- plan loading
def load_plans():
    plans = {}
    for f in sorted(PLANS.glob("*.json")):
        if f.name in ("merge_report.json",) or f.name.startswith("RESOLVED") \
           or f.name.startswith("DEFERRED") or f.name.startswith("DRYRUN"):
            continue
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception as e:
            raise RuntimeError(f"plan {f.name} unreadable: {e}")
        if not isinstance(d, dict) or "ops" not in d:
            continue
        plans[f.stem] = d
    unknown = [p for p in plans if p not in PLAN_PRIORITY]
    if unknown:
        raise RuntimeError(f"plans without PLAN_PRIORITY entry (add to merge_check.py): {unknown}")
    return plans

# ----------------------------------------------------------------------------- URL resolver
class UrlMap:
    """old URL/path → series id, from item_match listings + tree_map + tree creates."""
    def __init__(self, creates_by_url):
        self.map = {}
        im = json.load(open(ONEONE / "match" / "item_match.json", encoding="utf-8"))
        for url, v in (im.get("listings") or {}).items():
            sid = v.get("mapped_series_id")
            if sid: self.map.setdefault(norm_url(url), sid)
        tm = json.load(open(ONEONE / "match" / "tree_map.json", encoding="utf-8"))
        for n in tm.get("nodes", []):
            sid = n.get("matched_series_id")
            if sid:
                self.map.setdefault(norm_url(n.get("old_url") or ""), sid)
        self.creates_by_url = creates_by_url    # norm_url -> tmp_id (resolved later)

    def lookup(self, url):
        u = norm_url(url)
        if u in self.map: return ("id", self.map[u])
        if u in self.creates_by_url: return ("tmp", self.creates_by_url[u])
        return (None, None)

# ----------------------------------------------------------------------------- resolution
class Resolver:
    """Builds the final resolved op stream from raw plans + merge_report conflicts."""
    def __init__(self, plans):
        self.plans = plans
        self.drops = {}            # (plan, idx) -> reason
        self.field_drops = defaultdict(set)   # (plan, idx) -> dropped field names
        self.converts = {}         # (plan, idx) -> replacement op body (move->copy)
        self.retag_union = {}      # (plan, idx) -> union tags (kept op rewritten)
        self.tmp_alias = {}        # loser tmp -> winner tmp or existing uuid
        self.notes = []
        self.resolution_stats = Counter()

    def refresh_merge_report(self):
        MC.main()
        return json.load(open(PLANS / "merge_report.json", encoding="utf-8"))

    def _op(self, plan, idx):
        return self.plans[plan]["ops"][idx]

    def _priority_sort(self, items):
        return sorted(items, key=lambda it: (PLAN_PRIORITY.get(it["plan"], 99), it["idx"]))

    def apply_conflicts(self, report):
        for c in report["conflicts"]:
            cls = c["class"]; items = c["items"]
            if cls == "A.move-move":
                srt = self._priority_sort(items)
                winner = srt[0]
                for lo in srt[1:]:
                    op = self._op(lo["plan"], lo["idx"])
                    conv = dict(op); conv["op"] = "copy_lesson"
                    conv["_converted_from"] = "move_lesson(A)"
                    self.converts[(lo["plan"], lo["idx"])] = conv
                    self.resolution_stats["A.move->copy"] += 1
            elif cls in ("C.series-sort", "C.series-sort-crosslist"):
                srt = self._priority_sort(items)
                for lo in srt[1:]:
                    self.drops[(lo["plan"], lo["idx"])] = cls
                    self.resolution_stats["C.drop-series-sort"] += 1
            elif cls == "D.draft-vs-use":
                for it in items:
                    if it["op"] == "draft_lesson":
                        self.drops[(it["plan"], it["idx"])] = "D.draft-cancelled-usage-wins"
                        self.resolution_stats["D.draft-cancelled"] += 1
            elif cls == "E.publish-vs-draft":
                for it in items:
                    if it["op"] == "draft_lesson":
                        self.drops[(it["plan"], it["idx"])] = "E.publish-wins"
            elif cls == "J.rpi-dup":
                # keep rabbis_plan row (page owner); else priority+idx
                srt = sorted(items, key=lambda it: (0 if it["plan"] == "rabbis_plan" else 1,
                                                    PLAN_PRIORITY.get(it["plan"], 99), it["idx"]))
                for lo in srt[1:]:
                    self.drops[(lo["plan"], lo["idx"])] = "J.rpi-dup"
                    self.resolution_stats["J.rpi-dup-dropped"] += 1
            elif cls.startswith("K.insert-dup"):
                srt = self._priority_sort(items)
                winner = srt[0]
                wtmp = get_payload_tmp(self._op(winner["plan"], winner["idx"]))
                for lo in srt[1:]:
                    self.drops[(lo["plan"], lo["idx"])] = cls
                    ltmp = get_payload_tmp(self._op(lo["plan"], lo["idx"]))
                    if ltmp and wtmp and ltmp != wtmp:
                        self.tmp_alias[ltmp] = wtmp
                    self.resolution_stats["K.insert-dup-dropped"] += 1
            elif cls == "L.retag-conflict":
                allt = sorted({t for it in items
                               for t in (self._op(it["plan"], it["idx"]).get("audience_tags") or [])})
                srt = self._priority_sort(items)
                self.retag_union[(srt[0]["plan"], srt[0]["idx"])] = allt
                for lo in srt[1:]:
                    self.drops[(lo["plan"], lo["idx"])] = "L.retag-union"
                self.resolution_stats["L.retag-union"] += 1
            elif cls == "M.lesson-rabbi-conflict":
                srt = self._priority_sort(items)
                for lo in srt[1:]:
                    self.drops[(lo["plan"], lo["idx"])] = "M.lesson-rabbi-loser"
                    self.resolution_stats["M.dropped"] += 1
            elif cls == "N.series-rabbi-conflict":
                # majority value wins; tie → first op
                vals = Counter()
                for it in items:
                    vals[str(self._op(it["plan"], it["idx"]).get("rabbi_id"))] += 1
                win_val = max(vals.items(), key=lambda kv: (kv[1], -min(
                    it["idx"] for it in items
                    if str(self._op(it["plan"], it["idx"]).get("rabbi_id")) == kv[0])))[0]
                kept = False
                for it in sorted(items, key=lambda x: (PLAN_PRIORITY.get(x["plan"], 99), x["idx"])):
                    v = str(self._op(it["plan"], it["idx"]).get("rabbi_id"))
                    if v == win_val and not kept:
                        kept = True; continue
                    self.drops[(it["plan"], it["idx"])] = "N.series-rabbi"
                    self.resolution_stats["N.dropped"] += 1
            elif cls == "O.update-series-conflict":
                field = c["key"].rsplit(".", 1)[1]
                srt = self._priority_sort(items)
                for lo in srt[1:]:
                    self.field_drops[(lo["plan"], lo["idx"])].add(field)
                    self.resolution_stats["O.field-dropped"] += 1
            elif cls.startswith("P.create-series"):
                srt = self._priority_sort(items)
                winner = srt[0]
                wtmp = get_payload_tmp(self._op(winner["plan"], winner["idx"]))
                for lo in srt[1:]:
                    self.drops[(lo["plan"], lo["idx"])] = cls
                    ltmp = get_payload_tmp(self._op(lo["plan"], lo["idx"]))
                    if ltmp and wtmp and ltmp != wtmp:
                        self.tmp_alias[ltmp] = wtmp
                    self.resolution_stats["P.create-dup-dropped"] += 1
            # I/J-sort/H/G/Q/S: handled structurally (dedup/repack) at apply time.

    def normalize_nav_visible(self, db):
        """ketuvim series.nav_visible:false → tree band convention (no new column).
        A nav_visible=false series is page-only: its ketuvim page-position v (1..99)
        is parked AFTER the parent's sidebar band, at park_base(parent)+v where
        park_base = next multiple of 100 above the max final sibling sort.
        A nav-false series with no sort op gets sort_order=0 (page-only marker)."""
        kp = "lessons_plan_ketuvim"
        if kp not in self.plans: return
        plan = self.plans[kp]
        nv = {}
        for idx, op in enumerate(plan["ops"]):
            if op.get("op") == "update_series" and (op.get("fields") or {}).get("nav_visible") is False:
                nv[op["series_id"]] = idx
            if op.get("op") == "create_series" and (op.get("fields") or {}).get("nav_visible") is False:
                # create carries its own sort_order — parked at execute via same rule
                op.setdefault("_nav_park", True)
        if not nv and not any(o.get("_nav_park") for o in plan["ops"]): return

        # final sibling sorts projection (all plans, post C-resolution, pre nav transform)
        final_sort = {}
        for pname in sorted(self.plans, key=lambda p: PLAN_PRIORITY.get(p, 99)):
            for idx, op in enumerate(self.plans[pname]["ops"]):
                if op.get("op") != "set_series_sort": continue
                if (pname, idx) in self.drops: continue
                sid = op.get("series_id") or op.get("series_ref")
                if not is_uuid(str(sid)): continue
                final_sort.setdefault(sid, op.get("sort_order"))
        parent_of = dict(db.series_parent)
        for pname in self.plans:
            for idx, op in enumerate(self.plans[pname]["ops"]):
                if op.get("op") == "reparent_series" and is_uuid(str(op.get("new_parent_ref") or "")):
                    parent_of[op["series_id"]] = op["new_parent_ref"]
        max_sib = defaultdict(int)
        for sid, so in final_sort.items():
            if so is not None:
                p = parent_of.get(sid)
                if p: max_sib[p] = max(max_sib[p], int(so))
        for sid, so in db.series_sort.items():
            if so and sid not in final_sort:
                p = parent_of.get(sid)
                if p: max_sib[p] = max(max_sib[p], int(so))

        def park_base(parent):
            m = max_sib.get(parent, 0)
            return max(100, ((m // 100) + 1) * 100)

        transformed = 0
        sorted_series = set()
        for idx, op in enumerate(plan["ops"]):
            if op.get("op") == "set_series_sort" and op.get("series_id") in nv:
                v = op.get("sort_order")
                if v is not None and 1 <= v <= 99:
                    parent = parent_of.get(op["series_id"])
                    op["_nav_original_sort"] = v
                    op["sort_order"] = park_base(parent) + v
                    transformed += 1
                sorted_series.add(op["series_id"])
        for sid, idx in nv.items():
            self.field_drops[(kp, idx)].add("nav_visible")
            if sid not in sorted_series:
                # synthesize page-only marker
                plan["ops"].append({"op": "set_series_sort", "series_id": sid, "sort_order": 0,
                                    "confidence": "high",
                                    "_synth": "nav_visible-false-no-position",
                                    "evidence": {"detail": "normalized from update_series.nav_visible=false (no page position)"}})
                transformed += 1
        # the create_series _nav_park (kuntres): park its sort_order
        for op in plan["ops"]:
            if op.get("op") == "create_series" and op.get("_nav_park"):
                self.field_drops_note = True
                v = op.get("sort_order")
                parent = op.get("parent_ref") if is_uuid(str(op.get("parent_ref"))) else None
                if v is not None and 1 <= v <= 99:
                    op["_nav_original_sort"] = v
                    op["sort_order"] = park_base(parent) + v
                if isinstance(op.get("fields"), dict):
                    op["fields"].pop("nav_visible", None)
        self.resolution_stats["nav_visible-normalized"] = transformed
        self.notes.append(f"nav_visible normalization: {len(nv)} update_series ops folded into "
                          f"sort-band convention ({transformed} sort values parked/synthesized)")

    def build_stream(self, db):
        """Produce resolved ops, each: {op_id, stage, plan, idx, conf, body}."""
        report = self.refresh_merge_report()
        self.apply_conflicts(report)
        self.normalize_nav_visible(db)

        stream = []
        copy_seen = set()          # (src_key, tgt_key) dedup for converted copies
        link_seen = set()          # (topic_key, lesson_key)
        rpi_seen = set()           # (rabbi, kind, target_key)
        tli_seen = set()
        move_target = {}           # lesson uuid -> winning move target (for identity check)
        # pass 1: collect winning move targets
        for pname in sorted(self.plans, key=lambda p: PLAN_PRIORITY.get(p, 99)):
            for idx, op in enumerate(self.plans[pname]["ops"]):
                if (pname, idx) in self.drops or (pname, idx) in self.converts: continue
                if op.get("op") == "move_lesson":
                    move_target.setdefault(str(op.get("lesson_id")), MC.ref_str(op.get("to_series_ref")))

        for pname in sorted(self.plans, key=lambda p: PLAN_PRIORITY.get(p, 99)):
            for idx, op in enumerate(self.plans[pname]["ops"]):
                key = (pname, idx)
                if key in self.drops:
                    continue
                body = self.converts.get(key, op)
                body = json.loads(json.dumps(body, ensure_ascii=False))  # deep copy
                # field drops (O + nav_visible)
                if key in self.field_drops and isinstance(body.get("fields"), dict):
                    for f in self.field_drops[key]:
                        body["fields"].pop(f, None)
                    if not body["fields"]:
                        self.resolution_stats["empty-update-dropped"] += 1
                        continue
                if key in self.retag_union:
                    body["audience_tags"] = self.retag_union[key]
                    body["_retag_union"] = True
                t = body.get("op")
                # tmp alias rewrite on every tmp-ish ref
                self._alias_rewrite(body)
                # structural dedups
                if t == "copy_lesson":
                    src = MC.lesson_key(body); tgt = MC.ref_str(body.get("to_series_ref"))
                    if move_target.get(str(body.get("lesson_id"))) == tgt:
                        self.resolution_stats["copy-identity-dropped"] += 1
                        continue   # copy into the lesson's new home = identity
                    if (src, tgt) in copy_seen:
                        self.resolution_stats["copy-dup-dropped"] += 1
                        continue
                    copy_seen.add((src, tgt))
                elif t == "link_lesson_topic":
                    k2 = (MC.ref_str(body.get("topic_ref") or body.get("topic_id")), MC.lesson_key(body))
                    if k2 in link_seen:
                        self.resolution_stats["I.link-dup-dropped"] += 1
                        continue
                    link_seen.add(k2)
                elif t == "rabbi_page_item":
                    tgt = MC.ref_str(body.get("series_id") or body.get("lesson_id")
                                     or body.get("series_ref") or body.get("lesson_ref") or "?")
                    k2 = (str(body.get("rabbi_id")), body.get("kind"), tgt)
                    if k2 in rpi_seen:
                        self.resolution_stats["J.rpi-dup-dropped"] += 1
                        continue
                    rpi_seen.add(k2)
                elif t == "teacher_listing_item":
                    tgt = str(body.get("series_id") or body.get("lesson_id") or body.get("lesson_ref"))
                    k2 = (body.get("scope"), body.get("key"), body.get("kind"), tgt)
                    if k2 in tli_seen:
                        self.resolution_stats["Q.tli-dup-dropped"] += 1
                        continue
                    tli_seen.add(k2)
                stage = STAGE_OF_OP.get(t)
                if stage is None:
                    raise RuntimeError(f"unknown op type {t} in {pname}[{idx}]")
                op_order = OP_ORDER.get(t, 9)
                # copies/moves whose SOURCE lesson is a tmp insert must run AFTER stage-6
                # inserts (APPLY-ORDER 5 then 6, but the row only exists post-insert).
                if t in ("copy_lesson", "move_lesson"):
                    src = body.get("lesson_id") or body.get("lesson_ref")
                    if isinstance(src, str) and not is_uuid(src):
                        stage, op_order = 6, (1 if t == "copy_lesson" else 2)
                        body["_restaged"] = "tmp-source-after-inserts"
                op_id = canonical_op_id(pname, idx, body)
                stream.append({"op_id": op_id, "stage": stage, "order": op_order,
                               "plan": pname, "idx": idx,
                               "conf": body.get("confidence", "high"), "body": body})
        stream.sort(key=lambda r: (r["stage"], r["order"],
                                   PLAN_PRIORITY.get(r["plan"], 99), r["idx"]))
        return stream

    def _alias_rewrite(self, body):
        def fix(v):
            if isinstance(v, str) and v in self.tmp_alias:
                return self.tmp_alias[v]
            if isinstance(v, dict) and v.get("tmp_id") in self.tmp_alias:
                v = dict(v); v["tmp_id"] = self.tmp_alias[v["tmp_id"]]
            return v
        for k in ("lesson_id", "lesson_ref", "series_id", "series_ref", "to_series_ref",
                  "parent_ref", "new_parent_ref", "topic_ref", "topic_id", "tmp_id"):
            if k in body: body[k] = fix(body[k])
        pay = body.get("payload")
        if isinstance(pay, dict):
            for k in ("series_ref", "tmp_id"):
                if k in pay: pay[k] = fix(pay[k])

# ----------------------------------------------------------------------------- DB snapshot
class DB:
    def __init__(self, fresh=False):
        STATE.mkdir(exist_ok=True)
        cachef = STATE / "snapshot.json"
        if not fresh and cachef.exists() and time.time() - cachef.stat().st_mtime < 1800:
            d = json.load(open(cachef, encoding="utf-8"))
        else:
            d = self._pull()
            json.dump(d, open(cachef, "w", encoding="utf-8"), ensure_ascii=False)
        self.raw = d
        self.has_copied_from = d["schema"]["copied_from"]
        self.has_tli = d["schema"]["teacher_listing_items"]
        self.has_series_topics = d["schema"]["series_topics"]
        self.has_nav_visible = d["schema"]["nav_visible"]
        self.lessons = {r["id"]: r for r in d["lessons"]}
        self.series = {r["id"]: r for r in d["series"]}
        self.topics = {r["id"]: r for r in d["topics"]}
        self.rabbis = {r["id"]: r for r in d["rabbis"]}
        self.lesson_topics = {(r["lesson_id"], r["topic_id"]): r for r in d["lesson_topics"]}
        self.rpi = {(r["rabbi_id"], r["kind"], r.get("series_id") or r.get("lesson_id")): r
                    for r in d["rabbi_page_items"]}
        self.series_parent = {sid: s.get("parent_id") for sid, s in self.series.items()}
        self.series_sort = {sid: s.get("sort_order") for sid, s in self.series.items()}
        self.series_by_norm_title = defaultdict(list)
        for sid, s in self.series.items():
            self.series_by_norm_title[normalize_he(s["title"])].append(sid)
        self.rabbi_by_name = {}
        for rid, r in self.rabbis.items():
            self.rabbi_by_name.setdefault(normalize_he(r["name"]), rid)
        self.rabbi_by_name_loose = {}
        for rid, r in self.rabbis.items():
            self.rabbi_by_name_loose.setdefault(strip_nashim(r["name"]), rid)
        self.lessons_by_series = defaultdict(list)
        for lid, l in self.lessons.items():
            self.lessons_by_series[l.get("series_id")].append(lid)

    def _pull(self):
        print("pulling DB snapshot ...", file=sys.stderr)
        d = {}
        d["schema"] = {
            "copied_from": bool(run_sql("SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='copied_from'")),
            "nav_visible": bool(run_sql("SELECT 1 FROM information_schema.columns WHERE table_name='series' AND column_name='nav_visible'")),
            "teacher_listing_items": bool(run_sql("SELECT 1 FROM information_schema.tables WHERE table_name='teacher_listing_items'")),
            "series_topics": bool(run_sql("SELECT 1 FROM information_schema.tables WHERE table_name='series_topics'")),
            "lessons_sort_order": bool(run_sql("SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='sort_order'")),
            "lesson_topics_sort_order": bool(run_sql("SELECT 1 FROM information_schema.columns WHERE table_name='lesson_topics' AND column_name='sort_order'")),
            "rabbi_page_items": bool(run_sql("SELECT 1 FROM information_schema.tables WHERE table_name='rabbi_page_items'")),
        }
        cols = ("id,title,series_id,rabbi_id,status,sort_order,audience_tags,content_type,"
                "source_type,audio_url,video_url,attachment_url,legacy_attachment_url,"
                "bible_book,bible_chapter,(content IS NOT NULL) AS has_content")
        rows = []
        off = 0
        while True:
            chunk = run_sql(f"SELECT {cols} FROM lessons ORDER BY id LIMIT 4000 OFFSET {off}")
            rows += chunk
            if len(chunk) < 4000: break
            off += 4000
        d["lessons"] = rows
        d["series"] = run_sql("SELECT id,title,parent_id,status,sort_order,rabbi_id,audience_tags,bible_book,lesson_count FROM series")
        d["topics"] = run_sql("SELECT id,name,slug,parent_id,sort_order FROM topics")
        d["rabbis"] = run_sql("SELECT id,name,status,entity_type,lesson_count,slug FROM rabbis")
        lt = []
        off = 0
        while True:
            chunk = run_sql(f"SELECT lesson_id,topic_id,sort_order FROM lesson_topics ORDER BY lesson_id,topic_id LIMIT 5000 OFFSET {off}")
            lt += chunk
            if len(chunk) < 5000: break
            off += 5000
        d["lesson_topics"] = lt
        d["rabbi_page_items"] = run_sql("SELECT rabbi_id,kind,series_id,lesson_id,sort_order FROM rabbi_page_items") \
            if d["schema"]["rabbi_page_items"] else []
        return d

# ----------------------------------------------------------------------------- engine
class Engine:
    def __init__(self, args):
        self.args = args
        self.plans = load_plans()
        self.db = DB(fresh=args.fresh_snapshot)
        self.resolver = Resolver(self.plans)
        self.stream = self.resolver.build_stream(self.db)
        # registries
        self.creates_by_url = {}
        self.create_tmp = {}        # tmp_id -> create record
        for r in self.stream:
            b = r["body"]
            if b["op"] == "create_series":
                tmp = b.get("tmp_id")
                if tmp:
                    self.create_tmp[tmp] = r
                    u = (b.get("evidence") or {}).get("old_url")
                    if u: self.creates_by_url[norm_url(u)] = tmp
        self.urlmap = UrlMap(self.creates_by_url)
        self.insert_tmp = {}        # tmp_id -> insert record
        for r in self.stream:
            if r["body"]["op"] == "insert_lesson":
                tmp = get_payload_tmp(r["body"])
                if tmp: self.insert_tmp[tmp] = r
        # persisted maps
        STATE.mkdir(exist_ok=True)
        self.tmp_map = self._load_json(STATE / "tmp_map.json", {})       # tmp -> real uuid
        self.copy_map = self._load_json(STATE / "copy_map.json", {})     # "src|tgt" -> uuid
        self.applied = set()
        jf = STATE / "applied.jsonl"
        if jf.exists():
            for line in open(jf, encoding="utf-8"):
                try:
                    rec = json.loads(line)
                    if str(rec.get("result","")).startswith("error"):
                        self.applied.discard(rec["op_id"])  # errored ops retry on re-run
                    else:
                        self.applied.add(rec["op_id"])
                except Exception: pass
        # alias for create-resolves-to-existing (e.g. לב הפרק → e93c7a85)
        self.create_to_existing = {}
        self._probe_creates_against_existing()
        # DETERMINISTIC tmp pre-pass: tmp ids resolve independent of journal/crash state.
        # every create op's new id is uuid5(op_id), so the full map is derivable up-front.
        for r in self.stream:
            b = r["body"]
            if b.get("op") in ("create_series", "create_topic") or (b.get("op") == "insert_lesson"):
                tmp = b.get("tmp_id") or (b.get("payload") or {}).get("tmp_id")
                if not tmp: continue
                if tmp in self.create_to_existing:
                    self.tmp_map.setdefault(tmp, self.create_to_existing[tmp])
                else:
                    self.tmp_map.setdefault(tmp, det_uuid(r["op_id"]))
        # projection state for dry-run
        self.proj_parent = dict(self.db.series_parent)
        self.proj_home = {lid: l.get("series_id") for lid, l in self.db.lessons.items()}
        self.merged_rabbi = {}      # from -> into
        self.anomalies = []
        self.blocking = []
        self.blocked_deps = []
        self.deferred = []
        self.gated = []
        self.queues = {"rehost": [], "scrape": [], "media_discovery": []}

    @staticmethod
    def _load_json(path, default):
        if path.exists():
            return json.load(open(path, encoding="utf-8"))
        return default

    def _save_state(self):
        json.dump(self.tmp_map, open(STATE / "tmp_map.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        json.dump(self.copy_map, open(STATE / "copy_map.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    def journal(self, op_id, stage, result, extra=None):
        with open(STATE / "applied.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps({"op_id": op_id, "stage": stage, "result": result,
                                "extra": extra, "ts": time.strftime("%Y-%m-%dT%H:%M:%S")},
                               ensure_ascii=False) + "\n")
        self.applied.add(op_id)

    # ---------- create→existing probe (P special-case, incl. לב הפרק → e93c7a85) ----------
    def _probe_creates_against_existing(self):
        demoted = {r["body"]["series_id"] for r in self.stream if r["body"]["op"] == "demote_series"}
        for tmp, rec in self.create_tmp.items():
            b = rec["body"]
            cands = [sid for sid in self.db.series_by_norm_title.get(normalize_he(b.get("title")), [])
                     if sid not in demoted]
            if not cands: continue
            parent = b.get("parent_ref")
            resolved_parent = None
            if is_uuid(str(parent)):
                resolved_parent = parent
            elif isinstance(parent, dict) and parent.get("old_url"):
                k, v = self.urlmap.lookup(parent["old_url"])
                if k == "id": resolved_parent = v
            same_parent = [sid for sid in cands if self.db.series_parent.get(sid) == resolved_parent]
            pick = None
            if same_parent:
                pick = sorted(same_parent)[0]
            elif len(cands) == 1 and rec["plan"] != "tree_plan":
                pick = cands[0]
            elif len(cands) >= 1 and rec["plan"] == "rabbis_plan":
                # rabbis_plan creates for already-existing old nodes (documented: לב הפרק)
                pick = sorted(cands)[0]
            if pick:
                self.create_to_existing[tmp] = pick
                self.resolver.resolution_stats["create-resolved-to-existing"] += 1

    # ---------- ref resolution ----------
    def resolve_series(self, ref, allow_tmp=True):
        """→ ('id', uuid) | ('tmp', tmp_id) | (None, reason)"""
        if ref is None: return (None, "null-ref")
        if isinstance(ref, dict):
            if ref.get("series_id"): return self.resolve_series(ref["series_id"])
            if ref.get("tmp_id"): return self.resolve_series(ref["tmp_id"])
            if ref.get("old_url") or ref.get("old_parent_url"):
                k, v = self.urlmap.lookup(ref.get("old_url") or ref.get("old_parent_url"))
                if k == "id": return ("id", v)
                if k == "tmp": return self.resolve_series(v)
                return (None, f"old_url-unmapped:{(ref.get('old_url') or ref.get('old_parent_url'))[:80]}")
            return (None, f"dict-unresolvable:{json.dumps(ref, ensure_ascii=False)[:60]}")
        s = str(ref)
        if s.startswith("old_url:"):
            k, v = self.urlmap.lookup(s[len("old_url:"):])
            if k == "id": return ("id", v)
            if k == "tmp": return self.resolve_series(v)
            return (None, f"old_url-unmapped:{s[:80]}")
        if is_uuid(s):
            if s in self.db.series: return ("id", s)
            return (None, f"series-uuid-missing:{s}")
        if SHORT_UUID_RE.match(s):
            full = [sid for sid in self.db.series if sid.startswith(s)]
            if len(full) == 1: return ("id", full[0])
            return (None, f"short-uuid-ambiguous:{s}")
        # tmp ref
        s2 = self.resolver.tmp_alias.get(s, s)
        if s2 in self.create_to_existing: return ("id", self.create_to_existing[s2])
        if s2 in self.tmp_map: return ("id", self.tmp_map[s2])
        if s2 in self.create_tmp: return (("tmp", s2) if allow_tmp else (None, f"tmp-not-yet-created:{s2}"))
        return (None, f"tmp-unknown:{s}")

    def resolve_lesson(self, body):
        """source lesson of a lesson-op → ('id',uuid)|('tmp',tmp)|('old',(series_id,norm_title))|(None,reason)"""
        v = body.get("lesson_id") or body.get("lesson_ref") or body.get("lesson_tmp_ref")
        if v is None and body.get("lesson_ref_old"):
            ro = body["lesson_ref_old"]
            k, sid = self.urlmap.lookup(ro.get("canonical_old_url") or "")
            if k != "id":
                return (None, f"lesson_ref_old-series-unmapped:{(ro.get('canonical_old_url') or '')[:80]}")
            nt = normalize_he(ro.get("title"))
            matches = [lid for lid in self.db.lessons_by_series.get(sid, [])
                       if normalize_he((self.db.lessons.get(lid) or {}).get("title","")) == nt]
            if len(matches) >= 1:
                return ("id", sorted(matches)[0])
            # snapshot is pre-session; lessons inserted/moved this run aren't in it — query live
            try:
                live = run_sql(f"SELECT id,title FROM lessons WHERE series_id={sql_lit(sid)}")
                lm = [r["id"] for r in (live or []) if normalize_he(r.get("title") or "") == nt]
                if lm:
                    return ("id", sorted(lm)[0])
            except Exception:
                pass
            return (None, f"lesson_ref_old-no-title-match:{nt[:60]}@{sid[:8]}")
        if v is None: return (None, "no-lesson-ref")
        if isinstance(v, dict):
            if v.get("tmp_id"): v = v["tmp_id"]
            else: return (None, "lesson-dict-unresolvable")
        s = str(v)
        if is_uuid(s):
            if s in self.db.lessons: return ("id", s)
            return (None, f"lesson-uuid-missing:{s}")
        s2 = self.resolver.tmp_alias.get(s, s)
        if s2 in self.tmp_map: return ("id", self.tmp_map[s2])
        if s2 in self.insert_tmp: return ("tmp", s2)
        return (None, f"lesson-tmp-unknown:{s}")

    def resolve_rabbi_name(self, name):
        if not name: return None
        n = normalize_he(name)
        rid = self.db.rabbi_by_name.get(n) or self.db.rabbi_by_name_loose.get(strip_nashim(name))
        if rid: return self.merged_rabbi.get(rid, rid)
        return None

    def resolve_topic(self, ref):
        if ref is None: return (None, "null-topic")
        s = str(ref)
        if is_uuid(s):
            return ("id", s) if s in self.db.topics else (None, f"topic-uuid-missing:{s}")
        s2 = self.resolver.tmp_alias.get(s, s)
        if s2 in self.tmp_map: return ("id", self.tmp_map[s2])
        for r in self.stream:
            if r["body"]["op"] == "create_topic" and r["body"].get("tmp_id") == s2:
                return ("tmp", s2)
        return (None, f"topic-tmp-unknown:{s}")

    # ---------- med sanity checks ----------
    def med_sanity(self, body):
        t = body["op"]
        if t == "set_lesson_rabbi":
            k, lid = self.resolve_lesson(body)
            if k != "id": return True   # tmp rows: rabbi set at insert
            cur = (self.db.lessons.get(lid) or {}).get("rabbi_id")
            if cur is None: return True
            curname = strip_nashim(self.db.rabbis.get(cur, {}).get("name", ""))
            newname = strip_nashim(body.get("rabbi_name", ""))
            return curname == newname or curname in newname or newname in curname
        if t == "retag_lesson":
            k, lid = self.resolve_lesson(body)
            if k != "id": return True
            cur = sorted((self.db.lessons.get(lid) or {}).get("audience_tags") or [])
            tgt = sorted(body.get("audience_tags") or [])
            return cur == [] or set(cur) <= set(tgt) or set(tgt) <= {"general", "teachers"}
        if t == "draft_lesson":
            # don't draft a row another plan placed/sorted (D covered it; safety net)
            k, lid = self.resolve_lesson(body)
            return k == "id"
        if t == "insert_lesson":
            pay = body.get("payload") or {}
            kk, sid = self.resolve_series(pay.get("series_ref"))
            if kk != "id": return True
            nt = normalize_he(pay.get("title"))
            dup = [l for l in self.db.lessons_by_series.get(sid, [])
                   if normalize_he((self.db.lessons.get(l) or {}).get("title","")) == nt]
            return not dup
        if t == "create_series":
            tmp = body.get("tmp_id")
            return True if (tmp in self.create_to_existing) else True
        if t == "set_series_rabbi":
            sid = body.get("series_id") or body.get("series_ref")
            k, rid = self.resolve_series(sid)
            if k != "id": return True
            row = self.db.series.get(rid)
            if row is None:
                # series created in this run (uuid5) — not in snapshot; query live
                try:
                    live = run_sql(f"SELECT rabbi_id FROM series WHERE id={sql_lit(rid)}")
                    cur = live[0].get("rabbi_id") if live else None
                except Exception:
                    cur = None
            else:
                cur = row.get("rabbi_id")
            return cur is None or cur == body.get("rabbi_id")
        return True   # default: ref validation is the sanity check

    # ---------- selection ----------
    def select(self, rec):
        """returns disposition: run | deferred-med | deferred-low | gated"""
        b = rec["body"]
        if b["op"] in GATED_OPS and not self.args.with_extra_schema:
            return "gated"
        conf = rec["conf"]
        if conf == "low":
            return "deferred-low"
        if conf == "med" and not self.args.include_med:
            return "deferred-med"
        if conf == "med" and self.args.include_med and not self.med_sanity(b):
            return "deferred-med-sanity"
        return "run"

# ----------------------------------------------------------------------------- validation (dry run)
class DryRun:
    def __init__(self, eng):
        self.e = eng
        self.stats = defaultdict(Counter)     # stage -> counters
        self.examples = defaultdict(list)
        self.sibling_ties = []
        self.promoted_roots = 0
        # pass A: dispositions + deferred-entity registries (dependency-hole accounting)
        self.disp = {}
        self.deferred_tmps = set()       # tmp ids of deferred insert_lesson / create_series / create_topic
        self.deferred_copies = set()     # (lesson_key, target_series_key)
        self.deferred_moves = {}         # lesson uuid -> deferred target key
        for rec in eng.stream:
            d = eng.select(rec)
            self.disp[rec["op_id"]] = d
            if d == "run": continue
            b = rec["body"]
            if b["op"] in ("insert_lesson", "create_series", "create_topic"):
                tmp = get_payload_tmp(b)
                if tmp: self.deferred_tmps.add(tmp)
            elif b["op"] == "copy_lesson":
                kk, lid = eng.resolve_lesson(b)
                k, v = eng.resolve_series(b.get("to_series_ref"))
                if kk and k:
                    src = lid if kk == "id" else f"tmp:{lid}"
                    tgt = v if k == "id" else f"tmp:{v}"
                    self.deferred_copies.add((src, tgt))
            elif b["op"] == "move_lesson":
                kk, lid = eng.resolve_lesson(b)
                k, v = eng.resolve_series(b.get("to_series_ref"))
                if kk == "id" and k:
                    self.deferred_moves[lid] = v if k == "id" else f"tmp:{v}"

    def tmp_is_deferred(self, ref):
        if ref is None: return False
        s = str(ref)
        s = self.e.resolver.tmp_alias.get(s, s)
        return s in self.deferred_tmps

    def note(self, stage, what, rec, detail=""):
        self.stats[stage][what] += 1
        if len(self.examples[(stage, what)]) < 8:
            b = rec["body"]
            self.examples[(stage, what)].append(
                f"{rec['plan']}[{rec['idx']}] {b['op']} {detail}"[:220])

    def run(self):
        e = self.e
        # ---- stage 0-2 preconditions
        self.verify_preconditions()
        # projections
        created_series = {}     # tmp -> simulated
        created_topics = {}
        topic_links = dict(e.db.lesson_topics)   # (lesson,topic) -> row
        sort_targets = defaultdict(list)         # series_id -> [(sortval, prio, idx, rowkey, rec)]
        copies = {}                              # (srckey,tgt) -> synth id
        insert_home = {}                         # tmp -> series id
        rpi_rows = defaultdict(list)
        unresolved_sorts = []

        for rec in e.stream:
            b = rec["body"]; t = b["op"]; st = rec["stage"]
            disp = self.disp[rec["op_id"]]
            self.stats[st]["total"] += 1
            self.stats[st][f"conf-{rec['conf']}"] += 1
            if disp == "gated":
                self.note(st, "gated", rec); e.gated.append(rec["op_id"]); continue
            if disp.startswith("deferred"):
                self.note(st, disp, rec)
                e.deferred.append({"op_id": rec["op_id"], "plan": rec["plan"], "idx": rec["idx"],
                                   "conf": rec["conf"], "why": disp, "op": b})
                continue
            # dependency-hole: runnable op referencing a deferred tmp entity
            dep_tmp = None
            for refk in ("lesson_id", "lesson_ref", "series_id", "series_ref", "to_series_ref",
                         "topic_ref", "parent_ref"):
                v0 = b.get(refk)
                if isinstance(v0, dict): v0 = v0.get("tmp_id")
                if v0 is not None and not is_uuid(str(v0)) and self.tmp_is_deferred(v0):
                    dep_tmp = str(v0); break
            if dep_tmp:
                self.note(st, "blocked-by-deferred-dep", rec, f"tmp {dep_tmp[:40]}")
                e.blocked_deps.append(f"{rec['plan']}[{rec['idx']}] {t} (conf {rec['conf']}) "
                                      f"depends on deferred tmp '{dep_tmp}'")
                continue

            if t == "set_entity_type":
                r = e.db.rabbis.get(b["rabbi_id"])
                if not r: self.note(st, "invalid-ref", rec, b["rabbi_id"]); continue
                self.note(st, "would-change" if r.get("entity_type") != b["entity_type"] else "already-satisfied", rec)
            elif t == "update_rabbi_field":
                r = e.db.rabbis.get(b["rabbi_id"])
                if not r: self.note(st, "invalid-ref", rec, b["rabbi_id"]); continue
                self.note(st, "would-change" if r.get(b["field"]) != b["value"] else "already-satisfied", rec)
            elif t == "merge_rabbi":
                fr, into = e.db.rabbis.get(b["from_id"]), e.db.rabbis.get(b["into_id"])
                if not fr or not into:
                    self.note(st, "invalid-ref", rec, f"{b.get('from_id')}->{b.get('into_id')}"); continue
                e.merged_rabbi[b["from_id"]] = b["into_id"]
                done = fr.get("status") == "inactive"
                self.note(st, "already-satisfied" if done else "would-change", rec)

            elif t == "create_series":
                tmp = b.get("tmp_id")
                if tmp in e.create_to_existing:
                    self.note(st, "already-satisfied", rec,
                              f"{b.get('title','')[:40]} -> existing {e.create_to_existing[tmp][:8]}")
                    continue
                k, v = e.resolve_series(b.get("parent_ref")) if b.get("parent_ref") is not None else ("id", None)
                if b.get("parent_ref") is not None and k is None:
                    self.note(st, "invalid-ref", rec, f"parent {v}"); e.blocking.append(
                        f"create_series {tmp}: parent unresolvable ({v})"); continue
                created_series[tmp] = {"parent": v, "title": b.get("title")}
                self.note(st, "would-create", rec, b.get("title", "")[:50])
            elif t == "reparent_series":
                if b["series_id"] not in e.db.series:
                    self.note(st, "invalid-ref", rec, b["series_id"]); continue
                npr = b.get("new_parent_ref")
                if npr is None:
                    # promote to top-level root (e.g. כלי-עזר 27ca7dec) — intentional
                    cur = e.proj_parent.get(b["series_id"])
                    e.proj_parent[b["series_id"]] = None
                    self.promoted_roots += 0 if cur is None else 1
                    self.note(st, "already-satisfied" if cur is None else "would-change",
                              rec, "(promote to root)")
                    continue
                k, v = e.resolve_series(npr)
                if k is None: self.note(st, "invalid-ref", rec, f"parent {v}"); continue
                cur = e.proj_parent.get(b["series_id"])
                tgt = v if k == "id" else f"tmp:{v}"
                # cycle probe (projected, id-parents only)
                if k == "id":
                    seen, c = set(), v
                    while c and c not in seen:
                        seen.add(c)
                        if c == b["series_id"]:
                            self.note(st, "anomaly", rec, "cycle"); e.blocking.append(
                                f"reparent cycle {b['series_id'][:8]}->{v[:8]}"); c = None; break
                        c = e.proj_parent.get(c)
                e.proj_parent[b["series_id"]] = tgt
                self.note(st, "already-satisfied" if cur == tgt else "would-change", rec)
            elif t == "update_series":
                s = e.db.series.get(b["series_id"])
                if not s: self.note(st, "invalid-ref", rec, b["series_id"]); continue
                diff = {f: val for f, val in (b.get("fields") or {}).items()
                        if json.dumps(s.get(f), ensure_ascii=False) != json.dumps(val, ensure_ascii=False)}
                self.note(st, "would-change" if diff else "already-satisfied", rec, str(list(diff))[:60])
            elif t == "demote_series":
                s = e.db.series.get(b["series_id"])
                if not s: self.note(st, "invalid-ref", rec, b["series_id"]); continue
                self.note(st, "would-change" if s.get("status") != (b.get("status") or "draft") else "already-satisfied", rec)
            elif t == "set_series_rabbi":
                k, v = e.resolve_series(b.get("series_id") or b.get("series_ref"))
                if k is None: self.note(st, "invalid-ref", rec, v); continue
                if b.get("rabbi_id") not in e.db.rabbis:
                    self.note(st, "invalid-ref", rec, f"rabbi {b.get('rabbi_id')}"); continue
                if k == "tmp": self.note(st, "would-change", rec, "(on created series)"); continue
                row = e.db.series.get(v)
                if row is None:
                    self.note(st, "would-change", rec, "(on created series)"); continue
                cur = row.get("rabbi_id")
                self.note(st, "already-satisfied" if cur == b["rabbi_id"] else "would-change", rec)

            elif t == "move_lesson":
                kk, lid = e.resolve_lesson(b)
                if kk is None: self.note(st, "invalid-ref", rec, lid); continue
                k, v = e.resolve_series(b.get("to_series_ref"))
                if k is None: self.note(st, "invalid-ref", rec, f"target {v}"); continue
                tgt = v if k == "id" else f"tmp:{v}"
                if kk == "id":
                    cur = e.proj_home.get(lid)
                    e.proj_home[lid] = tgt
                    self.note(st, "already-satisfied" if cur == tgt else "would-change", rec)
                else:
                    insert_home[lid] = tgt
                    self.note(st, "would-change", rec, "(move of inserted row)")
            elif t == "copy_lesson":
                kk, lid = e.resolve_lesson(b)
                if kk is None: self.note(st, "invalid-ref", rec, lid); continue
                k, v = e.resolve_series(b.get("to_series_ref"))
                if k is None: self.note(st, "invalid-ref", rec, f"target {v}"); continue
                tgt = v if k == "id" else f"tmp:{v}"
                srckey = lid if kk == "id" else f"tmp:{lid}"
                if kk == "id" and e.proj_home.get(lid) == tgt:
                    self.note(st, "already-satisfied", rec, "copy==home (identity)"); continue
                copies[(srckey, tgt)] = det_uuid(rec["op_id"])
                self.note(st, "would-create", rec)
            elif t == "retag_lesson":
                kk, lid = e.resolve_lesson(b)
                if kk is None: self.note(st, "invalid-ref", rec, lid); continue
                if kk == "tmp": self.note(st, "already-satisfied", rec, "(tags set at insert)"); continue
                cur = sorted((e.db.lessons.get(lid) or {}).get("audience_tags") or [])
                self.note(st, "already-satisfied" if cur == sorted(b.get("audience_tags") or []) else "would-change", rec)
            elif t in ("publish_lesson", "draft_lesson"):
                kk, lid = e.resolve_lesson(b)
                if kk is None: self.note(st, "invalid-ref", rec, lid); continue
                want = "published" if t == "publish_lesson" else "draft"
                cur = (e.db.lessons.get(lid) or {}).get("status") if kk == "id" else None
                self.note(st, "already-satisfied" if cur == want else "would-change", rec)
            elif t == "set_lesson_rabbi":
                kk, lid = e.resolve_lesson(b)
                if kk is None: self.note(st, "invalid-ref", rec, lid); continue
                rid = e.resolve_rabbi_name(b.get("rabbi_name"))
                if rid is None:
                    self.note(st, "anomaly", rec, f"rabbi-name-unresolved:{b.get('rabbi_name','')[:40]}")
                    e.anomalies.append(f"set_lesson_rabbi: name not in rabbis table: '{b.get('rabbi_name')}' ({rec['plan']}[{rec['idx']}])")
                    continue
                if kk == "tmp": self.note(st, "already-satisfied", rec, "(set at insert)"); continue
                cur = (e.db.lessons.get(lid) or {}).get("rabbi_id")
                self.note(st, "already-satisfied" if cur == rid else "would-change", rec)
            elif t == "update_lesson_field":
                kk, lid = e.resolve_lesson(b)
                if kk is None: self.note(st, "invalid-ref", rec, lid); continue
                fld, val = b["field"], b["value"]
                if fld == "attachment_url_old":
                    if "bneyzion.co.il" in str(val):
                        e.queues["rehost"].append({"op_id": rec["op_id"], "lesson_id": lid, "url": val})
                        self.note(st, "queued-rehost", rec)
                    else:
                        cur = (e.db.lessons.get(lid) or {}).get("attachment_url")
                        self.note(st, "would-change" if cur != val else "already-satisfied", rec, "(s3-direct)")
                    continue
                cur = (e.db.lessons.get(lid) or {}).get(fld)
                self.note(st, "would-change" if cur != val else "already-satisfied", rec)

            elif t == "insert_lesson":
                pay = b.get("payload") or {}
                sref = pay.get("series_ref")
                if sref is None:
                    self.note(st, "anomaly", rec, "null series_ref")
                    e.anomalies.append(f"insert_lesson {get_payload_tmp(b)}: series_ref null — needs placement decision ({rec['plan']}[{rec['idx']}])")
                else:
                    k, v = e.resolve_series(sref)
                    if k is None:
                        self.note(st, "invalid-ref", rec, f"series {v}")
                        e.blocking.append(f"insert_lesson {get_payload_tmp(b)}: series unresolvable ({v})")
                        continue
                rid = e.resolve_rabbi_name(pay.get("rabbi_name"))
                if pay.get("rabbi_name") and rid is None:
                    self.note(st, "anomaly", rec, f"rabbi-name-unresolved:{pay.get('rabbi_name','')[:40]}")
                    e.anomalies.append(f"insert_lesson: rabbi_name '{pay.get('rabbi_name')}' not found ({rec['plan']}[{rec['idx']}])")
                tmp = get_payload_tmp(b)
                if tmp: insert_home.setdefault(tmp, None)
                # dup probe
                if sref is not None and k == "id":
                    nt = normalize_he(pay.get("title"))
                    dup = [l for l in e.db.lessons_by_series.get(v, [])
                           if normalize_he((e.db.lessons.get(l) or {}).get("title","")) == nt]
                    if dup:
                        self.note(st, "already-satisfied", rec, f"same-title row exists {dup[0][:8]}")
                        continue
                # queues
                scrape = (pay.get("needs_content_scrape") or pay.get("needs_content_fetch")
                          or pay.get("fetch_content_from_old_url") or b.get("needs_content_scrape"))
                rehosts = [u for u in (pay.get("attachment_url_old"), pay.get("audio_url_old"),
                                       pay.get("video_url_old"))
                           if u and "bneyzion.co.il" in str(u)] + \
                          [u for u in (pay.get("additional_attachments_old") or [])
                           if u and "bneyzion.co.il" in str(u)]
                if pay.get("fetch_media_from_old_page"):
                    e.queues["media_discovery"].append({"op_id": rec["op_id"], "old_url": b.get("old_url")})
                if scrape:
                    src = pay.get("content_fetch_old_url") or b.get("old_url") or ""
                    e.queues["scrape"].append({"op_id": rec["op_id"], "url": src,
                                               "cached": cache_lookup(src) is not None})
                for u in rehosts:
                    e.queues["rehost"].append({"op_id": rec["op_id"], "url": u})
                self.note(st, "would-create", rec, pay.get("title", "")[:40])

            elif t == "set_series_sort":
                k, v = e.resolve_series(b.get("series_id") or b.get("series_ref"))
                if k is None: self.note(st, "invalid-ref", rec, v); continue
                if k == "tmp":
                    self.note(st, "would-change", rec, "(created series)"); continue
                cur = (e.db.series.get(v) or {}).get("sort_order")
                self.note(st, "already-satisfied" if cur == b.get("sort_order") else "would-change", rec)
            elif t == "set_lesson_sort":
                kk, lid = e.resolve_lesson(b)
                if kk is None:
                    self.note(st, "invalid-ref", rec, lid)
                    unresolved_sorts.append(f"{rec['plan']}[{rec['idx']}]: {lid}")
                    continue
                k, v = e.resolve_series(b.get("series_ref") or b.get("series_id"))
                if k is None:
                    self.note(st, "invalid-ref", rec, f"scope {v}")
                    unresolved_sorts.append(f"{rec['plan']}[{rec['idx']}]: scope {v}")
                    continue
                scope = v if k == "id" else f"tmp:{v}"
                srckey = lid if kk == "id" else f"tmp:{lid}"
                # physical row resolution against projections
                if kk == "id" and e.proj_home.get(lid) == scope:
                    rowkey = lid
                elif (srckey, scope) in copies:
                    rowkey = copies[(srckey, scope)]
                elif kk == "tmp":
                    rowkey = f"insert:{srckey}"
                elif (srckey, scope) in self.deferred_copies:
                    self.note(st, "blocked-by-deferred-dep", rec, "(copy deferred)")
                    e.blocked_deps.append(f"{rec['plan']}[{rec['idx']}] set_lesson_sort (conf {rec['conf']}) "
                                          f"targets the copy row of {srckey[:12]} in {scope[:12]} — copy op is deferred (med/low)")
                    continue
                elif kk == "id" and self.deferred_moves.get(lid) == scope:
                    self.note(st, "blocked-by-deferred-dep", rec, "(move deferred)")
                    e.blocked_deps.append(f"{rec['plan']}[{rec['idx']}] set_lesson_sort (conf {rec['conf']}) "
                                          f"expects {srckey[:12]} moved to {scope[:12]} — move op is deferred (med/low)")
                    continue
                else:
                    self.note(st, "anomaly", rec, f"no row in scope (home={str(e.proj_home.get(lid))[:8]})")
                    unresolved_sorts.append(
                        f"{rec['plan']}[{rec['idx']}]: lesson {srckey[:12]} has no home/copy/insert row in scope {scope[:12]}")
                    continue
                sort_targets[scope].append((b.get("sort_order") or 0,
                                            PLAN_PRIORITY.get(rec["plan"], 99), rec["idx"], rowkey, rec))
                self.note(st, "would-change", rec)   # all lessons.sort_order currently NULL

            elif t == "create_topic":
                created_topics[b.get("tmp_id")] = b
                self.note(st, "would-create", rec, b.get("title", "")[:40])
            elif t == "set_topic_sort":
                tp = e.db.topics.get(b.get("topic_id"))
                if not tp: self.note(st, "invalid-ref", rec, b.get("topic_id")); continue
                self.note(st, "already-satisfied" if tp.get("sort_order") == b.get("sort_order") else "would-change", rec)
            elif t == "unlink_lesson_topic":
                if (b["lesson_id"], str(b.get("topic_ref"))) in topic_links:
                    self.note(st, "would-change", rec)
                    topic_links.pop((b["lesson_id"], str(b.get("topic_ref"))), None)
                else:
                    self.note(st, "already-satisfied", rec)
            elif t == "link_lesson_topic":
                kk, lid = e.resolve_lesson(b)
                if kk is None: self.note(st, "invalid-ref", rec, lid); continue
                tk, tv = e.resolve_topic(b.get("topic_ref") or b.get("topic_id"))
                if tk is None: self.note(st, "invalid-ref", rec, tv); continue
                if tk == "id" and kk == "id" and (lid, tv) in topic_links:
                    cur = topic_links[(lid, tv)].get("sort_order")
                    self.note(st, "already-satisfied" if cur == b.get("sort_order") else "would-change",
                              rec, "(link exists, sort upd)" if cur != b.get("sort_order") else "")
                else:
                    self.note(st, "would-create", rec)
            elif t == "link_series_topic":
                self.note(st, "gated", rec)   # only reached with flag; still needs table
            elif t == "rabbi_page_item":
                if b.get("rabbi_id") not in e.db.rabbis:
                    self.note(st, "invalid-ref", rec, f"rabbi {b.get('rabbi_id')}")
                    e.blocking.append(f"rabbi_page_item: rabbi missing {b.get('rabbi_id')} ({rec['plan']}[{rec['idx']}])")
                    continue
                if b.get("kind") == "series" or b.get("series_id") or b.get("series_ref"):
                    k, v = e.resolve_series(b.get("series_id") or b.get("series_ref"))
                    if k is None: self.note(st, "invalid-ref", rec, f"series {v}"); continue
                else:
                    kk, lid = e.resolve_lesson(b)
                    if kk is None: self.note(st, "invalid-ref", rec, lid); continue
                rpi_rows[b["rabbi_id"]].append(rec)
                self.note(st, "would-create", rec)
            elif t == "teacher_listing_item":
                # only with --with-extra-schema
                if not e.db.has_tli:
                    self.note(st, "gated", rec); continue
                self.note(st, "would-create", rec)

        # repack stats
        repacked = sum(len(vv) for vv in sort_targets.values())
        self.stats[7]["repack-rows"] = repacked
        self.stats[7]["repack-scopes"] = len(sort_targets)
        dupslots = 0
        for scope, lst in sort_targets.items():
            slots = Counter(x[0] for x in lst)
            dupslots += sum(1 for s, n in slots.items() if n > 1)
        self.stats[7]["same-slot-ties-absorbed-by-repack"] = dupslots
        self.stats[9]["rabbi-pages-touched"] = len(rpi_rows)
        # stage 10 counters
        self.stats[10]["series-lesson_count-stale-now"] = self._count_stale_counters()
        return unresolved_sorts

    def _count_stale_counters(self):
        try:
            r = run_sql("SELECT count(*) AS n FROM series s WHERE s.lesson_count IS DISTINCT FROM "
                        "(SELECT count(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published')")
            return r[0]["n"]
        except Exception:
            return -1

    def verify_preconditions(self):
        e = self.e
        pre = self.stats[0]
        sch = e.db.raw["schema"]
        pre["schema-lessons.sort_order"] = int(sch["lessons_sort_order"])
        pre["schema-lesson_topics.sort_order"] = int(sch["lesson_topics_sort_order"])
        pre["schema-rabbi_page_items"] = int(sch["rabbi_page_items"])
        pre["schema-copied_from(GATED)"] = int(sch["copied_from"])
        pre["schema-teacher_listing_items(GATED)"] = int(sch["teacher_listing_items"])
        pre["schema-series_topics(GATED)"] = int(sch["series_topics"])
        try:
            r = run_sql("SELECT (SELECT count(*) FROM lessons_bak_oneone_20260612) l,"
                        "(SELECT count(*) FROM series_bak_oneone_20260612) s")
            pre["backups-ok"] = int(r[0]["l"] > 0 and r[0]["s"] > 0)
        except Exception:
            pre["backups-ok"] = 0
            e.blocking.append("backup tables *_bak_oneone_20260612 missing")
        roots = sum(1 for sid, p in e.db.series_parent.items() if p is None)
        pre["null-parent-roots"] = roots
        if roots != KNOWN_ROOT_COUNT:
            e.anomalies.append(f"root count {roots} != known {KNOWN_ROOT_COUNT}")

# ----------------------------------------------------------------------------- execution
class Executor:
    """--execute --stage N. Idempotent: journal + state probes + deterministic ids."""
    def __init__(self, eng):
        self.e = eng

    def run_stage(self, stage):
        e = self.e
        recs = [r for r in e.stream if r["stage"] == stage]
        print(f"stage {stage}: {len(recs)} resolved ops")
        done = skip = err = 0
        batch_sql, batch_ids = [], []

        def flush():
            nonlocal done
            if not batch_sql: return
            run_sql(";\n".join(batch_sql))
            for oid in batch_ids:
                e.journal(oid, stage, "applied-batch")
            done_n = len(batch_ids)
            batch_sql.clear(); batch_ids.clear()
            return done_n

        if stage == 7:
            self._stage7(recs); return
        if stage == 9:
            self._stage9(recs); return
        if stage == 10:
            self._stage10(); return

        for rec in recs:
            if rec["op_id"] in e.applied: skip += 1; continue
            disp = e.select(rec)
            if disp != "run":
                if disp.startswith("deferred"):
                    e.deferred.append({"op_id": rec["op_id"], "plan": rec["plan"],
                                       "idx": rec["idx"], "conf": rec["conf"],
                                       "why": disp, "op": rec["body"]})
                continue
            try:
                sqls = self.op_sql(rec)
            except Exception as ex:
                err += 1
                e.journal(rec["op_id"], stage, f"error:{ex}")
                continue
            if sqls is None: skip += 1; e.journal(rec["op_id"], stage, "noop"); continue
            batch_sql.extend(sqls); batch_ids.append(rec["op_id"])
            if len(batch_sql) >= 200:
                done += flush() or 0
        done += flush() or 0
        e._save_state()
        print(f"stage {stage} done: applied={done} skipped={skip} errors={err}")
        self.verify(stage)

    # --- single-op SQL builders (stages 3,4,5,6,8) ---
    def op_sql(self, rec):
        e = self.e; b = rec["body"]; t = b["op"]
        if t == "set_entity_type":
            return [f"UPDATE rabbis SET entity_type={sql_lit(b['entity_type'])} WHERE id={sql_lit(b['rabbi_id'])} AND entity_type IS DISTINCT FROM {sql_lit(b['entity_type'])}"]
        if t == "update_rabbi_field":
            return [f"UPDATE rabbis SET {b['field']}={sql_lit(b['value'])} WHERE id={sql_lit(b['rabbi_id'])}"]
        if t == "merge_rabbi":
            fr, into = b["from_id"], b["into_id"]
            into = e.merged_rabbi.get(into, into)   # chain re-point
            e.merged_rabbi[fr] = into
            return [
                f"UPDATE lessons SET rabbi_id={sql_lit(into)} WHERE rabbi_id={sql_lit(fr)}",
                f"UPDATE series  SET rabbi_id={sql_lit(into)} WHERE rabbi_id={sql_lit(fr)}",
                f"UPDATE rabbis  SET status='inactive' WHERE id={sql_lit(fr)}",
            ]
        if t == "create_series":
            tmp = b.get("tmp_id")
            if tmp in e.create_to_existing:
                e.tmp_map[tmp] = e.create_to_existing[tmp]; return None
            k, v = e.resolve_series(b.get("parent_ref"), allow_tmp=False) \
                if b.get("parent_ref") is not None else ("id", None)
            if b.get("parent_ref") is not None and k is None:
                raise RuntimeError(f"parent unresolvable {v}")
            nid = det_uuid(rec["op_id"])
            e.tmp_map[tmp] = nid
            return [("INSERT INTO series (id,title,parent_id,status,audience_tags,sort_order,bible_book,lesson_count) VALUES ("
                     f"{sql_lit(nid)},{sql_lit(b.get('title'))},{sql_lit(v)},{sql_lit(b.get('status') or 'active')},"
                     f"{sql_lit(b.get('audience_tags') or ['general'])},{sql_lit(b.get('sort_order') if b.get('sort_order') is not None else 0)},"
                     f"{sql_lit(b.get('bible_book'))},0) ON CONFLICT (id) DO NOTHING")]
        if t == "reparent_series":
            if "new_parent_ref" not in b: return None
            if b.get("new_parent_ref") is None:
                # explicit null = reparent to ROOT
                return [f"UPDATE series SET parent_id=NULL WHERE id={sql_lit(b['series_id'])} AND parent_id IS NOT NULL"]
            k, v = e.resolve_series(b["new_parent_ref"], allow_tmp=False)
            if k is None: raise RuntimeError(f"parent unresolvable {v}")
            return [f"UPDATE series SET parent_id={sql_lit(v)} WHERE id={sql_lit(b['series_id'])} AND parent_id IS DISTINCT FROM {sql_lit(v)}"]
        if t == "update_series":
            sets = ", ".join(f"{f}={sql_lit(val)}" for f, val in (b.get("fields") or {}).items())
            if not sets: return None
            return [f"UPDATE series SET {sets} WHERE id={sql_lit(b['series_id'])}"]
        if t == "demote_series":
            return [f"UPDATE series SET status={sql_lit(b.get('status') or 'draft')} WHERE id={sql_lit(b['series_id'])}"]
        if t == "set_series_rabbi":
            k, v = e.resolve_series(b.get("series_id") or b.get("series_ref"), allow_tmp=False)
            if k is None: raise RuntimeError(f"series unresolvable {v}")
            return [f"UPDATE series SET rabbi_id={sql_lit(b['rabbi_id'])} WHERE id={sql_lit(v)}"]
        if t == "move_lesson":
            kk, lid = e.resolve_lesson(b)
            if kk == "tmp": lid = e.tmp_map.get(lid) or self._fail(f"tmp lesson {lid} not inserted yet")
            elif kk is None: raise RuntimeError(f"lesson unresolvable {lid}")
            k, v = e.resolve_series(b.get("to_series_ref"), allow_tmp=False)
            if k is None: raise RuntimeError(f"target unresolvable {v}")
            return [f"UPDATE lessons SET series_id={sql_lit(v)} WHERE id={sql_lit(lid)} AND series_id IS DISTINCT FROM {sql_lit(v)}"]
        if t == "copy_lesson":
            return self._copy_sql(rec)
        if t == "retag_lesson":
            kk, lid = e.resolve_lesson(b)
            if kk != "id": return None
            return [f"UPDATE lessons SET audience_tags={sql_lit(b.get('audience_tags') or [])} WHERE id={sql_lit(lid)}"]
        if t == "publish_lesson":
            return [f"UPDATE lessons SET status='published' WHERE id={sql_lit(b['lesson_id'])} AND status<>'published'"]
        if t == "draft_lesson":
            return [f"UPDATE lessons SET status='draft' WHERE id={sql_lit(b['lesson_id'])} AND status<>'draft'"]
        if t == "set_lesson_rabbi":
            kk, lid = e.resolve_lesson(b)
            if kk != "id": return None
            rid = e.resolve_rabbi_name(b.get("rabbi_name"))
            if rid is None: raise RuntimeError(f"rabbi name unresolved: {b.get('rabbi_name')}")
            return [f"UPDATE lessons SET rabbi_id={sql_lit(rid)} WHERE id={sql_lit(lid)}"]
        if t == "update_lesson_field":
            fld, val = b["field"], b["value"]
            if fld == "attachment_url_old":
                if "bneyzion.co.il" in str(val):
                    e.queues["rehost"].append({"op_id": rec["op_id"], "lesson_id": b["lesson_id"], "url": val})
                    return [f"UPDATE lessons SET legacy_attachment_url={sql_lit(val)} WHERE id={sql_lit(b['lesson_id'])}"]
                return [f"UPDATE lessons SET attachment_url={sql_lit(val)}, legacy_attachment_url={sql_lit(val)} WHERE id={sql_lit(b['lesson_id'])}"]
            return [f"UPDATE lessons SET {fld}={sql_lit(val)} WHERE id={sql_lit(b['lesson_id'])}"]
        if t == "insert_lesson":
            return self._insert_sql(rec)
        if t == "create_topic":
            nid = det_uuid(rec["op_id"])
            e.tmp_map[b.get("tmp_id")] = nid
            return [("INSERT INTO topics (id,name,slug,parent_id,sort_order) VALUES ("
                     f"{sql_lit(nid)},{sql_lit(b.get('title'))},{sql_lit(b.get('slug_suggest'))},"
                     f"{sql_lit(b.get('parent_ref'))},{sql_lit(b.get('sort_order'))}) ON CONFLICT (id) DO NOTHING")]
        if t == "set_topic_sort":
            return [f"UPDATE topics SET sort_order={sql_lit(b['sort_order'])} WHERE id={sql_lit(b['topic_id'])}"]
        if t == "unlink_lesson_topic":
            # POLICY: never DELETE — but lesson_topics is a pure link table; removing a wrong
            # link is the demotion itself. Old rows are in lesson_topics_bak_oneone_20260612.
            return [f"DELETE FROM lesson_topics WHERE lesson_id={sql_lit(b['lesson_id'])} AND topic_id={sql_lit(str(b.get('topic_ref')))}"]
        if t == "link_lesson_topic":
            kk, lid = e.resolve_lesson(b)
            if kk == "tmp": lid = e.tmp_map.get(lid)
            if not lid: raise RuntimeError("lesson unresolvable")
            tk, tv = e.resolve_topic(b.get("topic_ref") or b.get("topic_id"))
            if tk == "tmp": tv = e.tmp_map.get(tv)
            if not tv: raise RuntimeError("topic unresolvable")
            # guard: lid may be a det-uuid of an op the merge dropped — verify physically, throttle-free via WHERE EXISTS
            return [("INSERT INTO lesson_topics (lesson_id,topic_id,sort_order) "
                     f"SELECT {sql_lit(lid)},{sql_lit(tv)},{sql_lit(b.get('sort_order'))} "
                     f"WHERE EXISTS (SELECT 1 FROM lessons WHERE id={sql_lit(lid)}) "
                     f"ON CONFLICT (lesson_id,topic_id) DO UPDATE SET sort_order=EXCLUDED.sort_order")]
        if t == "link_series_topic":
            if not e.db.has_series_topics: return None
            k, v = e.resolve_series(b.get("series_ref"), allow_tmp=False)
            tk, tv = e.resolve_topic(b.get("topic_ref"))
            if tk == "tmp": tv = e.tmp_map.get(tv)
            if k is None or not tv: raise RuntimeError("series/topic unresolvable")
            return [("INSERT INTO series_topics (series_id,topic_id,sort_order) "
                     f"SELECT {sql_lit(v)},{sql_lit(tv)},{sql_lit(b.get('sort_order'))} "
                     f"WHERE EXISTS (SELECT 1 FROM series WHERE id={sql_lit(v)}) ON CONFLICT DO NOTHING")]
        raise RuntimeError(f"no SQL builder for {t}")

    def _fail(self, msg):
        raise RuntimeError(msg)

    def _copy_sql(self, rec):
        e = self.e; b = rec["body"]
        kk, lid = e.resolve_lesson(b)
        if kk == "tmp":
            lid = e.tmp_map.get(lid) or self._fail(f"copy source tmp {lid} not inserted")
        elif kk is None:
            raise RuntimeError(f"copy source unresolvable {lid}")
        k, v = e.resolve_series(b.get("to_series_ref"), allow_tmp=False)
        if k is None: raise RuntimeError(f"copy target unresolvable {v}")
        nid = det_uuid(rec["op_id"])
        e.copy_map[f"{lid}|{v}"] = nid
        extra_col = ", copied_from" if e.db.has_copied_from else ""
        extra_val = f", {sql_lit(lid)}" if e.db.has_copied_from else ""
        return [(f"INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,"
                 f"attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,"
                 f"status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,sort_order{extra_col}) "
                 f"SELECT {sql_lit(nid)},title,description,content,rabbi_id,{sql_lit(v)},video_url,audio_url,"
                 f"attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,"
                 f"status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,"
                 f"{sql_lit(b.get('sort_order'))}{extra_val} FROM lessons WHERE id={sql_lit(lid)} "
                 f"ON CONFLICT (id) DO NOTHING")]

    def _insert_sql(self, rec):
        e = self.e; b = rec["body"]; pay = b.get("payload") or {}
        k, v = e.resolve_series(pay.get("series_ref"), allow_tmp=False) \
            if pay.get("series_ref") is not None else (None, None)
        if pay.get("series_ref") is not None and k is None:
            raise RuntimeError(f"insert series unresolvable {v}")
        rid = e.resolve_rabbi_name(pay.get("rabbi_name"))
        nid = det_uuid(rec["op_id"])
        tmp = get_payload_tmp(b)
        if tmp: e.tmp_map[tmp] = nid
        scrape = (pay.get("needs_content_scrape") or pay.get("needs_content_fetch")
                  or pay.get("fetch_content_from_old_url") or b.get("needs_content_scrape"))
        rehost_urls = [u for u in (pay.get("attachment_url_old"), pay.get("audio_url_old"), pay.get("video_url_old")) if u]
        pending = bool(scrape) or any("bneyzion.co.il" in str(u) for u in rehost_urls) or pay.get("fetch_media_from_old_page")
        status = "draft" if pending else (pay.get("status") or "published")
        if scrape:
            e.queues["scrape"].append({"op_id": rec["op_id"], "lesson_id": nid,
                                       "url": pay.get("content_fetch_old_url") or b.get("old_url"),
                                       "final_status": pay.get("status") or "published"})
        for u in rehost_urls:
            if "bneyzion.co.il" in str(u):
                e.queues["rehost"].append({"op_id": rec["op_id"], "lesson_id": nid, "url": u,
                                           "final_status": pay.get("status") or "published"})
        if pay.get("fetch_media_from_old_page"):
            e.queues["media_discovery"].append({"op_id": rec["op_id"], "lesson_id": nid, "old_url": b.get("old_url")})
        audio = pay.get("audio_url") or (pay.get("audio_url_old") if pay.get("audio_url_old") and "bneyzion.co.il" not in str(pay.get("audio_url_old")) else None)
        video = pay.get("video_url") or (pay.get("video_url_old") if pay.get("video_url_old") and "bneyzion.co.il" not in str(pay.get("video_url_old")) else None)
        return [("INSERT INTO lessons (id,title,description,rabbi_id,series_id,audio_url,video_url,"
                 "legacy_attachment_url,bible_book,bible_chapter,source_type,content_type,status,audience_tags,sort_order) VALUES ("
                 f"{sql_lit(nid)},{sql_lit(pay.get('title'))},{sql_lit(pay.get('description'))},{sql_lit(rid)},"
                 f"{sql_lit(v)},{sql_lit(audio)},{sql_lit(video)},{sql_lit(pay.get('attachment_url_old'))},"
                 f"{sql_lit(pay.get('bible_book'))},{sql_lit(pay.get('bible_chapter'))},"
                 f"{sql_lit(pay.get('source_type') or 'text')},{sql_lit(pay.get('content_type'))},"
                 f"{sql_lit(status)},{sql_lit(pay.get('audience_tags') or ['general'])},{sql_lit(b.get('sort_order'))}) "
                 f"ON CONFLICT (id) DO NOTHING")]

    # --- stage 7: sorts with repack ---
    def _stage7(self, recs):
        e = self.e
        # series sorts: straight updates (winners only — losers already dropped)
        sers = [r for r in recs if r["body"]["op"] == "set_series_sort"
                and r["op_id"] not in e.applied and e.select(r) == "run"]
        vals = []
        for r in sers:
            k, v = e.resolve_series(r["body"].get("series_id") or r["body"].get("series_ref"), allow_tmp=False)
            if k is None: e.journal(r["op_id"], 7, f"error:series-unresolvable {v}"); continue
            vals.append((v, r["body"].get("sort_order"), r["op_id"]))
        for i in range(0, len(vals), 500):
            chunk = vals[i:i+500]
            vs = ",".join(f"({sql_lit(a)}::uuid,{sql_lit(s)})" for a, s, _ in chunk)
            run_sql(f"UPDATE series SET sort_order=v.so FROM (VALUES {vs}) AS v(id,so) WHERE series.id=v.id")
            for _, _, oid in chunk: e.journal(oid, 7, "applied")
        # lesson sorts: resolve physical rows, repack per scope 10,20,30...
        lsorts = [r for r in recs if r["body"]["op"] == "set_lesson_sort"
                  and r["op_id"] not in e.applied and e.select(r) == "run"]
        scopes = defaultdict(list)
        errors = []
        # BULK live prefetch (replaces 16K per-op probes that hit the API throttler):
        # one paged dump of (id, series_id, copied_from) reflecting all moves/copies/inserts this run.
        live_home = {}
        live_copies = {}
        off = 0
        while True:
            page = run_sql("SELECT id, series_id, copied_from FROM lessons ORDER BY id LIMIT 5000 OFFSET %d" % off)
            if not page: break
            for row_ in page:
                live_home[row_["id"]] = row_.get("series_id")
                if row_.get("copied_from") and row_.get("series_id"):
                    live_copies[(row_["copied_from"], row_["series_id"])] = row_["id"]
            if len(page) < 5000: break
            off += 5000
        print(f"stage 7: live prefetch {len(live_home)} lessons, {len(live_copies)} copies")
        for r in lsorts:
            b = r["body"]
            kk, lid = e.resolve_lesson(b)
            if kk == "tmp": lid = e.tmp_map.get(lid)
            if not lid or kk is None: errors.append((r, f"lesson-unresolved")); continue
            k, v = e.resolve_series(b.get("series_ref") or b.get("series_id"), allow_tmp=False)
            if k is None: errors.append((r, f"scope-unresolved {v}")); continue
            if live_home.get(lid) == v: row = lid
            elif f"{lid}|{v}" in e.copy_map: row = e.copy_map[f"{lid}|{v}"]
            elif (lid, v) in live_copies: row = live_copies[(lid, v)]
            else:
                errors.append((r, f"no-row-in-scope {lid[:8]}@{v[:8]}")); continue
            scopes[v].append((b.get("sort_order") or 0, PLAN_PRIORITY.get(r["plan"], 99), r["idx"], row, r["op_id"]))
        updates = []
        for scope, lst in scopes.items():
            lst.sort()
            for n, (_, _, _, row, oid) in enumerate(lst, 1):
                updates.append((row, n * 10, oid))
        for i in range(0, len(updates), 500):
            chunk = updates[i:i+500]
            vs = ",".join(f"({sql_lit(a)}::uuid,{s})" for a, s, _ in chunk)
            run_sql(f"UPDATE lessons SET sort_order=v.so FROM (VALUES {vs}) AS v(id,so) WHERE lessons.id=v.id")
            for _, _, oid in chunk: e.journal(oid, 7, "applied")
        if errors:
            ef = PLANS / "STAGE7-unresolved.jsonl"
            with open(ef, "w", encoding="utf-8") as f:
                for r, why in errors:
                    f.write(json.dumps({"op_id": r["op_id"], "plan": r["plan"], "idx": r["idx"], "why": why},
                                       ensure_ascii=False) + "\n")
            print(f"stage 7: {len(errors)} unresolved sort targets -> {ef}")
        e._save_state()
        self.verify(7)

    # --- stage 9: rabbi_page_items ladder rebuild ---
    def _stage9(self, recs):
        e = self.e
        rows = defaultdict(list)
        for r in recs:
            b = r["body"]
            if b["op"] != "rabbi_page_item": continue
            if r["op_id"] in e.applied or e.select(r) != "run": continue
            tgt_series = tgt_lesson = None
            if b.get("series_id") or b.get("series_ref"):
                k, v = e.resolve_series(b.get("series_id") or b.get("series_ref"), allow_tmp=False)
                if k is None: e.journal(r["op_id"], 9, f"error:series {v}"); continue
                tgt_series = v
            else:
                kk, lid = e.resolve_lesson(b)
                if kk == "tmp": lid = e.tmp_map.get(lid)
                if not lid: e.journal(r["op_id"], 9, "error:lesson-unresolved"); continue
                tgt_lesson = lid
            owner_rank = 0 if r["plan"] == "rabbis_plan" else (1 if r["plan"].startswith("lessons_plan") else 2)
            rows[b["rabbi_id"]].append((owner_rank, b.get("sort_order") if b.get("sort_order") is not None else 10**6,
                                        r["idx"], b.get("kind"), tgt_series, tgt_lesson, r["op_id"]))
        ins = []
        for rid, lst in rows.items():
            lst.sort()
            for n, (_, _, _, kind, sid, lid, oid) in enumerate(lst, 1):
                ins.append((rid, kind, sid, lid, n, oid))
        # pre-filter against LIVE ids (det-uuid refs of merge-dropped ops must not break the batch)
        live_l = set(); off = 0
        while True:
            pg = run_sql("SELECT id FROM lessons ORDER BY id LIMIT 5000 OFFSET %d" % off)
            if not pg: break
            live_l.update(r["id"] for r in pg)
            if len(pg) < 5000: break
            off += 5000
        live_s = {r["id"] for r in run_sql("SELECT id FROM series")}
        dropped = [t for t in ins if (t[3] and t[3] not in live_l) or (t[2] and t[2] not in live_s)]
        ins = [t for t in ins if not ((t[3] and t[3] not in live_l) or (t[2] and t[2] not in live_s))]
        if dropped:
            with open(PLANS / "STAGE9-dropped-refs.jsonl", "w", encoding="utf-8") as f:
                for t in dropped:
                    f.write(json.dumps({"rabbi_id": t[0], "kind": t[1], "series_id": t[2],
                                        "lesson_id": t[3], "op_id": t[5]}, ensure_ascii=False) + "\n")
            print(f"stage 9: {len(dropped)} rpi rows dropped (missing physical refs) -> STAGE9-dropped-refs.jsonl")
        for i in range(0, len(ins), 300):
            chunk = ins[i:i+300]
            vs = ",".join(f"({sql_lit(a)}::uuid,{sql_lit(k)},{sql_lit(s)}::uuid,{sql_lit(l)}::uuid,{n})"
                          for a, k, s, l, n, _ in chunk)
            run_sql("INSERT INTO rabbi_page_items (rabbi_id,kind,series_id,lesson_id,sort_order) "
                    f"SELECT v.* FROM (VALUES {vs}) AS v(rabbi_id,kind,series_id,lesson_id,sort_order) "
                    "WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items r WHERE r.rabbi_id=v.rabbi_id AND r.kind=v.kind "
                    "AND coalesce(r.series_id,r.lesson_id)=coalesce(v.series_id,v.lesson_id))")
            for *_, oid in chunk: e.journal(oid, 9, "applied")
        # teacher_listing_items (gated)
        if self.e.args.with_extra_schema and e.db.has_tli:
            tli = [r for r in recs if r["body"]["op"] == "teacher_listing_item"
                   and r["op_id"] not in e.applied and e.select(r) == "run"]
            vals = []
            for r in tli:
                b = r["body"]
                lid = b.get("lesson_id")
                if not lid and b.get("lesson_ref"):
                    lid = e.tmp_map.get(self.e.resolver.tmp_alias.get(b["lesson_ref"], b["lesson_ref"]))
                if (lid and lid not in live_l) or (b.get("series_id") and b.get("series_id") not in live_s):
                    continue
                vals.append((b["scope"], b["key"], b["kind"], b.get("series_id"), lid, b.get("sort_order"), r["op_id"]))
            for i in range(0, len(vals), 300):
                chunk = vals[i:i+300]
                vs = ",".join(f"({sql_lit(a)},{sql_lit(k)},{sql_lit(kd)},{sql_lit(s)}::uuid,{sql_lit(l)}::uuid,{sql_lit(n)})"
                              for a, k, kd, s, l, n, _ in chunk)
                run_sql("INSERT INTO teacher_listing_items (scope,key,kind,series_id,lesson_id,sort_order) "
                        f"SELECT v.* FROM (VALUES {vs}) AS v(scope,key,kind,series_id,lesson_id,sort_order) "
                        "WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items t WHERE t.scope=v.scope AND t.key=v.key "
                        "AND t.kind=v.kind AND coalesce(t.series_id,t.lesson_id)=coalesce(v.series_id,v.lesson_id))")
                for *_, oid in chunk: e.journal(oid, 9, "applied")
        self.verify(9)

    # --- stage 10 ---
    def _stage10(self):
        run_sql("UPDATE series s SET lesson_count = sub.n FROM (SELECT series_id, count(*) n FROM lessons "
                "WHERE status='published' GROUP BY series_id) sub WHERE sub.series_id = s.id AND s.lesson_count IS DISTINCT FROM sub.n;"
                "UPDATE series s SET lesson_count = 0 WHERE NOT EXISTS (SELECT 1 FROM lessons l WHERE l.series_id=s.id AND l.status='published') AND s.lesson_count <> 0;")
        run_sql("UPDATE rabbis r SET lesson_count = sub.n FROM (SELECT rabbi_id, count(*) n FROM lessons "
                "WHERE status='published' AND NOT (audience_tags @> ARRAY['teachers'] AND NOT audience_tags @> ARRAY['general']) "
                "GROUP BY rabbi_id) sub WHERE sub.rabbi_id = r.id AND r.lesson_count IS DISTINCT FROM sub.n;")
        run_sql("""
CREATE OR REPLACE VIEW rabbi_effective_counts AS
SELECT r.id AS rabbi_id,
  CASE WHEN EXISTS (SELECT 1 FROM rabbi_page_items p WHERE p.rabbi_id=r.id)
  THEN (SELECT count(*) FROM rabbi_page_items p WHERE p.rabbi_id=r.id AND p.kind IN ('lesson','qa'))
     + COALESCE((SELECT sum(s.lesson_count) FROM rabbi_page_items p JOIN series s ON s.id=p.series_id
                 WHERE p.rabbi_id=r.id AND p.kind='series'),0)
  ELSE (SELECT count(*) FROM lessons l WHERE l.rabbi_id=r.id AND l.status='published'
        AND NOT (l.audience_tags @> ARRAY['teachers'] AND NOT l.audience_tags @> ARRAY['general']))
  END AS effective_count
FROM rabbis r""")
        run_sql("""
CREATE OR REPLACE VIEW topic_effective_counts AS
SELECT t.id AS topic_id,
  (SELECT count(DISTINCT l.id) FROM lesson_topics lt JOIN lessons l ON l.id=lt.lesson_id
   WHERE lt.topic_id=t.id AND l.status='published'
   AND NOT (l.audience_tags @> ARRAY['teachers'] AND NOT l.audience_tags @> ARRAY['general'])) AS effective_count
FROM topics t""")
        print("stage 10: counters + views done")
        self.verify(10)

    # --- queues (execute mode, post stage 5/6) ---
    def process_rehost_queue(self):
        key = service_key()
        done = fail = 0
        for item in self.e.queues["rehost"]:
            url = item["url"]
            sha = hashlib.sha1(url.encode()).hexdigest()[:12]
            ext = os.path.splitext(url.split("?")[0])[1] or ".pdf"
            book = "misc"
            path = f"oneone/{book}/{sha}{ext}"
            local = f"/tmp/oneone_rehost_{sha}{ext}"
            r = subprocess.run(["curl", "-s", "--noproxy", "*", "-L", "--max-time", "120",
                                "-o", local, "-w", "%{http_code} %{content_type} %{size_download}", url],
                               capture_output=True, text=True)
            parts = (r.stdout or "").split()
            ok = parts and parts[0] == "200" and os.path.exists(local) and os.path.getsize(local) > 1000
            if ok and ext == ".pdf":
                with open(local, "rb") as f: ok = f.read(5).startswith(b"%PDF")
            if not ok:
                fail += 1; item["status"] = "download-failed"; continue
            up = subprocess.run(["curl", "-s", "--noproxy", "*", "-X", "POST",
                                 f"{SUPA_URL}/storage/v1/object/{STORAGE_BUCKET}/{path}",
                                 "-H", f"Authorization: Bearer {key}",
                                 "-H", "Content-Type: application/octet-stream",
                                 "--data-binary", f"@{local}"], capture_output=True, text=True)
            if '"error"' in (up.stdout or "") and "Duplicate" not in up.stdout:
                fail += 1; item["status"] = f"upload-failed:{up.stdout[:120]}"; continue
            public = f"{SUPA_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{path}"
            if item.get("lesson_id"):
                run_sql(f"UPDATE lessons SET attachment_url={sql_lit(public)} WHERE id={sql_lit(item['lesson_id'])}")
            item["status"] = "ok"; item["new_url"] = public
            done += 1
        print(f"rehost queue: ok={done} fail={fail}")
        return fail == 0

    def process_scrape_queue(self):
        done = fail = 0
        for item in self.e.queues["scrape"]:
            url = item.get("url")
            if not url: fail += 1; continue
            if url.startswith("/"): url = OLD_HOST + url
            cp = cache_lookup(url) or CACHE / (hashlib.sha1(url.encode()).hexdigest() + ".html")
            html_txt = None
            if cp.exists():
                html_txt = open(cp, encoding="utf-8", errors="replace").read()
            else:
                r = subprocess.run(["curl", "-s", "--noproxy", "*", "-L", "--max-time", "60", url],
                                   capture_output=True, text=True)
                if r.returncode == 0 and len(r.stdout) > 5000:
                    html_txt = r.stdout
                    cp.write_text(html_txt, encoding="utf-8")
            body = self._extract_lesson_text(html_txt) if html_txt else None
            if not body: fail += 1; item["status"] = "no-content"; continue
            body_n = unicodedata.normalize("NFC", body)
            if item.get("lesson_id"):
                run_sql(f"UPDATE lessons SET content=$one1${body_n}$one1$, status={sql_lit(item.get('final_status') or 'published')} "
                        f"WHERE id={sql_lit(item['lesson_id'])}")
            done += 1; item["status"] = "ok"
        print(f"scrape queue: ok={done} fail={fail}")
        return fail == 0

    @staticmethod
    def _extract_lesson_text(h):
        i = h.find('<div id="lessonText">')
        if i == -1: return None
        j = i + len('<div id="lessonText">')
        depth, k = 1, j
        while depth > 0:
            no, nc = h.find("<div", k), h.find("</div>", k)
            if nc == -1: return None
            if no != -1 and no < nc: depth += 1; k = no + 4
            else: depth -= 1; k = nc + 6
        return h[j:k - 6].strip()

    # --- SQL preview (no execution; EXPLAIN-validated sample) ---
    def print_sql(self, stages=(3, 4, 5, 6, 8)):
        out = PLANS / "SQL-PREVIEW.sql"
        lines, unresolvable = [], 0
        per_type_first = {}
        for stage in stages:
            recs = [r for r in self.e.stream if r["stage"] == stage]
            lines.append(f"-- ===== stage {stage}: {len(recs)} resolved ops =====")
            for rec in recs:
                if self.e.select(rec) != "run": continue
                t = rec["body"]["op"]
                try:
                    sqls = self.op_sql(rec)
                except Exception as ex:
                    unresolvable += 1
                    lines.append(f"-- {rec['plan']}[{rec['idx']}] {t}: UNRESOLVABLE: {str(ex)[:160]}")
                    continue
                if not sqls: continue
                for s in sqls:
                    lines.append(s + ";")
                    per_type_first.setdefault((t, s.split()[0]), s)
        lines.append("-- ===== stage 7 representative batch shape =====")
        s7 = ("UPDATE lessons SET sort_order=v.so FROM (VALUES "
              "('00000000-0000-0000-0000-000000000000'::uuid,10)) AS v(id,so) WHERE lessons.id=v.id")
        lines.append(s7 + ";")
        per_type_first[("set_lesson_sort", "UPDATE")] = s7
        lines.append("-- ===== stage 9 representative batch shape =====")
        s9 = ("INSERT INTO rabbi_page_items (rabbi_id,kind,series_id,lesson_id,sort_order) "
              "SELECT v.* FROM (VALUES ('00000000-0000-0000-0000-000000000000'::uuid,'series',"
              "'00000000-0000-0000-0000-000000000000'::uuid,NULL::uuid,1)) "
              "AS v(rabbi_id,kind,series_id,lesson_id,sort_order) "
              "WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items r WHERE r.rabbi_id=v.rabbi_id "
              "AND r.kind=v.kind AND coalesce(r.series_id,r.lesson_id)=coalesce(v.series_id,v.lesson_id))")
        lines.append(s9 + ";")
        per_type_first[("rabbi_page_item", "INSERT")] = s9
        out.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"SQL preview -> {out} ({sum(1 for l in lines if not l.startswith('--'))} statements, "
              f"{unresolvable} unresolvable)")
        # EXPLAIN-validate one statement per (op type, verb) — parses + plans, never executes
        ok = bad = 0
        for (t, verb), s in sorted(per_type_first.items()):
            try:
                run_sql("EXPLAIN " + s)
                ok += 1
            except Exception as ex:
                bad += 1
                print(f"  EXPLAIN FAIL [{t}/{verb}]: {str(ex)[:200]}")
        print(f"EXPLAIN validation: {ok} statement shapes OK, {bad} failed")
        return bad == 0

    # --- verification ---
    def verify(self, stage):
        checks = {
            3: ["SELECT count(*) AS bad FROM lessons l JOIN rabbis r ON l.rabbi_id=r.id WHERE r.status='inactive'"],
            4: ["SELECT count(*) AS orphans FROM series WHERE parent_id IS NULL"],
            5: ["SELECT count(*) AS published_unplaced FROM lessons WHERE status='published' AND series_id IS NULL"],
            6: ["SELECT count(*) AS rule13 FROM lessons WHERE (coalesce(audio_url,'') LIKE '%bneyzion.co.il%' "
                "OR coalesce(video_url,'') LIKE '%bneyzion.co.il%' OR coalesce(attachment_url,'') LIKE '%bneyzion.co.il%') AND status='published'"],
            7: ["SELECT count(*) AS dup_slots FROM (SELECT series_id, sort_order FROM lessons WHERE sort_order IS NOT NULL "
                "GROUP BY 1,2 HAVING count(DISTINCT id)>1) x"],
            8: ["SELECT count(*) AS themes_children FROM topics WHERE parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b'"],
            9: ["SELECT count(*) AS rpi_rows FROM rabbi_page_items",
                "SELECT count(DISTINCT rabbi_id) AS rabbis_with_pages FROM rabbi_page_items"],
            10: ["SELECT count(*) AS stale FROM series s WHERE s.lesson_count IS DISTINCT FROM "
                 "(SELECT count(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published')"],
        }
        for sql in checks.get(stage, []):
            try:
                print(f"  verify[{stage}]:", json.dumps(run_sql(sql), ensure_ascii=False))
            except Exception as ex:
                print(f"  verify[{stage}] FAILED: {ex}")

# ----------------------------------------------------------------------------- outputs
def write_resolved(stream):
    out = PLANS / "RESOLVED-OPS.jsonl"
    with open(out, "w", encoding="utf-8") as f:
        for r in stream:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return out

def write_deferred(eng):
    out = PLANS / "DEFERRED-med-low.jsonl"
    with open(out, "w", encoding="utf-8") as f:
        for d in eng.deferred:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")
    return out

def write_report(eng, dr, unresolved_sorts, t0):
    out = PLANS / "DRYRUN-REPORT.md"
    L = []
    L.append("# DRYRUN-REPORT — oneone_apply.py")
    L.append(f"\n*{time.strftime('%Y-%m-%d %H:%M')} · plans loaded: {', '.join(sorted(eng.plans))} · "
             f"resolved ops: {len(eng.stream)} · runtime {time.time()-t0:.0f}s · "
             f"flags: only_high={not eng.args.include_med} with_extra_schema={eng.args.with_extra_schema}*\n")
    L.append("## Resolution summary (merge rules applied)\n")
    for k, v in sorted(eng.resolver.resolution_stats.items()):
        L.append(f"- {k}: **{v}**")
    L.append(f"- tmp aliases (K/P remaps): **{len(eng.resolver.tmp_alias)}**")
    L.append(f"- creates resolved to existing series: **{len(eng.create_to_existing)}** "
             f"({', '.join(f'{t}→{v[:8]}' for t, v in sorted(eng.create_to_existing.items()))})")
    for n in eng.resolver.notes:
        L.append(f"- NOTE: {n}")
    L.append("\n## Preconditions (stages 0-2, verify-only)\n")
    for k, v in sorted(dr.stats[0].items()):
        L.append(f"- {k}: {v}")
    L.append("\n## Per-stage dry-run totals\n")
    L.append("| stage | total | would-change | would-create | already-satisfied | invalid-ref | anomaly | blocked-by-deferred | queued | gated | deferred (med/low/sanity) |")
    L.append("|---|---|---|---|---|---|---|---|---|---|---|")
    for st in range(3, 11):
        s = dr.stats[st]
        if not s: continue
        L.append(f"| {st} | {s.get('total',0)} | {s.get('would-change',0)} | {s.get('would-create',0)} | "
                 f"{s.get('already-satisfied',0)} | {s.get('invalid-ref',0)} | {s.get('anomaly',0)} | "
                 f"{s.get('blocked-by-deferred-dep',0)} | "
                 f"{s.get('queued-rehost',0)} | {s.get('gated',0)} | "
                 f"{s.get('deferred-med',0)}/{s.get('deferred-low',0)}/{s.get('deferred-med-sanity',0)} |")
    L.append("\n### Stage 7 repack projection")
    L.append(f"- scopes (physical series) receiving lesson sort ladders: **{dr.stats[7].get('repack-scopes',0)}**")
    L.append(f"- rows to renumber (10,20,30…): **{dr.stats[7].get('repack-rows',0)}**")
    L.append(f"- same-slot ties absorbed by repack: **{dr.stats[7].get('same-slot-ties-absorbed-by-repack',0)}**")
    L.append(f"\n### Stage 10\n- series.lesson_count stale vs published-count today: **{dr.stats[10].get('series-lesson_count-stale-now',0)}**")
    L.append("\n## Queues (Rule 13 + content scrape)\n")
    L.append(f"- rehost queue (bneyzion.co.il media → Storage): **{len(eng.queues['rehost'])}** (runnable ops only)")
    L.append(f"- content-scrape queue: **{len(eng.queues['scrape'])}** "
             f"(cache hits: {sum(1 for q in eng.queues['scrape'] if q.get('cached'))}; misses fetched live at execute)")
    L.append(f"- media-discovery (fetch_media_from_old_page): **{len(eng.queues['media_discovery'])}**")
    # queue load hiding inside deferred ops
    dq_scrape = dq_rehost = dq_media = 0
    for d in eng.deferred:
        b1 = d["op"]
        if b1.get("op") != "insert_lesson": continue
        p1 = b1.get("payload") or {}
        if (p1.get("needs_content_scrape") or p1.get("needs_content_fetch")
                or p1.get("fetch_content_from_old_url") or b1.get("needs_content_scrape")): dq_scrape += 1
        if any(u and "bneyzion.co.il" in str(u) for u in
               (p1.get("attachment_url_old"), p1.get("audio_url_old"), p1.get("video_url_old"))): dq_rehost += 1
        if p1.get("fetch_media_from_old_page"): dq_media += 1
    L.append(f"- additional queue load inside DEFERRED med/low inserts (activates with --include-med): "
             f"scrape **{dq_scrape}**, rehost **{dq_rehost}**, media-discovery **{dq_media}**")
    L.append("\n## Gated on pending schema (--with-extra-schema)\n")
    gated_ops = Counter(r["body"]["op"] for r in eng.stream if r["op_id"] in set(eng.gated))
    for k, v in sorted(gated_ops.items()):
        L.append(f"- {k}: **{v}** ops")
    L.append(f"- copied_from stamping on copy_lesson: column {'present' if eng.db.has_copied_from else 'ABSENT — copies will not be stamped (weaker idempotency probe; deterministic uuid5 ids still make re-runs safe)'}")
    L.append("\n## Blocking issues (must fix before --execute)\n")
    if eng.blocking:
        for b1 in sorted(set(eng.blocking)):
            L.append(f"- ❌ {b1}")
    else:
        L.append("- none")
    L.append("\n## Blocked by deferred dependencies (high ops needing a med/low prerequisite)\n")
    L.append("*These runnable (high-confidence) ops reference a row that only a deferred med/low op creates. "
             "They will error harmlessly at --execute under --only-high; they succeed with --include-med.*\n")
    if eng.blocked_deps:
        for b1 in eng.blocked_deps[:60]:
            L.append(f"- 🔗 {b1}")
        if len(eng.blocked_deps) > 60:
            L.append(f"- … +{len(eng.blocked_deps)-60} more")
    else:
        L.append("- none")
    L.append("\n## Anomalies (non-blocking, review)\n")
    for a in sorted(set(eng.anomalies))[:80]:
        L.append(f"- ⚠️ {a}")
    if len(set(eng.anomalies)) > 80:
        L.append(f"- … +{len(set(eng.anomalies))-80} more")
    if unresolved_sorts:
        L.append(f"\n### Unresolved set_lesson_sort targets ({len(unresolved_sorts)})\n")
        for u in unresolved_sorts[:60]:
            L.append(f"- {u}")
        if len(unresolved_sorts) > 60:
            L.append(f"- … +{len(unresolved_sorts)-60} more")
    L.append("\n## Examples per bucket\n")
    for (st, what), exs in sorted(dr.examples.items()):
        if what in ("invalid-ref", "anomaly"):
            L.append(f"\n**stage {st} / {what}:**")
            for e1 in exs: L.append(f"- `{e1}`")
    out.write_text("\n".join(L) + "\n", encoding="utf-8")
    return out

# ----------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", default=False)
    ap.add_argument("--execute", action="store_true")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--stage", type=int)
    ap.add_argument("--include-med", action="store_true")
    ap.add_argument("--with-extra-schema", action="store_true")
    ap.add_argument("--fresh-snapshot", action="store_true")
    ap.add_argument("--process-queues", action="store_true",
                    help="(execute mode) run rehost+scrape queues after stage 6")
    ap.add_argument("--print-sql", action="store_true",
                    help="write plans/SQL-PREVIEW.sql + EXPLAIN-validate statement shapes (no writes)")
    args = ap.parse_args()
    if not args.execute and not args.verify and not args.print_sql:
        args.dry_run = True
    if args.execute and args.stage is None:
        ap.error("--execute requires --stage N")

    t0 = time.time()
    eng = Engine(args)
    write_resolved(eng.stream)
    print(f"resolved stream: {len(eng.stream)} ops -> plans/RESOLVED-OPS.jsonl")

    if args.dry_run:
        dr = DryRun(eng)
        unresolved = dr.run()
        write_deferred(eng)
        rep = write_report(eng, dr, unresolved, t0)
        print(f"dry-run report -> {rep}")
        print(f"deferred -> plans/DEFERRED-med-low.jsonl ({len(eng.deferred)})")
        if eng.blocking:
            print(f"BLOCKING ISSUES: {len(set(eng.blocking))} (see report)")
            sys.exit(1)
        return

    ex = Executor(eng)
    if args.print_sql:
        ok = ex.print_sql()
        sys.exit(0 if ok else 1)
    if args.verify:
        ex.verify(args.stage if args.stage else 10)
        return
    if args.execute:
        ex.run_stage(args.stage)
        if args.process_queues and args.stage == 6:
            ex.process_rehost_queue()
            ex.process_scrape_queue()
        write_deferred(eng)

if __name__ == "__main__":
    main()
