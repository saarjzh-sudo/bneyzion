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
| `lessons` | 11,818 | title, content (HTML), audio_url, video_url, attachment_url, source_type, rabbi_id, series_id, status, bible_book, bible_chapter, duration, thumbnail_url, **audience_tags TEXT[]** |
| `series` | 1,374 | hierarchical (parent_id), lesson_count, rabbi_id, status, image_url, **audience_tags TEXT[]** |
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
- **Status:** 47 products + 10 categories imported from WooCommerce into `products` / `product_categories`.
- The "do not touch /store or /checkout" warning is **REMOVED** (superseded 2026-05-03).
  Store pages can be edited freely. Compliance audit done — see §7 entry 2026-05-03.
- **TODO (next session):** Convert `/store/:slug` from `source_url` external redirect
  to internal Grow payment flow. Each product needs a row in `payment_products` table.
  See ProductPage.tsx TODO comment for details.
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

### Iron rules added 2026-04-30
6. **`transparentHeader` + `sidebar={true}` is forbidden.** The old `display: onSidebarToggle ? "none" : undefined` bug (now fixed in DesignHeader.tsx) caused nav to disappear on desktop. Sidebar pages always get a solid header. Only immersive hero pages (home, memorial) may use `transparentHeader`.
7. **Never put `marginTop: -96` inside a component that is rendered inside `DesignLayout overlapHero`.** The layout already applies the -96 offset to `<main>`. Double application causes the header to vanish.
8. **`DesignSidebar` must use `useContentSidebar()` — never a hardcoded MAIN_TREE.** Any change to the production sidebar tree (SeriesList.tsx) must be mirrored here.
9. **Never navigate from sidebar to `/bible/:book`.** Those pages are broken. All sidebar navigation must go to `/series/:id`.
10. **`source_type` is not media type.** `source_type` (Umbraco/YouTube/S3) is the migration source. Derive media type from presence of `video_url` / `audio_url` / `attachment_url`.
11. **`useTopSeries` filters `status=active` only.** Use `useSeriesDetail(id)` when you need to fetch a specific series regardless of status (e.g. parent series with status=published).
12. **`@media print` + Framer Motion = blank PDF.** Add `* { transform: none !important; will-change: auto !important; }` to any print stylesheet on pages with Framer Motion animations. Also: never use `column-count` with RTL without verifying Chrome doesn't collapse heights.
13. **`getSeriesCoverImage` must cover all 24 biblical books (Torah + Neviim + Ketuvim).** Without a Ketuvim entry, books like Lamentations/Song of Songs/Job fall back to mahogany gradient only — no illustration.
14. **`DesignPreviewHome.tsx` is production, not sandbox.** Despite the "DesignPreview" prefix, `/` serves this file. It was never renamed after replacing `Index.tsx`. Always verify routes in `App.tsx` before assuming production vs sandbox.
15. **Two navbars exist and must be updated together.** `src/components/layout-v2/DesignHeader.tsx` (global, all non-home pages) + `src/pages/DesignPreviewHome.tsx` inline `DesignNavBar` (home only). Adding a nav item requires updating both files.
16. **Route-swap is the safest rollout strategy.** Change the route binding in `App.tsx` only. No file copies, no renames. Instant rollback via `git checkout <backup-tag>`.
17. **Before any production rollout: `git tag -a backup-pre-X-YYYY-MM-DD -m "..."`.** Current tags: `backup-pre-redesign-rollout-2026-04-30`, `backup-pre-sidebar-rollout-2026-04-30`, `pre-swap-portal-2026-04-30T1652`, `backup-pre-parasha-rollout-2026-04-30`.

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
- Backfill result: **1 series** tagged `["teachers","general"]` via keyword matching — "כלי עזר - טבלאות זמני המאורעות ומפות"
- All other 1,373 series defaulted to `["general"]` at this point

**Subsequent Saar decision — bulk UPDATE all content to `["general","teachers"]`:**
After seeing the keyword backfill result, Saar decided ALL 1,374 series and 11,818 lessons
should be tagged `["general","teachers"]` immediately ("כל הסדרות רלוונטיות למורים").
This UPDATE was run manually via Supabase SQL Editor (not in the migration file):
```sql
UPDATE series SET audience_tags = ARRAY['general','teachers'];
UPDATE lessons SET audience_tags = ARRAY['general','teachers'];
```
Confirmed by commit `255f096` (DB check: "all 1,374 series already tagged").
The badge will appear on ALL content until Yoav manually removes the "teachers" tag
from series that are not teacher-appropriate (via /admin/series bulk-tag UI).
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

### 2026-04-30 — Home: sidebar below hero, smooth scroll from Hero CTA

**Decision (Saar):** Hero = full-width, no sidebar beside it. Below Hero, sidebar appears inline (desktop) or as drawer (mobile).

**Architecture chosen (option A — manual composition):**
- `DesignPreviewHome.tsx` no longer uses `Layout` or `DesignLayout`. Instead it composes manually:
  - `DesignHeader` with `transparentOnTop` + `onSidebarToggle` → manages `drawerOpen` state
  - `DesignHero` — full-width, overlaps header with `marginTop: -96` (unchanged)
  - `StatsBar` — full-width below hero, no sidebar
  - `<div id="learn-start">` — flex row: `DesignSidebar` (inline sticky on desktop, drawer on mobile) + `<main>` with all content sections
  - `DesignFooter` + `DesignMobileBottomNav` at bottom

**CTA scroll:** "התחילו ללמוד" button in `DesignHero` calls `scrollToLearn()` → `document.getElementById('learn-start')?.scrollIntoView({ behavior: 'smooth' })`. No longer navigates to `/series`.

**Sidebar behavior:**
- Desktop ≥1024px: `DesignSidebar` renders as sticky inline column (290px wide) beside main content
- Mobile <1024px: `DesignSidebar` renders as off-canvas drawer (always hidden until burger tap)
- The burger in `DesignHeader` toggles `drawerOpen` state via `onSidebarToggle` prop — same as `DesignLayout sidebar={true}`

**Files changed:** `src/pages/DesignPreviewHome.tsx`
- Removed: `import Layout from "@/components/layout/Layout"`
- Added: imports for `DesignHeader`, `DesignFooter`, `DesignMobileBottomNav`, `DesignSidebar`
- Local `DesignFooter` function renamed to `LegacyDesignFooter` (kept for reference, not rendered)
- `DesignPreviewHome` component now owns `drawerOpen` state

**Iron rule learned:** On the home page, sidebar must NOT appear beside the hero. Use manual composition — import shell components directly — instead of `DesignLayout` which forces sidebar to be at the same level as all content including the hero.

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

### 2026-04-30 — Portal v3 + Courses v2 + CourseDetail v2 — full gamification + 8-book timeline (commit 8a94c14)

**Saar's 5 answers (design decisions confirmed):**
1. Portal open to all registered users — only course tab content ("הרחבה" + "שיעור שבועי") locked per subscription
2. "הקורסים שלי" = one master card for the weekly-chapter program; no per-book separate courses
3. Gamification = full (streak + badges + level + points), modeled on "לוקחים אחריות"
4. QuickAction "כנס ללימוד עכשיו" → `/design-course/weekly-chapter#chapter-zechariah-7`
5. 8-book timeline across ALL pages: דניאל ✅ → איכה ✅ → עזרא-נחמיה ✅ → אסתר ✅ → חגי 🔄 → זכריה ▶️ → מלאכי ⏰ → יהושע ⏰

