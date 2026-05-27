#!/usr/bin/env python3
"""
Playwright full-site lesson scanner — bneyzion.vercel.app
Scans all 12,792 published lessons in parallel (15-20 workers).
Output: audits/playwright-scan-2026-05-27.json + .csv + .md

Usage:
  python3 scripts/playwright-lessons-scan.py
  python3 scripts/playwright-lessons-scan.py --resume   # skip already-scanned IDs
  python3 scripts/playwright-lessons-scan.py --limit 100  # test run

Dependencies: playwright (pip install playwright && playwright install chromium)
"""

import asyncio
import csv
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

# ──────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────
SUPABASE_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
SUPABASE_PROJECT = "pzvmwfexeiruelwiujxn"
SITE_BASE = "https://bneyzion.vercel.app"
LESSON_URL_PATTERN = f"{SITE_BASE}/lessons/{{id}}"

CONCURRENCY = 15          # parallel Playwright workers
PAGE_TIMEOUT = 15_000     # ms per page load
SCREENSHOT_DIR = Path("audits/screenshots")
OUTPUT_JSON = Path("audits/playwright-scan-2026-05-27.json")
OUTPUT_CSV = Path("audits/playwright-scan-2026-05-27.csv")
OUTPUT_MD = Path("audits/playwright-scan-2026-05-27.md")
STATE_FILE = Path("audits/playwright-scan-2026-05-27-state.json")

CHECKPOINT_EVERY = 500    # print checkpoint every N lessons
EARLY_BAIL_THRESHOLD = 0.50  # if >50% fail on same pattern, stop and report

# Design checks
EXPECTED_BG_COLOR = None  # we check presence of cream/parchment class, not exact hex
GOLD_KEYWORDS = ["gold", "#8B6F47", "#C4A265", "#E8D5A0", "amber", "yellow"]

# ──────────────────────────────────────────────
# SUPABASE FETCH
# ──────────────────────────────────────────────
def fetch_lessons(limit: Optional[int] = None) -> list[dict]:
    """Fetch all published lesson IDs + metadata from Supabase Management API.
    Uses curl --noproxy '*' to bypass NetSpark MITM proxy.
    Paginates in batches of 1000 to avoid Supabase row limit.
    """
    import subprocess, json as jsonlib

    all_rows = []
    offset = 0
    batch = limit if (limit and limit <= 1000) else 1000

    while True:
        this_batch = min(batch, limit - offset) if limit else batch
        query = f"""
            SELECT
                l.id,
                l.title,
                l.audio_url,
                l.video_url,
                l.attachment_url,
                l.status,
                r.name AS rabbi_name,
                s.title AS series_title
            FROM lessons l
            LEFT JOIN rabbis r ON l.rabbi_id = r.id
            LEFT JOIN series s ON l.series_id = s.id
            WHERE l.status = 'published'
            ORDER BY l.id
            LIMIT {this_batch} OFFSET {offset};
        """

        payload = jsonlib.dumps({"query": query})
        result = subprocess.run(
            [
                "curl", "-s", "--noproxy", "*",
                "-X", "POST",
                f"https://api.supabase.com/v1/projects/{SUPABASE_PROJECT}/database/query",
                "-H", f"Authorization: Bearer {SUPABASE_TOKEN}",
                "-H", "Content-Type: application/json",
                "-d", payload,
            ],
            capture_output=True, text=True, timeout=60
        )

        if result.returncode != 0:
            raise RuntimeError(f"curl error: {result.stderr}")

        data = jsonlib.loads(result.stdout)
        if isinstance(data, dict) and "message" in data:
            raise RuntimeError(f"Supabase error: {data['message']}")

        rows = data
        all_rows.extend(rows)
        offset += len(rows)

        print(f"  Fetched batch: {offset} lessons so far...", flush=True)

        if len(rows) < this_batch:
            break  # last batch
        if limit and offset >= limit:
            break

    return all_rows


