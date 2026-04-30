# Bnei Zion — Full Site Knowledge Base

**Last updated:** 2026-04-30
**Purpose:** Single source of truth for the bneyzion-designer agent and any
human/agent working across multiple sessions on this project. Captures
ALL site knowledge — migration history, content structure, external
systems, credentials pointers, and a learning protocol so every session
adds to (not overwrites) institutional memory.

> 📘 **Companion doc:** `REDESIGN.md` (this repo) covers the v2 sandbox
> redesign work specifically. This file (`KNOWLEDGE.md`) covers
> *everything else* — site history, content, data, integrations.

---

## 1. Site identity & lineage

**Client:** Rabbi Yoav Oriel (yoavoriel@gmail.com)
**Audience:** Religious-Zionist Hebrew-speaking Bible learners, rabbis, educators
**Purpose:** Premium Hebrew Torah/Tanakh learning portal — 11,818 lessons from 200+ rabbis

### Domain timeline
| Era | Domain | Stack | Status |
|-----|--------|-------|--------|
| Old | `www.bneyzion.co.il` | Umbraco CMS (.NET) | Live, source for migration |
| Old | `club.bneyzion.co.il` | WordPress + WooCommerce | Live, separate shop subdomain |
| New (sandbox era) | `bneyzion.vercel.app` | Vite + React + Supabase | LIVE — current production |
| Future | `bneyzion.co.il` | (DNS cutover pending) | Not yet migrated |

### Key paths
| Where | Path |
|-------|------|
| Local repo | `/Users/saarj/Downloads/saar-workspace/bneyzion` |
| GitHub | `https://github.com/saarjzh-sudo/bneyzion` |
| Vercel project | `saars-projects-4508d6bb / bneyzion` (`prj_P2KNzQJKsnpF1ZXShOBH3XL03c2x`) |
| Supabase (current) | `pzvmwfexeiruelwiujxn.supabase.co` |
| Old Umbraco | `https://www.bneyzion.co.il` |
| Old shop | `https://club.bneyzion.co.il` |

---

## 2. Migration history (Lovable → Own Supabase)

### What happened (Q1-Q2 2026)
The site was originally hosted by Lovable (which used their own Supabase
project `fhdcmsmwvssjzhqocaai`). In April 2026 we migrated everything
to a Supabase project owned by Saar (`pzvmwfexeiruelwiujxn`) for full
control over data, RLS, edge functions, and the migration scripts.

### Migration stats
- **27,145 rows** moved across 42 tables
- **42 tables** + 3 RPCs + 1 view + 1 enum recreated on new project
- **18 edge functions** redeployed
- **FK constraints** dropped during migration, restored after, orphans cleaned
- **RLS policies** applied: public read on content, user own-row, admin only on migration tables

### Three Supabase projects (CRITICAL — don't confuse them)
| Project ID | Purpose | Read/Write? |
|------------|---------|-------------|
| `pzvmwfexeiruelwiujxn` | **Bnei Zion (CURRENT)** — full ownership | ✅ Read+Write |
| `fhdcmsmwvssjzhqocaai` | Lovable source (old) — historical reference | Read-only |
| `eqqrafxdtxpypxdmyyix` | Old bnei-zion-conference — separate project | ⛔ Don't touch |

### Migration scripts (in `scripts/`)
| Script | Purpose |
|--------|---------|
| `create-schema.sql` | Full DDL: 42 tables + 3 RPCs + view + enum |
| `migrate-data.mjs` | Old Supabase → new Supabase, paginated upserts in FK order |
| `fix-data-integrity.mjs` | Fixes source_type mismatches, recalcs `lesson_count` |
| `fix-umbraco-links.mjs` | Strips `umb://document` links from imported HTML |
| `enrich-from-old-site.mjs` | First-gen scraper from old Umbraco public pages |
| `mass-scrape.mjs` | 10-worker parallel scraper (row-blind — known limit) |
| `umbraco-index.json` | Cached tree of 9,566 Umbraco pages |
| `qa-migration.mjs` | QA report generator (87% health score on last run) |
| `verify-content.mjs` | Compare Supabase vs Umbraco (limited by editor permissions) |
| `fix-misattributions.mjs` | 312 URLs corrected (April 2026 audit) |
| `audit-accuracy.mjs` | Random-sample auditor, paginated |
| `scrape-drafts-v2.mjs` | 4-strategy draft enrichment (vp4.me + YouTube + HTML5 + direct) |

### Run pattern (MUST use)
```bash
cd /Users/saarj/Downloads/saar-workspace/bneyzion
env -u HTTPS_PROXY -u HTTP_PROXY node scripts/SCRIPT.mjs
```
The `env -u HTTPS_PROXY -u HTTP_PROXY` strips NetSpark proxy.

### Open data gaps (from migration)
- **461 lessons** are still drafts — exist on old site but couldn't be enriched
- **820 lessons with video** — many videos missed during scraping (table-row layout issue)
- **Solution path:** when `yoav` Umbraco user gets admin access (pending Avihay@TWB), pull property values directly via GetById API
- See REDESIGN.md §10 for "What NOT to do" — don't run mass scripts without backup

---

## 3. Database schema (42 tables, organized)

### Content (5 core)
| Table | Rows | Purpose |
|-------|------|---------|
| `lessons` | 11,818 | title, content (HTML), audio_url, video_url, attachment_url, source_type, rabbi_id, series_id, status, bible_book, bible_chapter, duration |
| `series` | 1,374 | hierarchical (parent_id), lesson_count, rabbi_id, status, image_url |
| `rabbis` | 203 | name, title, bio, image_url, lesson_count |
| `topics` | 741 | slug-based navigation categories |
| `lesson_topics` | 12,907 | many-to-many lessons↔topics |

### Cross-references
| Table | Purpose |
|-------|---------|
| `series_links` | 47 cross-series references |
| `migration_redirects` | Old Hebrew URLs → new routes (used in vercel.json + sitemap) |

### User / gamification
| Table | Purpose |
|-------|---------|
| `profiles` | Supabase auth profile |
| `user_roles` | Enum: admin/moderator/user |
| `user_favorites`, `user_favorite_series`, `user_favorite_rabbis` | Bookmarks |
| `user_history` | Lesson watch progress |
| `user_daily_activity` | Streak tracking source |
| `user_points`, `user_points_log` | Points ledger |
| `user_challenge_progress`, `weekly_challenges` | Gamification challenges |
| `weekly_leaderboard` | VIEW — top 10 from user_points + profiles |

### Community / commerce
| Table | Purpose |
|-------|---------|
| `community_courses`, `community_members` | Premium community |
| `course_enrollments`, `course_sessions` | Live course logistics |
| `orders`, `order_items` | Storefront orders |
| `products` (47 active), `product_categories` (10) | Shop catalog (migrated from WooCommerce) |
| `donations` | Donation receipts |
| `lesson_dedications` | "Dedicated in memory of..." per-lesson |
| `lesson_comments` | User comments on lessons |
| `contact_messages` | Contact form |
| `coupons` | Promo codes for shop |
| `payment_products` | Grow payment configs (DB-driven, with FALLBACK constants) |
| `grow_orders` | Grow payment session log |

### Weekly program (migration file ready — NOT yet applied)
| Table | Purpose |
|-------|---------|
| `user_access_tags` | Fine-grained access grants per user. `tag` = "program:weekly-chapter" etc. `valid_until` updated on each recurring Grow charge. `pending_user_link=true` when subscriber exists in Smoove but hasn't registered on site yet. |
| `weekly_program_progress` | Per-user progress tracking (current_book, current_chapter, chapters_completed, streak_weeks) |

#### New columns on existing tables (migration pending)
- `community_courses`: `program_slug`, `access_type` ('open'|'subscribers_only'|'requires_tag'), `access_tag`
- `community_course_lessons`: `week_number`, `bible_book`, `bible_chapter`, `layer_type` ('base'|'enrichment'|'exercise'), `summary_html`, `presentation_url`, `drive_folder_url`, `thumbnail_url`

#### New RPC
- `has_access_tag(p_user_id uuid, p_tag text) → boolean` — SECURITY DEFINER, checks valid non-expired grant