**DesignPreviewPortalSubscriber.tsx** — full rewrite (v3):
- `previewMode` toggle at top: subscriber / חבר רשום / אורח (3 states)
- QuickActions: 2x2 grid on mobile, 4-wide on desktop — primary "כנס ללימוד עכשיו" gold tile (2x wide)
- Stats: chaptersCompleted / weeksActive / hoursLearned / streakWeeks (with gold flame glow at 7+)
- Next session banner (navy card with countdown)
- Master course card: dark header with 8-book mini-timeline + overall progress ring SVG
- Gamification section (id="achievements"):
  - Streak heat-map (12-week bar chart, color ramp from muted → #e25822)
  - Level bar (1247/1500 → "לומד מתקדם רמה 4")
  - Badges 3x2 grid: 3 earned (gold) / 3 locked (grayscale)
- Recent + Favorites: 2-column with MiniLessonRow components
- Suggestions: real series data from `useTopSeries(8)`
- Membership footer: subscriber state OR join CTA

**DesignPreviewCoursesCatalog.tsx** — v2:
- Removed Daniel/Esther as locked independent courses
- Main course: full-width `MainCourseCard` with 8-book mini-timeline inline
- Secondary courses: "איך ללמוד תנ״ך" (completed), new independent mocks (פרשת השבוע / פרקי אבות / תהילים)
- Two sections: "הקורסים שלי" + "קורסים שתאהב"
- Filter tabs: הקורסים שלי / פעיל / הושלם / קורסים נוספים

**DesignPreviewCourseDetail.tsx** — v2:
- Sidebar expanded: 8 books instead of 3
- Books 1-4 (done) collapsed by default, expandable in read-only mode
- Book 5 (חגי) = in_progress, Book 6 (זכריה) = current + expanded + פרק ז active
- Books 7-8 (מלאכי, יהושע) = upcoming — locked, not clickable
- Breadcrumb: "< הקורסים שלי" → `/design-courses`
- Tab labels updated: בסיס / הרחבה / שיעור שבועי (was: תכני בסיס / העמקה / השיעור השבועי)

**Navigation links wired:**
- Portal "כנס ללימוד עכשיו" → `/design-course/weekly-chapter#chapter-zechariah-7`
- Portal "הקורסים שלי" → `/design-courses`
- Courses card "המשך" → `/design-course/weekly-chapter`
- Course detail breadcrumb → `/design-courses`
- Courses breadcrumb → `/design-portal-subscriber`

**TypeScript:** 0 errors

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

### 2026-04-30 — DesignSidebar v4 — עץ accordion אמיתי (commit 27eb88c)

**הבעיה שתוקנה:** הסיידבר הציג רשימת קישורים סטטיים (MAIN_TREE) שניווטו ל-`/bible/<ספר>` — דפים שבורים. לחיצה על "בראשית" פתחה דף ריק, לא רשימת סדרות.

**מה שונה ב-`src/components/layout-v2/DesignSidebar.tsx`:**
- מוחק לגמרי את ה-`MAIN_TREE` הסטטי
- `useContentSidebar()` מגדיר את כל הנתונים (אותו hook כמו SeriesList.tsx)
- 3 רמות accordion: קטגוריה → ספר → ילד (פרשה/פרק)
- רמה 4: `SeriesInlineList` — fetch lazy מ-Supabase כשפותחים ילד, מציג סדרות בתוך הסיידבר עצמו
- לחיצה על סדרה: navigate ל-`/series/:id` (עובד) — אין יותר `/bible/*`
- טאב "מורים": אותו עץ + banner ייחודי (אין פילטור נפרד)
- טאב "נושאים": מציג את extraSections (מועדים, הפטרות, כלי עזר...) עם אותו accordion
- `SeriesInlineList` מוצג עם גבול צד ידני (RTL: border-inline-start) וספירת שיעורים
- Loading state: skeleton bars בזמן fetch

**כלל שנלמד:** DesignSidebar חייב להשתמש ב-`useContentSidebar` — לא ב-MAIN_TREE סטטי. כל שינוי ב-tree של SeriesList חייב להשתקף גם כאן.

**כלל שנלמד:** אין לנווט ל-`/bible/*` מהסיידבר. דפי `/bible/:book` שבורים — זו משימה נפרדת. כל ניווט מהסיידבר ← `/series/:id` בלבד.

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

### 2026-04-30 — Print PDF bug fix (commit 9402313)

**Bug:** `/parasha` Cmd+P → Save as PDF produced a blank PDF: only masthead titles on page 1, a lone column-rule on page 2, footer on page 3. All article content (verse, articles, riddle) was invisible.

**Root causes (3 compounding Chrome print bugs):**

1. **Framer Motion + column-count = zero-height columns.** Framer Motion sets `transform: translateY(0px)` and `will-change: transform` as inline styles on every animated `<motion.article>`. In Chrome print mode, these inline styles create a new stacking context inside `column-count: 2`, causing Chrome to collapse element heights to zero. Content was rendered but had 0px height — invisible in the PDF.

2. **`column-count: 2` + `direction: rtl` is unreliable in Chrome print.** Even with the transform fix, Chrome's RTL multi-column print rendering has a known stability issue. Single column always works correctly.

3. **`overflow: hidden` on ancestors clips column content.** The hero `<section>` had Tailwind's `overflow-hidden`. The old CSS only fixed `section:first-of-type` overflow but not the `#root`/main wrappers. Chrome clips column content on any ancestor with `overflow: hidden`.

**Fix strategy applied to `src/styles/parasha-print.css`:**
- `* { transform: none !important; will-change: auto !important; }` — kills Framer Motion inline styles
- `html, body, #root, main, div, section, article, ... { overflow: visible !important; height: auto !important; opacity: 1 !important; }` — kills all clipping
- `.print-columns { column-count: 1 !important; }` — single column; content over aesthetics
- Narrowed all `display: none` rules to specific named selectors only (never `section`, `div`, `main` generically)
- Removed overly broad `[aria-hidden]` and `section:first-of-type` rules

**Iron rule:** Never use `column-count` in print CSS for RTL content without verifying Chrome doesn't collapse heights. If Framer Motion is present on the page, `transform: none !important` MUST appear in the `@media print` block. When in doubt — single column, full content, then add aesthetics.

### 2026-04-30 — TeacherContentBadge added to all lesson-display surfaces (commit dbce4c2)

**Problem:** badge was present on series cards (sidebar + SeriesList + SeriesPageV2), but missing from lesson-level displays.

**Surfaces fixed:**
- `src/hooks/useLesson.ts`:
  - `useLesson` select: added `audience_tags` column
  - `useSeriesLessons` select: added `audience_tags` column
  - (`useLessonsBySeries` already uses `select("*")` — no change needed)
- `src/pages/DesignPreviewLesson.tsx`: badge below title h1 in hero
- `src/pages/DesignPreviewLessonPage.tsx`: badge below editorial h1 in hero + inline in sidebar "שיעורים בסדרה" rail
- `src/pages/DesignPreviewLessonPopup.tsx`: badge beside h2 in modal header
- `src/pages/DesignPreviewSeriesPage.tsx`: badge in lesson card body (between title and footer)
- `src/pages/DesignPreviewSeriesPageV2.tsx`: already had badge in all 3 lesson surfaces (no change)

**Rule:** TeacherContentBadge must appear on EVERY surface that displays a lesson with a title — card, popup, modal, page header, and sidebar rail. When adding new lesson display components, always check and include badge.

### 2026-04-30 — Portal v4 + Courses v2.1 — 5 fixes (commit 870c3e1)

**Trigger:** Saar requested 5 fixes before production rollout + asked about rollout strategy.

**Fix 1 — CTA diverge by previewMode (PortalSubscriber):**
- subscriber primary tile: "כנס ללימוד הפרק השבועי — לחיות תנ״ך" (gold, links to weekly chapter)
- member primary tile: "המשך מאיפה שהפסקת" (teal, links to free series)
- guest: unchanged
- member stats: 3 tiles only (hoursLearned / lessonsWatched / favorites — NO streak)
- subscriber stats: 4 tiles (added streakWeeks with orange flame at 7+)
- weekly-chapter card + gamification section: shown only for subscribers (`{hasSubscription && <section>...</section>}`)
- upsell CTA for member: olive green card "בוא ללמוד תנ״ך כל שבוע" + ₪5 offer + 280+ social proof + "הצטרף עכשיו" button

**Fix 2 — hardcoded subscriber whitelist:**
- `src/lib/hardcodedSubscribers.ts` (NEW): HARDCODED_SUBSCRIBERS array + `isHardcodedSubscriber(email)` helper
- saar.j.z.h@gmail.com is in the list
- `src/hooks/useUserAccess.ts` updated: `hasAccess = dbAccess || hardcodedGrant` — DB RPC takes precedence once migration runs. Interim solution until Saar applies DB migration and imports 280 subscribers.

**Fix 3 — Lock overlay in CatalogCourses:**
- `src/pages/DesignPreviewCoursesCatalog.tsx` — previewMode toggle added (subscriber / חבר רשום)
- `MainCourseCard(isSubscriber)`: if `!isSubscriber` and `slug === "weekly-chapter"` → shows locked overlay (blurred cover + Lock icon + subscribe CTA)
- `CourseTile(isSubscriber, isLocked)`: available courses for member show "זמין בחבילת מנוי" + "רכוש קורס" → `/design-store`

**Fix 4 — RTL progress bars:**
- All progress bar track containers got `dir="ltr"` so fill runs right-to-left in RTL context
- Affected: level XP bar (PortalSubscriber), 8-book progress bar (CatalogCourses MainCourseCard + CourseTile)

**Fix 5 — Unused imports removed:**
- `useMemo` and `ArrowLeft` removed from PortalSubscriber imports (TS was passing but ESLint would warn)

**TS:** 0 errors before and after all changes.
**Push:** `HTTP_PROXY="" HTTPS_PROXY="" git push origin main` → success (5ca862e → 870c3e1)

**Rollout decision (pending Saar):** 3 options presented:
- (א) Full replacement: `/portal`, `/courses`, `/course/:slug` → new versions
- (ב) Parallel routes: `/portal-new`, `/courses-new` etc.
- (ג) Keep as `/design-*` sandbox, link from main nav

**Iron rule learned:** `{condition && <section>...</section>}` is clean JSX for conditional sections. But when condition applies to a whole block that spans many lines — keep `{condition && <section>` + `</section>}` on same visual level. Don't mix open-tag and close-tag in JSX fragments.

### 2026-04-30 — Production swap: portal/courses/course routes → new design (commit 1bab02e)

**Saar approved full production swap of 3 routes.**

**Strategy used:** Option B (route-only swap — no file copies, no renames).
- `/portal` → `DesignPreviewPortalSubscriber` (with `RequireAuth` wrapper maintained)
- `/courses` → `DesignPreviewCoursesCatalog` (NEW production route — no prior production page)
- `/course/:slug` → `DesignPreviewCourseDetail` (NEW production route — no prior production page)
- `/portal-old` → old `Portal.tsx` (legacy backup, RequireAuth, accessible for rollback comparison)
- `/portal/course/:id` → `CommunityCoursePage` (unchanged legacy)
- All `/design-*` sandbox variants remain intact as canonical references

**File changed:** `src/App.tsx` only (6 lines changed)

**Backup tag:** `pre-swap-portal-2026-04-30T1652` (local + remote GitHub)

**Verification (curl):**
- `/portal` → 200
- `/courses` → 200
- `/course/weekly-chapter` → 200
- `/portal-old` → 200
- `/design-portal-subscriber` → 200 (sandbox still works)
- `/design-courses` → 200
- `/design-course/weekly-chapter` → 200

**Iron rule learned:** Route-swap (Option B) is the safest production rollout strategy:
- No file copies (avoids content drift)
- No renames (no import breakage)
- Instant rollback: revert 1 commit or `git checkout pre-swap-portal-2026-04-30T1652`
- Legacy URL remains accessible for 30 days before cleanup

### 2026-04-30 — Global DesignSidebar rollout to production Layout (commit b88c631)

**Saar approved rollout via option A — global Layout wrapper.**

**Files changed:**
- `src/components/layout/Layout.tsx` — replaced `Header`/`Footer`/`MobileBottomNav` with
  `DesignHeader`/`DesignFooter`/`DesignMobileBottomNav`. Added `DesignSidebar` as global right-side
  panel. New prop: `sidebar?: boolean` (default true). Mobile: drawer triggered from header burger.
- `src/pages/SeriesList.tsx` — inner `<aside>` (357-line sidebar) wrapped in `{false && ...}`.
  Code preserved per Saar's explicit request for rollback safety. Comment:
  "Hidden 30.4.2026 — replaced by global DesignSidebar in Layout."
- `src/pages/DesignPreviewHome.tsx` — does NOT use `<Layout>`. Uses manual composition:
  imports `DesignHeader`, `DesignSidebar`, `DesignFooter`, `DesignMobileBottomNav` directly.
  `DesignHeader transparentOnTop={true}` + `DesignHero` full-width + `StatsBar` full-width
  + `<div id="learn-start">` (flex row: sidebar inline-sticky left + main content right).
  This keeps the hero completely full-width without a sidebar beside it (per Saar's layout decision).
  The `DesignNavBar` function still exists in the file as the inline nav component used by the home page's DesignHeader.

**CORRECTION NOTE (2026-04-30):** An earlier entry in this file stated the home page was
"wrapped in `<Layout sidebar={false}>`" — that was the planned approach, but the final
implementation uses manual composition (verified against source code). When in doubt, check
`src/pages/DesignPreviewHome.tsx` directly.

**Backup tag:** `backup-pre-sidebar-rollout-2026-04-30` (local + remote)

**Effect:** DesignSidebar (4 tabs: ראשי / נושאים / רבנים / מורים) now appears on ALL production routes
that use Layout.tsx: /series, /lessons/:id, /rabbis, /rabbis/:id, /series/:id, /store, /store/:slug,
/about, /donate, /contact, /memorial, /memorial/saadia, /parasha, /community, /pricing, and all others.
Home page (/) is sidebar-free by intent.

**TS check:** 0 new errors introduced (pre-existing DesignPreviewCoursesCatalog.tsx errors unrelated).

### 2026-04-30 — Session summary: sidebar unification + production rollout (consolidated)

This entry is a cross-reference summary of all the sidebar/rollout work done in the 2026-04-30 session.
Detailed per-change logs are in the entries above. This summary exists so a future session can get
the full picture of what changed without reading 40+ individual entries.

#### A. DB schema changes (audience_tags)
- Migration `supabase/migrations/20260430_audience_tags.sql` applied (commit `6c773ff`)
- `series.audience_tags TEXT[] DEFAULT ARRAY['general']` — column + GIN index
- `lessons.audience_tags TEXT[] DEFAULT ARRAY['general']` — column + GIN index
- Helper view `series_with_audience` (non-destructive, read-only)
- Keyword backfill auto-tagged 1 series; then Saar ran a manual UPDATE tagging ALL 1,374 series + 11,818 lessons as `["general","teachers"]`
- `types.ts` regenerated, `as any` casts removed from `useSeries.ts` + `admin/Series.tsx`
- `audience_tags` is **required** (not optional) in the `Series` TS interface

#### B. Admin Series UI (`src/pages/admin/Series.tsx`)
- Edit dialog: multi-select for audience_tags (כללי / מורים / נוער / מתקדמים)
- Table: "קהל יעד" badge column
- Filter bar: הכל / מורים / כללי with live counts
- Bulk-tag checkbox + "תייג כמורים" button

#### C. TeacherContentBadge component
- `src/components/ui/TeacherContentBadge.tsx` — renders only when `tags.includes("teachers")`
- `variant="full"` (icon + text "למורים") or `variant="small"` (icon + tooltip only)
- Applied to: DesignPreviewLesson, DesignPreviewLessonPage, DesignPreviewLessonPopup,
  DesignPreviewSeriesPage, DesignPreviewSeriesPageV2, DesignSidebar (SeriesInlineList)
- Hooks updated: `useLesson` + `useSeriesLessons` now select `audience_tags`

#### D. DesignSidebar v4 (`src/components/layout-v2/DesignSidebar.tsx`)
- 4 tabs: ראשי / נושאים / רבנים / מורים (GraduationCap icon)
- Real accordion tree via `useContentSidebar()` (same hook as production SeriesList.tsx)
- `SeriesInlineList` component: lazy-fetches series by parent_id, renders inline with badges + lesson count
- Separate `expandedMain` + `expandedTeachers` state per tab
- Tab "מורים" = same MAIN_TREE as "ראשי" + unique banner "כל האתר מתויג"
- Quick-links above tree: ראשי (/) + תכנית הפרק השבועי (/design-chapter-weekly)
- Footer: donate button (gold) + לזכר סעדיה flame link
- Logo: `h-16 md:h-20` (matches live Header.tsx)
- Desktop: sticky inline 290px panel. Mobile: off-canvas drawer (burger in DesignHeader)

#### E. TeachersWing (`/design-teachers-wing`) — hidden, not deleted
- Removed from: DesignHeader NAV_ITEMS, DesignFooter columns, DesignSidebar tabs, DesignMobileBottomNav
- Route still active in App.tsx — accessible via direct URL
- `src/pages/DesignPreviewTeachersWing.tsx` + `src/hooks/useTeacherSeries.ts` kept (no deletion)
- 6 mock categories (חידות/אטומיים/כלים/פודקאסט/קורסים/מאמרים) are hardcoded, not DB-backed — will not be reproduced

#### F. Production rollout — what shipped
**Backup tags (both local + GitHub):**
- `backup-pre-sidebar-rollout-2026-04-30`
- `pre-swap-portal-2026-04-30T1652`
- `backup-pre-parasha-rollout-2026-04-30`

**Files changed in production:**
1. `src/components/layout/Layout.tsx` — now imports DesignHeader/DesignFooter/DesignMobileBottomNav (was Header/Footer/MobileBottomNav). New prop `sidebar?: boolean` (default `true`) — DesignSidebar rendered globally.
2. `src/pages/SeriesList.tsx` — inner 357-line sidebar wrapped in `{false && ...}` (not deleted). Comment: "Hidden 30.4.2026 — replaced by global DesignSidebar in Layout. Keeping per Saar's request."
3. `src/pages/DesignPreviewHome.tsx` — manual composition (DesignHeader + DesignSidebar + DesignFooter directly, NO `<Layout>` wrapper). Hero full-width, sidebar inline-sticky below `#learn-start` anchor.
4. `src/App.tsx` — `/portal` → DesignPreviewPortalSubscriber, `/courses` → DesignPreviewCoursesCatalog, `/course/:slug` → DesignPreviewCourseDetail. `/portal-old` → legacy Portal.tsx.
5. `src/App.tsx` — `/series/:id` → DesignPreviewSeriesPageV2 (was SeriesPagePublic).
6. `src/pages/ParashaPage.tsx` — rewritten with mahogany hero, 3 CTA cards, sticky TOC, print stylesheet.

#### G. Open items from this session
1. **audience_tags fine-tuning** — Yoav must remove "teachers" tag from series that are NOT teacher-appropriate via `/admin/series` bulk UI. Currently everything is tagged (badge appears on all content).
2. **`/bible/:book` pages broken** — not addressed. Navigation to these was removed from sidebar (sidebar now links to `/series/:id` directly). Future task.
3. **TeachersWing decision** — delete or repurpose. No timeline set.
4. **Migration `20260430_weekly_program_foundation.sql`** — still not applied. Blocked by missing `grow_orders` table in DB. Must verify table exists before applying.
5. **WebP optimization** — current Shir HaShirim images are 1.3–1.7MB PNG. Convert to WebP before second book pilot.
6. **`/portal-old` cleanup** — delete after 30-day stability window (deadline: 2026-05-30).
7. **Sandbox cleanup** — `/design-series-page-v2/*` routes can be removed from App.tsx after 30-day production stability window.

### 2026-05-03 — Store checkout migrated from WooCommerce redirect to internal Grow flow (commit 3382aa7)

**Decision:** Option A — `products` table queried dynamically on `create-payment.ts` server. No data duplication into `payment_products`. New `store:<slug>` prefix on `meta.product` routes the request to the products table. Products table `source_url` column kept in DB (for reference), no longer used in UI.

**UI decision:** `StoreCheckoutDialog.tsx` (new component) rather than reusing `Checkout.tsx`. Reason: Checkout.tsx requires cart state + auth. Store products are one-click impulse buys that should not require login.

**Files created/changed:**
- `src/config/shipping.ts` — NEW: `SHIPPING_OPTIONS` (3 options: registered_mail ₪25 / courier ₪60 / pickup free), `getShippingPrice()`, `getShippingLabel()` helpers
- `src/components/payment/StoreCheckoutDialog.tsx` — NEW: Dialog with first/last name, phone, email, shipping method radio buttons, address fields (conditional on method ≠ pickup), notes, price summary, TOS+18+ checkbox, Grow wallet flow
- `api/grow/create-payment.ts` — Extended: if `meta.product` starts with `store:`, query `products` table by slug, build synthetic productCfg (`type=wallet`, `page_code_env=PRODUCTS`, `max_installments=12`). Stores `product_source="products"` in `raw_payload`. Creates `order_items` row immediately after order insert.
- `api/grow/webhook.ts` — Extended: `runPostPurchaseSideEffects` now accepts `mergedPayload`, detects `product_source="products"` or `store:` prefix, logs delivery note (Smoove transactional template TODO — pending Saar creating template)
- `src/pages/ProductPage.tsx` — Replaced TOS checkbox + `<a href={source_url}>` CTA with `<StoreCheckoutDialog>` wrapper. Removed unused `useState`, `Checkbox` import.

**Grow routing:** all store products use `GROW_PAGECODE_PRODUCTS` env var (same as `book-megilat-esther`). No new Grow pageCode needed. Max installments = 12 (configurable at dialog level — currently 1 because store products show no installments selector).

**TypeScript:** 0 errors (one narrow type comparison fixed by removing redundant `required` inside a narrowed branch).

**TODOs remaining:**
- Saar must create a Smoove transactional email template for order confirmation — webhook logs delivery note but does not send email yet
- Shipping method selected in dialog is embedded in `description` field (e.g. "מוצר | משלוח: דואר רשום, הרצל 1, ירושלים") — future: add dedicated `shipping_method` column to `orders` table for easier admin filtering
- Test with real Grow sandbox transaction before going live

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

### 2026-04-30 — Sidebar v4 polish: badge, chrome items, logo, banner removal (commit cc87830)

- **Changed:** `src/components/layout-v2/DesignSidebar.tsx`
  - Removed gold "ניווט באתר לפי ספר ופרק" banner (per Saar request)
  - Added quick-links box above tree: ראשי (/) + תכנית הפרק השבועי (/design-chapter-weekly)
  - Added donate button (gold, `/design-donate`) + לזכר סעדיה flame to footer — both above collapse toggle
  - `SeriesInlineList` now fetches `audience_tags` and renders `<TeacherContentBadge variant="small">` next to series titles tagged with "teachers"
- **Changed:** `src/components/layout-v2/DesignHeader.tsx`
  - Logo uses `className="h-16 md:h-20"` (matches live `Header.tsx`) instead of hardcoded `height:64`
- **New constraint:** `audience_tags` column must exist on `series` table for badge to appear. If column is missing, badge is silently hidden (TeacherContentBadge returns null on empty/null tags). Once `supabase/migrations/20260430_audience_tags.sql` is applied, badges will show on tagged series.

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

### 2026-04-30 — Series page V2 production rollout + 42 Shir HaShirim images (agentId aafb5bb33b089f8f0)

**Production change (commits 58b4f60 + 1f0784f):**
- `src/App.tsx` line 167: `/series/:id` now serves `DesignPreviewSeriesPageV2` (was `SeriesPagePublic`)
- `src/pages/DesignPreviewSeriesPageV2.tsx`: internal sub-series links changed from
  `/design-series-page-v2/:id` → `/series/:id` (production navigation consistency)
- "Not found" fallback link changed from `/design-series-list` → `/series`

**Image generation (scripts/generate_shir_hashirim_images.py):**
- 42 watercolor images generated via Imagen 4 Fast ($0.02/image, $0.84 total)
- 4 sub-series cover images (series.image_url) for: שיעורים / קריאה וביאור / מוקלט / בבקיאות
- 18 lesson thumbnails for שיעורים על שיר השירים (series 41b62e31)
- 8 lesson thumbnails for קריאה וביאור בקצרה (series c866f217) — per chapter א-ח
- 8 lesson thumbnails for שיר השירים מוקלט ללא טעמים (series d963ee27) — dove variations
- 4 lesson thumbnails for שיר השירים בבקיאות (series a6874e51) — apple ripening stages
- Uploaded to Supabase Storage bucket `lesson-images` at path `shir-hashirim/`
- DB patched: `series.image_url` (4 rows) + `lessons.thumbnail_url` (38 rows)
- Local copies stored in `public/images/shir-hashirim/` (42 PNGs, ~1.3–1.7MB each)
- Script supports resume: if local file exists, re-upload without re-generating
- Rate limit handling: 2 workers + 2s delay + 3 retries with 30/60/90s backoff on 429

**Fallback (white): already existed.** All LessonCard and SubSeriesCard have `background: "white"`
as the card container — parchmentDark as the image-slot background. No gradient system needed.

**New constraint learned:**
- Imagen 4 Fast rate-limits after ~10-12 consecutive requests. Use ≤2 workers + DELAY_BETWEEN=2s.
  With retry=3 and wait 30/60/90s, the full 42-image batch completes in ~3 minutes.
- `series.parent_id` (not `parent_series_id`) is the FK column for hierarchy in this DB.

**Shir HaShirim series IDs (production DB):**
- Parent: `16b824c5-6cea-4a4f-bda5-6aac870b2689` (שיר השירים — main, 12 children)
- שיעורים על שיר השירים: `41b62e31-0643-4368-b8ff-04dc25dc2603` (18 lessons)
- קריאה וביאור בקצרה: `c866f217-16fe-4dc1-8a98-583faad5c4d5` (8 lessons)
- מוקלט ללא טעמים: `d963ee27-7551-48dd-9204-4de495922e98` (8 lessons)
- שיר השירים בבקיאות: `a6874e51-86f0-4e11-9739-902233b06eb4` (4 lessons)

---

### 2026-04-30 — Memorial Saadia real photos deployed (commit f4f189e)

- Replaced 3 placeholder assets with real family-approved photos:
  - `src/assets/memorial-saadia-hero.jpg` (104KB, full-body in field)
  - `src/assets/saadia-soldier.png` (2.3MB, dress uniform portrait)
  - `src/assets/saadia-tefillin.png` (3.5MB, tefillin in Gaza building)
- Added 4 new gallery photos: `saadia-combat.jpg`, `saadia-rally.jpg`, `saadia-suit.jpg`, `saadia-young-books.jpg`
- Wired gallery into `src/pages/DesignPreviewMemorialSaadia.tsx`
- Deployed to production bneyzion.vercel.app (all 6 assets confirmed HTTP 200)
- PR #5 (pre-launch-fixes) open but no overlap — safe to push directly to main

---

---

## 11. Weekly-chapter program — consolidated architecture reference

Assembled 2026-04-30 to give future sessions a single place that explains
the full design, prevents repeated misunderstandings, and captures all
decisions Saar confirmed.

### 11.1 Three separate layers (not one monolithic page)

| Layer | Route | Who can access | Purpose |
|-------|-------|---------------|---------|
| **אזור אישי** | `/portal` | Any registered user (no paywall) | Personal dashboard — progress, streak, favorites, suggestions |
| **הקורסים שלי** | `/courses` | Any registered user (catalog), gated content needs subscription | Catalog of courses the user has or can acquire |
| **דף קורס** | `/course/:slug` | Any for "בסיס" tab, subscription required for "הרחבה" + "שיעור שבועי" | Course content with per-tab access gate |

**Files (post production-swap commit 1bab02e):**
- `/portal` → `src/pages/DesignPreviewPortalSubscriber.tsx`
- `/courses` → `src/pages/DesignPreviewCoursesCatalog.tsx`
- `/course/:slug` → `src/pages/DesignPreviewCourseDetail.tsx`
- `/portal-old` → legacy `src/pages/Portal.tsx` (backup, 30-day window)

### 11.2 "הקורסים שלי" is ONE master course card — not per-book

**CRITICAL confusion to avoid in future sessions:**
חגי / זכריה / מלאכי / דניאל / אסתר / עזרא-נחמיה / איכה / יהושע are
**NOT separate courses**. They are sub-units inside the single master course
"הפרק השבועי בתנ״ך — תכנית המנויים, הרב יואב אוריאל".

The catalog at `/courses` shows:
1. One big "weekly-chapter" master card (8-book mini-timeline, overall progress ring)
2. Additional independent courses (e.g. "איך ללמוד תנ״ך" completed, future: "פרשת השבוע", "פרקי אבות", "תהילים")

Never break out individual books as separate course cards in the catalog.

### 11.3 Three user states and what each sees

| State | Who | Primary CTA | Stats shown |
|-------|-----|------------|-------------|
| **subscriber** | active `program:weekly-chapter` tag | "כנס ללימוד הפרק השבועי — לחיות תנ״ך" (gold tile, large) | 4 tiles: chaptersCompleted / weeksActive / hoursLearned / **streakWeeks** with orange flame glow at 7+ |
| **member** | registered, no subscription | "המשך מאיפה שהפסקת" (teal, links to free series) | 3 tiles: hoursLearned / lessonsWatched / favorites (NO streak) |
| **guest** | not logged in | "הירשם בחינם" | landing/marketing only |

Member upsell card (olive green): "בוא ללמוד תנ״ך כל שבוע — ₪5 חודש ראשון" + 280+ social proof.

### 11.4 Eight-book timeline — canonical order

Used across PortalSubscriber (master card), CoursesCatalog (progress ring), CourseDetail (sidebar):

| # | Book | Status |
|---|------|--------|
| 1 | דניאל | completed |
| 2 | איכה | completed |
| 3 | עזרא-נחמיה | completed |
| 4 | אסתר | completed |
| 5 | חגי | in_progress (nearing end) |
| 6 | זכריה | current (active, chapter ז) |
| 7 | מלאכי | upcoming |
| 8 | יהושע | upcoming (from start of program) |

In CourseDetail sidebar: books 1-4 are collapsed/read-only, book 5 is in_progress, book 6 is expanded+active (pרק ז highlighted), books 7-8 are locked.

### 11.5 Three content layers per chapter

| Layer | Tab label | Access | DB source |
|-------|-----------|--------|----------|
| **בסיס** | "בסיס" | Open to all | `lessons` table via `bible_book + bible_chapter` filter; override with `community_course_lessons.layer_type = 'base'` |
| **הרחבה** | "הרחבה" | Subscribers only | `community_course_lessons.layer_type = 'enrichment'` — audio summary + presentation + article |
| **שיעור שבועי** | "שיעור שבועי" | Subscribers only | `community_course_lessons.layer_type = 'weekly'` — live recording + summary PDF |

Locked tabs show a blurred content preview + lock icon + "הצטרף לתכנית" CTA.

### 11.6 Subscription model (single tier only)

- **Program name:** "לחיות תנ״ך — הפרק השבועי"
- **Tier structure:** SINGLE TIER — no annual, no lifetime
- **Promo offer:** ₪5 first month (campaign-only, not always active)
- **Regular price:** ₪110/month auto-charge via Grow direct debit
- **Grow product key:** `"weekly-chapter-subscription"` → access tag `"program:weekly-chapter"`
- **Access tag on DB:** `user_access_tags.tag = "program:weekly-chapter"`, `valid_until` extended 35 days on every Grow webhook charge

### 11.7 Smoove lists

| List ID | Name | Count |
|---------|------|-------|
| **1045078** | "הפרק השבועי - תכנית מנויים" | **280 active subscribers** |
| **1048454** | "הפרק השבועי - מתעניינים שלא רכשו" | 18 leads |

Import script ready: `scripts/import-weekly-chapter-subscribers.mjs`
— blocked until DB migration `20260430_weekly_program_foundation.sql` is applied.

### 11.8 Hardcoded subscribers fallback

**File:** `src/lib/hardcodedSubscribers.ts`
**Function:** `isHardcodedSubscriber(email: string) → boolean`
**How it's used:** `src/hooks/useUserAccess.ts` — `hasAccess = dbAccess || hardcodedGrant`
DB check takes precedence once migration is applied.

**Current whitelist:**
- `saar.j.z.h@gmail.com` (Saar)

**This is intentionally temporary.** Remove/replace once:
1. Migration `20260430_weekly_program_foundation.sql` is applied
2. Import script runs and populates 280 subscribers in `user_access_tags`

### 11.9 Database migration (not yet applied)

**File:** `supabase/migrations/20260430_weekly_program_foundation.sql`

**Why it's not applied:** `grow_orders` table missing in DB (blocked pre-condition).
The `weekly_program_foundation` migration references `grow_orders`. Before applying:
verify `grow_orders` exists, or strip that reference from the migration.

**What the migration creates:**
- `user_access_tags` table (user_id, tag, valid_until, pending_user_link)
- `weekly_program_progress` table (current_book, current_chapter, chapters_completed, streak_weeks)
- New columns on `community_courses`: program_slug, access_type, access_tag
- New columns on `community_course_lessons`: week_number, bible_book, bible_chapter, layer_type, summary_html, presentation_url, drive_folder_url, thumbnail_url
- RPC: `has_access_tag(p_user_id uuid, p_tag text) → boolean` SECURITY DEFINER

**Manual apply:**
Paste SQL in Supabase Dashboard → SQL Editor:
`https://supabase.com/dashboard/project/pzvmwfexeiruelwiujxn/sql/new`

### 11.10 Gamification (modeled on "לוקחים אחריות")

All of the following is in `DesignPreviewPortalSubscriber.tsx`:

- **Streak:** weekly (not daily). Flame icon, orange glow when ≥7 weeks (`#e25822`)
- **Level system:** points → level name. Example: 1247/1500 = רמה 4 "לומד מתקדם"
- **Badges grid:** 3x2 grid. 3 earned (gold, fully saturated), 3 locked (grayscale, muted)
- **QuickActions:** 2x2 grid on mobile, 4-wide on desktop. Primary tile (gold, 2x wide) = "כנס ללימוד עכשיו"
- **4 stats** with dynamic coloring (subscriber mode)
- **Notification banner:** "יש תוכן חדש השבוע" (dismissible)
- **Next session countdown:** navy card with live countdown to next weekly lesson
- **Streak heat-map:** 12-week bar chart, color ramp muted→orange

### 11.11 RTL correctness notes for progress bars

All progress bar containers need `dir="ltr"` so the fill direction works correctly in RTL context.
Affected surfaces (all fixed as of commit 870c3e1):
- Level XP bar in PortalSubscriber
- 8-book progress bar in CatalogCourses MainCourseCard
- 8-book progress bar in CourseTile

Any new progress bar component must also have `dir="ltr"` on the track container.

### 11.12 Google Drive content source

**Shared Drive ID:** `0AFz55knVlI2BUk9PVA`
**Drive name:** "תכנית הפרק השבועי בתנ״ך"

**Drive API gotcha (critical):** This is a **Shared Drive**, not a regular folder.
Regular `files().list(q="'<id>' in parents")` returns EMPTY.
Must use: `corpora='drive'`, `driveId=DRIVE_ID`, `includeItemsFromAllDrives=True`, `supportsAllDrives=True`.

**Token:** re-uses YouTube OAuth token at `the-system-v8/T-tools/04-mcp-servers/youtube/drive_token.json`
**Scan script:** `scripts/drive-scan.py`

**Folder structure (6 books scanned):**
- הפרק השבועי - דניאל (18 sub-items, 14 chapters + intro)
- הפרק השבועי - חגי, זכריה ומלאכי (4 sub-items)
- הפרק השבועי - מגילת איכה (6 chapters)
- הפרק השבועי - מגילת אסתר (7 units)
- הפרק השבועי - נחמיה (15 sub-items)
- הפרק השבועי - עזרא (16 sub-items)

**Per-chapter content structure (confirmed from Drive):**
- `תכני בסיס` → audio + PDF
- `תכני הרחבה` → video + article + slides
- `השיעור השבועי` → video + summary PDF

**Current program focus:** זכריה פרק ז (active), חגי nearing end, מלאכי upcoming.

### 11.13 WhatsApp notification cadence (currently manual)

**Group name:** "לחיות תנ״ך"

| Day | Content sent |
|-----|-------------|
| שישי | "תחילת שבוע — העלינו תכני בסיס" |
| שני | "העלינו תכני העמקה" |
| רביעי | תזכורת לשיעור + קישור |
| יום השיעור | קישור + תזכורת |
| יום לאחר | הקלטה + סיכום + מצגת + קישור |

**Future goal:** Automate via WhatsApp (Green API) + email (Smoove) + on-site notifications.
**Status:** Document only — do NOT build until base infrastructure is complete.

### 11.14 Open work — priority order

1. **Run migration** `20260430_weekly_program_foundation.sql` (Saar pastes in SQL Editor)
   — pre-condition: verify/add `grow_orders` table first
2. **Import 280 subscribers** from Smoove → `user_access_tags` via `import-weekly-chapter-subscribers.mjs`
3. **Wire Drive content** into `community_course_lessons` (after migration)
4. **Sales page light refresh** — only "דחיפה קלה" on fonts/spacing in `DesignPreviewMegillatEsther.tsx`
5. **Automate weekly notifications** — WhatsApp + email + on-site
6. **Delete `/portal-old`** after 30 days of stability (deadline: 2026-05-30)

---

### 2026-04-30 — DesignPreviewHome: navbar architecture + hero CTA swap + יום ירושלים (commits 57809ce, a82adb8, e679221)

**CRITICAL: "DesignPreview" prefix does NOT mean sandbox.**
`DesignPreviewHome.tsx` IS the public production route `/`. Despite its name, it is NOT a sandbox — every change ships live. The filename was inherited when it replaced `Index.tsx` in April 2026 and was never renamed. Future agents: always verify the route in `App.tsx` before assuming production or sandbox status. Never assume from the filename alone.

**Two navbars exist — nav changes require updating BOTH:**
- `src/components/layout-v2/DesignHeader.tsx` — global header, loaded by `Layout.tsx`. Serves all non-home pages.
- `src/pages/DesignPreviewHome.tsx` — contains inline `DesignNavBar` component because `/` does NOT use `<Layout>`. Navigation changes to the home page must go here, not in `DesignHeader`.
- To add a global nav item (e.g., "תרומות"), update both files. To add a home-page-only item, update only `DesignPreviewHome.tsx`.
- `src/components/layout/Header.tsx` (the old header) is no longer used. `Layout.tsx` now imports `DesignHeader`.

**Changes in this session:**
- `57809ce`:
  - `DesignPreviewHome.tsx` second hero CTA button: "גלה את הסדרות" → "לתכנית הפרק השבועי" (link → `/design-chapter-weekly`)
  - `יום ירושלים` added to `HOLIDAYS_5786`: `{ name: "יום ירושלים", hebrewDate: "כ״ח אייר", date: new Date(2026, 4, 15), terms: ["יום ירושלים","ירושלים","בית המקדש"] }` — between ל״ג בעומר (5.5) and שבועות (22.5). Bug was simply a missing entry, no logic error.
- `a82adb8`: added "חנות" to `FULL_NAV_LINKS` in `DesignPreviewHome.tsx`. Needed because home's `DesignNavBar` is independent from `DesignHeader` (which already had it).
- `e679221`: added "תרומות" → `/donate` to both `DesignHeader` and `DesignPreviewHome.tsx`. Final nav order: ראשי / רבנים / סדרות / תנ״ך / קהילה / חנות / פרשת השבוע / אודותינו / תרומות.

**Holiday display note:** `getUpcomingHoliday()` returns one holiday — the nearest within a 45-day window. Causes a visible sequential jump between holidays. Future improvement: show 2 upcoming or add smooth transition.

**Push status at session end:** `57809ce` already on origin/main. `a82adb8` + `e679221` local only — Saar will push.

**6 open design improvements for DesignPreviewHome (none started):**
1. Hero height expand to 70vh / 580px min
2. ~~CTA button swap~~ — done in `57809ce`
3. Gradient divider between Hero and StatsBar
4. Parasha + holiday grid: 1fr 1fr alignment imbalance
5. Rabbi cards: `object-fit: cover` + fixed aspect-ratio
6. WhatsAppCTASection: move directly above footer + WhatsApp-toned background

---

### 2026-04-30 — DesignNavBar transparent + centered + DesignHeader centering confirmed (commit a3bd797)

- **DesignPreviewHome.tsx `DesignNavBar`**: removed `position:absolute + left:50% + transform` from nav-links container. Replaced with `flex:1 + justifyContent:center + flexWrap:wrap`. Background was already correctly `transparent` pre-scroll; scrolled state gets parchment + backdrop-blur.
- **DesignHeader.tsx**: already correct (`maxWidth:1280, margin:"0 auto", justifyContent:"space-between"` with inner nav `flex:1 justifyContent:center`). No changes needed.
- Push: commits `a82adb8 → a3bd797` (9 commits total) pushed to origin/main in one batch after Saar's explicit approval.

### 2026-04-30 — Session synthesis: series page V2 live + image pilot + open follow-ups (agentId a6b963e004c77dffd)

This entry consolidates the cross-cutting learnings from the full Shir HaShirim session for easy future reference. Specific commits and round-by-round feedback are documented in the entries above (rounds 1-5, commit 58b4f60/1f0784f, cb91a68).

#### What shipped to production in this session
- `/series/:id` now serves `DesignPreviewSeriesPageV2` (was `SeriesPagePublic`). See commit 58b4f60.
- 42 watercolor images generated + uploaded + DB patched for שיר השירים. See commit 1f0784f.
- "חנות" nav link added to homepage navbar. See commit a82adb8 + §11 session note above.

#### Image strategy — decisions to carry forward

**Style:** watercolor on white paper, 16:9, 1280×720px, Imagen 4 Fast (`imagen-4.0-generate-001`).
**Cost:** ~$0.02/image (Imagen 4 Fast). 42 images = $0.84 total.
**Storage:** Supabase bucket `lesson-images/{book-slug}/`. Local mirror: `public/images/{book-slug}/`.
**DB fields used:** `series.image_url` (series cover) + `lessons.thumbnail_url` (per-lesson). Both already exist — no migration needed.
**Fallback (Saar's explicit decision):** white background (`background: "white"`), `parchmentDark` for the image slot. No gradient fallback. White = the canonical fallback for anything without an image.
**Script base:** `scripts/generate_shir_hashirim_images.py`. Copy + adjust series IDs + palette for each new book.
**Rate limit:** ≤2 workers + 2s delay + 3 retries (30/60/90s backoff on 429).
**Resume:** if local PNG exists → re-upload only, no new generation.
**Per-book palette:** 5 colors + dominant element per sub-series + variation per lesson.
  - שיר השירים: blush rose / soft lilac / warm cream / sage green / gold-amber.
**Planning docs** (repo root, not versioned history):
  - `image-strategy.md` — full palette system + Imagen 4 prompt templates
  - `rollout-series-redesign.md` — original 3-phase plan (partially superseded)
  - `rollout-genesis-phase0.md` — Genesis `?v=2` beta plan (dropped, went with full prod rollout)
  - `rollout-execution-plan.md` — the actual execution plan for today's rollout

#### Pitfalls consolidated (all confirmed in this session)

| # | Pitfall | Rule |
|---|---------|------|
| 1 | `transparentHeader=true` + `sidebar={true}` | Nav hidden on desktop. `onSidebarToggle ? "none"` inline style overrides `hidden md:flex`. Removed from `DesignHeader.tsx`. Sidebar pages always get solid header. |
| 2 | Double `marginTop: -96` | `DesignLayout overlapHero` already applies `-96` to `<main>`. Never add it again inside the hero component. |
| 3 | Inline `display` vs Tailwind responsive | Inline always wins. Never put `display: X ? "none" : undefined` on elements with Tailwind responsive display classes. |
| 4 | `transparentHeader` + low-contrast hero | Add top gradient `rgba(0,0,0,0.25–0.55)→transparent 40%` inside the hero. With solid header, max 0.25. |
| 5 | `min-height` + `justify-content: flex-end` | Empty space trap. Use `flex-start`, let content dictate height. |
| 6 | `source_type` ≠ media type | `source_type` = scraping origin (Umbraco/YouTube/S3). Derive media type from `video_url`/`audio_url`/`attachment_url`. |
| 7 | `useTopSeries` misses `status=published` | Filter is `status=active` only. Use `useSeriesDetail(id)` for fetching by ID without status filter. |
| 8 | Imagen 4 Fast rate-limit | ≤2 workers + 2s delay + 3 retries with backoff. |
| 9 | `series.parent_id` FK column | Correct name (NOT `parent_series_id`). |
| 10 | `getSeriesCoverImage` must cover all 24 books | Torah + Neviim + Ketuvim. Ketuvim regex added in this session. Any new book without `image_url` falls back to the matched asset, not mahogany. |
| 11 | LessonModal parity with `LessonDialog.tsx` | When `LessonDialog` gets new features, check `LessonModal` in `DesignPreviewSeriesPageV2.tsx` too. |
| 12 | Favorites in V2 = local state only | Heart toggle is local React state, not wired to Supabase. `useUserFavorites` hook exists — wire in Phase Future. |

#### Open follow-ups from this session

| Item | Priority | Action |
|------|----------|--------|
| Hide sub-series with `lesson_count = 0` | High | 8 empty Shir HaShirim chapters appear in grid. Filter: `.filter(s => (s.lesson_count ?? 0) > 0)` in `DesignPreviewSeriesPageV2.tsx`. |
| WebP optimization | Medium | Current PNGs are 1.3–1.7MB each. Run `cwebp -q 85 input.png -o output.webp`. Do before second book pilot. |
| Favorites Supabase wiring | Medium | `useUserFavorites` hook exists in production. Wire heart toggle in `LessonModal`. |
| LessonPage V2 (Phase 3) | Medium | `/lessons/:id` still uses old `LessonPage.tsx`. Series page V2 = Phase 1. Phase 3 = lesson page. |
| Second book image pilot | Low | Next candidate: בראשית (20 active series, ~460 lessons, flat — no sub-series). Copy `generate_shir_hashirim_images.py`. |
| Cleanup `/design-series-page-v2/*` routes | Low | Old sandbox routes. Remove from `App.tsx` after 30-day production stability window. |
| Weekly program migration | Blocking | Apply `20260430_weekly_program_foundation.sql` in Supabase SQL Editor. Blocked on `grow_orders` table — verify it exists first. |

### 2026-05-03 — Grow go-live compliance pass: TOS + age/delivery terms (commit b5291ba)

- `src/pages/Terms.tsx` — added §5 הגבלת גיל (18+) and §6 מדיניות אספקה (digital
  instant / registered mail ≤14 biz days / courier ≤7 biz days / pickup). Old §5–8
  renumbered to §8–11. Now 11 sections total, parity with Aboulafia go-live checklist.
- `src/components/payment/QuickBuyDialog.tsx` — TOS checkbox already present (confirmed).
- `src/pages/Checkout.tsx` — added `Checkbox` + `tosAccepted` state. Checkbox with link
  to /terms + "מאשר/ת מעל גיל 18". `handleSubmit` validates before `setLoading(true)`.
  Submit button disabled until `tosAccepted`.
- `src/pages/Donate.tsx` — same TOS checkbox pattern. `handleDonate` validates before
  `startPayment`. Button disabled until `tosAccepted`. Added `Checkbox` + `Link` imports.
- TS check: 0 errors. Pushed to origin/main. Vercel deploy confirmed 200 on /terms + /megilat-esther.

### 2026-05-03 — Terms page + Grow go-live unblock (commit 23c28ad)

- `src/pages/Terms.tsx` — NEW static RTL page at `/terms`. 8 sections meeting Grow's
  site-check requirements: identity + contact, service description, payment policy (Grow/Meshulam,
  PCI, no card storage), cancellation (14-day consumer protection law, written request),
  content usage + copyright, privacy policy (data collected, not sold, deletion on request),
  change notice (30 days), jurisdiction (Israeli law, Jerusalem courts). Uses `Layout` +
  `PageHero` + `useSEO`. No DB queries — purely static.
- `src/App.tsx` — lazy-load `Terms`; added `<Route path="/terms" />` (next to `/about`).
- `src/components/payment/QuickBuyDialog.tsx` — label text "תקנון האתר ואת מדיניות הפרטיות"
  replaced with `<Link to="/terms" target="_blank" rel="noopener noreferrer">`. Added
  `react-router-dom` `Link` import. `onClick stopPropagation` keeps the payment dialog open
  when the user clicks through to /terms in a new tab.
- TS check: 0 errors. Pushed to origin/main.

### 2026-05-03 — Legal entity correction: מכלל יופי (ע"ר) 580731974 (commit 8def5ed)

- `src/pages/Terms.tsx` — replaced "תנועת בני ציון ללימוד תנ"ך, ע"ר" (incorrect) with the
  registered legal entity "עמותת מכלל יופי (ע"ר)", number 580731974, address רחוב הרקפת 5,
  ירושלים, מיקוד 9650515. Registration date 1.12.2021. Source: data.gov.il.
- Changed in 3 places: section 1 (identity), section 6 (shipping disclaimer), section 10 (ToS update notice).
- "בני ציון" brand name untouched everywhere else: Footer ©, KnesPage hero, JSON-LD name fields,
  useSEO descriptions, StorePage, About. Only legal-role occurrences changed.
- No legalName field exists in JSON-LD yet — not added (no requirement stated).
- TODO: phone number for the office (hd section 1) — not available in codebase, needs Saar to provide.
- Iron rule learned: **"בני ציון" = brand/מותג; "מכלל יופי (ע"ר) 580731974" = ישות משפטית.
  Never use the brand name as the legal entity in ToS, disclaimers, or legal signatures.**

### 2026-05-03 — Payment compliance audit: QuickBuyDialog 18+ + ProductPage TOS guard

- `src/components/payment/QuickBuyDialog.tsx` (שורה 183) — checkbox label updated: הוסף
  "אני קראתי ומאשר/ת" בפתיחה + "**מלאו לי 18 שנים ומעלה**" לפני ומסכים/ה. פסוק מלא:
  "אני קראתי ומאשר/ת את [תקנון האתר ומדיניות הפרטיות], **מלאו לי 18 שנים ומעלה**, ומסכים/ה..."
- `src/pages/ProductPage.tsx` — הוסף `useState` + `Checkbox` import. לפני כפתור "לרכישה"
  מופיע checkbox זהה (RTL, /terms link, 18+). הכפתור `disabled={!tosAccepted}`. flow
  חיצוני ל-source_url (WooCommerce) נשמר — המשתמש חייב לסמן לפני שהכפתור נעשה active.
- `/store` ו-`/checkout` — **אין יותר "do not touch"**: האזהרה הוסרה מ-§4 + KNOWLEDGE.md
  עודכן בהתאם לבקשת סאר מ-3.5.2026.
- **Iron rule נוסף:** כל מסלול תשלום (QuickBuyDialog, Checkout, Donate, ProductPage) חייב
  checkbox עם לינק /terms + הצהרת 18+. זהו חוק ברזל לאחר Grow audit 3.5.2026.
- **TODO פתוח:** להמיר את `/store/:slug` מ-source_url חיצוני ל-flow Grow פנימי. כל מוצר
  צריך שורה ב-`payment_products`. ראה TODO comment ב-ProductPage.tsx.
- TS check: 0 שגיאות.

---

*This is the long-memory file. Every session must read it. Every
significant change must update it. The agent enforces this.*
