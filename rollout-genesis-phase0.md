# Genesis Phase 0 — Rollout Plan (בראשית בלבד)

**Written:** 2026-04-30  
**Author:** Claude (bneyzion-designer agent)  
**Status:** Draft — awaiting Saar's go / no-go  
**Parent doc:** `rollout-series-redesign.md` (the full 3-phase plan)

Genesis Phase 0 is a contained, low-risk introduction of the v2 series design on a single Bible book
before the full site rollout. If it works — great, expand. If it breaks — rollback is one command.

---

## 1. What's in "בראשית" — DB snapshot (2026-04-30)

**Hierarchy:**
```
תורה (bb14b5a5) — top-level category
└── בראשית (db78e0a3) — book-level category, lesson_count=0, status=category
    ├── 20 active/published sub-series (listed below)
    └── דפי עבודה - בראשית (d777...) — status=published, lesson_count=0
```

**No sub-series have their own children** — all Genesis series are flat (one level deep).
This is important: Phase 0 will not need to handle deep nesting. Low complexity.

### All active Genesis series (sorted by lesson count):

| # | Title | Lessons | Rabbi | ID |
|---|-------|---------|-------|-----|
| 1 | מאמרים - חומש בראשית | 63 | הרב איתן שנדורפי | `a4a97704` |
| 2 | בראשית - מוקלט \| ללא טעמים | 46 | הרב דן בארי | `3d600a33` |
| 3 | מאמרים על פרשיות בראשית | 42 | הרב יהושע שפירא | `a5505b1a` |
| 4 | דבר תורה לשולחן השבת - בראשית | 37 | הרב יואב אוריאל | `dbcae806` |
| 5 | פרשת שבוע-בראשית | 31 | הרב ג'אמי | `feaf8a0b` |
| 6 | שיעורים-חומש בראשית | 21 | הרב אוהד תירוש | `cca8bc67` |
| 7 | הרב אבינר - שיחות על פרשיות בראשית | 15 | הרב שלמה אבינר | `b2e079cd` |
| 8 | חומש בראשית - קריאה עם ביאור פשוט | 11 | הרב יונדב זר | `a910a10c` |
| 9 | חומש בראשית - קריאה בטעמים אשכנזי | 11 | הרב יונדב זר | `261c2776` |
| 10 | רחל, לאה והולדת השבטים (לנשים בלבד) | 11 | הרבנית נורית גאל דור | `48718218` |
| 11 | פרשת השבוע עפ"י הרמב"ן | 9 | הרב אליעזר קשתיאל | `d62cd377` |
| 12 | גילויים בפרשה | 9 | הרב שלמה מונדשיין | `c8586bc6` |
| 13 | מבט מגבוה על חומש בראשית | 8 | הרב יואב אוריאל | `182cc679` |
| 14 | הרב אבינר על פרשיות בראשית | 8 | הרב שלמה אבינר | `9de1aa21` |
| 15 | שיעורים קצרים על ספר בראשית | 8 | הרב איתן קופמן | `2ca6e16b` |
| 16 | מאמרים על פרשיות בראשית - הרב ערן טמיר | 7 | הרב ערן טמיר | `64471337` |
| 17 | פרשיות בראשית | 6 | הרב נתן רוטמן | `c9b7ae19` |
| 18 | מאמרים על הפרשה - חומש בראשית | 6 | הרב נועם ונגרובר | `3b12317c` |
| 19 | שיעורים על ספר בראשית - אורות מודיעין | 4 | הרב מאיר נאמן | `59f305fb` |
| 20 | מאמרים קצרים - חומש בראשית | 2 | הרב אלי אדלר | `ab762d8c` |

**Total: 20 series, ~460 lessons** across Genesis.

---

## 2. The 5 beta series — chosen for coverage diversity

Selected to cover: big/small, different rabbis, different content types (audio/text/articles).