#### Migration file
`supabase/migrations/20260430_weekly_program_foundation.sql` — NOT yet applied. Apply with:
```bash
env -u HTTPS_PROXY -u HTTP_PROXY psql "$SUPABASE_DB_URL" -f supabase/migrations/20260430_weekly_program_foundation.sql
```

### Migration / admin
| Table | Purpose |
|-------|---------|
| `migration_batches`, `migration_items`, `migration_logs` | Migration audit |
| `site_settings` | Key-value CMS for hero copy, memorial names, etc. |

### RPCs (server-side functions)
- `get_series_ancestors(series_uuid)` — recursive CTE walking parent_id upward (breadcrumbs)
- `get_series_descendant_ids(root_id)` — recursive CTE walking children downward
- `has_role(user_id, role)` — SECURITY DEFINER, checks user_roles

### Enum
- `app_role` = `admin | moderator | user`

---

## 4. External systems & access

### Umbraco (old site CMS — read-only access)
**URL:** `https://www.bneyzion.co.il`
**Login endpoint:** `POST /umbraco/backoffice/UmbracoApi/Authentication/PostLogin`
**Account:** `yoav` (editor role — see MEMORY.md for password)
**Returns:** `Set-Cookie: UMB_UCONTEXT=<session>`

#### What works (editor permissions)
- Tree API: `/umbraco/backoffice/UmbracoTrees/ContentTree/GetNodes?id=<id>&treeAlias=content`
- Lessons base tree ID: `1069`
- Total content items under tree: 9,566

#### What's blocked
- `GetById` API (need admin)
- Cannot read property values (audioFile, videoUrl) directly
- Workaround: scrape public HTML pages (see `scripts/mass-scrape.mjs`)

#### Pending: admin access request
Email sent to `avihay@twb.co.il` + `office@twb.co.il` (TWB hosts the
Umbraco install). When admin granted → unlock 461 empty drafts via
GetById API.

### S3 media bucket pattern (legacy)
```
Audio: https://s3.us-east-2.amazonaws.com/bneyzion/{rabbi}/{book}/{filename}.mp3
Video: same bucket, .mp4 extension
PDF:   https://www.bneyzion.co.il/media/{id}/{filename}.pdf
Video iframe: https://embed.vp4.me/LandingPage,<guid>,<id>.aspx (vp4.me service)
```

### WordPress shop (`club.bneyzion.co.il`)
- Old WooCommerce store, **separate subdomain**
- Has its own: GTM-MBQXGFR, Meta pixel, products, orders
- **Status:** Saar is rebuilding the store flow in the new Supabase. The
  47 products + 10 categories in our `products` / `product_categories`
  were imported from this old WooCommerce.
- **Iron rule:** **Do NOT touch `/store` or `/checkout` on the new site
  without explicit instruction.** Saar handles store work in a separate
  session.
- WordPress source for products is read-only reference now.

### Google OAuth
- Project: `tidy-rig-466800-d2` in Google Cloud Console
- Client ID + Secret stored in Supabase Auth provider config
- Authorized redirect: `https://pzvmwfexeiruelwiujxn.supabase.co/auth/v1/callback`
- Authorized JS origins: `https://bneyzion.vercel.app`, `https://pzvmwfexeiruelwiujxn.supabase.co`
- **Mode:** Testing (NOT production-verified yet)
- Domain migration checklist (when `bneyzion.co.il` cutover happens):
  1. Add `https://bneyzion.co.il` (and `www`) to JS origins
  2. Update Branding (home/privacy/ToS URLs)
  3. Add Supabase Site URL + Redirect URLs for new domain
  4. Update `vercel.json` if any domain-absolute URLs present
  5. Submit OAuth consent screen for production verification

### Grow (Meshulam) payment
- SDK code at `api/grow/` + `src/hooks/useGrowPayment.ts`
- DB-driven via `payment_products` table + hardcoded FALLBACK constants
- See `MEMORY.md` "Grow lessons" entry for 10 known gotchas

### Other integrations (live)
| Service | Purpose | Pointer |
|---------|---------|---------|
| Sefaria API | Daily verse / parasha calendar | `useDailyVerse.ts`, `parashaCalendar.ts` |
| Vercel | Hosting + auto-deploy on push to `main` | Auto |
| Supabase Edge Functions | 18 functions (create-admin, sitemap, register-challenge, etc.) | `supabase/functions/` |
| WhatsApp (Green API) | Saar uses for review pings | See MEMORY.md `T-tools/01-skills/shigor-pro/references/clients.md` |

### Credentials policy
**All credentials live in MEMORY.md** (`/Users/saarj/.claude/projects/...../memory/MEMORY.md`)
or in client profile files (`B-brain/05-clients/bnei-zion/profile.md`),
NOT in this repo. The agent reads them from MEMORY.md when needed.
Never commit raw secrets to git.

---

## 5. Application architecture

### Tech stack
```
React 18 + TypeScript + Vite 5 + Tailwind v3 + shadcn/ui
├── Router: react-router-dom (NOT Next.js — pages/ is just folder naming)
├── State: React Query (@tanstack/react-query)
├── Auth: Supabase OAuth (Google) — direct call, no Lovable bridge
├── Animations: framer-motion
├── PWA: vite-plugin-pwa (manifest + service worker)
└── Deploy: Vercel with SPA rewrites
```

### Iron rule: NOT Next.js
- `src/pages/` is just folder naming, not file-based routing
- Never add `"use client"` directives — Vite doesn't understand them
- The Next.js skill in Claude Code suggests false positives here — ignore

### Key directories
```
src/
├── pages/          (45 routes, eager + lazy mixed)
├── components/
│   ├── ui/         (shadcn primitives + custom: empty-state, skeleton-card, dark-mode-toggle)
│   ├── home/       (HeroSection, ContinueLearningBar, DailyVerseSection, ...)
│   ├── layout/     (Layout, Header, Footer, MobileBottomNav, PageHero)  [PRODUCTION — DON'T EDIT]
│   ├── layout-v2/  (Design{Layout,Header,Footer,MobileBottomNav,PageHero,Sidebar})  [SANDBOX]
│   ├── player/     (FloatingPlayer with speed pills + skip ±15s)
│   ├── gamification/
│   └── memorial/
├── hooks/          (useLessons, useSeries, useRabbis, useTopSeries, useLessonsBySeries, ...)
├── lib/
│   ├── designTokens.ts    [SANDBOX design system]
│   ├── sanitize.ts        [DOMPurify wrapper — ALWAYS use for HTML]
│   ├── biblicalOrder.ts
│   ├── parashaCalendar.ts
│   └── sidebarOrder.ts
├── contexts/       (AuthContext, PlayerContext, CartContext)
└── integrations/supabase/  (client + types.ts auto-generated)

scripts/            (migration + scraping + audit scripts)
supabase/
├── functions/      (18 edge functions)
└── migrations/     (SQL migrations)
public/
├── fonts/          (Kedem Serif × 5 weights, Ploni × 7 weights, Paamon, Mugrabi)
├── images/         (real images downloaded from old site)
├── lovable-uploads/ (legacy — referenced logos)
└── video/hero-bg.mp4 (9.8MB hero video)
```

### Routes (45 total — see `src/App.tsx`)
- **Public eager:** `/`, `/series`, `/lessons/:id`, `/rabbis`, `/rabbis/:id`, `/auth`
- **Public lazy:** about, contact, donate, store, product, memorial, parasha, teachers, community, favorites, history, profile, pricing, thank-you, portal, checkout, kenes, bible-book, megilat-esther, chapter-weekly, dor-haplaot
- **Admin (25 routes):** `/admin/*` — gated by `ProtectedRoute` + `user_roles.admin`
- **Sandbox (18 routes):** `/design-*` — see `REDESIGN.md` §5
- **Dev:** `/dev-pages` (route navigator), `/preview.html` (static design picker)

### Security non-negotiables
1. **DOMPurify** sanitization on all `dangerouslySetInnerHTML`
   (12 occurrences across 9 files — wrapped in `src/lib/sanitize.ts`)
2. **`useLesson`** filters `.eq("status", "published")` — drafts must
   never leak to public view
3. **`useRabbiSeries`** filters `.eq("status", "active")` — same reason
4. **RLS** on Supabase — public read on content tables, user own-row,
   admin-only on migration tables
