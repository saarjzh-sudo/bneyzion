# Bnei Zion — Site Redesign v2 (sandbox documentation)

**Last updated:** 2026-04-30
**Owner:** Saar (saar.j.z.h@gmail.com)
**Status:** Sandbox-only · Live site unchanged · 18 design preview routes deployed

This is the canonical reference for the Bnei Zion **redesign** work
specifically. Anyone (human or agent) opening a new session on this
project should read this file BEFORE making any changes. It enforces
consistency across separate sessions and prevents accidental damage
to the live site.

> 📚 **Companion doc:** `KNOWLEDGE.md` (this repo) covers everything
> ELSE — full site context, migration history (Lovable→Own Supabase),
> 42-table schema, Umbraco access, WordPress shop, Google OAuth, all
> integrations, content stats, and the **learning protocol** (every
> session must append knowledge). Read both files in any new session.

---

## 1. Quick links

| Item | Location |
|------|----------|
| Live site | `https://bneyzion.vercel.app` (and `bneyzion.co.il` post-cutover) |
| GitHub repo | `https://github.com/saarjzh-sudo/bneyzion` |
| Vercel project | `prj_P2KNzQJKsnpF1ZXShOBH3XL03c2x` (name: `bneyzion`) |
| Supabase | `pzvmwfexeiruelwiujxn.supabase.co` |
| Backup tag | `backup-pre-redesign-rollout-2026-04-30` (GitHub + local) |
| Design tokens | `src/lib/designTokens.ts` |
| Sandbox shell | `src/components/layout-v2/` (DesignLayout, DesignSidebar, etc.) |
| Sandbox pages | `src/pages/DesignPreview*.tsx` (18 files) |

---

## 2. Iron rules (read before any work)

1. **Sandbox-only by default.** All redesign work goes into new files
   under `DesignPreview*.tsx` + `layout-v2/`. NEVER edit existing pages
   like `SeriesList.tsx`, `LessonPage.tsx`, `Layout.tsx`, etc., unless
   Saar explicitly says "ROLLOUT" or "החל את X".
2. **Never edit `Layout.tsx`** (the production wrapper) until cutover.
3. **Routes:** all sandbox routes are at `/design-*` and live in
   `App.tsx` outside the `import.meta.env.DEV` gate (so they're
   accessible on Vercel preview AND production). They are unlinked
   from the main nav, so public users won't stumble onto them.
4. **Real data only.** Use Supabase hooks (`useTopSeries`, `useLessonsBySeries`,
   `useProducts`, etc.) — no mock data. If a query is missing, write
   a hook in `src/hooks/`, don't inline mock arrays.
5. **No DEV gate on new routes.** Saar needs to review on Vercel
   preview, which uses production builds. The `import.meta.env.DEV`
   block was removed from sandbox routes for this reason.
6. **Tag every commit** with a clear `sandbox: ...` or `feat: ...`
   prefix so the cutover diff is readable.
7. **Push uses `--noproxy`.** NetSpark intercepts proxied connections.
   Use `HTTP_PROXY="" HTTPS_PROXY="" git push origin main`.
8. **Backup before destructive ops.** Always create a `backup-pre-X`
   git tag before any commit that could harm the live site.

---

## 3. Design system — single source of truth

All design tokens are in `src/lib/designTokens.ts`. They are NOT in
Tailwind theme yet — the sandbox uses inline styles. Once approved,
they migrate to `tailwind.config.ts` + CSS variables in `index.css`.

### Color palette
- **Gold family** (signature): `goldDark #8B6F47`, `goldLight #C4A265`,
  `goldShimmer #E8D5A0`, `goldDeep #6B4F2A`
- **Parchment** (warm cream backgrounds): `parchment #FAF6F0`,
  `parchmentDark #F5F0E8`, `parchmentDeep #EDE5D6`
- **Text**: `textDark #2D1F0E`, `textMid #3D2A14`, `textMuted #6B5C4A`,
  `textSubtle #A69882`
- **Olive** (community/CTA secondary): `oliveDark #4A5A2E`, `oliveMain #5B6E3A`
- **Dark moods**: `navyDeep #1A2744`, `mahogany #422817`
- **Special**: `tealMain #2D7D7D`, `israelBlue #003F8A`