| Series | Why chosen | Lessons | URL (v2 sandbox) |
|--------|-----------|---------|-----------------|
| **דבר תורה לשולחן השבת - בראשית** (`dbcae806`) | Yoav Oriel's own series — best for showing the client the result on his content | 37 | `https://bneyzion.vercel.app/design-series-page-v2/dbcae806-435d-4aa1-a227-0c1acb14a914` |
| **מאמרים - חומש בראשית** (`a4a97704`) | Largest series (63 lessons) — stress-tests pagination/loading | 63 | `https://bneyzion.vercel.app/design-series-page-v2/a4a97704-0ee4-41b2-a193-b538fdc7c203` |
| **בראשית - מוקלט \| ללא טעמים** (`3d600a33`) | Audio-only series — tests audio filter chip | 46 | `https://bneyzion.vercel.app/design-series-page-v2/3d600a33-c520-414d-a120-32d85789325c` |
| **שיעורים קצרים על ספר בראשית** (`2ca6e16b`) | Short lessons (8) — tests the "compact" end | 8 | `https://bneyzion.vercel.app/design-series-page-v2/2ca6e16b-7a86-4fe7-a0f5-ee2fba5a8a57` |
| **רחל, לאה והולדת השבטים** (`48718218`) | Unique content (for women) — tests edge case title display | 11 | `https://bneyzion.vercel.app/design-series-page-v2/48718218-87f5-4844-b8ea-139e9663f0e9` |

---

## 3. Approach recommendation: URL-based feature flag

### Option A — `?v=2` query param on `/series/:id`

The route `/series/:id` stays the default, serving the production `SeriesPagePublic.tsx`.
When `?v=2` is appended, it renders `DesignPreviewSeriesPageV2` instead.

```tsx
// In App.tsx — no new route needed, just a wrapper component
function SeriesPageRouter() {
  const [searchParams] = useSearchParams();
  if (searchParams.get("v") === "2") return <DesignPreviewSeriesPageV2 />;
  return <SeriesPagePublic />;
}
// Route: <Route path="series/:id" element={<SeriesPageRouter />} />
```