5. **`useAwardPoints`** uses atomic upsert with `onConflict: "user_id"`
   to prevent race conditions on points ledger

---

## 6. Content state (as of 2026-04-30)

| Metric | Value |
|--------|-------|
| Total lessons | 11,818 |
| Published | 11,357 (96%) |
| With audio | 6,432 |
| With video | 820 |
| With PDF | 963 |
| With media (any) | 6,941 |
| Drafts | 461 (truly empty, awaiting Umbraco admin access) |
| Active rabbis | 179 (with `lesson_count > 0`) |
| Active series | 745 (with at least one published lesson) |
| Total series | 1,374 |
| Topics | 741 |
| Products (active) | 47 |
| Product categories | 10 |
| Auth users | 2 |
| Admin users | 1 (`saar.j.z.h@gmail.com`) |

### Health score (last QA run)
- **87%** — most gaps are missing media URLs that need row-level scraping
  or Umbraco admin access to GetById API

---

## 7. Major work history (sessions log)

### 2026-04-14 — Migration completion + Google OAuth
- 312 URLs corrected via `fix-misattributions.mjs`
- 60/73 missing drafts recovered via vp4.me 4-strategy scraper
- Google OAuth set up in Supabase (Testing mode)
- Domain migration checklist documented for future cutover

### 2026-04-15 to 2026-04-16 — Layout fixes + security
- LessonDialog: video/description overlap bug fixed (commit `2e73725`)
- Critical security fix: drafts leak via `useLesson` (commit `ded754a`)
- `lesson_count` recalculation: 179 rabbis + 745 series
- Admin role granted to `saar.j.z.h@gmail.com`
- Hero image 404 fix (CSS gradient replacement in 5 files)
- Index.tsx duplicate page title bug fixed
- Taamei Mikra (cantillation marks) font bug — strip `U+0591–U+05AF`,
  keep `U+05B0–U+05C7` (nikud)

### 2026-04-16 — Design system + `/design-home` redesign
- DesignPreviewHome.tsx built — first iteration of new design language
- Design tokens introduced (gold/parchment/mahogany/olive/navy)
- DesignParashaHolidaySection (forest gradient, parasha + holiday)
- Imagen 4 image generation set up (war-miracles-bg, kenes-banner)
- Image optimization: PNG → JPEG (88% size reduction)
- Rolled out: `Index.tsx` replaced with `/design-home`, `/dor-haplaot`
  redesigned with Navy+Gold

### 2026-04-28 — V2 sandbox kickoff
- `src/lib/designTokens.ts` created (canonical design tokens)
- `src/components/layout-v2/` shell created (DesignLayout, DesignHeader,
  DesignFooter, DesignMobileBottomNav, DesignPageHero, DesignSidebar v1)
- 8 sandbox pages: layout, series-list, series-page, lesson-popup,
  store, product, portal, chapter-weekly
- Iron rule: sandbox-only, never edit production Layout.tsx

### 2026-04-29 — Sidebar v3 + lesson trio + memorial + research
- Sidebar v3 rebuilt to mirror live SeriesList 1:1 (3 tabs + gold header)
- Lesson trio: LessonCard → LessonPopup → LessonPage with shared image
- Megillat Esther sales page + login-to-personal-area path
- Subscriber portal with progress + completed books
- Memorial Saadia: real photos + 4 placeholder slots
- Design research page: 32 patterns, 8 categories, top-10 priority list
- 18 sandbox routes total at `/design-*`

### 2026-04-30 — Documentation + dedicated agent + this knowledge base
- Backup tag: `backup-pre-redesign-rollout-2026-04-30`
- `REDESIGN.md` written (sandbox-focused doc)
- `~/.claude/agents/bneyzion-designer.md` created (auto-loads context)
- This file (`KNOWLEDGE.md`) created — full site knowledge

### 2026-04-30 — Weekly chapter program — open questions resolved (Saar answers)

**Subscription model (single tier — direct debit / הוראת קבע):**
- Month 1: ₪5 (intro offer, campaign-only)
- Month 2+: ₪110/month auto-charge
- When there's no promo: ₪110 from day 1
- NO annual, NO lifetime, NO multiple tiers. One subscription, one price.

**Existing subscribers:**
- Smoove list: `"בני ציון מנויים הפרק השבועי"` (need to find list ID)
- Import strategy: upsert all emails → `user_access_tags` with `tag = "program:weekly-chapter"`
- No Supabase auth user for old subscribers → create user shell or mark `pending_user_link`

**Google Drive content:**
- Drive root: `https://drive.google.com/drive/folders/0AFz55knVlI2BUk9PVA`
- Must scan with Google Drive API to understand folder structure per book/chapter
- credentials.json: `/Users/saarj/Downloads/saar-workspace/the-system-v8/T-tools/04-mcp-servers/youtube/credentials.json`
- Rule: scan only, don't import until Saar approves mapping

**Base content architecture (dual-source):**
- Default: dynamic pull from `lessons` table with `bible_book + bible_chapter` matching
- Override: optional row in `community_course_lessons` with `layer_type = 'base'` for content created specifically for the program
- When override exists — show BOTH (program-specific base + site content)

**Access levels:**
- Existing site content (already in `lessons` table) — open to everyone
- New base content created specifically for the program — subscribers only
- Enrichment layers (audio summary, commentary, exercises) — subscribers only

