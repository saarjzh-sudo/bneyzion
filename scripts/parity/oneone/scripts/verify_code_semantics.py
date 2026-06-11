#!/usr/bin/env python3
"""
verify_code_semantics.py — idempotent sanity check for code_semantics.md.

Verifies, against the live working tree (read-only):
  1. Every public-facing route in src/App.tsx (excluding /admin/*, /design-*, auth/portal/store/
     community/memorial/static pages out of scope) is mentioned in code_semantics.md.
  2. Every src file cited in the doc exists.
  3. Spot-checks that load-bearing claims still match the code (grep assertions).

Exit 0 + JSON summary on stdout. Re-runnable any time the doc or code changes.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path("/Users/srhlq/Downloads/saar-workspace/bneyzion")
DOC = ROOT / "scripts/parity/oneone/code_semantics.md"
APP = ROOT / "src/App.tsx"

# Routes that are in scope for the 1:1 content-parity audit
IN_SCOPE_PREFIXES = (
    "/teachers", "/lessons/", "/rabbis", "/parasha", "/series", "/category/",
    "/topic/", "/bible/",
)

OUT_OF_SCOPE = {
    # commerce / auth / community / static / campaign pages — not old-site content parity
    "/", "/auth", "/portal", "/portal-login", "/portal-old", "/courses", "/checkout",
    "/store", "/store/:slug", "/about", "/terms", "/privacy-policy", "/contact",
    "/donate", "/kenes", "/kenes-2026-05", "/kenes-archive", "/dor-haplaot",
    "/daily-verse", "/daily-video", "/memorial", "/memorial/saadia", "/roadmap",
    "/proposal", "/thank-you", "/favorites", "/history", "/profile", "/community",
    "/community/:id", "/chapter-weekly", "/megilat-esther", "/dev-pages",
    "/design-my-courses", "/program/weekly-chapter", "/course/weekly-chapter",
    "/course/:slug", "/portal/course/:id",
}

SPOT_CHECKS = [
    # (file, regex, claim)
    ("src/hooks/useSeriesHierarchy.ts", r'\.eq\("parent_id", parentId!\)\s*\.order\("title"\)',
     "useSeriesChildren orders by title only (R-SER1)"),
    ("src/hooks/useLessonsBySeries.ts", r'order\("bible_chapter"', "series lessons ordered by bible_chapter"),
    ("src/hooks/useLessonsBySeries.ts", r'\+ "::" \+ \(l\.rabbi_id \|\| ""\)', "dedup key title::rabbi_id"),
    ("src/hooks/useParasha.ts", r'title\.ilike\.%\$\{t\}%', "parasha bare ilike match (risk #1)"),
    ("src/hooks/useParasha.ts", r'\.limit\(150\)', "parasha lessons limit 150"),
    ("src/hooks/useContentSidebar.ts", r'\.eq\("status", "category"\)', "Neviim books category-only"),
    ("src/hooks/useContentSidebar.ts", r'\.limit\(200\)', "useSeriesForNode limit 200"),
    ("src/hooks/useLesson.ts", r'\.eq\("status", "published"\)', "useLesson published filter"),
    ("src/pages/LessonPage.tsx", None, None),  # existence only
    ("src/components/lesson/LessonDialog.tsx", r'src=\{\(lesson as any\)\.attachment_url\}',
     "LessonDialog iframes raw attachment_url (R-DLG1)"),
    ("src/pages/DesignPreviewSeriesPageV2.tsx", r'audience_tags\.includes\("teachers"\)',
     "series page teachers redirect"),
    ("src/hooks/useRabbi.ts", r'\.limit\(60\)', "rabbi lessons limit 60"),
    ("src/hooks/useRabbi.ts", r'deduped\.slice\(0, 20\)', "rabbi lessons cap 20"),
    ("src/hooks/useTopSeries.ts", r'\.eq\("status", "active"\)', "catalog active-only"),
    ("src/hooks/useGlobalSearch.ts", r'\.eq\("status", "active"\)', "search active-only series/rabbis"),
    ("src/components/layout-v2/DesignSidebar.tsx", r'/how-to-learn-tanach', "dead quick-link present"),
    ("src/hooks/useTopicsSidebar.ts", r'from\("lesson_topics"\)', "sidebar topic counts via lesson_topics"),
    ("src/pages/TopicPage.tsx", r'\.limit\(500\)', "topic lessons cap 500"),
    ("src/hooks/useTeacherBookContent.ts", r'bible_book=eq\.', "teachers book keyed on bible_book"),
    ("src/hooks/useBible.ts", r'\.gt\("lesson_count", 0\)', "bible book series lesson_count>0 gate"),
]


def extract_routes(app_src: str):
    return sorted(set(re.findall(r'<Route path="([^"]+)"', app_src)))


def main():
    doc = DOC.read_text(encoding="utf-8")
    app_src = APP.read_text(encoding="utf-8")
    routes = extract_routes(app_src)

    public_routes = [
        r for r in routes
        if not r.startswith("/admin") and not r.startswith("/design-") and r != "*"
        and r not in OUT_OF_SCOPE
    ]
    in_scope = [r for r in public_routes if r.startswith(IN_SCOPE_PREFIXES)]
    leftover = [r for r in public_routes if r not in in_scope]

    missing_routes = []
    for r in in_scope:
        # normalize param syntax for doc search: /series/:id → '/series/:id' appears verbatim in doc
        if r not in doc:
            missing_routes.append(r)

    # 2. cited files exist
    cited = sorted(set(re.findall(r'`(src/[A-Za-z0-9_\-./]+\.(?:tsx?|ts))', doc)) |
                   set(re.findall(r'\((src/[A-Za-z0-9_\-./]+\.(?:tsx?|ts))', doc)))
    missing_files = [c for c in cited if not (ROOT / c).exists()]

    # 3. spot checks
    failed_checks = []
    for fname, pattern, claim in SPOT_CHECKS:
        p = ROOT / fname
        if not p.exists():
            failed_checks.append(f"file missing: {fname}")
            continue
        if pattern is None:
            continue
        if not re.search(pattern, p.read_text(encoding="utf-8")):
            failed_checks.append(f"{fname}: pattern not found ({claim})")

    risk_rows = len(re.findall(r"^\| \d+ \|", doc, flags=re.M))
    sections = len(re.findall(r"^## ", doc, flags=re.M))

    summary = {
        "ok": not missing_routes and not missing_files and not failed_checks,
        "routes_total_in_app": len(routes),
        "routes_in_scope": len(in_scope),
        "in_scope_routes": in_scope,
        "routes_missing_from_doc": missing_routes,
        "out_of_scope_public_routes_not_required": leftover,
        "cited_src_files": len(cited),
        "cited_files_missing": missing_files,
        "spot_checks": len([c for c in SPOT_CHECKS if c[1]]),
        "spot_check_failures": failed_checks,
        "doc_sections": sections,
        "top_risk_rows": risk_rows,
        "doc_bytes": DOC.stat().st_size,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
