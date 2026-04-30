# Rollout Plan — Series & Lesson Redesign to Production

**Written:** 2026-04-30  
**Author:** Claude (bneyzion-designer agent)  
**Status:** Draft — awaiting Saar's go / no-go on Phase 1

This plan is actionable. Read it and decide if Phase 1 starts this session or next.

---

## 1. Files that need to change — and their sizes

### The new design lives in:
| Sandbox file | Lines | What it contains |
|---|---|---|
| `src/pages/DesignPreviewSeriesPageV2.tsx` | ~2,200 | Full series detail page (hero, sub-series, lessons, modal) |
| `src/pages/DesignPreviewSeriesList.tsx` | ~600 | Series catalog / browse |
| `src/pages/DesignPreviewLessonPage.tsx` | ~800 | Full lesson detail page |
| `src/components/layout-v2/DesignLayout.tsx` | ~120 | Page wrapper with sidebar |
| `src/components/layout-v2/DesignHeader.tsx` | ~280 | Header (logo + nav + auth) |
| `src/components/layout-v2/DesignSidebar.tsx` | ~500 | 3-tab sidebar |
| `src/components/layout-v2/DesignFooter.tsx` | ~200 | Footer |
| `src/components/layout-v2/DesignMobileBottomNav.tsx` | ~100 | Mobile nav |

### The production files that get replaced:
| Production file | Lines | Role |
|---|---|---|
| `src/pages/SeriesPagePublic.tsx` | 255 | Series detail — currently uses `useSeriesMixedContent` (table view) |
| `src/pages/SeriesList.tsx` | 895 | Series catalog / browse |
| `src/pages/LessonPage.tsx` | 397 | Full lesson detail page |
| `src/components/layout/Layout.tsx` | 20 | Thin wrapper → `Header + children + Footer` |
| `src/components/layout/Header.tsx` | 133 | Top nav (already cleaned up this session) |
| `src/components/lesson/LessonDialog.tsx` | 565 | Modal dialog for lesson quick-view |

**Total production code being replaced:** ~2,265 lines → replaced by ~4,000 lines of v2 design-system code.

---

## 2. What IS in the v2 sandbox that production needs

Everything in `DesignPreviewSeriesPageV2.tsx` uses real Supabase hooks:
- `useSeriesDetail(id)` — already exists in production, used in `SeriesPagePublic.tsx`
- `useLessonsBySeries(series.id)` — exists, used in old sandbox
- `useSeriesChildren(series.id)` — exists in `useSeriesHierarchy.ts`, used by production `SeriesPagePublic.tsx` indirectly via `useSeriesMixedContent`
- `useSeriesBreadcrumb(series.id)` — exists, uses `get_series_ancestors` RPC which IS in production Supabase (confirmed in KNOWLEDGE.md §3)
- `get_series_ancestors` RPC — confirmed in DB (KNOWLEDGE.md §3 RPCs section)
- `getSeriesCoverImage(title)` — in `src/lib/designTokens.ts` — exists

**All hooks already exist. No new DB migrations required for Phase 1.**

---

## 3. What still needs work before production

### Known gaps in v2 sandbox (must resolve before replacing production):

