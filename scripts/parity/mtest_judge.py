#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deterministic migration-parity judge for the BIG test.
Replaces the 443 LLM judge-agents (which were defeated by persistent server throttling)
with an encoded rule-set applied directly to the cached diff files in /tmp/mtest_diff.

Per node it pairs missing<->extra titles to detect title-format variants vs genuine
gaps/pollution, applies the dual-audience + teacher/nav whitelists, and classifies
each node clean / minor_gap / defect with the specific offending titles.

Output: /tmp/mtest_judge_result.json  (+ printed summary)
"""
import json, os, re, sys, unicodedata, collections

DIFF_DIR = "/tmp/mtest_diff"
ARGS = os.path.join(os.path.dirname(__file__), "mtest-args.json")

# ---------- normalization ----------
QUOTES = '"“”„״\'‘’׳`'
def norm(s):
    if s is None: return ""
    s = unicodedata.normalize("NFC", str(s))
    s = s.replace("״", '"').replace("׳", "'")
    for q in '“”„‘’':
        s = s.replace(q, '"')
    s = re.sub(r"\s+", " ", s).strip()
    return s

def strip_q(s):
    return re.sub(r'["\']', '', s)

# ---------- classifiers ----------
NAME_TOKENS = ("הרב ", "הרבנית ", "הרה\"ג", "הרהג", "פרופ", "ד\"ר", "דר ", "הרבנ")
WOMEN_TAG = "(לנשים)"

# dual-audience public study content (genuine, NOT pollution) — substring match
DUAL_AUDIENCE = ["ושננתם", "ביאור", "ציר זמן", "סיכומים", "מפות עזר",
                 "קריאה וביאור", "טבלת", "טבלאות", "מפה ", "מפת ", "ציר הזמן"]

# missing items that are legitimately absent (nav / teacher-only / structural)
MISSING_LEGIT_EXACT = {"סדרת שיעורים", "כל השיעורים", "סדרות שיעורים", "שיעורים"}
MISSING_LEGIT_SUB = ["מעבר ל", "דפי עבודה", "שאלות חזרה", "שאלות בעיון", "חידות",
                     "ביאורי מילים", "דף עבודה", "כל ההפטרות", "כל השיעורים"]

def is_women_or_author_suffix(suffix):
    """suffix appended to a missing title -> same lesson, benign title-format variant."""
    s = suffix.strip()
    if not s: return False
    if WOMEN_TAG in s: return True
    for t in NAME_TOKENS:
        if s.startswith(t) or (" " + t) in (" " + s):
            return True
    return False

def is_numbering_suffix(suffix):
    s = suffix.strip()
    # allow hyphenated Hebrew/numeric ranges: "פרקים ג-ד", "חלק ב", "שיעורים 3-5"
    return bool(re.fullmatch(r'[\-–]?\s*(פרק|פרקים|חלק|חלקים|שיעור|שיעורים)\s+[א-ת0-9][א-ת0-9\'"\-–\s]*', s))

def is_duplicate_word_suffix(base, suffix):
    """e.g. base ends with 'ושננתם', suffix == 'ושננתם' -> corruption."""
    s = strip_q(suffix.strip())
    b = strip_q(base.strip())
    if not s: return False
    bw = b.split()
    return bool(bw) and s == bw[-1]

def dual_audience_hit(title):
    t = strip_q(title)
    return any(k in t for k in DUAL_AUDIENCE)

def has_count_suffix(title):
    # a trailing "(12)" style count marker => real duplicate/aggregation defect
    return bool(re.search(r'\(\s*\d+\s*\)\s*$', title))

# ---------- pairing ----------
def pair_missing_extra(missing, extra, series_name):
    """Return (pairs, unpaired_missing, unpaired_extra).
    pairs: list of (m, e, kind) where kind in
      benign_author / benign_numbering / corruption_dup / corruption_concat / ambiguous
    """
    mN = [(m, norm(m)) for m in missing]
    eN = [(e, norm(e)) for e in extra]
    used_e = set()
    pairs = []
    unpaired_m = []
    sname = norm(series_name) if series_name else ""

    for (m_raw, m) in mN:
        best = None  # (idx, kind)
        for i, (e_raw, e) in enumerate(eN):
            if i in used_e:
                continue
            ms, es = strip_q(m), strip_q(e)
            if ms == es:
                best = (i, "benign_exact"); break
            # extra is missing-title + suffix
            if es.startswith(ms + " ") or es.startswith(ms):
                suffix = e[len(m):] if e.startswith(m) else es[len(ms):]
                suffix = suffix.strip()
                if not suffix:
                    best = (i, "benign_exact"); break
                if is_women_or_author_suffix(suffix):
                    best = (i, "benign_author"); break
                if is_numbering_suffix(suffix):
                    best = (i, "benign_numbering"); break
                if is_duplicate_word_suffix(m, suffix):
                    best = (i, "corruption_dup"); break
                # suffix equals (or is contained in) the series/topic name -> concatenation corruption
                if sname and (strip_q(suffix) in sname or sname in strip_q(suffix) or
                              len(strip_q(suffix)) >= 8):
                    best = (i, "corruption_concat"); break
                best = (i, "ambiguous"); continue
            # missing is extra-title + suffix (rare)
            if ms.startswith(es + " "):
                best = (i, "benign_author" if is_women_or_author_suffix(m[len(e):].strip()) else "ambiguous")
        if best is not None:
            used_e.add(best[0])
            pairs.append((m_raw, eN[best[0]][0], best[1]))
        else:
            unpaired_m.append(m_raw)
    unpaired_e = [e_raw for i, (e_raw, _) in enumerate(eN) if i not in used_e]
    return pairs, unpaired_m, unpaired_e

# ---------- per-node judge ----------
def judge(node_name, node_type, d):
    old_n, new_n = d.get("old_n"), d.get("new_n")
    old_err, new_err = d.get("old_err"), d.get("new_err")
    missing = [m for m in d.get("missing_in_new", []) if norm(m)]
    extra   = [e for e in d.get("extra_in_new", []) if norm(e)]
    count_mm = d.get("count_mismatch", []) or []

    # rule 1: old scrape empty/errored but new has content -> clean
    if (old_err or (old_n in (0, None) and (new_n or 0) > 0)) and not extra:
        return dict(name=node_name, type=node_type, status="clean", severity="none",
                    old_n=old_n, new_n=new_n, pollution=[], missing=[], title_corruption=[],
                    count_problems=[], ambiguous=[], notes="old scrape empty/errored; new has content")
    if new_err:
        return dict(name=node_name, type=node_type, status="defect", severity="high",
                    old_n=old_n, new_n=new_n, pollution=[], missing=[], title_corruption=[],
                    count_problems=[], ambiguous=[], notes=f"NEW page errored: {new_err}")

    pairs, um, ue = pair_missing_extra(missing, extra, node_name)

    corruption = [(m, e) for (m, e, k) in pairs if k in ("corruption_dup", "corruption_concat")]
    ambiguous_pairs = [(m, e) for (m, e, k) in pairs if k == "ambiguous"]

    # unpaired extra -> candidate pollution; drop dual-audience legit
    pollution, benign_extra = [], []
    for e in ue:
        if has_count_suffix(e):
            pollution.append(e)  # (N)/duplicate marker = real defect
        elif dual_audience_hit(e):
            benign_extra.append(e)
        else:
            pollution.append(e)

    # unpaired missing -> candidate gap; drop nav/teacher/empty legit
    real_missing, benign_missing = [], []
    for m in um:
        mm = norm(m)
        if mm in MISSING_LEGIT_EXACT or any(mm.startswith(s) or s in mm for s in MISSING_LEGIT_SUB):
            benign_missing.append(m)
        else:
            real_missing.append(m)

    count_problems = []
    for c in count_mm:
        if isinstance(c, dict):
            try:
                if abs(int(c.get("old", 0)) - int(c.get("new", 0))) > 1:
                    count_problems.append(c)
            except Exception:
                count_problems.append(c)
        else:
            count_problems.append(c)

    # "(N)" / exact-duplicate markers among pollution = high-confidence defect
    dup_pollution = [e for e in pollution if has_count_suffix(e)]

    on = old_n or 0
    nn = new_n or 0
    thin_old = on <= 2 and nn >= on   # old page barely scraped -> new content is legit, not pollution

    # ----- tiered classification -----
    # confidence A (mechanical, certain): title corruption, (N)-duplicate pollution, count>1
    confirmed = bool(corruption or dup_pollution or count_problems)
    # confidence B (needs content verification): volume diffs we can't adjudicate deterministically
    review_kind = None
    if not confirmed and not thin_old:
        if node_type == "book" and nn < on:
            review_kind = "book_shrink"        # new shows fewer than old — real gap or structural grouping?
        elif node_type == "rabbi" and nn > on and pollution:
            review_kind = "rabbi_overattrib"   # new attributes more lessons than old — possible over-attribution
        elif pollution:
            review_kind = "extra_in_new"
        elif real_missing:
            review_kind = "missing_in_new"

    if confirmed:
        status = "defect"
        if corruption and (len(corruption) >= 5 or len(pollution) >= 5):
            severity = "high"
        elif len(corruption) >= 2 or len(dup_pollution) >= 1 or count_problems:
            severity = "medium"
        else:
            severity = "low"
    elif review_kind:
        status = "review"
        severity = "medium" if (abs(nn - on) >= 8) else "low"
    elif real_missing and not thin_old:
        status = "minor_gap"; severity = "low"
    else:
        status = "clean"; severity = "none"

    notes_bits = []
    if corruption: notes_bits.append(f"{len(corruption)} title-corruption")
    if dup_pollution: notes_bits.append(f"{len(dup_pollution)} (N)-duplicate")
    if count_problems: notes_bits.append(f"{len(count_problems)} count>1")
    if review_kind: notes_bits.append(f"review:{review_kind} ({on}->{nn})")
    if thin_old and (pollution or extra): notes_bits.append("old scrape thin -> new legit")
    if real_missing: notes_bits.append(f"{len(real_missing)} candidate-missing")
    if ambiguous_pairs: notes_bits.append(f"{len(ambiguous_pairs)} ambiguous-pair")
    if not notes_bits: notes_bits.append("balanced; only benign format/whitelist diffs")

    return dict(name=node_name, type=node_type, status=status, severity=severity,
                old_n=old_n, new_n=new_n,
                review_kind=review_kind,
                title_corruption=[e for (m, e) in corruption],
                dup_pollution=dup_pollution,
                pollution=([] if (thin_old or review_kind) else pollution) if not confirmed else pollution,
                pollution_candidates=(pollution if review_kind else []),
                missing=real_missing,
                count_problems=count_problems,
                ambiguous=[e for (m, e) in ambiguous_pairs],
                notes="; ".join(notes_bits))

def main():
    args = json.load(open(ARGS))
    results = []
    missing_files = []
    for a in args:
        p = os.path.join(DIFF_DIR, a["safe"] + ".json")
        if not os.path.exists(p):
            missing_files.append(a["safe"]); continue
        d = json.load(open(p))
        results.append(judge(a["name"], a["type"], d))

    by_status = collections.Counter(r["status"] for r in results)
    sev_rank = {"high":3,"medium":2,"low":1,"none":0}
    defects = sorted([r for r in results if r["status"] == "defect"],
                     key=lambda r: (-sev_rank[r["severity"]], r["type"], r["name"]))
    review = sorted([r for r in results if r["status"] == "review"],
                    key=lambda r: (r["review_kind"], -abs((r["new_n"] or 0)-(r["old_n"] or 0))))
    minor = [r for r in results if r["status"] == "minor_gap"]
    clean = [r for r in results if r["status"] == "clean"]
    corruption_nodes = [r for r in defects if r["title_corruption"]]
    ambiguous_nodes = [r for r in results if r["ambiguous"]]

    out = dict(
        summary=dict(total=len(results), clean=len(clean), minor_gap=len(minor),
                     defect=len(defects), review=len(review), missing_files=len(missing_files),
                     corruption_nodes=len(corruption_nodes),
                     by_type_defect=dict(collections.Counter(r["type"] for r in defects)),
                     review_by_kind=dict(collections.Counter(r["review_kind"] for r in review))),
        confirmed_defects=defects,
        review_needed=review,
        minor=minor,
        ambiguous_nodes=[dict(name=r["name"], type=r["type"], ambiguous=r["ambiguous"]) for r in ambiguous_nodes],
    )
    json.dump(out, open("/tmp/mtest_judge_result.json", "w"), ensure_ascii=False, indent=1)

    print("=== DETERMINISTIC JUDGE — full 443 coverage ===")
    print("status:", dict(by_status), "| missing diff files:", len(missing_files))
    print("CONFIRMED defects by type:", out["summary"]["by_type_defect"], "| by sev:",
          dict(collections.Counter(r["severity"] for r in defects)))
    print("title-corruption nodes:", len(corruption_nodes))
    print("REVIEW-needed by kind:", out["summary"]["review_by_kind"])
    print("\n=== CONFIRMED DEFECTS (mechanical, high confidence) ===")
    for r in defects:
        flags = []
        if r["title_corruption"]: flags.append(f"corruption×{len(r['title_corruption'])}")
        if r["dup_pollution"]: flags.append(f"(N)dup×{len(r['dup_pollution'])}")
        if r["count_problems"]: flags.append(f"count×{len(r['count_problems'])}")
        print(f"  [{r['severity']:6}] {r['type']:8} {r['name']}  ({r['old_n']}->{r['new_n']})  {', '.join(flags)}")
    print(f"\n=== REVIEW NEEDED ({len(review)}) — volume diffs, need content verification ===")
    for k in sorted(set(r["review_kind"] for r in review)):
        ex = [r for r in review if r["review_kind"]==k]
        print(f"  {k}: {len(ex)} nodes  e.g. " + ", ".join(f"{r['name']}({r['old_n']}->{r['new_n']})" for r in ex[:4]))

if __name__ == "__main__":
    main()
