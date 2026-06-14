#!/usr/bin/env python3
"""R1 standalone+שו"ת matcher (READ-ONLY analysis).
For each Torah book:
 - parse GT category page (corrected selector via r1_parse) -> standalone(kind=lesson) + shut(kind=shut)
 - match each GT row vs DB lessons (status=published, bible_book=<book>) by normalized title
     * standalone match = exists with series_id IS NULL  (the "surfaced" set)
     * any match       = exists anywhere (also nested under a series)
 - resolve rabbi_id by author name (exact normalized name in rabbis table; else NULL->yoav fallback)
 - classify media of GT row download[0]:
     * s3 / vp4 / youtube / direct http(s) (not bneyzion.co.il/media) -> direct
     * /media/... or bneyzion.co.il/media/... -> rehost (legacy_attachment_url, Rule13 flag)
     * none -> text-only
 - emit per-book report json under r1/standalone_recon_<book>.json
Outputs only; no DB writes.
"""
import importlib.util, hashlib, json, re, os, unicodedata, html as htmlmod, sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("r1_parse", os.path.join(HERE, "r1_parse.py"))
P = importlib.util.module_from_spec(spec); spec.loader.exec_module(P)

BOOKS = ["בראשית","שמות","ויקרא","במדבר","דברים"]
YOAV_ID = "acd34d0f-1288-47b8-9e8e-38e69599c294"  # הרב יואב אוריאל
DBCACHE = os.path.join(HERE, "r1", "dbcache")
BASE = "https://www.bneyzion.co.il"

def norm(s):
    return P.norm(s)

def norm_name(s):
    """normalize a rabbi/author display name for matching: drop niqqud, (לנשים) suffix, quotes."""
    if not s: return ""
    s = htmlmod.unescape(s)
    s = "".join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\(לנשים\)", "", s)
    s = re.sub(r"[\"'״׳`]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def classify_media(row):
    dls = row.get("download") or []
    if not dls:
        return {"kind": "text", "url": None, "legacy": None}
    href = dls[0]["href"]
    low = href.lower()
    # rehost candidates: relative /media or absolute bneyzion.co.il/media
    if re.match(r"^/media/", href) or re.search(r"bneyzion\.co\.il/media/", low):
        legacy = href if href.startswith("http") else BASE + href
        return {"kind": "rehost", "url": None, "legacy": legacy}
    # direct: s3, vp4, youtube, other external http(s)
    if href.startswith("http"):
        return {"kind": "direct", "url": href, "legacy": None}
    # relative non-media -> treat as page link only, no media
    return {"kind": "text", "url": None, "legacy": None}

def media_source_type(row, mclass):
    icons = row.get("media") or []
    if "video" in icons or "youtube" in icons:
        return "video"
    if "audio" in icons:
        return "audio"
    if mclass["kind"] in ("direct","rehost"):
        # has a downloadable file but icon says nothing -> default to its type
        u = (mclass["url"] or mclass["legacy"] or "").lower()
        if u.endswith(".mp3") or "audio" in u: return "audio"
        if u.endswith(".mp4") or "video" in u or "vp4" in u: return "video"
        return "article"   # pdf/doc article
    return "text"

def load_db(book):
    return json.load(open(os.path.join(DBCACHE, f"all_{book}.json"), encoding="utf-8"))

def load_rabbis():
    return json.load(open(os.path.join(DBCACHE, "rabbis.json"), encoding="utf-8"))

def main():
    rabbis = load_rabbis()
    rabbi_by_name = {}
    for r in rabbis:
        rabbi_by_name[norm_name(r["name"])] = r["id"]

    grand = {}
    for book in BOOKS:
        url = f"{BASE}/מאגר-השיעורים-והמאמרים/תורה/{book}/"
        sha = hashlib.sha1(url.encode("utf-8")).hexdigest()
        h = open(os.path.join(HERE, "r1cache", sha + ".html"), encoding="utf-8", errors="replace").read()
        rows = P.parse_category(h)
        gt = [r for r in rows if r["kind"] in ("lesson","shut")]

        db = load_db(book)
        # title -> rows (all) ; standalone subset
        db_by_title = {}
        db_standalone_by_title = {}
        for d in db:
            tn = norm(d["title"])
            db_by_title.setdefault(tn, []).append(d)
            if d["series_id"] is None:
                db_standalone_by_title.setdefault(tn, []).append(d)

        out_rows = []
        for r in gt:
            tn = r["title_norm"]
            in_standalone = tn in db_standalone_by_title
            in_any = tn in db_by_title
            mclass = classify_media(r)
            src = media_source_type(r, mclass)
            an = norm_name(r["author"])
            rid = rabbi_by_name.get(an)
            rid_fallback = rid is None
            out_rows.append({
                "idx": r["idx"],
                "kind": r["kind"],
                "title": r["title"],
                "title_norm": tn,
                "author": r["author"],
                "rabbi_id": rid if rid else YOAV_ID,
                "rabbi_matched": not rid_fallback,
                "href": r["href"],
                "media_class": mclass["kind"],
                "media_url": mclass["url"],
                "legacy_url": mclass["legacy"],
                "source_type": src,
                "in_standalone": in_standalone,
                "in_any": in_any,
                "no_title": not r["title"].strip(),
            })
        grand[book] = out_rows
        json.dump(out_rows, open(os.path.join(HERE, "r1", f"standalone_recon_{book}.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=2)

        std = [r for r in out_rows if r["kind"]=="lesson"]
        shut = [r for r in out_rows if r["kind"]=="shut"]
        def summ(rows):
            return {
                "total": len(rows),
                "in_standalone": sum(1 for r in rows if r["in_standalone"]),
                "in_any_not_standalone": sum(1 for r in rows if r["in_any"] and not r["in_standalone"]),
                "missing": sum(1 for r in rows if not r["in_any"]),
                "missing_from_standalone": sum(1 for r in rows if not r["in_standalone"]),
                "rehost": sum(1 for r in rows if r["media_class"]=="rehost"),
                "direct": sum(1 for r in rows if r["media_class"]=="direct"),
                "text": sum(1 for r in rows if r["media_class"]=="text"),
                "rabbi_unmatched_yoav": sum(1 for r in rows if not r["rabbi_matched"]),
                "no_title": sum(1 for r in rows if r["no_title"]),
            }
        print(f"\n### {book}")
        print("  standalone:", json.dumps(summ(std), ensure_ascii=False))
        print("  shut:      ", json.dumps(summ(shut), ensure_ascii=False))
    json.dump(grand, open(os.path.join(HERE, "r1", "standalone_recon_ALL.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