### Fonts
- **Display** (h1/h2): `Kedem, "Frank Ruhl Libre", serif`
- **Body**: `Ploni, sans-serif`
- **Accent** (CTAs): `Paamon, serif`
- **Technical**: `Mugrabi, sans-serif`

### 4 hero variants
| Variant | Used for |
|---------|----------|
| `parchment` | Series list, Store, About, Contact, Profile (light/default) |
| `mahogany` | Series detail, Lesson page, Rabbi page (warm storytelling) |
| `navy` | Memorial, Dor Haplaot (solemn, awe) |
| `olive` | Community, Knes, Teachers Wing (intellectual gathering) |

### 7 series families
Auto-classified by Hebrew title regex in `getSeriesFamily()`.

| Family key | Label | Hero variant | Accent |
|------------|-------|--------------|--------|
| `sacredCanon` | קאנון מקודש | mahogany | gold-dark |
| `weeklyObservance` | מעגל השנה | parchment | olive |
| `miraculous` | פלאות | navy | gold-shimmer |
| `remembrance` | זיכרון ומורשת | navy | mahogany |
| `youth` | מסע לילדים | parchment | teal |
| `assembly` | כנס וקהילה | olive | olive-dark |
| `reference` | כלי עזר | parchment | text-muted |

---

## 4. Sandbox shell architecture

### `DesignLayout` (`src/components/layout-v2/DesignLayout.tsx`)
The wrapper used by every sandbox page. Composes:
- `DesignHeader` (top, 96px)
- `DesignSidebar` (right side in RTL, collapsible)
- main content area (flex 1)
- `DesignFooter` (bottom)
- `DesignMobileBottomNav` (mobile only)

Props:
- `transparentHeader` — header is transparent before scroll (use with overlapping dark hero)
- `overlapHero` — main has `marginTop: -96` so hero overlaps under header
- `sidebar` — set to `false` to hide the sidebar entirely (e.g. for fully-immersive pages)

### `DesignSidebar` v3 (`src/components/layout-v2/DesignSidebar.tsx`)
**1:1 mirror of the live SeriesList sidebar.** This is critical — Saar
explicitly required the sidebar to match the production sidebar.

Structure:
- Gold primary banner: "ניווט באתר לפי ספר ופרק"
- 3 tabs: **ראשי** (Library) / **נושאים** (Filter) / **רבנים** (Users)
- Search input
- Tab "ראשי" tree: ראשי + פרשה + תכנית / חמישה חומשי תורה (5 books, expanded by default)
  / נביאים (8) / כתובים (7) / מועדים (8) / כלים ולימוד (4) / חנות+תרומה+contact
- Tab "נושאים": media filters + special collections
- Tab "רבנים": top 30 from Supabase `usePublicRabbis`
- Active route gets gold edge stripe + tinted background
- Memorial flame to סעדיה הי״ד pinned at footer
- Collapse toggle: `localStorage` key `bnz.sidebar.collapsed`
- Mobile: drawer triggered from header burger (off-canvas, RTL slide)

### Pending: Teachers Wing integration into sidebar
**Saar's spec (2026-04-30):** Currently TeachersWing has its own
categories (`תכנים אטומיים / חידות / קורסים / מאמרים / כלים / פודקאסט`).
The series catalog has parallel content. He wants to:
1. Add `audience_tags` (or similar) column to `series` + `lessons` in Supabase
2. Tag teacher-relevant content with `"teachers"`
3. Merge the two sidebars: one unified sidebar with optional "view as teacher"
   filter, OR an "אגף המורים" tab that shows teacher tools + tagged content

See **§ 8. Open work** for the full plan.

---

## 5. The 18 sandbox pages (current inventory)

