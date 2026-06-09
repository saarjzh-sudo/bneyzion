#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
parity_engine.py — shared library
===================================
normalize + canonical_match + diff
ללא תלות חיצונית (stdlib בלבד).
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path
from typing import Any

# ============================================================
# Config
# ============================================================
PROJECT_REF = "pzvmwfexeiruelwiujxn"
OLD_SITE    = "https://www.bneyzion.co.il"
SUPABASE_PAT = os.environ.get("SUPABASE_MANAGEMENT_API_TOKEN", "")


# ============================================================
# Hebrew text normalisation
# ============================================================

def normalize_he(s: str) -> str:
    """
    NFC + remove nikud + lowercase + collapse whitespace + strip quotes/dashes.
    חובה להפעיל על שני הצדדים לפני כל השוואה.
    """
    if not s:
        return ""
    s = str(s).strip()
    # Remove nikud (U+0591–U+05C7)
    s = ''.join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    s = unicodedata.normalize('NFC', s)
    s = re.sub(r'\s+', ' ', s)
    # Strip common punctuation that varies between old/new
    s = re.sub(r'[""״\'"׳]', '', s)
    s = re.sub(r'[|–—\-]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s.lower()


# ============================================================
# String overlap helpers
# ============================================================

def _token_overlap(a: str, b: str) -> float:
    """Jaccard-like overlap on word tokens."""
    ta = set(a.split())
    tb = set(b.split())
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union


def _char_overlap(a: str, b: str) -> float:
    """Character-level overlap (longer = denominator)."""
    if not a or not b:
        return 0.0
    s, l = (a, b) if len(a) <= len(b) else (b, a)
    matches = sum(1 for c in s if c in l)
    return matches / len(l)


# ============================================================
# canonical_match — 4-level priority
# ============================================================

MatchLevel = str  # "exact" | "overlap80" | "substring75" | "prefix14" | "none"

class MatchResult:
    def __init__(self, level: MatchLevel, score: float, old_title: str, new_title: str):
        self.level     = level
        self.score     = score
        self.old_title = old_title
        self.new_title = new_title
        self.matched   = level != "none"

    def __repr__(self):
        return f"MatchResult(level={self.level!r}, score={self.score:.2f})"


def canonical_match(old_title: str, new_title: str) -> MatchResult:
    """
    Compare two lesson/series titles at 4 levels (per SKILL.md §שלב C).
    Returns MatchResult.
    """
    a = normalize_he(old_title)
    b = normalize_he(new_title)

    # Level 1 — exact
    if a == b:
        return MatchResult("exact", 1.0, old_title, new_title)

    # Level 2 — token overlap ≥ 0.80
    ov = _token_overlap(a, b)
    if ov >= 0.80:
        return MatchResult("overlap80", ov, old_title, new_title)

    # Level 3 — substring: one contains ≥75% of the other's chars
    shorter, longer = (a, b) if len(a) <= len(b) else (b, a)
    if len(longer) > 0 and len(shorter) / len(longer) >= 0.75 and shorter in longer:
        ratio = len(shorter) / len(longer)
        return MatchResult("substring75", ratio, old_title, new_title)

    # Level 4 — prefix 14 chars (parasha/book name matching)
    if len(a) >= 5 and len(b) >= 5:
        plen = min(14, len(a), len(b))
        if a[:plen] == b[:plen]:
            return MatchResult("prefix14", plen / max(len(a), len(b)), old_title, new_title)

    return MatchResult("none", ov, old_title, new_title)


def best_match_from_list(
    old_title: str,
    candidates: list[dict],
    title_key: str = "title",
) -> tuple[dict | None, MatchResult]:
    """
    Find best match for old_title among candidates list.
    Returns (best_candidate, MatchResult) or (None, none-result).
    """
    best_item: dict | None = None
    best_res = MatchResult("none", 0.0, old_title, "")
    for cand in candidates:
        res = canonical_match(old_title, cand.get(title_key, ""))
        if res.matched and res.score > best_res.score:
            best_item = cand
            best_res = res
    return best_item, best_res


# ============================================================
# Supabase SQL helper
# ============================================================

def sql_query(q: str) -> list:
    """Run SQL via Supabase Management API. Returns list of rows."""
    if not SUPABASE_PAT:
        print("ERROR: SUPABASE_MANAGEMENT_API_TOKEN not set", file=sys.stderr)
        return []
    result = subprocess.run([
        "curl", "--noproxy", "*", "-s",
        "-H", f"Authorization: Bearer {SUPABASE_PAT}",
        "-H", "Content-Type: application/json",
        "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-d", json.dumps({"query": q})
    ], capture_output=True, text=True, timeout=60)
    try:
        data = json.loads(result.stdout)
        if isinstance(data, dict) and "message" in data:
            print(f"  SQL ERROR: {data['message'][:300]}", file=sys.stderr)
            return []
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"  JSON error: {e} | raw: {result.stdout[:300]}", file=sys.stderr)
        return []


def sql_exec(q: str) -> dict:
    """Execute a write SQL statement, return raw response dict."""
    if not SUPABASE_PAT:
        return {"error": "no SUPABASE_MANAGEMENT_API_TOKEN"}
    result = subprocess.run([
        "curl", "--noproxy", "*", "-s",
        "-H", f"Authorization: Bearer {SUPABASE_PAT}",
        "-H", "Content-Type: application/json",
        "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-d", json.dumps({"query": q})
    ], capture_output=True, text=True, timeout=60)
    try:
        return json.loads(result.stdout)
    except Exception as e:
        return {"error": str(e), "raw": result.stdout[:300]}