| Gap | Severity | Notes |
|---|---|---|
| **Favorites toggle is local state only** — `LessonModal` heart button uses `useState(false)`, not real Supabase `useAddFavorite`/`useRemoveFavorite` | Medium — feature regression | Production `LessonDialog` uses real `useIsFavorite`, `useAddFavorite`, `useRemoveFavorite` hooks |
| **`useLessonsBySeries` vs `useSeriesMixedContent`** — the v2 `LessonsSection` uses `useLessonsBySeries` which gets only direct-child lessons. Production `SeriesPagePublic` uses `useSeriesMixedContent` which surfaces all descendant content (sub-series rows + inlined lessons from all descendants). For series with deep nesting (e.g. "נביאים") this means the v2 may show fewer items. | High — content regression for nested series | Decision needed: keep `useLessonsBySeries` for the flat lesson list below the sub-series grid? Or switch to `useSeriesMixedContent`? Recommendation: keep current approach — the v2 explicitly shows sub-series as a separate section, which is architecturally cleaner than the mixed table. |
| **No `useAwardPoints` call** — production `LessonDialog` awards gamification points on media play. v2 `LessonModal` does not. | Low — gamification regression | Add `useAwardPoints` call on media play events |
| **No `useMediaProgress` tracking** — production tracks listen/watch progress. v2 does not. | Medium — UX regression | Add `useMediaProgress` hook to `LessonModal` and to v2 `LessonPage` |
| **SEO: no `useSEO`** — `SeriesPagePublic.tsx` calls `useSEO({ title, description, image, url, jsonLd })` for JSON-LD Course schema. v2 page has no SEO hook. | Medium — SEO regression for series pages | Add `useSEO` call in main component, matching existing schema |
| **`LessonModal` uses simple title not `sanitizeHtml`** — description is stripped with `.replace(/<[^>]*>/g, "")`. Production renders via `sanitizeHtml`. | Low | Use `sanitizeHtml` from `src/lib/sanitize.ts` |
| **No `SmartAuthCTA`** — production series page shows enroll CTA for unauthenticated users at the bottom. v2 page does not. | Low | Add the `SmartAuthCTA` component at bottom |
| **`DesignHeader` vs `Header`** — v2 uses `DesignHeader.tsx` with its own nav items. Production uses `Header.tsx`. The two must be harmonized or one replaced. | High — structural | This is Phase 2. Header.tsx was already updated this session (4 nav items). DesignHeader has the same 4 items. Merge is straightforward. |
| **Mobile: no bottom nav parity** — v2 has `DesignMobileBottomNav` which differs from production `MobileBottomNav`. | Low | Visual difference only, not functional |

---

## 4. Smoke tests before production deploy

Run these manually on Vercel preview BEFORE merging to main:

### Series page (`/series/:id`)
- [ ] Series with no sub-series and direct lessons — shows hero + lessons grid (שיר השירים: ID `41b62e31-0643-4368-b8ff-04dc25dc2603`)
- [ ] Series with sub-series and no direct lessons — shows hero + "חלקי הסדרה" only, no empty lessons section (איכה: ID `35781f30-76a7-4fc6-aa06-52a1db4a4054`)
- [ ] Series with both sub-series and direct lessons — shows both sections
- [ ] Deep series (3+ levels) — breadcrumb shows correct ancestors
- [ ] Series with single rabbi — no grouping noise in sub-series
- [ ] Series with 2-5 rabbis — grouped sub-series by rabbi name
- [ ] Series with >6 sub-series — "הצג עוד" button appears, expand/collapse works
- [ ] List/Grid toggle on sub-series — persists across page navigation
- [ ] List/Grid toggle on lessons — persists across page navigation
- [ ] Media filter chips — audio/video/pdf filters work correctly
- [ ] Lesson modal: click lesson → modal opens, URL gains `?lesson=ID`
- [ ] Lesson modal: Escape closes modal, back button works
- [ ] Lesson modal: audio plays (שיר השירים has audio lessons)
- [ ] Lesson modal: video iframe renders (test with series that has video)
- [ ] Lesson modal: "פתח בעמוד מלא" links correctly to `/lessons/:id`
- [ ] "שיעורים נוספים" grid in modal — up to 6 related lessons shown
- [ ] Hero overlay: image visible through background (not too dark)
- [ ] Hero meta: shows lesson count + sub-series count correctly
- [ ] Mobile: sidebar opens from burger, closes on outside tap
- [ ] Mobile RTL: all elements correctly aligned
- [ ] SEO: check page source for `<title>`, `<meta name="description">`, JSON-LD

### Lesson page (`/lessons/:id`)
- [ ] Full lesson loads with correct title, rabbi, date
- [ ] Audio player renders for audio lessons
- [ ] Video iframe renders for video lessons
- [ ] PDF link renders for PDF lessons
- [ ] Breadcrumb navigates back to series correctly
- [ ] Print opens branded window
- [ ] Favorites toggle connects to real Supabase (requires login)

### General layout
- [ ] Header: logo links to `/`, 4 nav items, Google login works
- [ ] Sidebar: 3 tabs (ראשי/נושאים/רבנים), collapse/expand persists
- [ ] Sidebar: search works (filters real data)
- [ ] Footer: links work, no broken routes
- [ ] Vercel analytics / Google Tag Manager still fires (check `window.dataLayer`)

---

## 5. Recommended rollout order (3 phases)

### Phase 1 — Series page only (lowest risk, highest visual impact)
**Estimated: 1 session (2-3 hours)**