| URL | What it shows | Real data? | Status |
|-----|---------------|------------|--------|
| `/design-layout` | Chrome demo: 4 hero variants, header, footer | n/a | done |
| `/design-series-list` | Top 5 series + 24-card catalog with family chips + search | yes | done |
| `/design-series-page` | Single series detail: hero + lessons grid + rabbis + related | yes (top series) | done |
| `/design-series-page/:id` | Specific series by ID | yes | done |
| `/design-lesson-popup` | Modal lesson popup over blurred series page bg | yes | done |
| `/design-lesson-page` ⭐ | Full lesson detail page — shared image with card+popup | yes | done |
| `/design-lesson-page/:id` | Specific lesson by ID | yes | done |
| `/design-store` | 47 products, 10 categories, search, sort | yes | done |
| `/design-product` | Single product page with HTML content | yes (default first featured) | done |
| `/design-product/:slug` | Specific product by slug | yes | done |
| `/design-portal` | Generic learner portal | yes | done |
| `/design-portal-subscriber` ⭐ | Weekly chapter subscriber's personal area | yes + mock subscriber state | done |
| `/design-chapter-weekly` | התכנית השבועית — 9 books with content | yes | done |
| `/design-rabbis-list` | 179 rabbis directory | yes | done |
| `/design-rabbi` | Single rabbi profile (defaults to top) | yes | done |
| `/design-rabbi/:id` | Specific rabbi | yes | done |
| `/design-teachers-wing` | אגף המורים: 6 categories, benefits, recommended series | yes (recommended) | done — needs sidebar merge |
| `/design-community` | Community + 3 membership tiers + active courses | yes | done |
| `/design-bible-book/:book` | Browse a Bible book — chapters with lesson counts | yes | done |
| `/design-donate` | Donation flow with presets, recurring, dedication | n/a (form only) | done |
| `/design-megilat-esther` ⭐ | Subscription sales + login-to-personal-area path | n/a (sales) | done |
| `/design-memorial-saadia` | Memorial for סעדיה דרעי הי״ד | yes (existing assets) | done — 4 photo slots empty |
| `/design-research` | Editorial research doc: 32 design patterns | n/a (data) | done — Saar wants visual examples per pattern |

⭐ = built in this current cycle (waves 4-5)

---

## 6. The lesson trio principle (Saar's design directive)

The same accompanying image must thread through 3 surfaces:

1. **LessonCard** (in `/design-series-page` grid, BEFORE click) — vertical
   card, image at top, title + rabbi + meta below
2. **LessonPopup** (`/design-lesson-popup`, on click) — modal hero uses
   the same image; ideally with View Transitions API for the future
3. **LessonPage** (`/design-lesson-page`, full navigation) — same image
   as a 620px cinematic hero

The image source priority: `lesson.thumbnail_url` → `series.image_url` →
`getSeriesCoverImage(series.title)` → `/images/series-default.png`.

This is the **single most important visual rule** Saar has called out.
Don't break it.

---

## 7. Subscription / portal flow

```
/design-megilat-esther (sales)
    ├─ "התחל מנוי" → Grow payment (TODO)
    └─ "כבר מנוי? התחבר לאזור האישי" → /design-portal-subscriber

/design-portal-subscriber
    ├─ Continue learning card (current series + current lesson)
    ├─ My library (completed books with green ✓)
    ├─ Up next (3 series in queue)
    ├─ Stats (4 metrics)
    └─ Membership status + upgrade path
```

Subscription tiers (matching the Esther sales page):
- חודשי: 36₪/month
- שנתי: 360₪/year (highlighted, save 18%)
- חבר כסיל לחיים: 1800₪ one-time

---

## 8. Open work — for next sessions

### Priority 1: Sidebar unification with Teachers Wing
**Saar's spec (2026-04-30):**
1. Add `audience_tags TEXT[]` column to `series` + `lessons` tables
   (Supabase migration). Default `["general"]`.
2. Backfill existing teacher content with `"teachers"` tag (manual or
   query-based: anything under TeachersWing categories gets `"teachers"`).
3. Update `DesignSidebar` to add a "view mode" toggle (general /
   teachers / both) that filters the visible tree.
4. OR: keep the 3-tab structure but rename "נושאים" tab to include the
   teacher tool categories (תכנים אטומיים / חידות / מצגות / מאמרים).
5. Test that NO content is duplicated when both views are active.

