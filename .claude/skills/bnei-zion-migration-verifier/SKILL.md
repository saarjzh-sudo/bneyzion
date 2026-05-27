# bnei-zion-migration-verifier

**Skill name:** `bnei-zion-migration-verifier`
**Version:** 2.0 (Generalized — 2026-05-27)
**Scope:** כל section באתר bneyzion.co.il → Supabase migration
**Last used:** אגף המורים (2026-05-27, GREEN עם caveats — 100% parity achieved)

**When to use:** לפני, במהלך, ואחרי כל מיגרציה של תוכן מהאתר הישן (Umbraco / bneyzion.co.il)
ל-Supabase החדש. מטרה: 1:1 parity, לא over-tagging ולא under-tagging.

**How to invoke in a new session:**
```
"תריץ את bnei-zion-migration-verifier על section X"
"verify migration לכל הרבנים הכלליים באתר"
"תוודא parity 1:1 בין הישן לחדש בסקציה X"
"/skill bnei-zion-migration-verifier section=תנ״ך-בראשית"
```

---

## Site Inventory — Migration Targets

| Section | Old URL pattern | DB tables | audience_tag | Series (old) | Lessons (old) | Status |
|---------|----------------|-----------|--------------|--------------|---------------|--------|
| **אגף המורים** | `/מאגר-עזרי-הלמידה/*` | lessons, rabbis, series | `teachers` | 2,745 | ~11,552 | GREEN 27.5.2026 |
| **תנ"ך — תורה כללי** | `/פרשת-השבוע/` | lessons, parshot | `parshat-hashavua` | ? | ? | NOT STARTED |
| **תנ"ך — בראשית** | `/פרשת-השבוע/?book=בראשית` | lessons, parshot | `parshat-hashavua` | ? | ? | NOT STARTED |
| **תנ"ך — שמות** | `/פרשת-השבוע/?book=שמות` | lessons, parshot | `parshat-hashavua` | ? | ? | NOT STARTED |
| **תנ"ך — ויקרא** | `/פרשת-השבוע/?book=ויקרא` | lessons, parshot | `parshat-hashavua` | ? | ? | NOT STARTED |
| **תנ"ך — במדבר** | `/פרשת-השבוע/?book=במדבר` | lessons, parshot | `parshat-hashavua` | ? | ? | NOT STARTED |
| **תנ"ך — דברים** | `/פרשת-השבוע/?book=דברים` | lessons, parshot | `parshat-hashavua` | ? | ? | NOT STARTED |
| **נביאים** | `/נביאים/*` | lessons, parshot | `neviim` | ? | ? | NOT STARTED |
| **כתובים** | `/כתובים/*` | lessons, parshot | `ketuvim` | ? | ? | NOT STARTED |
| **רבנים — כלליים** | `/יוצרים/?type=rabbi` | rabbis, lessons, series | `general` | ? | ? | NOT STARTED |
| **יוצרים — כלליים** | `/יוצרים/?type=content_creator` | rabbis, lessons, series | `general` | ? | ? | NOT STARTED |
| **נושאים — כלליים** | `/נושאים/*` | lessons, series | `general` | ? | ? | NOT STARTED |
| **פרשת השבוע** | `/פרשת-השבוע/` | lessons, parshot | `parshat-hashavua` | ? | ? | NOT STARTED |
| **סיידבר ראשי** | `/` (filter checkboxes) | series, content_types | `general` | ? | ? | NOT STARTED |
| **חנות ספרים** | `/shop/*` | products | `shop` | ? | ? | NOT STARTED |
| **קורסים** | `/courses/*` | community_courses, lessons | `course` | ? | ? | NOT STARTED |

> ? = לא נמדד עדיין. מלא לאחר baseline scrape של ה-section.

---

## Empirical Findings — Past Migrations

| Date | Section | Old count | DB before | DB after | Notes |
|------|---------|-----------|-----------|----------|-------|
| 27.5.2026 | אגף המורים | 2,745 series (UI) | 3,052 lessons tagged | 11,552 lessons tagged | UI shows series count not lesson count. Sidebar numbers = series level. Real lessons ~4x higher. `html.unescape()` critical for titles with Hebrew punctuation. |