**WhatsApp automation (document only, don't build yet):**
- Group: "לחיות תנ"ך"
- Weekly cadence: שישי (base content ready), שני (enrichment ready), רביעי (lesson reminder + link),
  שיעור day (link + reminder), מחרת (recording + summary + presentation + link)
- Future: automate WhatsApp + email + site notifications. Build AFTER base infrastructure.

**Sales page:**
- NOT an external iframe — use `useGrowPayment` locally in our React app
- Located at `/design-megilat-esther` (sandbox) / `/megilat-esther` (live to be redesigned)
- Content: חגי + זכריה + מלאכי from Drive
- Flow: ₪5 intro charge → Grow direct debit → ₪110/month auto

### 2026-04-30 — Weekly program foundation (gal 1 — DB & backend prep)

**Files added/changed:**
- `supabase/migrations/20260430_weekly_program_foundation.sql` — NEW migration (NOT applied yet)
  - Creates `user_access_tags`, `weekly_program_progress` tables
  - Alters `community_courses` (+program_slug, access_type, access_tag)
  - Alters `community_course_lessons` (+week_number, bible_book, bible_chapter, layer_type, summary_html, presentation_url, drive_folder_url, thumbnail_url)
  - Adds `has_access_tag(uuid, text)` SECURITY DEFINER RPC
- `scripts/import-weekly-chapter-subscribers.mjs` — NEW import script (NOT run yet)
  - Fetches all 280 contacts from Smoove list 1045078 ("הפרק השבועי - תכנית מנויים")
  - Upserts into `user_access_tags` with `tag = "program:weekly-chapter"`
  - Handles both linked users and `pending_user_link=true` for unregistered emails
  - Run: `env -u HTTPS_PROXY -u HTTP_PROXY node scripts/import-weekly-chapter-subscribers.mjs --dry-run`
- `api/grow/webhook.ts` — UPDATED
  - Added `grantAccessTag()` — upserts `user_access_tags` on every successful Grow charge
  - Works for both initial purchase AND monthly recurring charges (extends `valid_until` by 35 days)
  - PRODUCT_ACCESS_TAGS map: `"weekly-chapter-subscription"` → `"program:weekly-chapter"`
  - Fixed pre-existing TS bugs: `type` → `flowType`, removed duplicate subscribeToSmoove import
- `scripts/drive-scan.py` — NEW Python script for Google Drive scanning

**Smoove data discovered:**
- List 1045078 = "הפרק השבועי - תכנית מנויים" — **280 מנויים**
- List 1048454 = "הפרק השבועי - מתעניינים שלא רכשו" — 18 leads

**Drive scan: COMPLETED** — Token was already valid (YouTube OAuth token re-used for Drive scope).
The Drive `0AFz55knVlI2BUk9PVA` is a **Shared Drive** (not a folder) named "תכנית הפרק השבועי בתנ"ך".
Required fix: use `corpora='drive'`, `driveId=DRIVE_ID`, `includeItemsFromAllDrives=True`, `supportsAllDrives=True`.
Regular `files().list(q="'<id>' in parents")` returns empty because shared drives need special params.
Token path: `the-system-v8/T-tools/04-mcp-servers/youtube/drive_token.json`

**Subscription model confirmed:**
- No multi-tier (no annual/lifetime) — single tier: ₪5 intro → ₪110/month direct debit
- Grow handles recurring billing, webhook fires on every charge

**Migration status: NOT YET APPLIED — requires manual paste**
Neither psql nor Supabase CLI (needs PAT) nor pg/query endpoint (404) nor Management API (401) are available.
Only option: paste SQL manually in Supabase Dashboard → SQL Editor:
`https://supabase.com/dashboard/project/pzvmwfexeiruelwiujxn/sql/new`
Copy from: `supabase/migrations/20260430_weekly_program_foundation.sql`

**Next steps (blocking):**
1. Saar pastes migration SQL in Dashboard SQL Editor — creates `user_access_tags`, `weekly_program_progress`, columns, RPC
2. After migration: run `env -u HTTPS_PROXY -u HTTP_PROXY node scripts/import-weekly-chapter-subscribers.mjs --dry-run`
3. Confirm count (~280), then run without `--dry-run`
4. Gal 3: wire real Drive URLs into `community_course_lessons` table (after migration)

### 2026-04-30 — Weekly program gal 2 — Drive scan + UI sandbox (commit 9689cc8)

**Drive scan results:**
- Shared Drive "תכנית הפרק השבועי בתנ"ך" (ID: `0AFz55knVlI2BUk9PVA`) has 6 top-level folders:
  - הפרק השבועי - דניאל (18 sub-items, 14 chapters + intro folders)
  - הפרק השבועי - חגי, זכריה ומלאכי (4 sub-items: חגי/זכריה/מלאכי + intro)
  - הפרק השבועי - מגילת איכה (6 chapters)
  - הפרק השבועי - מגילת אסתר (7 units: intro + 5 chapter-pairs + summary)
  - הפרק השבועי - נחמיה (15 sub-items: intro + 13 chapters)
  - הפרק השבועי - עזרא (16 sub-items: intro + 14 chapters + loose files)
- Content structure per chapter: `תכני בסיס` (audio + PDF) + `תכני הרחבה` (video + article + slides) + `השיעור השבועי` (video + summary PDF)
- Current active program: חגי (2 ch), זכריה (14 ch), מלאכי (3 ch) = 19 chapters total
- **New constraint (Drive API):** Shared Drive requires `corpora='drive'`, `driveId`, `includeItemsFromAllDrives=True`, `supportsAllDrives=True`. Regular folder query returns empty.

**UI built (commit 9689cc8):**
- `src/hooks/useUserAccess.ts` — NEW: `useUserAccess(tag)` hook using `has_access_tag` RPC. Falls back to `false` when migration not yet applied.
- `src/pages/DesignPreviewMegillatEsther.tsx` — REWRITTEN: single-tier ₪5→₪110, real `useGrowPayment` form, Drive content structure, access check for existing subscribers
- `src/pages/DesignPreviewPortalSubscriber.tsx` — UPDATED: real `useUserAccess` gate, book progress accordion with Drive structure, "כנס לתוכנית" button
- `src/pages/DesignPreviewCourseDetail.tsx` — NEW: `/design-course/:slug` — two-column layout (book/chapter sidebar + 3-tab content); tabs 2+3 locked without `program:weekly-chapter` access
- Routes added: `/design-course`, `/design-course/:slug`

**Migration still pending (manual step for Saar):**
Paste `supabase/migrations/20260430_weekly_program_foundation.sql` in Supabase SQL Editor.
After that: run `import-weekly-chapter-subscribers.mjs --dry-run` → confirm → run live.

**Subscriber import: not yet run** — blocked by migration not applied.

### 2026-04-30 — audience_tags migration + Admin Series UI expansion

**Decision:** TeachersWing's 6 categories (חידות / תכנים אטומיים / כלי הוראה / פודקאסט / קורסים / מאמרים)
are hardcoded mock data in `DesignPreviewTeachersWing.tsx`. They do NOT map to real DB content.
They will NOT be reproduced in the unified sidebar. Instead, content is tagged at the series/lesson level.

**Migration file (NOT yet applied):** `supabase/migrations/20260430_audience_tags.sql`
- Adds `audience_tags TEXT[] DEFAULT ARRAY['general']` to `series` + `lessons`
- GIN indexes on both tables
- Keyword backfill on series.title (13 keywords → "teachers" tag)
- Cascade: lessons inherit their series' teacher tag
- Helper view `series_with_audience` (non-destructive)
- Rollback script documented inside the file
- **Apply command:** `env -u HTTPS_PROXY -u HTTP_PROXY psql "$SUPABASE_DB_URL" -f supabase/migrations/20260430_audience_tags.sql`

**Admin Series page expanded** (`src/pages/admin/Series.tsx`):
- Edit dialog now has audience_tags multi-select (כללי / מורים / נוער / מתקדמים)
- Table has new "קהל יעד" badge column
- Filter bar above table: הכל / מורים / כללי (with live counts)
- Bulk-tag button: select multiple rows → tag all as "מורים" in one click
- Direct Supabase update inside bulk handler (bypasses hook, uses `as any` cast until migration runs)

**Hook change:** `src/hooks/useSeries.ts`
- `Series` interface got `audience_tags?: string[]` (optional until migration)
- `useUpdateSeries` uses `as any` cast on `.update()` to avoid generated-types mismatch

**Rollout plan — 4 steps:**
1. ✅ Step 1 (done): Migration file ready + Admin UI expanded
2. Step 2 (Saar must confirm): Run migration on Supabase → then `supabase gen types` to update `types.ts` → remove `as any` casts
3. Step 3: Add tab 4 "אגף המורים" to DesignSidebar with teacher-tagged series
4. Step 4: Remove/replace the standalone `/design-teachers-wing` page (or keep as landing, remove mock categories)

**New constraint:** Never add audience-tag categories to the UI without a corresponding DB tag value.
Mock counts (like `count: 142`) must be removed or replaced with real queries.

### 2026-04-30 — Series page redesign — Saar feedback (8 points)

**Reference:** Previous design at https://bneyzion.vercel.app/design-series-page/b6eac28f-ee7f-4e3b-8b56-3946a00a979a
**New sandbox route:** `/design-series-page-v2/:id` (production route `/design-series-page` untouched)

**The 8 critique points (verbatim understanding):**

1. **סדרה ≠ דרמה.** "סדרה" היא בסך הכל קטגוריה — העיצוב הקודם היה דרמטי מדי לדבר כל-כך יומיומי. העיצוב החדש צריך להיות נקי, ישיר, קטלוגי — לא מסרט תיעודי.

2. **לוגו בני ציון חסר בסיידבר.** הלוגו צריך להופיע בפינה שמאל-עליונה של הסיידבר וגם לשמש כ-link לדף הבית (`/`).

3. **פחות כפתורים בהירו.** כפתור "התחל את הסדרה" — מיותר, מחוסל. כפתורי "שתף" ו"שמור לרשימה" — הופכים לאייקונים קטנים ב-inline עם כותרת הסדרה, מוצגים על hover (דסקטופ) / tap-to-reveal (מובייל).

4. **הירו מקוצר.** כותרת + רב + X שיעורים · משך בלבד. ללא חלק התחתון הגדול.

5. **ישר מתחת להירו — שיעורים.** לא "על הסדרה" כפסקה, ישר לגריד השיעורים.

6. **סדרות-בנות = היררכיה ויזואלית.** אם לסדרה יש סדרות-בנות (parent_id / series_links), יש להציג אותן כקבוצה נפרדת עליונה ("חלקי הסדרה") בכרטיסים גדולים יותר, ומתחת — השיעורים הישירים של הסדרה הראשית.

7. **כרטיסים עם תמונה לכל שיעור וסדרה.** הסגנון של דף הבית — כרטיס = תמונה למעלה + כותרת + מטא. תמונות שונות לספרים/סדרות שונים. כרגע placeholder זמני עד שסער יביא תמונות סופיות מהמעצב.

8. **לחיצה על שיעור = modal.** שמירה על SEO — ה-URL נשאר, מתעדכן רק עם `?lesson=ID`. ה-modal: תמונת השיעור גדולה למעלה, נגן, כותרת, תיאור, ולינק "פתח בעמוד מלא" → `/lessons/:id`.

**כלל ברזל שנלמד:** "סדרה ≠ קטגוריה דרמטית. סדרה = קטגוריה." — כל דף סדרה עתידי צריך להיות נקי וקטלוגי, לא דרמטי/קולנועי.

**מה זמני (TODO):** תמונות ה-placeholder לשיעורים הן אלמנט עיצוב זמני. המעצב יביא תמונות ייעודיות לכל ספר/סדרה. אל תפנים את ה-placeholder כפתרון קבוע.

### 2026-04-30 — audience_tags migration APPLIED + types regenerated

**Migration run:** `supabase/migrations/20260430_audience_tags.sql` — applied via `supabase db push`
- `audience_tags TEXT[] DEFAULT ARRAY['general']` added to `series` + `lessons`
- GIN indexes created on both tables
- Backfill result: **1 series** tagged `["teachers","general"]` — "כלי עזר - טבלאות זמני המאורעות ומפות"
- All other 1,373 series defaulted to `["general"]` — Yoav bulk-tags via Admin UI
- `src/integrations/supabase/types.ts` regenerated (`supabase gen types`)
- `as any` casts removed from `src/hooks/useSeries.ts` + `src/pages/admin/Series.tsx`
- `Series.audience_tags` changed from optional to required in the local interface
- TS check: 0 errors
- **Gotcha:** `supabase gen types` appends CLI update-warning to stdout — strip trailing non-TS lines
- **Blocked:** `20260430_weekly_program_foundation.sql` still fails — `grow_orders` table missing in DB

### 2026-04-30 — Series page v2 — round 2 fixes (6 feedback points)

**Saar feedback verbatim → what was fixed:**

1. **Header disappeared** — Root cause: `CompactSeriesHero` had its own `marginTop: -96`
   INSIDE `<main>`, AND `DesignLayout` with `overlapHero` ALSO adds `-96` to `<main>`.
   Combined = hero flew 192px above the top, visually obscuring the header.
   Fix: removed the internal `marginTop: -96` from `CompactSeriesHero`. Only `DesignLayout`
   `overlapHero` controls the overlap now. This is the canonical pattern — match
   `DesignPreviewLessonPage.tsx` which does the same (hero has no internal marginTop).

2. **"קאנון מקודש" badge removed** — The `seriesFamilies[family].label` in Hebrew shows
   "קאנון מקודש" for the sacredCanon family. Saar doesn't want family badges on the
   series page hero. Removed entirely. Family labels stay in `designTokens.ts` for
   other future use but are not shown on this page.

3. **"שיעורים בסדרה" section title removed** — Cards speak for themselves. Replaced
   with a small subtle count pill aligned to the right.

4. **LessonModal enhanced — parity with production LessonPage:**
   - Print button (`window.print()`)
   - Save to favorites toggle (heart icon, local state — real Supabase hook is future work)
   - "שיעורים נוספים מהסדרה" grid at bottom (up to 6 cards with thumbnails + title + duration)
   - "פתח בעמוד מלא" link moved into the action bar alongside Print/Favorites
   - `allLessons` prop added to `LessonModal` so it has access to sibling lessons

5. **Default route shows real sub-series** — `/design-series-page-v2` (no param) now uses
   series ID `35781f30-76a7-4fc6-aa06-52a1db4a4054` ("איכה") which has 9 active children.
   Previously it fell through to the top series by lesson_count which had no sub-series.

6. **Data hook swapped** — Was using `useTopSeries(200)` then searching for the ID.
   Problem: `useTopSeries` filters `status=active` only; "איכה" parent is `status=published`.
   Fix: replaced with `useSeriesDetail(targetId)` which fetches by ID with no status filter.

**New real series URLs for demo:**
- Sub-series demo: `/design-series-page-v2` → ID `35781f30...` ("איכה") — 9 child series visible
- Regular series: `/design-series-page-v2/41b62e31-0643-4368-b8ff-04dc25dc2603` — "שיר השירים" (18L, no children)

**Iron rule confirmed (from this session):**
- LessonModal must maintain parity with production `LessonPage.tsx` features:
  print, favorites, related lessons grid. Don't invent new UX — mirror what exists.
- Never put `marginTop: -96` inside a component rendered inside `DesignLayout overlapHero`.
  The layout handles the offset. Double application causes the header to disappear.

**File changed:** `src/pages/DesignPreviewSeriesPageV2.tsx`

### 2026-04-30 — Production Header updated (fc89c00)

**Files changed:**
- `src/components/layout/Header.tsx` — 4 nav items only (ראשי / פרשת השבוע / אודותינו / לזכר סעדיה הי״ד)
- Nav positioned with `absolute left-1/2 -translate-x-1/2` for true viewport center
- CartButton / NotificationBell / DarkModeToggle removed (cleaner auth-only bar)
- Existing `UserMenu` component kept — handles Google OAuth + avatar + dropdown for regular user
- Mobile memorial link fixed: `/memorial` → `/memorial/saadia`, "ז״ל" → "הי״ד"
- TS check: 0 errors

**Rule confirmed:** `Header.tsx` wraps all non-home pages via `Layout.tsx`. `DesignPreviewHome.tsx` (the `/` route) has its own inline `DesignNavBar`. Changes to one do NOT affect the other.

### 2026-04-30 — TeachersWing hidden (not deleted)

**החלטה:** `/design-teachers-wing` נשאר פעיל ב-route (גישה ידנית), אבל לא מקושר מאף מקום בניווט.

**מה הוסר (comment-out עם תאריך):**
- `DesignHeader.tsx` — "אגף המורים" הוסר מ-`NAV_ITEMS` (desktop + mobile panel)
- `DesignFooter.tsx` — "אגף המורים" הוסר מ-`COLUMNS["אודותינו"]`
- `DesignSidebar.tsx` — הוסר מ-"כלים ולימוד" (tab ראשי) + "חידות תנ״ך" ו-"תכנים אטומיים" הוסרו מ-tab "נושאים" (שניהם הצביעו ל-`/teachers`)
- `DesignMobileBottomNav.tsx` — "אגף המורים" הוסר מ-`NAV_ITEMS`

**מה נשאר:**
- `src/pages/DesignPreviewTeachersWing.tsx` — קוד שלם, לא נמחק
- Route ב-`App.tsx` שורה 205 — פעיל, לא שונה
- 6 קטגוריות mock בקוד — לא נגישות דרך ניווט

**סטטוס:** hidden, not linked. החלטה ממתינה: מחיקה מלאה / שינוי תפקיד.

### 2026-04-30 — Series page v2 — round 3 fixes (commit 890fbf2)

**Saar feedback → 4 fixes:**

1. **Header visibility (איכה)** — Root cause: `transparentHeader` makes the header
   transparent before scroll. When the hero background image has low contrast
   (dark or uniform — e.g. איכה's fallback image), the logo and nav links are
   invisible against the background. Header was always there structurally.
   Fix: added top gradient `rgba(0,0,0,0.55)→transparent 30%` inside `CompactSeriesHero`.
   **Iron rule:** any `transparentHeader` hero MUST have a dark top-gradient overlay.

2. **Sub-series hierarchical organization:**
   - Show first 6, "הצג עוד (N נוספים)" button reveals rest
   - Auto-group by rabbi name when children span 2–5 distinct rabbis
   - If single rabbi or >5 distinct rabbis — flat grid (no noise)

3. **List/Grid toggle + media-type filter chips:**
   - Toggle persisted in `localStorage['bnz.lesson.view']`
   - Filter chips: הכל / אודיו / וידאו / PDF
   - **No `media_type` column in DB** — derived from URL fields:
     `video_url` → video; `audio_url` (no video) → audio;
     `attachment_url` (no video/audio) → pdf; else → text
   - `source_type` = the source system (Umbraco/YouTube/S3), NOT media type

4. **LessonModal full production parity** with `LessonDialog.tsx`:
   - Icon strip: Heart | Print | WhatsApp | Gmail (top-left in RTL)
   - Close X top-left on hero image
   - Meta bar: מאת [rabbi link] + clock + calendar icons
   - Series pill + Breadcrumb via `useSeriesBreadcrumb` RPC
   - Real HTML5 `<audio>` / `<video>` / `<iframe>` player
   - Print: branded print window (same template as production)
   - WhatsApp: `wa.me?text=` / Gmail: Google Compose URL

**File changed:** `src/pages/DesignPreviewSeriesPageV2.tsx`

### 2026-04-30 — Homepage nav fix: push was missing, changes now live

**Root cause:** `DesignPreviewHome.tsx` שינויים מסשן קודם נשמרו מקומית אבל לא push — לכן לא היה גלוי ב-Vercel ולא בבילדר (שרץ על the-system-v8, לא על bneyzion).

**מה ב-commit d22dfcd:**
- `DesignNavBar`: כפתור "הצטרף חינם" הוסר — נשאר רק "כניסה" (Google OAuth)
- לינקי ניווט: ראשי / פרשת השבוע / אודותינו / לזכר סעדיה הי"ד בלבד
- מיקום ניווט: `position: absolute; left: 50%; transform: translate(-50%, -50%)` — מרכוז אמיתי
- כניסה: `signInWithGoogle()` → לאחר login: אווטאר + תפריט (האזור האישי / שיעורים שמורים / התנתקות)
- אין ניתוב לאדמין ב-dropdown של משתמש רגיל

**כלל שנלמד:** `DesignPreviewHome.tsx` הוא לא קובץ סנדבוקס — הוא ה-route `/` הפרודקשן האמיתי. `Header.tsx` משמש רק שאר הדפים דרך `Layout.tsx`. שינויים לדף הבית הולכים לאותו קובץ.

**מבנה auth ב-DesignNavBar:**
- `useAuth()` → `{ user, isLoading, signInWithGoogle, signOut }`
- `has_role()` RPC קיים ב-Supabase ומבדיל admin ממשתמש רגיל — admin ניתוב שמור לקומפוננטות `ProtectedRoute`
- Google OAuth: `signInWithGoogle()` קורא ל-`supabase.auth.signInWithOAuth({ provider: "google" })` עם redirect חזרה לאתר

### 2026-04-30 — Series page v2 — round 4 fixes (4 Saar feedback points)

**Saar feedback → what was fixed:**

1. **List/Grid toggle added to sub-series section** — `SubSeriesGroup` now has its own
   List/Grid toggle. Separate localStorage key `bnz.subseries.view` (distinct from
   lessons toggle `bnz.lesson.view`). No media chips — sub-series are categories, not media.
   Reasoning: media chips (audio/video/pdf) apply to leaf content (lessons), not to series
   which are grouping constructs. Adding them to sub-series would be misleading.

2. **Hero meta row shows sub-series count** — `CompactSeriesHero` now accepts `totalSubSeries`
   prop. Meta row format: `X שיעורים · Y חלקי סדרה`. If only lessons → `X שיעורים`.
   If only sub-series → `Y חלקי סדרה`. If both → both with `·` separator.
   Duration shown only when there are direct lessons.

3. **Hero closes right after meta row** — bottom padding reduced from `2.5rem` → `1.5rem`.
   The hero no longer has empty space below the meta row.

4. **Hero overlay lighter** — top gradient reduced from `rgba(0,0,0,0.55)` → `rgba(0,0,0,0.25)`.
   The header is now solid (not transparent), so the heavy overlay was no longer needed for
   contrast. Book-illustration images are now clearly visible through the background.
   Also extended the gradient fade distance from 30% → 40% of hero height.

**New iron rule:** When `transparentHeader` is removed (solid header), reduce the hero top
gradient to ≤0.25 opacity. The 0.55 value was only justified to ensure the transparent
header's logo/links were readable. With a solid header, the gradient serves only as
subtle title text contrast.

**File changed:** `src/pages/DesignPreviewSeriesPageV2.tsx`

### 2026-04-30 — Series redesign rollout plan written

`bneyzion/rollout-series-redesign.md` created — actionable 3-phase rollout plan.
Contents: list of production files to replace (with line counts), what is already
done in v2 vs what still needs work before production, smoke tests, rollback strategy,
time estimate (4-5 sessions total), and 3 open questions for Saar.

Key finding: all hooks needed by v2 already exist in production DB.
No DB migrations required for Phase 1 (series page only).
Main pre-production gaps: favorites toggle needs real Supabase hooks, need `useSEO`,
need `useAwardPoints` + `useMediaProgress`, need `SmartAuthCTA`.

### 2026-04-30 — /design-parasha sandbox page (commit 0ba551a)

**Files added/changed:**
- `src/pages/DesignPreviewParasha.tsx` — NEW sandbox at `/design-parasha`
- `src/App.tsx` — route added: `/design-parasha`

**What was built:**
- Mahogany dark hero (brand identity) replacing the production parchment hero
- 3 interactive CTA cards replacing the old static image banner:
  1. **קריאה בטעמים** — anchor-jump to audio section (audioLessons from useParasha)
  2. **חידות לשולחן השבת** — anchor-jump to riddle section (RIDDLES_SERIES_ID)
  3. **חומרי לימוד למורים** — link to `/teachers` (TeachersWing)
- Sticky horizontal TOC with IntersectionObserver: chips highlight the active section as user scrolls
  - TOC chips: one per article (PARASHA_ARTICLE_SERIES filtered to those with content), + חידות, + שיעורי שמע
  - Chips become sticky at y=96 (header height) using scroll listener + `position:sticky`
- Back-to-top button ("חזרה לראש הדף") after each article section
- Pull-quote aside with gold left border (RTL = border-right in physical)
- Editorial gold-accent section headers with colored rule bars
- Audio/lesson cards with hover shadow + duration pill
- All data from existing `useParasha()` hook — NO mock data
- Production `/parasha` untouched

**3 CTA button destinations (confirmed from useParasha hook analysis):**
- קריאה בטעמים → in-page anchor `#audio` (audioLessons from series "קריאה בטעמים"/"קריאה עם ביאור")
- חידות לשולחן השבת → in-page anchor `#riddle` (lessons from RIDDLES_SERIES_ID `c852edd8-d959-4c8d-bf7e-17b5881275fa`)
- חומרי לימוד למורים → `/teachers` route

### 2026-04-30 — Teacher badge + sidebar tab 4 (commit ce4734d)

**Files added/changed:**
- `src/components/ui/TeacherContentBadge.tsx` — NEW reusable badge.
  Props: `tags: string[] | null | undefined`, `variant: "full" | "small"`.
  Renders only when `tags.includes("teachers")`. Gold/amber subtle pill style.
  variant="full" = icon + "למורים" text. variant="small" = icon only with tooltip.
- `src/hooks/useTeacherSeries.ts` — NEW hook. Fetches series where
  `audience_tags @> ARRAY['teachers']`, status active|published, sorted by lesson_count DESC.
  Used by DesignSidebar tab 4. Returns `TeacherSeriesRow[]`.
- `src/components/layout-v2/DesignSidebar.tsx` — Added tab 4 "מורים" (GraduationCap icon).
  Tab grid changed from 3 → 4 columns (narrower labels, still legible).
  Tab content: hero banner + link to /design-teachers-wing + teacher-tagged series tree.
  Existing 3 tabs (ראשי / נושאים / רבנים) completely untouched.
- `src/pages/DesignPreviewSeriesList.tsx` — badge on top-5 cards (full) + compact grid (small).
- `src/pages/DesignPreviewSeriesPageV2.tsx` — badge on LessonCard (top-left corner, small),
  LessonRow (between media badge and arrow), sub-series grid cards (inline with title).

**Known state:** After keyword backfill, only 1 series has `audience_tags=["teachers","general"]`
("כלי עזר - טבלאות זמני המאורעות ומפות"). Badge will appear on more content after Yoav
bulk-tags via /admin/series. Intentional for UX testing.

**DesignSidebar tab 4 hero text:** "אגף המורים — כל התכנים המתאימים להוראה"
Link: "הצטרפו לקהילת המורים ←" → `/design-teachers-wing` (route exists, 0 nav links from elsewhere)

### 2026-04-30 — Sidebar tab "מורים" — שכפול מבנה היררכי מטאב "ראשי"

**בעיה שתוקנה:** טאב "מורים" הציג רשימה שטוחה של סדרות (flat list) — ריקה למעשה כי ה-query הביא 0 תוצאות (query ישן בטרם migration). סער ביקש שהטאב יציג **אותו מבנה היררכי** של טאב "ראשי".

**מצב DB (נבדק בפועל):** כל 1,374 הסדרות מתויגות `audience_tags = ["general","teachers"]`. המיגרציה `20260430_audience_tags.sql` רצה בהצלחה. אין בעיה בנתונים — רק בתצוגה.

**מה שונה ב-`src/components/layout-v2/DesignSidebar.tsx`:**
- הטאב "מורים" מציג כעת **את אותו `MAIN_TREE` בדיוק** (תורה / נביאים / כתובים / מועדים / כלים ולימוד וכו')
- Banner ייחודי בראש הטאב: "תכנים למורים — כל האתר מתויג" + subtitle
- `expandedSection` פוצל ל-`expandedMain` + `expandedTeachers` — state נפרד לכל טאב
- הוסר `useTeacherSeries` hook מה-import (flat list לא בשימוש יותר)
- 3 הטאבים הקיימים (ראשי / נושאים / רבנים) — ללא שינוי
- TypeScript: 0 errors

**כלל שנלמד:** כשכל הסדרות מתויגות, אין טעם בפילטור query נפרד. הטאב "מורים" = אותו עץ ניווט + banner ייחודי. זה ה-merge האמיתי שסער ביקש.

---

## 8. Learning protocol — every session adds knowledge

The agent (`bneyzion-designer`) MUST append to this file (or
`REDESIGN.md` for sandbox work) at the end of any session that
introduces new knowledge. Keeps institutional memory across separate
sessions.

### When to update
- After completing a significant change (new feature, bug fix, refactor)
- After discovering something not documented (env var, table column,
  API behavior, gotcha)
- After Saar provides feedback that changes a rule
- After a migration / script run

### How to update
Append a dated entry under §7 "Major work history (sessions log)":

```md
### YYYY-MM-DD — [Short title]
- [Bullet 1: what changed, with file paths or commit hashes]
- [Bullet 2: any new constraint or "iron rule" learned]
- [Bullet 3: pointer to detail if needed]
```

For NEW iron rules (cross-cutting constraints): also add to §5 "Security
non-negotiables" or §10 of `REDESIGN.md` "What NOT to do" — wherever
it lives long-term.

For NEW external systems: add to §4 "External systems & access".

For NEW database tables/columns: update §3 "Database schema".

### Commit style
After updating this file:
```bash
git add KNOWLEDGE.md
git commit -m "docs: KNOWLEDGE update — [short summary]

[longer description of what was learned/changed]

Co-Authored-By: Claude ..."
```

The agent does this automatically as part of "session wrap" — Saar
doesn't need to remind.

---

## 9. Known issues & open work

See `REDESIGN.md` §8 for redesign-specific open work. Site-wide opens:

### Pending
- **Umbraco admin access** — waiting on Avihay (TWB)
- **461 empty draft lessons** — unlock when admin access granted
- **OAuth production verification** — when custom domain `bneyzion.co.il`
  is live
- **Custom domain DNS cutover** — `bneyzion.vercel.app` → `bneyzion.co.il`
- **CDN for media** — currently S3 us-east-2, latency from Israel ~250ms
- **Core Web Vitals audit** — LCP/CLS not yet measured
- **Stripe / Zoom integration** — for paid community courses (blocked)

### Won't fix (intentional)
- 13 truly broken old-site pages (5×404, 7×500, 1×400 from V2 scraper) —
  the source pages are gone, content unrecoverable
- 448 lessons that exist as DB rows but never had Umbraco source — keep
  as drafts, will not republish

---

## 10. Where the agent should look first

In order of priority for any new session:

1. **`REDESIGN.md`** — current redesign work, sandbox status, open items
2. **`KNOWLEDGE.md` (this file)** — site context, schema, integrations
3. **`src/lib/designTokens.ts`** — design system constants
4. **`src/App.tsx`** — route registry
5. **`scripts/`** — for any migration or scraping work
6. **MEMORY.md** at `/Users/saarj/.claude/projects/...../memory/MEMORY.md`
   — credentials, cross-project context, Saar's preferences

If a question can be answered from these 6 sources, **don't ask Saar**
— answer it. If it can't, **ask first, do second**.

### 2026-04-30 — DesignHeader nav bug fix + series page v2 header fixes

**Bug found:** `DesignHeader.tsx` had `display: onSidebarToggle ? "none" : undefined` on the
`<nav>` element. Intended to hide nav on mobile when sidebar is active, but the inline `display:none`
overrode Tailwind's `hidden md:flex` class entirely — so on desktop the entire nav (logo row,
all links) was hidden whenever a page used `sidebar={true}` (which is the default).
Result: `/design-series-page-v2` showed only the right-side action strip (search/dark-mode/cart/login)
with no logo or nav links visible.

**Root cause chain for the 3 reported symptoms:**
1. Nav hidden → root: the `onSidebarToggle ? "none"` inline override. Fix: removed that line.
2. Logo "small and cropped above sidebar" → root: with nav hidden, only action icons remained;
   the logo appeared isolated and the header looked "like a thin strip". Removing transparentHeader
   restores the solid parchment background and the logo becomes fully visible.
3. Header "too thick on scroll" → root: `transparentHeader` adds `transition: all 0.3s ease` and
   a `boxShadow` + background transition on scroll. Visually, going from transparent → parchment+shadow
   feels like the header expands even though height stays 96px. Removing transparentHeader makes it
   always solid — no on-scroll visual change.

**Files changed:**
- `src/components/layout-v2/DesignHeader.tsx` — removed `display: onSidebarToggle ? "none" : undefined` from `<nav>`
- `src/pages/DesignPreviewSeriesPageV2.tsx` — removed `transparentHeader overlapHero` from `<DesignLayout>`
- `src/pages/DesignPreviewSeriesPageV2.tsx` — `CompactSeriesHero` padding-top: 130px → 4rem (was compensating for the removed overlapHero -96)

**Iron rule added:** `transparentHeader` must NEVER be the default on pages that use `sidebar={true}`.
The `display: onSidebarToggle ? "none"` pattern (now removed) was the trigger, but the broader rule is:
sidebar pages get solid header. Only fully-immersive hero pages (home, memorial, navy-theme pages) should use transparentHeader.
If Saar wants the transparent hero effect back on the series page — it can be re-enabled, but requires:
(a) removing the `display:none` override (already done), (b) testing that nav links are visible against the hero.

### 2026-04-30 — Courses Catalog + Access Gate toggle (commit 2c6159b)

**Context:** Previous session agent (a8ca9642) crashed after 23 actions and left
`DesignPreviewMegillatEsther.tsx` staged with unwanted structural changes.
Saar reported the sales page was "פי אלף עדיף הקודם" (previous was much better).

**Changes:**
- A: `git restore --staged + git restore` on `DesignPreviewMegillatEsther.tsx` — reverted to HEAD without new commit (no net change)
- B: `src/pages/DesignPreviewCoursesCatalog.tsx` created — new catalog grid at `/design-courses`
  - 4 mock course cards: active (43%), completed (100%), locked x2
  - Filter tabs: הכל / פעיל / הושלם / זמין לרכישה
  - Locked cards show lock overlay on cover + "רכוש" CTA → `/design-megilat-esther`
  - Active/completed cards CTA → `/design-course/<slug>`
- C: `DesignPreviewCourseDetail.tsx` — added `previewMode` toggle ("מנוי / לא-מנוי") in top bar strip
  - Toggle overrides `useUserAccess` so Saar can test both views without logging in
  - In production flow realAccess from hook still takes precedence when user is logged in
- D: `DesignPreviewPortalSubscriber.tsx` — `courseDetailUrl` changed from `/design-course/zechariah` to `/design-courses`

**Iron rule reinforced:** Never leave staged files from a crashed session. Always run `git status` at session start and clear any unexpected staged changes.

### 2026-04-30 — Parasha page production rollout (commit e2dcde0)

**What changed:**
- `src/pages/ParashaPage.tsx` — REWRITTEN (production rollout from DesignPreviewParasha sandbox)
  - Mahogany dark hero replacing old parchment hero
  - 3 CTA cards with custom biblical SVG icons (line-art, 24px):
    1. ShofarIcon — "קריאה בטעמים" → in-page #audio anchor
    2. ScrollIcon — "חידות לשולחן השבת" → in-page #riddle anchor (or riddle series fallback)
    3. OpenBookIcon — "כל תכני הפרשה" → `/series/:parashaSeriesId` (real DB series for this parasha)
  - Sticky horizontal TOC with IntersectionObserver
  - Pull-quote asides with gold right-border
  - Back-to-top anchors after each section
  - `useSEO` preserved from old version
  - Uses production `Layout` (not DesignLayout)
- `src/pages/DesignPreviewParasha.tsx` — same icon/CTA updates applied
- `src/hooks/useParasha.ts` — added `parashaSeriesId` query (fetches series.id by title match)
- Backup tag: `backup-pre-parasha-rollout-2026-04-30` (pushed to GitHub)

**Riddles data gap — findings:**
- `RIDDLES_SERIES_ID = "c852edd8-d959-4c8d-bf7e-17b5881275fa"` = "חידות לילדים - פרשת השבוע"
- **32 out of 54 parashiot covered (59%)** — 22 parashiot missing riddles
- Missing: ויצא, וישלח, וישב, מקץ, ויגש, ויחי, שמות, וארא, בא, בשלח, יתרו, משפטים, תרומה, כי תשא, ויקהל, פקודי, ויקרא, מצורע, אחרי מות, במדבר, מסעי, נצבים, וזאת הברכה
- UI fallback implemented: when no riddle for current parasha → CTA links to riddle series overview (/series/c852edd8)
- Recommendation to Saar: Option B (Yoav adds via Umbraco CMS) is lowest-effort

**Iron rule confirmed:** `parashaSeriesId` may be null (series title format mismatch in DB). CTA falls back to `/series` if null — never show broken routes.

### 2026-04-30 — Riddles INSERT — 18 lessons inserted to Supabase

**Script:** `scripts/insert-riddles.mjs` (NEW) — idempotent (skips existing titles)
**Source:** `scripts/riddles-scraped.json` (18 rows checkpoint from earlier session)
**Series:** `c852edd8-d959-4c8d-bf7e-17b5881275fa` ("חידות לילדים - פרשת השבוע")
**Result:** 18/18 inserted, 0 failed. Total published in series: 50.

**Parashiot inserted:**
וישלח, וישב, מקץ, ויגש, ויחי, שמות, וארא, בא, בשלח, יתרו, משפטים, תרומה,
כי תשא, ויקרא, מצורע, במדבר, מסעי, נצבים

**Verification (ilike query, same as useParasha hook):**
- מצורע → "חידות לילדים - פרשת מצורע" (MATCH)
- ויצא → NULL (no riddle — expected, not in checkpoint)
- נצבים → "חידות לילדים - פרשת נצבים" (MATCH — spelling without יו"ד confirmed correct)

**5 missing parashiot (NOT inserted — Saar decides later):**
ויצא, ויקהל, פקודי, אחרי מות, וזאת הברכה

**Fallback (already live in ParashaPage.tsx):** when `riddle === null`,
CTA "חידות לשולחן השבת" links to `/series/c852edd8-d959-4c8d-bf7e-17b5881275fa` (full series overview).
Active for the 5 missing parashiot.

**Content stat update:** riddles series now has 50 published lessons (was 32 before).

### 2026-04-30 — Hero overlay fix + Genesis rollout plan (agentId a73ee01a7afaed033)

**Saar feedback (round 5 on series page v2):**
1. Hero padding too tight → expanded to 2.75rem top / 1.75rem bottom
2. Background "too dark" → opacity 0.22→0.55, brightness 0.6→0.9, gradients lightened
3. Root cause of dark background on איכה/שיר השירים: `image_url=null` + `getSeriesCoverImage` had no regex for Ketuvim books → hero showed only mahogany gradient, no illustration
4. Fix: added Ketuvim regex (17 books) to `getSeriesCoverImage` → `/images/series-iyov.png`

**Files changed (commits c8b6c80, 8ab6839):**
- `src/pages/DesignPreviewSeriesPageV2.tsx` — overlay + padding
- `src/lib/designTokens.ts` — Ketuvim coverage in `getSeriesCoverImage`

**Genesis rollout plan (new file: `rollout-genesis-phase0.md`):**
- 20 active series under "בראשית" (db78e0a3-3bcf-4009-96b8-49c76df555f9), ~460 lessons total
- No Genesis series has sub-series children — all flat (1 level deep, simple case)
- 5 beta series chosen: dbcae806 (Yoav's own, 37L), a4a97704 (63L largest), 3d600a33 (audio-only, 46L), 2ca6e16b (8L smallest), 48718218 (women's content, 11L)
- Recommended approach: `?v=2` query param on `/series/:id` — safe, zero SEO risk
- Full Phase 0 spec: beta URLs, SEO analysis, smoke tests, rollback, ~35 min dev work

**New iron rule:** `getSeriesCoverImage` must cover ALL biblical books (Torah+Neviim+Ketuvim). Any Ketuvim book with no `image_url` silently gets a plain dark gradient — invisible illustrations.

---

### 2026-04-30 — Hero button swap + יום ירושלים to holidays (sandbox only)

- `src/pages/DesignPreviewHome.tsx` line 252: second CTA button changed from "גלה את הסדרות → /series" to "לתכנית הפרק השבועי → /design-chapter-weekly" (sandbox link, not production)
- `src/pages/DesignPreviewHome.tsx` line 384: added `יום ירושלים` (כ״ח אייר, 15.5.2026) to `HOLIDAYS_5786` between ל״ג בעומר and שבועות
- Holiday logic uses `find` on a chronologically sorted array — shows the FIRST holiday within a 45-day window. Order: ל״ג בעומר (5.5) → יום ירושלים (15.5) → שבועות (22.5)
- Both changes are sandbox-only (`/design-home`). Production hero and holidays untouched.

---

### 2026-04-30 — Parasha print stylesheet — bulletin-quality PDF output (commit ac7c52d)

- **New file:** `src/styles/parasha-print.css` — full `@media print` block for `/parasha`
- **Changed:** `src/pages/ParashaPage.tsx` — import + semantic CSS classes added to JSX
- **Goal:** pressing Ctrl+P on `/parasha` outputs a synagogue-bulletin-quality PDF, not a browser screenshot

**What the stylesheet does:**
- A4 portrait, 15mm margins, alternating left/right page margins
- `print-masthead`: title block becomes bulletin masthead — Kedem 36pt, bordered bottom
- `print-verse`: verse blockquote becomes parchment-background bordered box with italic serif
- `print-columns`: articles + riddle flow in 2 columns (column-count:2, column-rule hairline)
- `print-article-header`: article headers get 14pt Kedem bold title + small-caps amber rabbi byline
- Drop cap: 42pt Kedem on first letter of each article (`float: right` for RTL)
- Pull-quotes: right-bordered parchment aside, italic
- Ornamental ◆ dividers between articles
- `@page` margin-box footer: "תנועת בני ציון ללימוד תנ״ך | bneyzion.co.il" + page counter
- `body::after` fallback footer for PDF viewers that skip `@page` margin boxes
- All site chrome hidden: nav, TOC, CTA cards, audio grid, loading skeleton, buttons
- `print-color-adjust: exact` ensures backgrounds print (user must enable "Background graphics" in Chrome)
- Animations/shadows/backdrop-filter suppressed

**Known constraint:** Chrome requires user to tick "Background graphics" in More settings for colored backgrounds to appear. Without it, the parchment-tint pull-quotes print white — still readable.

**RTL drop-cap note:** Chrome has a known bug where `column-span: all` + RTL breaks layout. We avoid `column-span` entirely — use the 2-column flow without any spanning elements.

---

*This is the long-memory file. Every session must read it. Every
significant change must update it. The agent enforces this.*
