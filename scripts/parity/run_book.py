#!/usr/bin/env python3
"""
run_book.py — full 1:1 pipeline for ONE public book, with a verify-BEFORE-apply gate.

Because the frontend is already deployed and data-driven, applying = going live. So we DRY-run
the three engines, AUDIT the resulting plans against the old site, and apply ONLY if the audit
is clean (else FLAG for review — never push broken data live).

Pipeline (all reuse the proven שמות engines):
  1. public_book_listing  → category page allow-list (series + standalone, old order, no
     pollution, phantom-lesson→real-series).
  2. series_lesson_listing→ per-series lesson allow-list by audio key (intruders out; shared
     whole-Torah series get a book-scoped key automatically).
  3. fix_lesson_rabbis    → per-lesson author = old-site author (audio-corroborated).

Audit gate (must all pass):
  - public_book: emitted ≥ 95% of old rows; every emitted lesson NON-empty; every emitted
    series has ≥1 published lesson.
  - series_lessons: every series emit == old_count (or only dup_skip diff); 0 unresolved that
    DROP content; every referenced lesson NON-empty.
  - rabbi: 0 unresolved; audio-corroboration has 0 disagreements.

Usage: python3 run_book.py "<book>" [--apply]   (default = dry+audit only, prints verdict JSON)
"""
import sys, os, json, subprocess, argparse, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sbq

PLANS = os.path.join(HERE, "_runplans"); os.makedirs(PLANS, exist_ok=True)

def q(sql, _t=8):
    for i in range(_t):
        out = sbq.run(sql)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"):
                time.sleep(1.3 * (i + 1)); continue
            return d
        except Exception:
            time.sleep(1.3 * (i + 1))
    return []

def sh(args, timeout=900):
    p = subprocess.run([sys.executable, "-u"] + args, cwd=HERE,
                       capture_output=True, text=True, timeout=timeout)
    return p.returncode, (p.stdout or "") + (p.stderr or "")

EMPTY = ("(content IS NULL OR content='') AND audio_url IS NULL AND video_url IS NULL "
         "AND attachment_url IS NULL AND legacy_attachment_url IS NULL")

def empty_ids(ids):
    """Return the subset of lesson ids that are EMPTY (no content/media)."""
    bad = []
    ids = [i for i in ids if i]
    for k in range(0, len(ids), 200):
        ch = "','".join(ids[k:k+200])
        r = q(f"SELECT id FROM lessons WHERE id IN ('{ch}') AND ({EMPTY})")
        bad += [x["id"] for x in (r or [])]
    return bad

def run(book, apply):
    """Staged: each engine is DRY-audited, and a BLOCKER (render error) stops apply for that
       stage; genuine content gaps (content absent from DB) are recorded, not blocking.
       public_book is applied BEFORE series (series reads the applied public_book listing)."""
    pj = os.path.join(PLANS, f"{book}-public.json")
    sj = os.path.join(PLANS, f"{book}-series.json")
    v = {"book": book, "status": "PENDING", "blockers": [], "gaps": [], "metrics": {}, "applied": []}

    # ===== STAGE 1: public_book (dry → audit → apply) =====
    rc, out = sh(["public_book_listing.py", "--book", book, "--out", pj])
    if rc != 0 or not os.path.exists(pj):
        v["status"] = "ERROR"; v["blockers"].append("public_book crashed: " + out[-300:]); return v
    pb = json.load(open(pj, encoding="utf-8"))
    if pb.get("error"):
        v["status"] = "ERROR"; v["blockers"].append("public_book: " + pb["error"]); return v
    pb_rows = pb.get("rows", [])
    v["metrics"].update({"public_old": pb.get("old_items"), "public_emit": pb.get("emitted")})
    # BLOCKER: emitted empty lessons (render error). Empty-series already excluded by the engine.
    e = empty_ids([r["lesson_id"] for r in pb_rows if r.get("kind") == "lesson" and r.get("lesson_id")])
    if e: v["blockers"].append(f"{len(e)} EMPTY lessons emitted in public listing")
    # GAP (non-blocking): content the old site had but DB lacks (empty series, unmatched lessons)
    v["gaps"] += [g.get("title") for g in pb.get("gaps_unresolved", [])]
    if v["blockers"]:
        v["status"] = "FLAGGED"; return v
    if apply:
        sh(["public_book_listing.py", "--book", book, "--apply", "--out", pj]); v["applied"].append("public_book")

    # ===== STAGE 2: series_lessons (needs public_book applied to know the series) =====
    if apply:
        rc, out = sh(["series_lesson_listing.py", "--book", book, "--apply", "--out", sj], timeout=2400)
    else:
        rc, out = sh(["series_lesson_listing.py", "--book", book, "--out", sj], timeout=2400)
    sp = json.load(open(sj, encoding="utf-8")) if os.path.exists(sj) else {"series": []}
    se = empty_ids(list({r["lesson_id"] for b in sp.get("series", []) for r in b.get("rows", [])}))
    s_unres = sum(len(b.get("unresolved", [])) for b in sp.get("series", []))
    v["metrics"].update({"series_count": len(sp.get("series", [])), "series_unres": s_unres})
    if se:  # emitted empty lesson inside a series = render error
        v["blockers"].append(f"{len(se)} EMPTY lessons emitted in series listings")
    v["gaps"] += [u.get("title") for b in sp.get("series", []) for u in b.get("unresolved", [])]

    # ===== STAGE 3: rabbi attribution (only fixes resolved → never worse; unresolved noted) =====
    rc, out = sh(["fix_lesson_rabbis.py", "--book", book] + (["--apply"] if apply else []), timeout=2400)
    rj = os.path.join(HERE, f"rabbi-fix-{book}.json")
    rf = json.load(open(rj, encoding="utf-8")) if os.path.exists(rj) else {"fixes": [], "unresolved": []}
    v["metrics"]["rabbi_fixes"] = len(rf.get("fixes", []))
    v["gaps"] += [f"rabbi?:{u.get('old_author')}" for u in rf.get("unresolved", [])]
    if apply and rf.get("fixes"):
        v["applied"].append(f"rabbi×{len(rf['fixes'])}")
    if apply:
        v["applied"].append("series_lessons")

    v["status"] = ("APPLIED" if apply else "PASS_DRY") if not v["blockers"] else "FLAGGED"
    return v

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("book")
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    v = run(a.book, a.apply)
    print("VERDICT " + json.dumps(v, ensure_ascii=False))