> עדכן שורה זו אחרי כל migration run.

---

## Iron Rules (V1 — learned from אגף המורים 27.5.2026)

### Rule 1: Establish baseline counts BEFORE migration
- סקרייפ את כל הקטגוריות באתר הישן ובנה טבלת yardstick עם המספרים המדויקים.
- שמור ל-JSON: `migrations/baseline_{section}_{date}.json`
- בלי baseline — אסור להתחיל מיגרציה.
- **Gotcha:** המספרים שמוצגים ב-UI (filter counts) הם ב-**series level**, לא lesson level.
  475 "סיכום הפרקים" = 475 series/items, לא שיעורים. כל series יכולה להכיל עשרות שיעורים.

### Rule 2: Use curl, not Firecrawl, for SSR pages on bneyzion.co.il
- `curl --noproxy '*' -s -L "URL"` מחזיר HTML מלא מהאתר הישן.
- Firecrawl בלבל בין SPA לSSR — לקח סשן שלם להבין.
- כל ה-`/מאגר-עזרי-הלמידה/` הוא SSR על Umbraco. שאר האתר — בדוק.

### Rule 3: Build whitelist before INSERT/UPDATE — and verify whitelist completeness
- לכל פריט שיעבור מיגרציה — חייב להיות record ב-whitelist.
- **Gotcha pagination:** pages מציגות carousel עם subset בלבד (~30% מהפריטים).
  לפי filter URL `/מאגר-עזרי-הלמידה/נושאים/?subject=X` — גם שם יש pagination.
  הדרך הנכונה: לסקרייפ כל sub-page עד עומק מלא ולצבור unique hrefs.
- whitelist נשמר ל-JSON. INSERT/UPDATE רק לפי whitelist.

### Rule 4: Backup table BEFORE every UPDATE/DELETE batch
```sql
CREATE TABLE {table}_pre_{operation}_YYYY_MM_DD AS SELECT * FROM {table};
```
- אמת `SELECT COUNT(*)` לפני שממשיכים.
- **Gotcha:** `DROP TABLE IF EXISTS` קודם אם הbackup כבר קיים (מריצה קודמת).

### Rule 5: Cross-reference AFTER every batch
- אחרי כל batch, הרץ count query והשווה ל-baseline.
- אם הפער >10% — עצור ובדוק לפני שממשיכים.

### Rule 6: NEVER overshoot — "more than expected" is also a failure
- 105% ≠ הצלחה. 95% ≠ הצלחה. רק 100% ±5%.
- over-tagging גורם לתוכן זר באגפים (UX regression).
- under-tagging גורם לחוסרים.

### Rule 7: entity_type matters — Rabbis vs Content Creators
- שם מתחיל ב"הרב X" → entity_type='rabbi'
- אחרת → entity_type='content_creator'
- ב-UI: פיצול ל-2 sections.
- אסור לערבב. (ראה KNOWLEDGE.md §7 entry 2026-05-27)

### Rule 8: Title normalization for matching
```python
import re, html

def normalize_title(t):
    t = html.unescape(str(t)).strip()
    t = re.sub(r'\s+', ' ', t)
    # Normalize Hebrew quotes
    for old, new in [("'", "'"), ('"', '"'), ('"', '"'), ('״', '"'), ('׳', "'")]:
        t = t.replace(old, new)
    return t.lower()
```
- "הרב X" ≡ "ר' X" ≡ "הרה"ג X" — נסה כמה variants.

### Rule 9: Understand what "count" means before cleanup
- **ה-DB lesson count ≠ ה-UI item count.** הסיבה:
  - כל series יכולה להכיל עשרות lessons בפועל
  - כפילויות (duplicates) יכולות לנפח את ה-count
  - placeholder records ריקים (content=NULL + no attachment + no audio + no video) = scraping artifacts
- **לפני cleanup:** תמיד בדוק אם יש content ב-records. Empty records = safe to delete.

