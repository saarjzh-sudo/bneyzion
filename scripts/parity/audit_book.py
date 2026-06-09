#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audit_book.py — working 1:1 parity audit for one book, TEACHERS section.

Reuses the *proven* primitives in parity_engine.py (normalize_he, canonical_match,
diff_inventories, sql_query, check_url, is_real_pdf) and the proven old-site crawl
path /מאגר-עזרי-הלמידה/{book}/ (same path the re-host used successfully).

Replaces the broken step_a crawl (which queried /פרשת-השבוע/?book= and returned 0).

Read-only. No DB writes. Run:
  env -u HTTPS_PROXY -u HTTP_PROXY NO_PROXY='*' \
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... python3 scripts/parity/audit_book.py --book בראשית
"""
from __future__ import annotations
import argparse, json, re, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, unquote

sys.path.insert(0, str(Path(__file__).parent))
from parity_engine import (  # noqa: E402
    OLD_SITE, normalize_he, diff_inventories, sql_query, fetch_html, check_url, is_real_pdf,
)

STORAGE_HOST = "pzvmwfexeiruelwiujxn.supabase.co"
REPORTS = Path(__file__).parent / "reports"
REPORTS.mkdir(exist_ok=True)

BOOK_TO_PATH = {
    "בראשית": "תורה/בראשית", "שמות": "תורה/שמות", "ויקרא": "תורה/ויקרא",
    "במדבר": "תורה/במדבר", "דברים": "תורה/דברים", "יהושע": "נביאים/יהושע",
    "שופטים": "נביאים/שופטים", "שמואל א": "נביאים/שמואל-א", "שמואל ב": "נביאים/שמואל-ב",
    "שמואל": "נביאים/שמואל-א", "מלכים א": "נביאים/מלכים-א", "מלכים ב": "נביאים/מלכים-ב",
    "ישעיהו": "נביאים/ישעיהו", "ירמיהו": "נביאים/ירמיהו", "יחזקאל": "נביאים/יחזקאל",
    "אסתר": "כתובים/אסתר", "רות": "כתובים/רות", "תהלים": "כתובים/תהלים",
}


def enc(path: str) -> str:
    return "/" + "/".join(quote(p, safe="") for p in path.split("/") if p) + "/"


def title_from_url(url: str) -> str:
    seg = url.rstrip("/").split("/")[-1]
    try:
        return unquote(seg).replace("-", " ").strip()
    except Exception:
        return seg.replace("-", " ").strip()


def old_inventory_teachers(book: str) -> list[dict]:
    """Crawl /מאגר-עזרי-הלמידה/{book}/ → series → lessons (the proven path)."""
    path = BOOK_TO_PATH.get(book)
    if not path:
        print(f"  אין מיפוי נתיב לספר '{book}'", file=sys.stderr)
        return []
    book_url = OLD_SITE + enc(f"מאגר-עזרי-הלמידה/{path}")
    html = fetch_html(book_url)
    if not html:
        print(f"  לא ניתן לטעון {book_url}", file=sys.stderr)
        return []
    prefix = f"/מאגר-עזרי-הלמידה/{path}/"
    series_paths = sorted(set(
        p for p in re.findall(r'href="(/מאגר-עזרי-הלמידה/[^"]+)"', html)
        if p.startswith(prefix) and len(p) > len(prefix)
    ))
    items: list[dict] = []
    seen: set[str] = set()
    for sp in series_paths:
        series_url = OLD_SITE + sp
        series_title = title_from_url(series_url)
        shtml = fetch_html(series_url)
        if not shtml:
            continue
        sub = sorted(set(
            l for l in re.findall(r'href="(/מאגר-עזרי-הלמידה/[^"]+)"', shtml)
            if l.startswith(sp) and len(l) > len(sp)
        ))
        pdfs = sorted(set(OLD_SITE + p for p in re.findall(r'href="(/media/[^"]+\.pdf)"', shtml, re.I)))
        if sub:
            for l in sub:
                if l in seen:
                    continue
                seen.add(l)
                items.append({"title": title_from_url(OLD_SITE + l), "url": OLD_SITE + l,
                              "series": series_title, "type": "lesson"})
        else:  # leaf series (worksheet collection)
            if series_url not in seen:
                seen.add(series_url)
                items.append({"title": series_title, "url": series_url, "series": series_title,
                              "type": "leaf", "pdfs": pdfs})
    return items


def new_inventory_teachers(book: str) -> list[dict]:
    base = book.split(" ")[0].replace("'", "''")
    safe = book.replace("'", "''")
    return sql_query(f"""
        SELECT l.id, l.title, l.attachment_url, l.audio_url, l.video_url, l.status,
               s.title AS series_title
        FROM lessons l LEFT JOIN series s ON s.id = l.series_id
        WHERE (l.bible_book = '{safe}' OR l.bible_book LIKE '{base}%')
          AND l.audience_tags @> ARRAY['teachers']::text[]
        ORDER BY s.title NULLS LAST, l.title;
    """)


def audit_attachments(new_items: list[dict]) -> dict:
    """Rule 13 + real-PDF + inline-render check on each new attachment."""
    on_old_site, not_pdf, blocked_inline, ok, no_att = [], [], [], 0, 0
    for it in new_items:
        url = it.get("attachment_url") or ""
        if not url:
            if not (it.get("audio_url") or it.get("video_url")):
                no_att += 1
            continue
        if "bneyzion.co.il" in url:
            on_old_site.append(it["title"]); continue
        status, ctype, clen = check_url(url)
        ctl = ctype.lower()
        # accept PDF *and* Office docs (Word/Excel/PowerPoint) — all are legitimate self-hosted attachments
        valid_ctype = any(t in ctl for t in (
            "application/pdf", "octet-stream", "msword", "officedocument",
            "ms-excel", "ms-powerpoint", "opendocument",
        ))
        if status != 200 or clen == 0 or not valid_ctype:
            not_pdf.append(f"{it['title']} — HTTP {status} {ctype or ''} {clen}b".strip()); continue
        ok += 1
    return {"ok": ok, "no_media": no_att, "on_old_site_RULE13": on_old_site,
            "broken_pdf": not_pdf, "self_hosted_pct": round(100 * ok / max(1, ok + len(on_old_site) + len(not_pdf)), 1)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", default="בראשית")
    args = ap.parse_args()
    book = args.book
    print(f"=== Parity audit (teachers) — ספר {book} ===\n")

    print("שלב A — אינוונטר ישן (bneyzion.co.il /מאגר-עזרי-הלמידה)...")
    old = old_inventory_teachers(book)
    print(f"  ישן: {len(old)} פריטים\n")

    print("שלב B — אינוונטר חדש (Supabase, audience=teachers)...")
    new = new_inventory_teachers(book)
    print(f"  חדש: {len(new)} שיעורים\n")

    print("שלב C+E — התאמה קנונית + diff דו-כיווני...")
    d = diff_inventories(old, new, old_title_key="title", new_title_key="title")

    # Global missing-verification: a section diff can flag an item as "missing" only
    # because it lives under the OTHER audience (general↔teachers) or a hyphen/spacing
    # title variant. Re-check every "missing" against the ENTIRE new lesson set before
    # declaring it truly absent. (Bereshit: this turned 26 false-missing → 0.)
    from parity_engine import canonical_match as _cm
    all_titles = [r.get("title", "") for r in sql_query("SELECT title FROM lessons")]
    all_norm = {normalize_he(t) for t in all_titles}
    really_missing = []
    for m in d.missing:
        nt = normalize_he(m.get("title", ""))
        if nt in all_norm:
            continue
        if any(_cm(m.get("title", ""), t).score >= 0.8 for t in all_titles):
            continue
        really_missing.append(m)
    d.missing = really_missing
    s = d.summary()

    print("שלב D — בדיקת attachments (Rule 13 + PDF אמיתי)...")
    att = audit_attachments(new)

    total_old = len(old)
    parity_pct = round(100 * s["matched"] / max(1, total_old), 1)

    print("\n" + "=" * 48)
    print(f"  דוח PARITY — {book} (אגף מורים)")
    print("=" * 48)
    print(f"  פריטים בישן:        {total_old}")
    print(f"  שיעורים בחדש:       {len(new)}")
    print(f"  מותאמים 1:1:        {s['matched']}  ({parity_pct}%)")
    print(f"  חוסרים (בישן→אין):  {s['missing']}")
    print(f"  תוספות (בחדש→אין):  {s['extras']}")
    print(f"  אי-התאמות:          {s['mismatches']}")
    print("  --- attachments ---")
    print(f"  תקינים self-hosted: {att['ok']}  ({att['self_hosted_pct']}%)")
    print(f"  ⚠️ על האתר הישן (Rule13): {len(att['on_old_site_RULE13'])}")
    print(f"  ⚠️ PDF שבור:         {len(att['broken_pdf'])}")
    print(f"  בלי מדיה:           {att['no_media']}")
    print("=" * 48)
    if d.missing[:8]:
        print("\nדוגמת חוסרים (בישן, לא נמצאו בחדש):")
        for m in d.missing[:8]:
            print(f"  - {m.get('title')}  [{m.get('series','')}]")
    if att["on_old_site_RULE13"][:5]:
        print("\n⚠️ עדיין על האתר הישן:")
        for t in att["on_old_site_RULE13"][:5]:
            print(f"  - {t}")

    out = REPORTS / f"parity-{book}-{datetime.now(timezone.utc).strftime('%Y%m%d')}.json"
    out.write_text(json.dumps({
        "book": book, "old_count": total_old, "new_count": len(new),
        "summary": s, "parity_pct": parity_pct, "attachments": att,
        "missing": d.missing, "extras": d.extras, "mismatches": d.mismatches,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nנשמר: {out}")


if __name__ == "__main__":
    main()