### Priority 2: Visual examples in `/design-research`
Saar's feedback: each of the 32 pattern boxes only has text, no actual
visual demo. Each box should DEMONSTRATE the pattern in itself
(e.g., a "drop cap" box has a drop cap, a "glass card" box is glass).

### Priority 3: AI features
- Audio summary track (90s AI-generated summary per lesson)
- Verse-anchored related-content suggestions (embeddings on the catalog)
- Synced transcript with audio playback

### Priority 4: View Transitions API
Implement card → popup → page image animation using View Transitions
API (Chrome 111+, Safari 18+).

### Priority 5: Fill memorial photo slots
Once Saar gets approval from the Drei family, populate 4 photo slots
in `DesignPreviewMemorialSaadia.tsx` (storage in `/public/images/saadia/`).

### Priority 6: Cutover plan
When Saar approves the sandbox for production:
1. Create branch `redesign-rollout-YYYY-MM-DD`
2. For each approved page:
   - Move content from `DesignPreview*.tsx` to the original page file
     (e.g., `DesignPreviewSeriesList.tsx` → `SeriesList.tsx`)
   - Update imports if needed
3. Replace `Layout.tsx` with the v2 version (Header + Sidebar + Footer)
4. Remove `/design-*` routes from `App.tsx`
5. Test thoroughly on Vercel preview
6. Merge to main → auto-deploy
7. Keep the backup tag for 30 days minimum

---

## 9. Decisions log

- **2026-04-28:** Started sandbox. Decision to NOT touch live files. Tokens
  in `designTokens.ts`, sandbox shell in `layout-v2/`.
- **2026-04-28:** Removed `import.meta.env.DEV` gate so sandbox is visible
  on Vercel preview/production deploys.
- **2026-04-29:** Sidebar v1 was custom-built. Saar critique: must match
  live SeriesList. Rebuilt as Sidebar v3 with 3 tabs + gold header,
  matching production 1:1.
- **2026-04-29:** Lesson trio principle: same image card → popup → page.
- **2026-04-29:** Memorial saadia uses existing assets (`saadia-soldier.png`,
  `saadia-tefillin.png`). 4 slots reserved for future photos. **No
  Facebook scraping** — copyright concerns.
- **2026-04-30:** Created backup tag `backup-pre-redesign-rollout-2026-04-30`
  before any production changes.

---

## 10. What NOT to do

- ❌ Don't edit `Layout.tsx`, `Header.tsx`, `Footer.tsx`,
  `MobileBottomNav.tsx`, `PageHero.tsx`, `SeriesList.tsx`, `LessonPage.tsx`
  in production paths.
- ❌ Don't push to `main` without first checking that you're only adding
  files / additive changes. Use `git diff origin/main..main` first.
- ❌ Don't reuse copyrighted images (e.g., from Facebook) for Saadia
  memorial or anywhere else.
- ❌ Don't reintroduce dated patterns (royal-blue + gold gradients,
  parchment textures, GIF nav icons, magen david bullets).
- ❌ Don't break RTL — always use logical CSS properties
  (`padding-inline-*`, `inset-inline-*`) on new code.
- ❌ Don't make all pages look the same. Each page type needs its own
  visual identity (Saar's repeated critique).
- ❌ Don't introduce mock data when real Supabase data is available via
  hooks.

---

## 11. Quick command reference

```bash
# Start dev server (port 8080)
cd /Users/saarj/Downloads/saar-workspace/bneyzion && pnpm dev

# TypeScript check
npx tsc --noEmit -p tsconfig.app.json

# Push (NetSpark workaround)
HTTP_PROXY="" HTTPS_PROXY="" git push origin main

# View Vercel deployments
vercel ls bneyzion --yes

# Roll back to backup
git tag -l | grep backup
# Then: git checkout backup-pre-redesign-rollout-2026-04-30 (read-only)
# Or:   Vercel dashboard → promote earlier deployment

# Send WhatsApp update to Saar (Green API instance 7105260665)
# See T-tools/01-skills/shigor-pro/references/clients.md for token
```

---

*Master document. Update on any major decision. Read first in any new session.*