### Rule 10: audience_tags is an array — use array_remove, never overwrite
```sql
-- CORRECT — removes only one tag, preserves others
UPDATE lessons SET audience_tags = array_remove(audience_tags, 'teachers')
WHERE ...;

-- WRONG — destroys all other tags
UPDATE lessons SET audience_tags = '{}' WHERE ...;
```

### Rule 11: Document every migration in KNOWLEDGE.md
- מה היה ה-baseline (counts לפני)
- מה השתנה (counts אחרי)
- אילו gotchas פגשת
- איפה ה-backup table
- rollback path (restore from backup)

### Rule 12: Visual verifier MANDATORY after deploy
- Chrome MCP screenshot של ה-UI אחרי deploy.
- count לא מספיק — צריך לראות שהפיצול (רבנים/יוצרי תוכן) נכון ויזואלית.
- אם Chrome MCP לא זמין — תזהיר את סאר ותציע alt (screenshot URL manual).

---

## Per-Section Migration Workflow

### Inputs (חובה לקבל מסאר או לזהות לפי Site Inventory):
1. **Section name** — e.g., "תנ"ך — בראשית"
2. **Old URL pattern** — e.g., `https://www.bneyzion.co.il/פרשת-השבוע/?book=בראשית`
3. **DB target tables** — default: `lessons` (אחר: `products`, `community_courses`, `parshot`)
4. **audience_tag** — default: שם ה-section ב-snake-case כפי שמופיע ב-Site Inventory
5. **entity_type filter** — אם רלוונטי: `rabbi` / `content_creator` / `null`

### Step 1: Baseline scrape
```bash
# SSR pages — curl direct:
curl --noproxy '*' -s -L "https://www.bneyzion.co.il/{SECTION_URL}" | \
  python3 -c "
import sys, re, html
content = sys.stdin.read()
# Extract filter checkboxes with counts
items = re.findall(r'<li>\s*<a[^>]+href=\"([^\"]+)\"[^>]*>([^<]+\(\d+\))[^<]*</a>', content)
for href, label in items:
    print(href.strip(), '|', label.strip())
"
# Save output to migrations/baseline_{section}_{YYYY_MM_DD}.json
```
- **Gotcha:** בדוק SSR vs SPA. אם `curl` מחזיר HTML ריק — ייתכן SPA. נסה `?format=json` ב-Umbraco.

### Step 2: Sub-page deep scrape (for pagination)
```python
# scrape_section.py — generic template
import requests, re, html, json
from urllib.parse import urljoin

BASE = "https://www.bneyzion.co.il"
SECTION_URL = "{SECTION_URL}"  # e.g., /מאגר-עזרי-הלמידה/

def scrape_all_items(section_url):
    seen = set()
    items = []
    # page 1
    resp = requests.get(urljoin(BASE, section_url), timeout=15)
    # find all sub-links in content area
    hrefs = re.findall(r'href="(/[^"]+)"', resp.text)
    for h in hrefs:
        full = urljoin(BASE, h)
        if h not in seen and SECTION_URL in h:
            seen.add(h)
            items.append({"url": full, "title": html.unescape(h.split("/")[-1])})
    return items
```
- חייב `html.unescape()` לפני SQL escaping (ראה Rule 8).

### Step 3: DB current state
```sql
-- Count records for this section
SELECT COUNT(*) FROM lessons 
WHERE audience_tags @> ARRAY['{TAG}'];

-- Breakdown by content_type
SELECT content_type, COUNT(*) 
FROM lessons WHERE audience_tags @> ARRAY['{TAG}']
GROUP BY content_type ORDER BY 2 DESC;
```

### Step 4: Diff — old vs new
בנה טבלה:
| Title | In old site | In DB | Match |
|-------|------------|-------|-------|
| X | Y | Y | OK |
| Y | Y | N | MISSING |
| Z | N | Y | EXTRA |

### Step 5: Backup
```sql
DROP TABLE IF EXISTS {table}_pre_{section}_{YYYY_MM_DD};
CREATE TABLE {table}_pre_{section}_{YYYY_MM_DD} AS SELECT * FROM {table};
SELECT COUNT(*) FROM {table}_pre_{section}_{YYYY_MM_DD};
```