# ──────────────────────────────────────────────
# SCAN ONE LESSON
# ──────────────────────────────────────────────
async def scan_lesson(
    page,
    lesson: dict,
    screenshot_dir: Path,
) -> dict:
    lesson_id = lesson["id"]
    url = LESSON_URL_PATTERN.format(id=lesson_id)

    result = {
        "id": lesson_id,
        "url": url,
        "title": lesson.get("title", ""),
        "rabbi_name": lesson.get("rabbi_name", ""),
        "series_title": lesson.get("series_title", ""),
        "has_audio_in_db": bool(lesson.get("audio_url")),
        "has_video_in_db": bool(lesson.get("video_url")),
        "has_attachment_in_db": bool(lesson.get("attachment_url")),
        # result fields
        "status": "pass",
        "issues": [],
        "console_errors": [],
        "network_404s": [],
        "render_ms": 0,
        "screenshot": None,
    }

    console_errors = []
    network_404s = []

    def on_console(msg):
        if msg.type == "error":
            console_errors.append(msg.text)

    def on_response(resp):
        if resp.status == 404:
            network_404s.append(resp.url)

    try:
        # Attach listeners
        page.on("console", on_console)
        page.on("response", on_response)

        t0 = time.monotonic()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT)
            # Wait for React hydration — look for lesson title or error state
            try:
                await page.wait_for_selector("h1, [data-error], .error-boundary", timeout=15000)
            except Exception:
                pass  # proceed anyway, DOM checks will catch missing h1
        except Exception as e:
            if "timeout" in str(e).lower():
                result["issues"].append("TIMEOUT")
                result["status"] = "fail"
                return result
            raise

        result["render_ms"] = int((time.monotonic() - t0) * 1000)

        # ── DOM checks ──────────────────────────────

        # 1. Check for 404 page or error page
        page_text = await page.inner_text("body")
        if "404" in page_text[:200] or "לא נמצא" in page_text[:200]:
            result["issues"].append("PAGE_NOT_FOUND")
            result["status"] = "fail"

        # 2. H1 exists and non-empty
        h1 = await page.query_selector("h1")
        if not h1:
            result["issues"].append("NO_H1")
            result["status"] = "fail"
        else:
            h1_text = (await h1.inner_text()).strip()
            if not h1_text:
                result["issues"].append("H1_EMPTY")
                result["status"] = "fail"

        # 3. Rabbi name displayed (if rabbi_name in DB)
        if lesson.get("rabbi_name"):
            rabbi_in_page = lesson["rabbi_name"] in page_text
            if not rabbi_in_page:
                result["issues"].append("RABBI_MISSING_FROM_PAGE")
                # soft fail — warn only

        # 4. Series title displayed (if series_title in DB)
        if lesson.get("series_title"):
            series_in_page = lesson["series_title"] in page_text
            if not series_in_page:
                result["issues"].append("SERIES_MISSING_FROM_PAGE")

        # 5. Media element present if DB says there should be one
        if lesson.get("has_audio_in_db") or lesson.get("has_video_in_db"):
            audio_el = await page.query_selector("audio")
            video_el = await page.query_selector("video, iframe")
            if not audio_el and not video_el:
                result["issues"].append("MEDIA_MISSING_FROM_PAGE")
                result["status"] = "fail"

        # 6. PDF/attachment link if DB has attachment
        if lesson.get("has_attachment_in_db"):
            pdf_link = await page.query_selector("a[href*='.pdf'], a[href*='/media/']")
            if not pdf_link:
                result["issues"].append("ATTACHMENT_LINK_MISSING")

        # 7. RTL check
        html_dir = await page.get_attribute("html", "dir")
        body_dir = await page.get_attribute("body", "dir")
        if html_dir != "rtl" and body_dir != "rtl":
            # also check if there's a wrapper with dir=rtl
            rtl_wrapper = await page.query_selector("[dir='rtl']")
            if not rtl_wrapper:
                result["issues"].append("RTL_MISSING")
                result["status"] = "fail"

        # 8. Network 404s (filter to media/images only)
        media_404s = [
            u for u in network_404s
            if any(ext in u.lower() for ext in [".mp3", ".mp4", ".pdf", ".jpg", ".jpeg", ".png", ".webp"])
        ]
        if media_404s:
            result["issues"].append(f"MEDIA_404: {len(media_404s)} files")
            result["network_404s"] = media_404s[:5]  # keep first 5
            result["status"] = "fail"

        # 9. Console errors (filter noise)
        real_errors = [
            e for e in console_errors
            if not any(noise in e for noise in [
                "favicon", "sw.js", "chunk", "hot-update",
                "Warning:", "[React", "ResizeObserver"
            ])
        ]
        if real_errors:
            result["console_errors"] = real_errors[:3]
            # only fail on supabase/auth errors
            if any(kw in e for e in real_errors for kw in ["supabaseUrl", "AuthError", "TypeError", "is not a function"]):
                result["issues"].append("CONSOLE_CRITICAL_ERROR")
                result["status"] = "fail"

        # 10. Take screenshot only on failure
        if result["status"] == "fail" and result["issues"]:
            screenshot_dir.mkdir(parents=True, exist_ok=True)
            shot_path = screenshot_dir / f"{lesson_id}.png"
            await page.screenshot(path=str(shot_path), full_page=True)
            result["screenshot"] = str(shot_path)

    except Exception as e:
        result["issues"].append(f"EXCEPTION: {str(e)[:200]}")
        result["status"] = "error"

    finally:
        # Remove listeners (page is reused)
        page.remove_listener("console", on_console)
        page.remove_listener("response", on_response)

    return result