**Pro:** Same URL, instantly testable by adding `?v=2`. No SEO risk (Google doesn't follow `?v=2`).
**Con:** The v2 page has its own sidebar (`DesignLayout`), while the production `/series/:id` uses `Layout`. The wrapper must handle this correctly.

### Option B — Auto-route by genesis parent

Middleware checks if the series belongs to the "בראשית" category tree. If yes, renders v2. All other series render the production page.

```tsx
function SeriesPageRouter() {
  const { id } = useParams();
  const { data: series } = useSeriesDetail(id!);
  // isGenesisSeries: walk ancestors, check if any = GENESIS_CATEGORY_ID
  const isGenesis = useIsInGenesisTree(series?.id);
  if (isGenesis) return <DesignPreviewSeriesPageV2 />;
  return <SeriesPagePublic />;
}
```

**Pro:** Transparent to users — no flag in URL. Saar can share the real series URL.
**Con:** Requires an extra DB call to check ancestry. One more hook to write (`useIsInGenesisTree`). Risk: any Genesis series accidentally flips to v2, even if not in the beta list.

### Recommended: Option A (`?v=2`)

Rationale:
- **SEO:** Google's crawler ignores `?v=2` unless explicitly indexed. The canonical URL (`/series/ID`) stays the same. No duplicate content issue.
- **Control:** Saar can share a URL with `?v=2` to Yoav for approval without affecting public users. When ready, remove the flag and the production page updates automatically.
- **Speed:** No extra hook, no ancestry traversal. One conditional in App.tsx.
- **Rollback:** Remove the `?v=2` branch. Takes 2 minutes.
- **Future:** When Phase 1 is approved, the flag becomes the default and the old branch is deleted.

For robots/SEO: add `<meta name="robots" content="noindex" />` inside the v2 component when `?v=2` is active. This prevents any `?v=2` URL from being indexed even if someone shares it.

---

## 4. SEO considerations

| Question | Answer |
|----------|--------|
| Same URL, two designs? | Yes — `/series/ID?v=2` vs `/series/ID`. Google sees them as the same canonical, since `?v=2` is not in the sitemap and the canonical meta tag points to `/series/ID`. No duplicate risk. |
| Will Google index `/series/ID?v=2`? | Only if someone links to it with `?v=2`. Adding `<meta name="robots" content="noindex">` on the v2 path prevents this. |
| Will the v2 path have JSON-LD? | Not in Phase 0. Add `useSEO` before Phase 1 general rollout (documented in `rollout-series-redesign.md` §3). |
| Does the sitemap change? | No. Sitemap is generated by the `sitemap` edge function and only emits production series URLs without query params. |
| Canonical risk? | None. The flag approach keeps the canonical URL identical. |

---

## 5. Phase 0 smoke tests — Genesis-specific

### Desktop (Chrome + Firefox)
- [ ] Open `?v=2` for all 5 beta series — page loads without blank screen
- [ ] Hero image visible (not black/dark) — especially on text-heavy series with no image
- [ ] Lesson count in hero matches DB row count
- [ ] All 63 lessons of `a4a97704` load (pagination / "הצג עוד" if applicable)
- [ ] Audio filter chip: `3d600a33` (audio-only) — all lessons remain visible under "אודיו", hidden under "וידאו"
- [ ] Click first lesson → modal opens, audio player renders, `?lesson=ID` appears in URL
- [ ] Click "פתח בעמוד מלא" in modal → navigates to `/lessons/:id`
- [ ] Share/Bookmark icons appear on hover (desktop), disappear on mouse-out
- [ ] Sidebar: ראשי / נושאים / רבנים tabs work, collapse button persists in localStorage

### Mobile (iPhone Safari + Android Chrome)
- [ ] Hero renders correctly — no overflow, text readable
- [ ] Tap a lesson card → modal opens (no zoom-in issues)
- [ ] Sidebar drawer opens from header burger, closes on tap outside
- [ ] Bottom nav visible and functional

### RTL
- [ ] All text is right-aligned
- [ ] Meta row (rabbi / duration / date) reads right-to-left
- [ ] Modal close button is on the correct side
- [ ] Sub-series cards flow right-to-left in grid

### Edge cases (Genesis-specific)
- [ ] `48718218` (רחל ולאה) — long title doesn't overflow hero h1
- [ ] `ab762d8c` (2 lessons) — grid shows 2 cards without visual gaps/empty rows
- [ ] Series with no image — fallback `getSeriesCoverImage("בראשית")` renders, not a broken img tag

---

## 6. When to expand beyond Genesis

Move to Phase 1 (full rollout) when ALL of the following are true:
- Phase 0 has been live for at least **3-5 days** (or Saar/Yoav reviews and approves faster)
- No crash reports or blank-page complaints
- Hero images are displaying correctly across the 5 beta series
- Lesson modal works on mobile
- Saar explicitly says "מאשר לפתוח לכל הספרים" or equivalent

**If any of the 5 beta series shows a bug** — fix the bug in the sandbox first, don't expand.

---

## 7. Rollback — Genesis only

If Phase 0 breaks specifically on Genesis series:

**Option A — remove flag (fastest):**
```tsx
// In SeriesPageRouter, comment out the v=2 branch:
// if (searchParams.get("v") === "2") return <DesignPreviewSeriesPageV2 />;
// Push → Vercel deploys in ~60 seconds → all ?v=2 URLs fall back to production page
```

**Option B — Vercel instant rollback (if push is blocked):**
- Go to `vercel.com/saars-projects-4508d6bb/bneyzion`
- Previous deployment → "Promote to Production"
- No git operations

**The backup tag `backup-pre-redesign-rollout-2026-04-30` is still valid:**
```bash
git checkout backup-pre-redesign-rollout-2026-04-30  # read-only view
# or
git revert HEAD --no-edit && HTTP_PROXY="" HTTPS_PROXY="" git push origin main
```

---

## 8. Time estimate for Phase 0

| Task | Time | Done? |
|------|------|-------|
| Write the `SeriesPageRouter` wrapper in `App.tsx` | 15 min | No |
| Add `<meta name="robots" content="noindex">` to v2 when `?v=2` active | 10 min | No |
| TS check + push | 10 min | No |
| Saar reviews 5 beta URLs | Saar's call | No |
| **Total** | **~35 minutes of dev work** | |

This is the fastest path to "real users can compare old vs new on the same data."

---

## 9. Clarifying questions before starting Phase 0

1. **Should Phase 0 launch this session or next?** The `SeriesPageRouter` wrapper is 20 lines of code. I can write it now and push. The 5 beta URLs would be live within ~90 seconds of Vercel deploy. Just say "תתחיל".

2. **Should the `?v=2` flag be visible to ALL users or only Saar/Yoav?** Currently it's fully public (anyone who knows the URL with `?v=2` sees the new design). If you want it password-gated, add a simple `localStorage` check: set `localStorage.setItem('bnz.preview', '1')` once and the flag works; otherwise, `?v=2` shows the old page. But for quick review with Yoav, no gating is simpler.

---

*File created: 2026-04-30. Delete or archive after Phase 1 completes.*