### Step 6: Build whitelist
- JSON file: `migrations/whitelist_{section}_{YYYY_MM_DD}.json`
- כל פריט: `{title, url, entity_type, content_type, series_title}`

### Step 7: Plan (write it out before executing)
```
Section: {SECTION}
Tag: {TAG}
Expected inserts: X
Expected updates: Y
Expected removals: Z
Expected deletes (empty placeholders): W
DB count before: N
DB count expected after: M
```

### Step 8: Execute in batches of 100-500
```sql
-- Batch insert example
INSERT INTO lessons (title, content_type, audience_tags, series_id, rabbi_id)
VALUES
  ('...', '...', ARRAY['{TAG}'], '...', '...'),
  ...
ON CONFLICT (title, series_id) DO NOTHING
RETURNING id;

-- Always RETURNING id to count affected rows
```

### Step 9: Post-migration counts
```sql
SELECT content_type, COUNT(*) as after_cnt
FROM {table} WHERE audience_tags @> ARRAY['{TAG}']
GROUP BY content_type ORDER BY 2 DESC;
```
Compare to baseline ±5%.

### Step 10: Visual verifier
```bash
curl --noproxy '*' -sI https://bneyzion.vercel.app/design-{section-slug} | grep -i "200\|location"
# Then Chrome MCP screenshot
```

### Step 11: KNOWLEDGE.md update
כתוב entry ב-§7 — before/after counts, backup table name, gotchas, rollback path.

### Step 12: Update Site Inventory table above
מלא את ה-? עבור ה-section שהזנת ועדכן Status ל-GREEN / PARTIAL / RED.

---

## Per-Section Gotchas (build as you go)

| Section | Gotcha | Solution |
|---------|--------|----------|
| אגף המורים | 22 קטגוריות, sidebar numbers = series not lessons | ספור lessons דרך JOIN, לא UI counter |
| אגף המורים | scraper v1 לא נכנס לsub-pages עם `?rav=NAME` | `scrape_creator_v2.py` — סורק כל sub-pages |
| אגף המורים | entity_type חסר מה-DB | הוסף `entity_type` column + populate לפי שם |
| תנ"ך | עץ 3 רמות: תורה → חומש → פרשה → פרק | חייב recursive scrape עם depth tracking |
| תנ"ך | שמות פרשות זהות בחומשים שונים | disambiguate עם book prefix ב-series.title |
| רבנים כלליים | entity_type='rabbi' חובה | grep "הרב" בשם לפני insert |
| יוצרים כלליים | entity_type='content_creator' | ברירת מחדל אם לא "הרב" |
| חנות ספרים | products table, לא lessons | שים לב לDB table שונה |
| קורסים | community_courses table + lessons JOIN | schema שונה מ-lessons רגיל |

---

## Common Gotchas (cross-section)

| Gotcha | Solution |
|--------|----------|
| SSR vs SPA on bneyzion.co.il | Use `curl --noproxy '*'` always; if empty HTML → SPA, try different approach |
| NetSpark blocks API calls | `--noproxy '*'` on all curl, management API via PAT |
| audience_tags is array | Use `array_remove`/`array_append`, never full overwrite |
| generated columns (`sort_order`) | Don't INSERT into them (`GENERATED ALWAYS AS`) |
| Pagination on old site | Check for "next page" and carousel — only shows ~30% per page |
| HTML entities in scraped titles | `html.unescape()` before SQL escaping |
| Duplicate records from scraping | Check `GROUP BY title HAVING COUNT(*) > 1` before cleanup |
| Empty placeholder records | Check `content IS NULL AND attachment_url IS NULL AND audio_url IS NULL` |
| UI count = series count, not lesson count | 475 items in filter = 475 series, could be 2000+ lessons |
| "general" series with teacher-tagged lessons | Series tag overrides lesson tag — fix series first |
| Hebrew URL encoding | `python3 -c "from urllib.parse import quote; print(quote('פרשה'))"` |
| Umbraco sometimes requires Accept header | Add `-H "Accept: text/html"` to curl |

---

## SQL Snippets Reference

