#!/usr/bin/env python3
"""
teachers_lesson_order.py — order teacher lessons WITHIN parsha-based series by the
canonical parsha order (not alphabetical).

Problem: series like "ביאור הפסוקים חומש בראשית" hold one lesson per parsha, all with
bible_chapter=NULL & sort_order=NULL → the series page sorts them by title (alphabetical:
בראשית, ויגש, ויחי...) instead of canonical (בראשית, נח, לך לך...).

Fix (additive, reversible — backup lessons_bak_r4_sortorder already exists): for every
teacher published lesson whose title names a parsha, set sort_order = canonical parsha index
(1..54). Only touches lessons currently sort_order 0/NULL (won't override reconciled values).

Usage: python3 teachers_lesson_order.py [--apply]
"""
import sys, os, re, json, unicodedata, argparse
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq

PARSHIOT = [
    # בראשית
    "בראשית","נח","לך לך","וירא","חיי שרה","תולדות","ויצא","וישלח","וישב","מקץ","ויגש","ויחי",
    # שמות
    "שמות","וארא","בא","בשלח","יתרו","משפטים","תרומה","תצוה","כי תשא","ויקהל","פקודי",
    # ויקרא
    "ויקרא","צו","שמיני","תזריע","מצורע","אחרי מות","קדושים","אמור","בהר","בחקתי",
    # במדבר
    "במדבר","נשא","בהעלותך","שלח","קרח","חקת","בלק","פינחס","מטות","מסעי",
    # דברים
    "דברים","ואתחנן","עקב","ראה","שופטים","כי תצא","כי תבוא","נצבים","וילך","האזינו","וזאת הברכה",
]
# index by normalized name; longer names first so "כי תשא" matches before "כי"
def nfc(s): return unicodedata.normalize("NFC", s or "")
def norm(s):
    s = nfc(s); s = re.sub(r"[֑-ׇ]", "", s); s = re.sub(r"\s+", " ", s).strip(); return s
PIDX = {norm(p): i + 1 for i, p in enumerate(PARSHIOT)}
ORDER = sorted(PIDX.keys(), key=lambda x: -len(x))  # match longest first

def q(sql):
    d = json.loads(sbq.run(sql))
    if isinstance(d, dict) and d.get("message"): raise SystemExit("SQL error: " + json.dumps(d, ensure_ascii=False)[:300])
    return d

def parsha_index(title):
    t = norm(title)
    # require the parsha to appear after "פרשת" OR as a clear token, to avoid the book-name "בראשית"
    for name in ORDER:
        if f"פרשת {name}" in t:
            return PIDX[name]
    for name in ORDER:
        if re.search(rf"(^|[\s\-|]){re.escape(name)}($|[\s\-|])", t):
            return PIDX[name]
    return None

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--apply", action="store_true"); args = ap.parse_args()
    # teacher lessons that sit in a series, ordering still unset, parsha in title
    rows = q("""
      SELECT l.id, l.title, l.sort_order
      FROM lessons l
      WHERE l.audience_tags @> ARRAY['teachers'] AND l.status='published'
        AND l.series_id IS NOT NULL
        AND (l.sort_order IS NULL OR l.sort_order = 0)
        AND l.title LIKE '%פרשת %'
    """)
    upd = []
    for r in rows:
        idx = parsha_index(r["title"])
        if idx: upd.append((r["id"], idx))
    print(f"candidates with 'פרשת ' in title: {len(rows)}  → matched parsha: {len(upd)}")
    # sample
    for rid, idx in upd[:12]:
        t = next(r["title"] for r in rows if r["id"] == rid)
        print(f"  so={idx:>2}  {t[:55]}")
    if args.apply and upd:
        n = 0
        for i in range(0, len(upd), 60):
            chunk = upd[i:i+60]
            cases = " ".join(f"WHEN '{rid}' THEN {idx}" for rid, idx in chunk)
            ids = ",".join(f"'{rid}'" for rid, _ in chunk)
            q(f"UPDATE lessons SET sort_order = CASE id {cases} END WHERE id IN ({ids});")
            n += len(chunk)
        print(f"APPLIED sort_order to {n} lessons.")

if __name__ == "__main__":
    main()