# ──────────────────────────────────────────────
# WORKER POOL
# ──────────────────────────────────────────────
async def worker(
    worker_id: int,
    queue: asyncio.Queue,
    results: list,
    browser,
    screenshot_dir: Path,
    counters: dict,
    lock: asyncio.Lock,
):
    context = await browser.new_context(
        viewport={"width": 1280, "height": 800},
        locale="he-IL",
        extra_http_headers={"Accept-Language": "he-IL,he;q=0.9"},
    )
    page = await context.new_page()

    try:
        while True:
            try:
                lesson = queue.get_nowait()
            except asyncio.QueueEmpty:
                break

            if counters.get("early_bail"):
                queue.task_done()
                continue

            result = await scan_lesson(page, lesson, screenshot_dir)

            async with lock:
                results.append(result)
                counters["done"] += 1
                if result["status"] == "fail":
                    counters["fail"] += 1
                elif result["status"] == "error":
                    counters["error"] += 1
                else:
                    counters["pass"] += 1

                done = counters["done"]
                total = counters["total"]

                if done % CHECKPOINT_EVERY == 0 or done == total:
                    elapsed = time.monotonic() - counters["start_time"]
                    rate = done / elapsed if elapsed > 0 else 1
                    eta_sec = (total - done) / rate if rate > 0 else 0
                    eta_min = int(eta_sec / 60)
                    print(
                        f"[CHECKPOINT] {done}/{total} scanned | "
                        f"pass={counters['pass']} fail={counters['fail']} err={counters['error']} | "
                        f"ETA: ~{eta_min} min",
                        flush=True,
                    )

                    # Early bail check
                    if done >= 200:
                        fail_rate = counters["fail"] / done
                        if fail_rate > EARLY_BAIL_THRESHOLD:
                            print(
                                f"\n[EARLY BAIL] {fail_rate:.1%} failure rate at {done} lessons. "
                                "Stopping to prevent wasted time. Check the results so far.",
                                flush=True,
                            )
                            counters["early_bail"] = True

            queue.task_done()
    except Exception as e:
        print(f"[WORKER {worker_id}] Unexpected error: {e}", flush=True)
    finally:
        try:
            await context.close()
        except Exception:
            pass


# ──────────────────────────────────────────────
# ANALYSIS
# ──────────────────────────────────────────────
def analyze_results(results: list) -> dict:
    passes = [r for r in results if r["status"] == "pass"]
    fails = [r for r in results if r["status"] == "fail"]
    errors = [r for r in results if r["status"] == "error"]

    # Count issue patterns
    issue_counts: dict[str, int] = {}
    for r in fails + errors:
        for issue in r["issues"]:
            # Normalize: strip trailing numbers/details
            key = issue.split(":")[0].strip()
            issue_counts[key] = issue_counts.get(key, 0) + 1

    # Sort by frequency
    top_patterns = sorted(issue_counts.items(), key=lambda x: -x[1])[:10]

    # Sample 5 per pattern
    samples: dict[str, list] = {}
    for pattern, _ in top_patterns:
        pattern_key = pattern.split(":")[0].strip()
        matched = [
            r for r in (fails + errors)
            if any(i.startswith(pattern_key) for i in r["issues"])
        ][:5]
        samples[pattern_key] = matched

    return {
        "total": len(results),
        "pass": len(passes),
        "fail": len(fails),
        "error": len(errors),
        "top_patterns": top_patterns,
        "samples": samples,
    }


