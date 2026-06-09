#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
analyze_missing.py — turn the raw crawl state into a TRUE missing list.

The raw audit_full "missing" is inflated by category/series/nav pages and duplicate
titles. This pass:
  1. rebuilds items with a STRICTER leaf rule (own media OR deep terminal),
  2. dedupes by normalized title,
  3. drops obvious category/series/nav pages,
  4. verifies each unique title against the FULL new inventory — by normalized title,
     prefix, canonical_match≥0.8, AND by attachment-filename match,
  5. emits only genuinely-absent lessons.

Run: env -u HTTPS_PROXY -u HTTP_PROXY NO_PROXY='*' \
       SUPABASE_MANAGEMENT_API_TOKEN=sbp_... python3 scripts/parity/analyze_missing.py
"""
from __future__ import annotations
import json, re, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

sys.path.insert(0, str(Path(__file__).parent))
from parity_engine import normalize_he, sql_query, canonical_match  # noqa: E402
from audit_full import build_items, STATE, OLD_SITE  # noqa: E402

REPORTS = Path(__file__).parent / "reports"

# titles that are clearly navigation / category / series-collection pages, not a lesson
NAV_RE = re.compile(r"(כל השיעורים|כל התכנים|כל המאמרים|אוסף|מאגר|^הפטרות|^פרשת השבוע$|"
                    r"^איך לומדים|^דף הבית|^תורה$|^נביאים$|^כתובים$)")


def pdf_basename(url: str) -> str:
    return normalize_he(unquote(url.rsplit("/", 1)[-1]).rsplit(".", 1)[0])


def main():
    if not STATE.exists():
        print("אין state file — הרץ קודם audit_full.py", file=sys.stderr); sys.exit(1)
    d = json.loads(STATE.read_text(encoding="utf-8"))
    pages, children = d["pages"], d["children"]
    print(f"state: {d['n']} עמודים, {len(d['frontier'])} בתור (0=הושלם)")

    items = build_items(pages, children)
    # stricter: keep only items with own media, or deep terminal article (depth>=5), and not nav
    strict = []
    for it in items:
        if NAV_RE.search(it["title"].strip()):
            continue
        has_media = bool(it.get("pdfs") or it.get("audio") or it.get("video"))
        if has_media or it.get("depth", 0) >= 5:
            strict.append(it)

    # dedupe by normalized title (keep first; count dups)
    by_norm: dict[str, dict] = {}
    dup = Counter()
    for it in strict:
        k = normalize_he(it["title"])
        if not k:
            continue
        dup[k] += 1
        by_norm.setdefault(k, it)
    print(f"פריטים: {len(items)} → אחרי סינון nav/leaf: {len(strict)} → ייחודיים: {len(by_norm)}")

    # new inventory: titles + attachment basenames
    new = sql_query("SELECT title, attachment_url FROM lessons")
    new_norm = {normalize_he(r["title"]) for r in new}
    new_titles = [r["title"] for r in new]
    new_att = {pdf_basename(r["attachment_url"]) for r in new if r.get("attachment_url")}

    truly_missing = []
    for k, it in by_norm.items():
        if k in new_norm:
            continue
        # prefix-14 fallback
        if any(len(k) >= 6 and len(nk) >= 6 and k[:14] == nk[:14] for nk in new_norm):
            continue
        # attachment-filename match (same PDF re-hosted under different title)
        if it.get("pdfs") and any(pdf_basename(p) in new_att for p in it["pdfs"]):
            continue
        # expensive canonical match against all new titles, only for survivors
        if any(canonical_match(it["title"], t).score >= 0.8 for t in new_titles):
            continue
        truly_missing.append(it)

    by_repo = Counter(m["repo"] for m in truly_missing)
    print("\n" + "=" * 52)
    print("  חוסרים אמיתיים (אחרי dedup + אימות גלובלי)")
    print("=" * 52)
    print(f"  ייחודיים שנבדקו:       {len(by_norm)}")
    print(f"  ⚠️ חוסרים אמיתיים:      {len(truly_missing)}")
    print(f"     ציבורי: {by_repo['public']} | מורים: {by_repo['teachers']}")
    print("=" * 52)
    with_pdf = [m for m in truly_missing if m.get("pdfs")]
    print(f"  מתוכם עם PDF באתר הישן (להעלאה): {len(with_pdf)}")
    print("\n  דוגמה (חוסרים אמיתיים עם PDF):")
    for m in with_pdf[:20]:
        print(f"   - [{m['repo']}] {m['title']}")

    out = REPORTS / f"missing-TRUE-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.json"
    out.write_text(json.dumps({
        "unique_checked": len(by_norm), "truly_missing": len(truly_missing),
        "by_repo": dict(by_repo), "with_pdf": len(with_pdf),
        "missing": truly_missing,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nנשמר: {out}")


if __name__ == "__main__":
    main()