Steps:
1. Create branch `rollout/series-page-v2`
2. Copy content from `DesignPreviewSeriesPageV2.tsx` into `SeriesPagePublic.tsx`:
   - Replace the `Layout` wrapper with `DesignLayout` (already sandboxed)
   - Add `useSEO` call (mirrors existing `SeriesPagePublic`)
   - Wire real `useIsFavorite`/`useAddFavorite`/`useRemoveFavorite` to `LessonModal` heart button
   - Add `useAwardPoints` on media play
   - Add `SmartAuthCTA` at page bottom
3. Run TS check
4. Push to preview branch, share Vercel preview URL with Saar
5. Saar approves → merge to main

**What changes for users:** Series detail page gets the new card-grid design with sub-series section, list/grid toggle, media filter chips, and the improved lesson modal.

**What stays unchanged:** SeriesList (browse), LessonPage (full), Header layout.

### Phase 2 — Header + Layout unification
**Estimated: 1 session**

Steps:
1. Merge `DesignHeader` + `DesignSidebar` into the production `Layout.tsx` path
2. This makes ALL pages (not just series) use the new sidebar and header
3. High risk: tests every page on the site

**Prerequisite:** Phase 1 approved and live.

### Phase 3 — Remaining pages (SeriesList, LessonPage, Rabbis, etc.)
**Estimated: 2-3 sessions**

Each page type is a separate PR. Rollout order by user traffic (descending):
1. `SeriesList.tsx` (series browser)
2. `LessonPage.tsx` (full lesson detail)
3. `RabbisList.tsx` + `RabbiPage.tsx`
4. `StorePage.tsx` + `ProductPage.tsx`
5. Remaining pages (portal, donate, community, etc.)

---

## 6. Rollback strategy

### Before any phase begins:
```bash
# Verify the backup tag exists
git tag -l | grep backup-pre-redesign
# Should show: backup-pre-redesign-rollout-2026-04-30
```

### If production breaks after merge:
**Option A — Vercel dashboard (fastest, 30 seconds):**
1. Go to `vercel.com/saars-projects-4508d6bb/bneyzion`
2. Find the last good deployment → "Promote to Production"
3. No git operations needed

**Option B — git revert:**
```bash
git revert HEAD --no-edit
HTTP_PROXY="" HTTPS_PROXY="" git push origin main
```
Vercel auto-deploys in ~60 seconds.

**Option C — feature flag (not yet implemented):**
Add `VITE_SERIES_V2=true` env var in Vercel. Routes check this flag:
```ts
// In App.tsx
const SeriesDetail = import.meta.env.VITE_SERIES_V2 
  ? DesignPreviewSeriesPageV2 
  : SeriesPagePublic;
```
This allows instant toggle via Vercel environment variables, without a code push.
**Recommendation:** implement this flag pattern for Phase 1. It makes Phase 2 and 3 safe.

---

## 7. Realistic time estimate

| Phase | Sessions | Risk | Prerequisite |
|---|---|---|---|
| Phase 0 — fix 4 issues (this session) | Done | None | — |
| Phase 1 — Series page v2 live | 1 | Low | Phase 0 done |
| Phase 2 — Layout/Header/Sidebar | 1 | Medium | Phase 1 approved |
| Phase 3a — SeriesList | 0.5 | Low | Phase 2 done |
| Phase 3b — LessonPage | 0.5 | Low | Phase 2 done |
| Phase 3c — Remaining pages | 1-2 | Low-Medium | Phase 2 done |
| **Total** | **4-5 sessions** | | |

A "session" = ~2 hours of focused work.

---

## 8. Open questions for Saar before Phase 1

1. **`useLessonsBySeries` vs `useSeriesMixedContent`** — Should the v2 series page show the sub-series as cards (current v2) OR mix sub-series rows + direct lessons together in a single table (current production)? Recommendation: keep v2 approach (cleaner), but confirm.

2. **Feature flag pattern** — Should Phase 1 use the `VITE_SERIES_V2` env var flag? This allows Saar to toggle between old and new design on production with zero code change if something breaks.

3. **LessonModal vs LessonDialog** — The v2 `LessonModal` is a custom component (no shadcn Dialog). The production `LessonDialog` uses shadcn Dialog. Should we unify them or keep v2's custom version? The custom version has better RTL positioning and a cleaner layout.

---

*This document should be deleted or archived once Phase 3 is complete.*
