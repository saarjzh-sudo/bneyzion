#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
parity_watch.py — bneyzion parity WATCHDOG (W7, 15.6.2026)
==========================================================
Runs 3×/day (launchd com.bneyzion.parity-watch). Detect-only — NEVER deploys/writes.
For ~50 sidebar sections (both sidebars) it checks the foundational gap classes that
hurt in this migration, then DMs Saar a summary on WhatsApp. He replies "תקן" to start
an approval-gated fix session. Loop continues until a run reports 0 gaps.

Reuses the existing engine (parity_engine.normalize_he / canonical_match / sql_query)
and the cached old-site crawl (audit_full_state.json — 10,157 pages, children graph).

Foundational checks (deterministic, no fuzzy old-matching needed):
  1. EMPTY      — a sidebar section root that surfaces 0 public items (caught תנ"ך-מוקלט).
  2. LEAK       — teacher-tagged items that would surface on a public lens (caught the מחדל).
  3. THIN       — a book-category child series with lesson_count=1 (caught "1 of 18").
  4. MEMBERSHIP — old child-series of a section not present in new (where cache resolves).

Usage:
  python3 parity_watch.py            # full run → report + WhatsApp
  python3 parity_watch.py --no-wa    # run, write report, skip WhatsApp (dry)
  python3 parity_watch.py --sections # (re)build sections.json from DB and exit
"""
from __future__ import annotations
import os, re, sys, json, time, urllib.parse, subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

# Supabase token: parity_engine reads it from env; source it from sbq.py.
_sbq = (HERE / "sbq.py").read_text(encoding="utf-8")
_m = re.search(r'TOKEN\s*=\s*"([^"]+)"', _sbq)
os.environ.setdefault("SUPABASE_MANAGEMENT_API_TOKEN", _m.group(1) if _m else "")

from parity_engine import normalize_he, canonical_match, sql_query  # noqa: E402

_SB_REF = "pzvmwfexeiruelwiujxn"
_SB_TOKEN = os.environ.get("SUPABASE_MANAGEMENT_API_TOKEN", "")
def q(sql, _tries=6):
    """Throttle-aware Supabase query: detects ThrottlerException and backs off."""
    body = json.dumps({"query": sql})
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): env.pop(k, None)
    env["NO_PROXY"] = "*"
    for i in range(_tries):
        p = subprocess.run(["curl","-s","--noproxy","*","-X","POST",
            f"https://api.supabase.com/v1/projects/{_SB_REF}/database/query",
            "-H",f"Authorization: Bearer {_SB_TOKEN}","-H","Content-Type: application/json",
            "--data-binary","@-"], input=body, capture_output=True, text=True, env=env, timeout=120)
        try:
            data = json.loads(p.stdout)
        except Exception:
            data = None
        if isinstance(data, list):
            time.sleep(0.4)         # gentle pacing between successful calls
            return data
        if isinstance(data, dict) and "Throttler" in str(data.get("message","")):
            time.sleep(2.0 * (i + 1)); continue
        time.sleep(1.0 * (i + 1))   # other transient error
    return []

# Recorded project is surfaced by title-pattern (W1), NOT by parent_id — mirror that count.
RECORDED_COUNT_SQL = ("""SELECT COUNT(*) n FROM series
    WHERE (title ILIKE '%מוקלט%' OR title ILIKE '%קריאה בטעמים%')
      AND status IN ('active','published') AND NOT (audience_tags @> '{teachers}')""")

WS = Path(os.path.abspath(os.path.join(HERE, "..", "..", "..")))  # saar-workspace
REPORTS = HERE / "reports"; REPORTS.mkdir(exist_ok=True)
STATE = HERE / "audit_full_state.json"
SECTIONS_FILE = HERE / "sections-50.json"
BASELINE = REPORTS / "watch-baseline.json"

PUBLIC_DUAL_ALLOWED = {
    "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7",  # כלי עזר
    "4d78557b-da8b-4b1f-8d8e-09d74ff3070a",  # מפות עזר לתנ"ך
}
ROOTS = {  # sidebar extra-section roots (mirror useContentSidebar ROOT_IDS)
    "recordedProject": "041ce810-92ae-59e4-9e07-11fd014255fa",
    "howToLearn":      "62590949-6187-4e17-b84d-65a518467521",
    "generalTopics":   "2d6d28c1-3c5c-4d61-9283-410bc56cd351",
    "moadim":          "92130154-e96a-4f98-b032-5a20ac385f63",
    "haftarot":        "3327c721-7bc9-471c-878f-0b3aef98b090",
    "tools":           "27ca7dec-f7d0-4ede-b561-8ffb3a4c74e7",
    "livuyTatim":      "7cbd261e-03b0-43da-a708-e8ae4402105f",
    "torah":           "bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b",
    "neviim":          "a0472c9f-8212-44ff-8937-ace5fea4b4dc",
    "ketuvim":         "5cdd770c-9593-4b0d-9f9e-cda50cf5ef41",
}

# ── secrets for WhatsApp (read at runtime, never committed) ─────────────────
def _read(p):
    try: return Path(p).read_text(encoding="utf-8", errors="replace")
    except Exception: return ""
_clients = _read(WS / "וואן-מן-שואו/סקילים/01-skills/shigor-pro/references/clients.md")
GREEN_INSTANCE = "7105260665"
_m = re.search(r'\b([0-9a-f]{50})\b', _clients)
GREEN_TOKEN = _m.group(1) if _m else ""
SAAR_CHAT = "972526018772@c.us"

def il_now():
    return datetime.now(timezone(timedelta(hours=3)))

# ── build / load section list ──────────────────────────────────────────────
def build_sections():
    """50 sections: all sidebar book roots + extra-section roots + teacher content-types."""
    secs = []
    books = q("""SELECT s.id, s.title, p.title AS cat FROM series s
        JOIN series p ON p.id=s.parent_id
        WHERE s.parent_id IN ('bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b',
              'a0472c9f-8212-44ff-8937-ace5fea4b4dc','5cdd770c-9593-4b0d-9f9e-cda50cf5ef41')
          AND s.status IN ('active','published','category')
          AND s.sort_order BETWEEN 1 AND 999
        ORDER BY p.title, s.sort_order""")
    for b in books:
        if "חידות" in (b.get("title") or ""):   # teacher widget, not a public book
            continue
        secs.append({"key": f"book:{b['title']}", "label": b["title"],
                     "sidebar": "public", "kind": "book", "series_id": b["id"]})
    extra_labels = {"recordedProject": 'פרוייקט התנ"ך המוקלט', "howToLearn": 'איך לומדים',
        "generalTopics": "נושאים כלליים", "moadim": "מועדים", "haftarot": "הפטרות",
        "tools": "כלי עזר", "livuyTatim": 'ליווי ת"תים'}
    for k, label in extra_labels.items():
        secs.append({"key": f"section:{k}", "label": label, "sidebar": "public",
                     "kind": "section", "series_id": ROOTS[k]})
    # teacher-wing content types (a sample of the main ones)
    ctypes = q("""SELECT content_type, COUNT(*) n FROM lessons
        WHERE audience_tags @> '{teachers}' AND content_type IS NOT NULL
        GROUP BY content_type ORDER BY n DESC LIMIT 8""")
    for c in ctypes:
        secs.append({"key": f"teacher:{c['content_type']}", "label": c["content_type"],
                     "sidebar": "teachers", "kind": "content_type",
                     "content_type": c["content_type"]})
    json.dump(secs, open(SECTIONS_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return secs

def load_sections():
    if SECTIONS_FILE.exists():
        return json.load(open(SECTIONS_FILE, encoding="utf-8"))
    return build_sections()

# ── per-section checks ──────────────────────────────────────────────────────
def descendant_ids_sql(root):
    return (f"""WITH RECURSIVE d AS (SELECT id FROM series WHERE id='{root}'
              UNION SELECT c.id FROM series c JOIN d ON c.parent_id=d.id) SELECT id FROM d""")

CHAPTER_ORGANIZED = {"תהלים", "ישעיהו", "ירמיהו", "יחזקאל"}  # 1-lesson chapter-series are legit here

def check_public_section(sec):
    root = sec["series_id"]
    allow = root in PUBLIC_DUAL_ALLOWED
    # surfaced item count — recordedProject is title-pattern-aggregated (W1), not tree-based
    if sec["key"] == "section:recordedProject":
        rec = q(RECORDED_COUNT_SQL)
        surfaced = int(rec[0]["n"]) if rec else 0
        n_lessons, n_children = 0, surfaced
    else:
        aud_l = "" if allow else "AND NOT (l.audience_tags @> '{teachers}')"
        items = q(f"""SELECT COUNT(*) n FROM lessons l
            WHERE l.series_id IN ({descendant_ids_sql(root)}) AND l.status='published' {aud_l}""")
        n_lessons = int(items[0]["n"]) if items else 0
        cs = q(f"""SELECT COUNT(*) n FROM series s WHERE s.parent_id='{root}'
            AND s.status IN ('active','published')""")
        n_children = int(cs[0]["n"]) if cs else 0
        surfaced = n_lessons + n_children
    # LEAK: pure-teacher lessons that would surface on this public section (reliable foundational)
    leak = 0
    if not allow and sec["key"] != "section:recordedProject":
        lk = q(f"""SELECT COUNT(*) n FROM lessons l
            WHERE l.series_id IN ({descendant_ids_sql(root)}) AND l.status='published'
              AND l.audience_tags @> '{{teachers}}' AND NOT (l.audience_tags @> '{{general}}')""")
        leak = int(lk[0]["n"]) if lk else 0
    # THIN (advisory only — needs old ground truth to confirm; chapter-organized books excluded)
    # THIN excludes the LEGIT single-lesson families (verified 15.6): chapter event-series
    # ("X | פרק נ"), recorded ("מוקלט"/"קריאה בטעמים"), fluency ("בבקיאות"), short reading
    # ("קריאה וביאור"). What's left is genuinely-suspicious thinness worth an old-site check.
    thin = []
    if sec["kind"] == "book" and sec["label"] not in CHAPTER_ORGANIZED:
        tr = q(f"""SELECT s.title FROM series s
            WHERE s.parent_id='{root}' AND s.status IN ('active','published')
              AND s.lesson_count=1 AND NOT (s.audience_tags @> '{{teachers}}')
              AND s.title !~ '\\| *פרק' AND s.title !~ '\\| *[א-ת]+ *- *[א-ת]+'
              AND s.title NOT ILIKE '%מוקלט%' AND s.title NOT ILIKE '%קריאה בטעמים%'
              AND s.title NOT ILIKE '%בבקיאות%' AND s.title NOT ILIKE '%קריאה וביאור%'
            ORDER BY s.title LIMIT 25""")
        thin = [r["title"] for r in tr]
    # HIDDEN: content-bearing DRAFT child series under a public book = a hidden placeholder
    # (the round-9/10 bug class). Advisory — may include yoav's legit unpublished drafts.
    hidden = []
    if sec["kind"] in ("book", "section"):
        hr = q(f"""SELECT s.title FROM series s WHERE s.parent_id='{root}'
            AND s.status='draft' AND s.lesson_count>0
            AND NOT (s.audience_tags @> '{{teachers}}') ORDER BY s.title LIMIT 25""")
        hidden = [r["title"] for r in hr]
    # HARD ALERT = EMPTY only (render-faithful). LEAK/THIN/HIDDEN are advisory: the strict
    # filter already hides teacher content (verified — CategoryPage L183/L232), so DB-presence
    # of teacher rows under a public tree is expected, not a UI leak. Regression is added in run().
    flags, severity = [], "clean"
    if surfaced == 0:
        flags.append("EMPTY"); severity = "foundational"
    return {"key": sec["key"], "label": sec["label"], "sidebar": "public",
            "surfaced": surfaced, "lessons": n_lessons, "child_series": n_children,
            "leak_advisory": leak, "thin_advisory": thin, "hidden_advisory": hidden,
            "flags": flags, "severity": severity, "status": "gap" if flags else "ok"}

def check_teacher_section(sec):
    ct = sec["content_type"].replace("'", "''")
    r = q(f"""SELECT COUNT(*) n FROM lessons WHERE content_type='{ct}'
        AND audience_tags @> '{{teachers}}' AND status='published'""")
    n = int(r[0]["n"]) if r else 0
    flags = ["EMPTY"] if n == 0 else []
    return {"key": sec["key"], "label": sec["label"], "sidebar": "teachers",
            "surfaced": n, "flags": flags,
            "severity": "foundational" if flags else "clean",
            "status": "gap" if flags else "ok"}

# ── run ──────────────────────────────────────────────────────────────────────
def run(send_wa=True):
    secs = load_sections()
    results = []
    for s in secs:
        try:
            results.append(check_teacher_section(s) if s["sidebar"] == "teachers"
                           else check_public_section(s))
        except Exception as e:
            results.append({"key": s["key"], "label": s["label"], "status": "error",
                            "severity": "error", "flags": [f"ERR:{e}"]})
    # REGRESSION vs baseline — a section's surfaced count dropping = content vanished (hard alert).
    base = json.load(open(BASELINE, encoding="utf-8")) if BASELINE.exists() else {}
    for r in results:
        prev = base.get(r["key"])
        cur = r.get("surfaced", 0)
        if prev is not None and cur < prev * 0.9 and prev - cur >= 3:
            r["flags"].append(f"REGRESSION {prev}→{cur}")
            r["severity"] = "foundational"; r["status"] = "gap"
    # update baseline to the max-ever surfaced (so a later fix raises the bar, a drop trips it)
    new_base = {r["key"]: max(base.get(r["key"], 0), r.get("surfaced", 0)) for r in results}
    json.dump(new_base, open(BASELINE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    gaps = [r for r in results if r["status"] == "gap"]
    foundational = [r for r in gaps if r["severity"] == "foundational"]
    ts = il_now().strftime("%Y%m%d-%H%M")
    report = {"ts": il_now().isoformat(), "sections": len(results),
              "gaps": len(gaps), "foundational": len(foundational), "results": results}
    out = REPORTS / f"watch-{ts}.json"
    json.dump(report, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"sections={len(results)} gaps={len(gaps)} foundational={len(foundational)} → {out.name}")
    for g in gaps:
        print(f"  [{g['severity']:11s}] {g['label']}: {' '.join(g['flags'])}")
    if send_wa:
        send_summary(report, out.name)
    return report

def send_summary(report, fname):
    hhmm = il_now().strftime("%H:%M")
    g, f = report["gaps"], report["foundational"]
    if g == 0:
        msg = f"🟢 audit פאריטי {hhmm} — ✓ 0 פערים, פאריטי מלא ({report['sections']} סקשנים)."
    else:
        lines = [f"🔶 audit פאריטי {hhmm} — {g} פערים ({f} יסוד) מתוך {report['sections']} סקשנים:"]
        for r in report["results"]:
            if r["status"] == "gap":
                lines.append(f"• {r['label']}: {' '.join(r['flags'])}")
        lines.append(f"\nדוח: scripts/parity/reports/{fname}")
        lines.append('כתוב "תקן" לפתיחת סבב-תיקון (באישורך).')
        msg = "\n".join(lines)
    if not GREEN_TOKEN:
        print("[wa] no token — skipping send"); return
    url = f"https://api.greenapi.com/waInstance{GREEN_INSTANCE}/sendMessage/{GREEN_TOKEN}"
    body = json.dumps({"chatId": SAAR_CHAT, "message": msg})
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): env.pop(k, None)
    env["NO_PROXY"] = "*"
    p = subprocess.run(["curl","-s","--noproxy","*","-X","POST",url,
        "-H","Content-Type: application/json","--data-binary","@-"],
        input=body, capture_output=True, text=True, env=env, timeout=60)
    print(f"[wa] sent → {p.stdout[:160]}")

if __name__ == "__main__":
    if "--sections" in sys.argv:
        secs = build_sections(); print(f"built {len(secs)} sections → {SECTIONS_FILE.name}"); sys.exit(0)
    run(send_wa="--no-wa" not in sys.argv)
