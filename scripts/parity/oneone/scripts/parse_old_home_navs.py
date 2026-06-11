#!/usr/bin/env python3
"""
Parse the saved old-site (bneyzion.co.il) homepage into canonical ground-truth JSONs.

Input : oneone/old_home_20260611.html  (saved 11.6.2026)
Output: oneone/old_sidebar_tree.json    — full public sidebar tree (1st nav.sideNav, "ראשי" tab)
        oneone/old_topics_sidebar.json  — topics list (2nd nav.sideNav, "נושאים" tab)
        oneone/old_rabbis_sidebar.json  — rabbis list (3rd nav.sideNav, "רבנים" tab)
        oneone/old_main_menu.json       — header ul.mainNav + ul.IconsNav quick links

Read-only with respect to everything else; idempotent (re-running overwrites outputs).

Selectors documented:
  - Sidebar trees:  <nav class="sideNav"> > <ul class="nav cats"> > li > a
                    + optional <ul class="nav subCats"> > li > a
                    + optional <ul class="nav subSubCats"> > li > a   (max depth seen = 3)
  - Topics/rabbis:  same nav.sideNav but flat ul.nav.cats > li > a, text "NAME (COUNT)"
  - Main menu:      <ul class="mainNav nav nav-justified"> > li > a
  - Icon links:     <ul class="IconsNav"> > li > a  (2 public quick links)
"""
import json
import re
import unicodedata
from pathlib import Path

from bs4 import BeautifulSoup

BASE = Path("/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/oneone")
HTML = BASE / "old_home_20260611.html"

NIQQUD_RE = re.compile(r"[֑-ׇ]")
WS_RE = re.compile(r"\s+")
COUNT_RE = re.compile(r"^(?P<name>.*?)\s*\((?P<count>\d+)\)\s*$", re.S)


def norm(s: str) -> str:
    """Hebrew matching normalization: strip niqqud, NFC, collapse ws, lowercase."""
    s = unicodedata.normalize("NFC", s)
    s = NIQQUD_RE.sub("", s)
    s = WS_RE.sub(" ", s).strip()
    return s.lower()


def clean_text(s: str) -> str:
    """Original string, html-unescaped by bs4 already; just collapse whitespace."""
    return WS_RE.sub(" ", s).strip()


def clean_url(u: str) -> str:
    return (u or "").strip()


