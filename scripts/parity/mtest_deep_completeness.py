#!/usr/bin/env python3
"""mtest_deep_completeness.py — ROUND 3 DEEP test: does every OLD lesson exist in the NEW site,
by audio golden-key (S3 basename) OR normalized title, regardless of nesting/grouping?
Sources (all cached, no scraping): oneone/old_listings_*.json (deep old) + oneone/newdb_*.json (new DB).
Outputs /tmp/mtest_deep/unmatched_by_page.json + prints summary."""
import json, os, re, urllib.parse, unicodedata
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = "/tmp/mtest_deep"; os.makedirs(OUT, exist_ok=True)

def nfc(s): return unicodedata.normalize("NFC", s or "")
def norm_title(s):
    s = nfc(s); s = re.sub(r"[֑-ׇ]", "", s)
    s = re.sub(r"\s*\([0-9]+\)\s*", " ", s)
    s = re.sub(r"[\"'״׳`’‘“”|()\[\].,:;!?\-–—_]", " ", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s
def audio_key(url):
    if not url: return None
    b = os.path.basename(urllib.parse.unquote(url.split("?")[0]))
    b = re.sub(r"\.(mp3|m4a|wav|aac)$", "", b, flags=re.I)
    b = nfc(b); b = re.sub(r"[\s+\-_.]", "", b).lower()
    return b or None

# ---- NEW side: audio-key set + title-norm set ----
new_audio = set(); new_titles = set()
for m in json.load(open(os.path.join(HERE, "oneone/newdb_lessons_media.json"), encoding="utf-8")):
    k = audio_key(m.get("audio_url"))
    if k: new_audio.add(k)
    for a in (m.get("additional_attachments") or []):
        k2 = audio_key(a if isinstance(a, str) else a.get("href"))
        if k2: new_audio.add(k2)
for l in json.load(open(os.path.join(HERE, "oneone/newdb_lessons.json"), encoding="utf-8")):
    t = norm_title(l.get("title"))
    if t: new_titles.add(t)
print(f"NEW keys: {len(new_audio)} audio, {len(new_titles)} titles")

# ---- OLD side: every item across both deep listings ----
NAV = ("סדרת שיעורים", "כל השיעורים", "מעבר ל")
TEACHER = ("דפי עבודה", "שאלות חזרה", "שאלות בעיון", "חידות", "ביאורי מילים", "דף עבודה")
unmatched = defaultdict(list); total = 0; matched = 0; nav_skip = 0
for fn in ("oneone/old_listings_torah_ketuvim.json", "oneone/old_listings_neviim_moadim.json"):
    raw = json.load(open(os.path.join(HERE, fn), encoding="utf-8"))
    pages = raw.get("pages") if isinstance(raw, dict) and "pages" in raw else {k: v for k, v in raw.items() if k != "_meta" and isinstance(v, dict)}
    for url, pg in pages.items():
        h1 = pg.get("h1") or url
        for it in pg.get("items", []):
            title = it.get("title") or ""
            if not title or title.strip() in NAV: nav_skip += 1; continue
            total += 1
            tnorm = norm_title(it.get("title_norm") or title)
            akeys = []
            for med in (it.get("media") or []):
                href = med.get("href") if isinstance(med, dict) else (med if isinstance(med, str) else None)
                k = audio_key(href)
                if k: akeys.append(k)
            hit = any(k in new_audio for k in akeys) or (tnorm in new_titles)
            if hit: matched += 1
            else:
                unmatched[h1].append({"title": title, "rabbi": it.get("rabbi"), "type": it.get("type"),
                                       "has_audio": bool(akeys), "page": url})

# ---- report ----
miss_items = sum(len(v) for v in unmatched.values())
print(f"OLD items judged: {total} | matched: {matched} ({100*matched//max(total,1)}%) | UNMATCHED: {miss_items} across {len(unmatched)} pages | nav-skipped: {nav_skip}")
ranked = sorted(unmatched.items(), key=lambda kv: -len(kv[1]))
json.dump({"summary": {"old_total": total, "matched": matched, "unmatched": miss_items, "pages": len(unmatched)},
           "by_page": {k: v for k, v in ranked}}, open(os.path.join(OUT, "unmatched_by_page.json"), "w"), ensure_ascii=False, indent=1)
print("\n=== top pages by unmatched count ===")
for h1, items in ranked[:25]:
    audio_miss = sum(1 for i in items if i["has_audio"])
    print(f"  {h1[:34]:34s} unmatched={len(items):>3} (with-audio={audio_miss})")
print(f"\nfull list → {OUT}/unmatched_by_page.json")