def write_markdown_report(analysis: dict, output_path: Path, scan_date: str):
    lines = [
        f"# Playwright Scan Report — {scan_date}",
        f"",
        f"## Summary",
        f"",
        f"| Metric | Count |",
        f"|--------|-------|",
        f"| Total scanned | {analysis['total']} |",
        f"| Pass | {analysis['pass']} ({analysis['pass']/max(analysis['total'],1)*100:.1f}%) |",
        f"| Fail | {analysis['fail']} ({analysis['fail']/max(analysis['total'],1)*100:.1f}%) |",
        f"| Error | {analysis['error']} ({analysis['error']/max(analysis['total'],1)*100:.1f}%) |",
        f"",
        f"## Top 5 Failure Patterns",
        f"",
    ]

    for i, (pattern, count) in enumerate(analysis["top_patterns"][:5], 1):
        pct = count / max(analysis["total"], 1) * 100
        lines.append(f"### {i}. `{pattern}` — {count} lessons ({pct:.1f}%)")
        lines.append("")

        # Fix suggestion
        fix_map = {
            "TIMEOUT": "Page load >15s. Likely heavy JS bundle or Supabase query bottleneck.",
            "PAGE_NOT_FOUND": "Lesson exists in DB but route returns 404. Check router + lesson slug.",
            "NO_H1": "Title not rendered. Likely data hook returns null/empty for this lesson.",
            "H1_EMPTY": "H1 rendered but empty text. Same root cause as NO_H1.",
            "MEDIA_MISSING_FROM_PAGE": "DB has audio/video but component not rendering media player. Check LessonPage audio_url condition.",
            "ATTACHMENT_LINK_MISSING": "DB has attachment_url but PDF link not rendered. Check attachment_url condition in LessonPage.",
            "RTL_MISSING": "dir=rtl not set on html/body/wrapper. Check Layout.tsx html lang+dir attributes.",
            "MEDIA_404": "Media file missing from S3 bucket or /media/ path. See attachment_url fix.",
            "CONSOLE_CRITICAL_ERROR": "JS error in console. Likely supabaseUrl config or React render error.",
            "RABBI_MISSING_FROM_PAGE": "Rabbi name in DB but not displayed. Check useLesson join or LessonPage rabbi display.",
            "SERIES_MISSING_FROM_PAGE": "Series title in DB but not displayed. Check series join in useLesson.",
        }
        fix = fix_map.get(pattern, "Investigate individual samples.")
        lines.append(f"**Fix suggestion:** {fix}")
        lines.append("")

        # Sample lessons
        samples = analysis["samples"].get(pattern.split(":")[0].strip(), [])
        if samples:
            lines.append("**Sample lessons:**")
            lines.append("")
            for s in samples:
                shot = f" [[screenshot](../../{s['screenshot']})]" if s.get("screenshot") else ""
                lines.append(f"- [{s['title'] or s['id']}]({s['url']}) — {', '.join(s['issues'][:3])}{shot}")
            lines.append("")

    lines += [
        f"## Fix Recommendations",
        f"",
        f"1. **MEDIA_MISSING_FROM_PAGE / MEDIA_404** — 335 audio URLs were fixed in this session (http→https). Remaining failures may be S3-missing files.",
        f"2. **TIMEOUT** — If >5% of lessons timeout, consider lazy-loading or skeleton states.",
        f"3. **RTL_MISSING** — Single fix in `index.html` or `Layout.tsx`: add `dir=\"rtl\"` to `<html>` tag.",
        f"4. **NO_H1 / H1_EMPTY** — These are likely the 137 empty-content lessons that were demoted to draft in this session.",
        f"5. **ATTACHMENT_LINK_MISSING** — 783 attachment URLs prefixed with `https://www.bneyzion.co.il` in this session. Remaining failures = old site still unreachable.",
        f"",
        f"---",
        f"*Generated: {scan_date} · Scanner: scripts/playwright-lessons-scan.py*",
    ]

    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Markdown report: {output_path}", flush=True)


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────
async def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", action="store_true", help="Skip already-scanned IDs")
    parser.add_argument("--limit", type=int, default=None, help="Test run with N lessons")
    args = parser.parse_args()

    scan_date = datetime.now().strftime("%Y-%m-%d %H:%M")
    print(f"[START] Playwright lesson scanner — {scan_date}", flush=True)
    print(f"  Site: {SITE_BASE}", flush=True)
    print(f"  Concurrency: {CONCURRENCY}", flush=True)

    # Fetch lessons from Supabase
    print("[FETCH] Loading lesson list from Supabase...", flush=True)
    lessons = fetch_lessons(limit=args.limit)
    print(f"[FETCH] {len(lessons)} published lessons found", flush=True)

    # Resume support
    already_scanned_ids = set()
    existing_results = []
    if args.resume and STATE_FILE.exists():
        existing_results = json.loads(STATE_FILE.read_text())
        already_scanned_ids = {r["id"] for r in existing_results}
        print(f"[RESUME] {len(already_scanned_ids)} already scanned, skipping", flush=True)

    # Filter
    lessons_to_scan = [l for l in lessons if l["id"] not in already_scanned_ids]
    print(f"[QUEUE] {len(lessons_to_scan)} lessons to scan", flush=True)

    if not lessons_to_scan:
        print("[DONE] Nothing to scan.", flush=True)
        return

    # Setup
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

    # Build queue
    queue = asyncio.Queue()
    for lesson in lessons_to_scan:
        await queue.put(lesson)

    results = list(existing_results)
    lock = asyncio.Lock()
    counters = {
        "done": len(existing_results),
        "pass": sum(1 for r in existing_results if r["status"] == "pass"),
        "fail": sum(1 for r in existing_results if r["status"] == "fail"),
        "error": sum(1 for r in existing_results if r["status"] == "error"),
        "total": len(lessons),
        "start_time": time.monotonic(),
        "early_bail": False,
    }

    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )

        workers = [
            worker(i, queue, results, browser, SCREENSHOT_DIR, counters, lock)
            for i in range(min(CONCURRENCY, len(lessons_to_scan)))
        ]

        await asyncio.gather(*workers)
        await browser.close()

    # Save state (for resume)
    STATE_FILE.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[SAVE] State saved: {STATE_FILE}", flush=True)

    # Save JSON
    OUTPUT_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[SAVE] JSON: {OUTPUT_JSON}", flush=True)

    # Save CSV
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "id", "url", "title", "rabbi_name", "series_title",
            "status", "issues", "render_ms", "screenshot",
        ])
        writer.writeheader()
        for r in results:
            writer.writerow({
                "id": r["id"],
                "url": r["url"],
                "title": r.get("title", ""),
                "rabbi_name": r.get("rabbi_name", ""),
                "series_title": r.get("series_title", ""),
                "status": r["status"],
                "issues": "|".join(r.get("issues", [])),
                "render_ms": r.get("render_ms", 0),
                "screenshot": r.get("screenshot", ""),
            })
    print(f"[SAVE] CSV: {OUTPUT_CSV}", flush=True)

    # Analysis + Markdown report
    analysis = analyze_results(results)
    write_markdown_report(analysis, OUTPUT_MD, scan_date)

    # Final summary
    print("\n" + "=" * 60, flush=True)
    print(f"FINAL RESULTS ({analysis['total']} lessons)", flush=True)
    print(f"  Pass:  {analysis['pass']} ({analysis['pass']/max(analysis['total'],1)*100:.1f}%)", flush=True)
    print(f"  Fail:  {analysis['fail']} ({analysis['fail']/max(analysis['total'],1)*100:.1f}%)", flush=True)
    print(f"  Error: {analysis['error']} ({analysis['error']/max(analysis['total'],1)*100:.1f}%)", flush=True)
    print("\nTop failure patterns:", flush=True)
    for pattern, count in analysis["top_patterns"][:5]:
        print(f"  {count:5d}x {pattern}", flush=True)
    print("=" * 60, flush=True)

    if counters.get("early_bail"):
        print("\n[NOTICE] Early bail triggered — scan stopped early due to high failure rate.", flush=True)
        print("Review the partial results and fix the root cause before re-running.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