### Check user references before deleting
```sql
-- Always run before DELETE
SELECT COUNT(*) FROM user_favorites 
WHERE lesson_id IN (SELECT id FROM lessons WHERE <condition>);

SELECT COUNT(*) FROM user_history 
WHERE lesson_id IN (SELECT id FROM lessons WHERE <condition>);

SELECT COUNT(*) FROM lesson_topics 
WHERE lesson_id IN (SELECT id FROM lessons WHERE <condition>);
```

### Safe de-tag
```sql
UPDATE lessons 
SET audience_tags = array_remove(audience_tags, '{TAG}')
WHERE audience_tags @> ARRAY['{TAG}']
  AND <condition>
RETURNING id;
-- Count returned ids to verify
```

### Rollback
```sql
-- Restore from backup if something goes wrong
UPDATE {table} l
SET audience_tags = b.audience_tags
FROM {table}_pre_{section}_{YYYY_MM_DD} b
WHERE l.id = b.id;
```

### Full section audit query
```sql
-- Snapshot of section health
SELECT 
  audience_tags,
  content_type,
  COUNT(*) as lesson_count,
  COUNT(DISTINCT series_id) as series_count,
  SUM(CASE WHEN content IS NULL AND attachment_url IS NULL AND audio_url IS NULL AND video_url IS NULL THEN 1 ELSE 0 END) as empty_count
FROM lessons
WHERE audience_tags && ARRAY['{TAG}']
GROUP BY audience_tags, content_type
ORDER BY lesson_count DESC;
```

---

## Supabase Connection (this project)
- **Project:** `pzvmwfexeiruelwiujxn`
- **Management API:** PAT at `סקילים/04-mcp-servers/api-keys.md` (saar's sbp_ token)
- **REST API:** service_role_key in `/Users/saarj/Downloads/saar-workspace/bneyzion/.env`
- **noproxy required:** `curl --noproxy '*'` — NetSpark MITM on saar's network
- **Endpoint:** `https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query`

---

## Scraper Templates

### Generic SSR page scraper
```python
#!/usr/bin/env python3
"""
Generic bneyzion.co.il section scraper
Usage: python3 scrape_section.py --section "אגף המורים" --url "/מאגר-עזרי-הלמידה/" --output out.json
"""
import requests, re, html, json, sys, argparse
from urllib.parse import urljoin, urlencode

BASE = "https://www.bneyzion.co.il"
PROXIES = {"http": "", "https": ""}  # noproxy equivalent

def scrape_section(url_path, max_depth=3):
    seen_urls = set()
    results = []
    
    def scrape_page(path, depth=0):
        if depth > max_depth or path in seen_urls:
            return
        seen_urls.add(path)
        
        try:
            resp = requests.get(urljoin(BASE, path), proxies=PROXIES, timeout=15)
            text = resp.text
        except Exception as e:
            print(f"Error fetching {path}: {e}", file=sys.stderr)
            return
        
        # Extract links in content area (adjust selector per section)
        hrefs = re.findall(r'href="(/[^"#?]+)"', text)
        titles = re.findall(r'<h[23][^>]*>([^<]+)</h[23]>', text)
        
        for h in hrefs:
            full = urljoin(BASE, h)
            if url_path in h and h not in seen_urls:
                item_title = html.unescape(h.rstrip('/').split('/')[-1])
                results.append({"url": full, "path": h, "title": item_title})
                scrape_page(h, depth + 1)
    
    scrape_page(url_path)
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--output", default="scrape_out.json")
    args = parser.parse_args()
    
    items = scrape_section(args.url)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(items)} items to {args.output}")
```

### Creator sub-page scraper (teachers wing proven pattern)
```python
# The pattern that worked for teachers wing — proven 27.5.2026
# Key: iterate sub-pages with ?rav=NAME query param
# File: /tmp/scrape_creator_v2.py (archived in migrations/)
```
See `migrations/firecrawl_deep_scrape_2026_05_27/` for reference JSON files.

---

*V2 generalized 2026-05-27. V1 created 2026-05-27 from teachers-wing crisis. Next section to migrate: TBD by Saar.*