def main():
    html = HTML.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    sidenavs = soup.select("nav.sideNav")
    assert len(sidenavs) == 3, f"expected 3 nav.sideNav, got {len(sidenavs)}"

    # ---------- 1. Full public sidebar tree (books tab) ----------
    counter = {"i": 0}

    def parse_li(li, depth):
        a = li.find("a", recursive=False)
        if a is None:
            return None
        node = {
            "title": clean_text(a.get_text()),
            "title_norm": norm(a.get_text()),
            "url": clean_url(a.get("href")),
            "depth": depth,
            "order_index": counter["i"],
            "children": [],
        }
        counter["i"] += 1
        # children live in a direct-child <ul> (class "nav subCats" / "nav subSubCats")
        for ul in li.find_all("ul", recursive=False):
            for child_li in ul.find_all("li", recursive=False):
                child = parse_li(child_li, depth + 1)
                if child is not None:
                    node["children"].append(child)
        return node

    tree = []
    cats_ul = sidenavs[0].find("ul", class_="cats")
    for li in cats_ul.find_all("li", recursive=False):
        node = parse_li(li, 1)
        if node is not None:
            tree.append(node)

    def count_nodes(nodes):
        return sum(1 + count_nodes(n["children"]) for n in nodes)

    def max_depth(nodes):
        return max((max(n["depth"], max_depth(n["children"])) for n in nodes), default=0)

    tree_total = count_nodes(tree)

    sidebar_out = {
        "source": "old_home_20260611.html — 1st nav.sideNav (#books tab, ul.nav.cats)",
        "saved_date": "2026-06-11",
        "selector": "nav.sideNav ul.nav.cats > li > a (+ ul.nav.subCats / ul.nav.subSubCats)",
        "total_links": tree_total,
        "top_level_count": len(tree),
        "max_depth": max_depth(tree),
        "tree": tree,
    }
    (BASE / "old_sidebar_tree.json").write_text(
        json.dumps(sidebar_out, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    # ---------- 2 & 3. Flat counted lists (topics, rabbis) ----------
    def parse_flat(nav, name_key):
        items = []
        for idx, a in enumerate(nav.select("ul.cats > li > a")):
            raw = clean_text(a.get_text())
            m = COUNT_RE.match(raw)
            if m:
                name = clean_text(m.group("name"))
                count = int(m.group("count"))
            else:
                name = raw
                count = None
            items.append(
                {
                    name_key: name,
                    f"{name_key}_norm": norm(name),
                    "raw_text": raw,
                    "count": count,
                    "url": clean_url(a.get("href")),
                    "order_index": idx,
                }
            )
        return items

    topics = parse_flat(sidenavs[1], "title")
    rabbis = parse_flat(sidenavs[2], "name")

    topics_out = {
        "source": "old_home_20260611.html — 2nd nav.sideNav (#tags tab)",
        "saved_date": "2026-06-11",
        "selector": "nav.sideNav ul.cats > li > a, text 'TITLE (COUNT)', href ?subject=",
        "total": len(topics),
        "items": topics,
    }
    (BASE / "old_topics_sidebar.json").write_text(
        json.dumps(topics_out, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    rabbis_out = {
        "source": "old_home_20260611.html — 3rd nav.sideNav (#rabanim tab)",
        "saved_date": "2026-06-11",
        "selector": "nav.sideNav ul.cats > li > a, text 'NAME (COUNT)', href ?rav=",
        "total": len(rabbis),
        "items": rabbis,
    }
    (BASE / "old_rabbis_sidebar.json").write_text(
        json.dumps(rabbis_out, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    # ---------- 4. Main menu + icon quick links ----------
    main_menu = []
    main_ul = soup.find("ul", class_="mainNav")
    for idx, a in enumerate(main_ul.select("li > a")):
        main_menu.append(
            {
                "title": clean_text(a.get_text()),
                "title_norm": norm(a.get_text()),
                "url": clean_url(a.get("href")),
                "target": a.get("target"),
                "order_index": idx,
            }
        )

    icons_nav = []
    icons_ul = soup.find("ul", class_="IconsNav")
    if icons_ul:
        for idx, a in enumerate(icons_ul.select("li > a")):
            icons_nav.append(
                {
                    "title": clean_text(a.get("title") or a.get_text()),
                    "title_norm": norm(a.get("title") or a.get_text()),
                    "url": clean_url(a.get("href")),
                    "order_index": idx,
                }
            )

    tabs = []
    tabs_ul = soup.select_one("div.sideNavBar > ul.nav-tabs")
    if tabs_ul:
        for idx, a in enumerate(tabs_ul.select("li > a")):
            tabs.append(
                {
                    "title": clean_text(a.get_text()),
                    "href": clean_url(a.get("href")),
                    "order_index": idx,
                }
            )

    main_out = {
        "source": "old_home_20260611.html — header ul.mainNav + ul.IconsNav + sidebar tabs",
        "saved_date": "2026-06-11",
        "selectors": {
            "main_menu": "ul.mainNav.nav.nav-justified > li > a",
            "icons_nav": "ul.IconsNav > li > a",
            "sidebar_tabs": "div.sideNavBar > ul.nav-tabs > li > a",
        },
        "main_menu_total": len(main_menu),
        "main_menu": main_menu,
        "icons_nav_total": len(icons_nav),
        "icons_nav": icons_nav,
        "sidebar_tabs": tabs,
    }
    (BASE / "old_main_menu.json").write_text(
        json.dumps(main_out, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    # ---------- verification report ----------
    print("=== VERIFICATION ===")
    print(f"sidebar tree : {tree_total} links, {len(tree)} top-level, max depth {max_depth(tree)}")
    print(f"topics       : {len(topics)} items")
    print(f"rabbis       : {len(rabbis)} items")
    print(f"main menu    : {len(main_menu)} items; icons {len(icons_nav)}; tabs {len(tabs)}")

    print("\n=== per top-level category child counts (direct / total descendants) ===")
    for n in tree:
        direct = len(n["children"])
        total = count_nodes(n["children"])
        print(f"  [{n['depth']}] {n['title']}: direct={direct} total_desc={total}")

    print("\n=== URL pattern anomalies in sidebar tree ===")
    def walk(nodes):
        for n in nodes:
            yield n
            yield from walk(n["children"])

    n_subject = n_rav = n_external = n_other = 0
    for n in walk(tree):
        u = n["url"]
        if "?subject=" in u:
            n_subject += 1
            print(f"  ?subject= : {n['title']} -> {u}")
        elif "?rav=" in u:
            n_rav += 1
            print(f"  ?rav=     : {n['title']} -> {u}")
        elif u.startswith("http"):
            n_external += 1
            print(f"  external  : {n['title']} -> {u}")
        elif not u.startswith("/מאגר-השיעורים-והמאמרים/"):
            n_other += 1
            print(f"  off-root  : {n['title']} -> {u}")
    print(f"  totals: subject={n_subject} rav={n_rav} external={n_external} off-root={n_other}")

    # topics/rabbis URL pattern checks
    bad_topics = [t for t in topics if "?subject=" not in t["url"]]
    bad_rabbis = [r for r in rabbis if "?rav=" not in r["url"]]
    print(f"\ntopics without ?subject= : {len(bad_topics)}")
    for t in bad_topics:
        print(f"  {t['title']} -> {t['url']}")
    print(f"rabbis without ?rav=     : {len(bad_rabbis)}")
    for r in bad_rabbis:
        print(f"  {r['name']} -> {r['url']}")

    missing_count_t = [t["title"] for t in topics if t["count"] is None]
    missing_count_r = [r["name"] for r in rabbis if r["count"] is None]
    print(f"topics missing (count): {missing_count_t}")
    print(f"rabbis missing (count): {missing_count_r}")

    # duplicate URL check inside the tree
    seen = {}
    dups = []
    for n in walk(tree):
        key = n["url"]
        if key in seen:
            dups.append((key, seen[key], n["title"]))
        else:
            seen[key] = n["title"]
    print(f"duplicate URLs in tree: {len(dups)}")
    for d in dups[:20]:
        print(f"  {d[0]} ({d[1]} / {d[2]})")


if __name__ == "__main__":
    main()