# ============================================================
# HTTP helpers
# ============================================================

_page_cache: dict[str, str | None] = {}

def fetch_html(url: str, timeout: int = 30) -> str | None:
    """Fetch HTML with noproxy. Returns None on 404 / too small."""
    if url in _page_cache:
        return _page_cache[url]
    safe_url = url.replace('"', '%22')
    result = subprocess.run([
        "curl", "--noproxy", "*", "-sL", "--max-time", str(timeout),
        "-A", "Mozilla/5.0",
        safe_url
    ], capture_output=True, timeout=timeout + 5, errors='replace')
    html = result.stdout.decode("utf-8", errors="replace") if isinstance(result.stdout, bytes) else result.stdout
    if not html or len(html) < 300 or ("Page not found" in html and len(html) < 2000):
        html = None
    _page_cache[url] = html
    return html


def check_url(url: str) -> tuple[int, str, int]:
    """
    HEAD request. Returns (status_code, content_type, content_length).
    Never use gview!
    """
    result = subprocess.run([
        "curl", "--noproxy", "*", "-sI", "--max-time", "20", url
    ], capture_output=True, text=True, timeout=25)
    status  = 0
    ctype   = ""
    clen    = 0
    for line in result.stdout.splitlines():
        m = re.match(r'HTTP/\S+\s+(\d+)', line)
        if m:
            status = int(m.group(1))
        m = re.match(r'content-type:\s*(.+)', line, re.I)
        if m:
            ctype = m.group(1).strip()
        m = re.match(r'content-length:\s*(\d+)', line, re.I)
        if m:
            clen = int(m.group(1))
    return status, ctype, clen


def is_real_pdf(url: str) -> tuple[bool, str]:
    """
    Returns (is_valid, reason).
    Valid = 200 + application/pdf + Content-Length > 0.
    NEVER gview.
    """
    if "docs.google.com/gview" in url:
        return False, "gview is dead (200+empty)"
    status, ctype, clen = check_url(url)
    if status != 200:
        return False, f"HTTP {status}"
    if "application/pdf" not in ctype and "octet-stream" not in ctype:
        return False, f"Content-Type: {ctype}"
    if clen == 0:
        return False, "Content-Length: 0"
    return True, f"OK ({clen} bytes)"


# ============================================================
# Diff engine — bidirectional
# ============================================================

class DiffResult:
    def __init__(self):
        self.missing:    list[dict] = []   # בישן, לא בחדש
        self.extras:     list[dict] = []   # בחדש, לא בישן
        self.matched:    list[dict] = []   # תואמים
        self.mismatches: list[dict] = []   # קיים בשני, אבל כותרת/מדיה שונה

    def summary(self) -> dict:
        return {
            "matched":    len(self.matched),
            "missing":    len(self.missing),
            "extras":     len(self.extras),
            "mismatches": len(self.mismatches),
        }


def diff_inventories(
    old_items: list[dict],
    new_items: list[dict],
    old_title_key: str = "title",
    new_title_key: str = "title",
) -> DiffResult:
    """
    Bidirectional diff: old vs new.
    Matches by canonical_match (4-level).
    Returns DiffResult.
    """
    result = DiffResult()
    used_new: set[int] = set()

    for old_item in old_items:
        old_t = old_item.get(old_title_key, "")
        best_new: dict | None = None
        best_res = MatchResult("none", 0.0, old_t, "")

        for i, new_item in enumerate(new_items):
            if i in used_new:
                continue
            res = canonical_match(old_t, new_item.get(new_title_key, ""))
            if res.matched and res.score > best_res.score:
                best_new = new_item
                best_res = res
                best_idx = i

        if best_new is None:
            result.missing.append({**old_item, "_reason": "not found in new"})
        else:
            used_new.add(best_idx)
            entry = {
                "old": old_item,
                "new": best_new,
                "match_level": best_res.level,
                "match_score": round(best_res.score, 3),
            }
            # Check for mismatches beyond title
            issues = []
            if best_res.level not in ("exact", "overlap80"):
                issues.append(f"title mismatch ({best_res.level} {best_res.score:.2f})")
            # attachment mismatch check (if fields present)
            old_att = old_item.get("attachment_url", "") or ""
            new_att = best_new.get("attachment_url", "") or ""
            if old_att and not new_att:
                issues.append("attachment missing in new")
            if issues:
                entry["issues"] = issues
                result.mismatches.append(entry)
            else:
                result.matched.append(entry)

    # extras = new items not matched
    for i, new_item in enumerate(new_items):
        if i not in used_new:
            result.extras.append({**new_item, "_reason": "not in old"})

    return result


# ============================================================
# Self-test (run directly)
# ============================================================

if __name__ == "__main__":
    tests = [
        ("פרשת בראשית", "פרשת בראשית", "exact"),
        ("פרשת בראשית", "בְּרֵאשִׁית", "exact"),        # nikud stripped
        ("דף עבודה — פרשת נח", "דף עבודה פרשת נח", "overlap80"),
        ("ויציאו העם ולקטו", "ויציאו העם וילקטו", "overlap80"),
        ("בראשית א", "בראשית א-ה", "prefix14"),
        ("פרשת שמות", "ספר שמות", "none"),
    ]
    for a, b, expected in tests:
        res = canonical_match(a, b)
        ok  = "✓" if res.level == expected else "✗"
        print(f"{ok} '{a}' × '{b}' → {res.level} (expected {expected})")
