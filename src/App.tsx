import { lazy, Suspense, Component, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import CartDrawer from "@/components/cart/CartDrawer";
import FloatingPlayer from "@/components/player/FloatingPlayer";
import { OnboardingBot } from "@/components/bot";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/ui/page-skeleton";
// Eager-loaded: frequently visited pages
const Index = lazy(() => import("./pages/DesignPreviewHome"));
import LessonPage from "./pages/LessonPage";
import RabbiPage from "./pages/RabbiPage";
// 27.5.2026 — SeriesList route removed per Saar. Import preserved for potential rollback.
// import SeriesList from "./pages/SeriesList";
const SeriesLibrary = lazy(() => import("./pages/SeriesLibrary"));
import RabbisList from "./pages/RabbisList";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded: less frequently visited pages
// Teachers Wing v2 — production pages (rollout 2026-05-11)
const TeachersWingPage        = lazy(() => import("./pages/teachers/TeachersWingPage"));
const TeachersSeriesPage      = lazy(() => import("./pages/teachers/TeachersSeriesPage"));
const TeachersLessonPage      = lazy(() => import("./pages/teachers/TeachersLessonPage"));
// Teachers Wing category pages — 2026-06-02 (B/C/D/E)
const TeachersBookPage        = lazy(() => import("./pages/teachers/TeachersBookPage"));
const TeachersContentTypePage = lazy(() => import("./pages/teachers/TeachersContentTypePage"));
const TeachersCreatorPage     = lazy(() => import("./pages/teachers/TeachersCreatorPage"));
// Teachers Wing parasha + worksheets pages — 2026-06-02 (F)
const TeachersParashaPage    = lazy(() => import("./pages/teachers/TeachersParashaPage"));
const TeachersWorksheetsPage = lazy(() => import("./pages/teachers/TeachersWorksheetsPage"));
const ChapterWeekly = lazy(() => import("./pages/ChapterWeekly"));
const MegilatEsther = lazy(() => import("./pages/MegilatEsther"));
const Proposal = lazy(() => import("./pages/Proposal"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const About = lazy(() => import("./pages/About"));
const Profile = lazy(() => import("./pages/Profile"));
const CommunityCoursePage = lazy(() => import("./pages/CommunityCoursePage"));
const Favorites = lazy(() => import("./pages/Favorites"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const Memorial = lazy(() => import("./pages/Memorial"));
const MemorialSaadia = lazy(() => import("./pages/MemorialSaadia"));
const SourcesCollectionPage = lazy(() => import("./pages/SourcesCollectionPage"));
const StorePage = lazy(() => import("./pages/StorePage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const Contact = lazy(() => import("./pages/Contact"));
// Donate.tsx (הישן) נשמר בכוונה כעותק-חזרה — ראו הערת ROLLOUT T05 למטה. אין לו route.
const ParashaPage = lazy(() => import("./pages/ParashaPage"));
const SeriesPagePublic = lazy(() => import("./pages/SeriesPagePublic"));
const Portal = lazy(() => import("./pages/Portal"));
const Checkout = lazy(() => import("./pages/Checkout"));
const KnesPage = lazy(() => import("./pages/KnesPage"));
const DorHaplaot = lazy(() => import("./pages/DorHaplaot"));
const DailyVersePage = lazy(() => import("./pages/DailyVersePage"));
const TanachNewsPage = lazy(() => import("./pages/TanachNewsPage"));
const NewsletterPage = lazy(() => import("./pages/NewsletterPage"));
const DevPages = lazy(() => import("./pages/DevPages"));
const BibleBookPage = lazy(() => import("./pages/BibleBookPage"));
// §12 / tree CA1: /bible index — "ניווט באתר לפי ספר ופרק" sidebar entry
const BibleIndexPage = lazy(() => import("./pages/BibleIndexPage"));
// 27.5.2026 — /pricing removed per Saar
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const CommunityDetailPage = lazy(() => import("./pages/CommunityDetailPage"));
const PortalLogin = lazy(() => import("./pages/PortalLogin"));
const DesignPreviewMyCourses = lazy(() => import("./pages/DesignPreviewMyCourses"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const LearningStylePage = lazy(() => import("./pages/LearningStylePage"));
const TopicPage = lazy(() => import("./pages/TopicPage"));
import { ScrollToTop } from "./components/ScrollToTop";
import InstallPrompt from "./components/pwa/InstallPrompt";
import UpdatePrompt from "./components/pwa/UpdatePrompt";
import CookieConsent from "./components/legal/CookieConsent";
import ShabbatGate from "./components/common/ShabbatGate";
import GlobalAIChat from "./components/ai/GlobalAIChat";

// Lazy-loaded admin pages
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Lessons = lazy(() => import("./pages/admin/Lessons"));
const Rabbis = lazy(() => import("./pages/admin/Rabbis"));
const SeriesPage = lazy(() => import("./pages/admin/Series"));
const Topics = lazy(() => import("./pages/admin/Topics"));
// רמה 17: /admin/users = עמוד המשתמשים המאוחד (מחליף את הפיצול מנויים/משתמשים)
const AdminUnifiedUsers = lazy(() => import("./pages/admin/UnifiedUsers"));
const Migration = lazy(() => import("./pages/admin/Migration"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminMessages = lazy(() => import("./pages/admin/Messages"));
const ContentUpload = lazy(() => import("./pages/admin/ContentUpload"));
const ContentCompare = lazy(() => import("./pages/admin/ContentCompare"));
const CommunityCourses = lazy(() => import("./pages/admin/CommunityCourses"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));
const ControlCenter = lazy(() => import("./pages/admin/ControlCenter"));
const ContentWorkspace = lazy(() => import("./pages/admin/ContentWorkspace"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const DesignPreviewLesson = lazy(() => import("./pages/DesignPreviewLesson"));
const DesignPreviewLayout = lazy(() => import("./pages/DesignPreviewLayout"));
const DesignPreviewSeriesList = lazy(() => import("./pages/DesignPreviewSeriesList"));
const DesignPreviewSeriesPage = lazy(() => import("./pages/DesignPreviewSeriesPage"));
const DesignPreviewLessonPopup = lazy(() => import("./pages/DesignPreviewLessonPopup"));
const DesignPreviewStore = lazy(() => import("./pages/DesignPreviewStore"));
const DesignPreviewProduct = lazy(() => import("./pages/DesignPreviewProduct"));
const DesignPreviewPortal = lazy(() => import("./pages/DesignPreviewPortal"));
const DesignPreviewChapterWeekly = lazy(() => import("./pages/DesignPreviewChapterWeekly"));
const DesignPreviewRabbisList = lazy(() => import("./pages/DesignPreviewRabbisList"));
const DesignPreviewRabbi = lazy(() => import("./pages/DesignPreviewRabbi"));
const DesignPreviewTeachersWing = lazy(() => import("./pages/DesignPreviewTeachersWing"));
const DesignPreviewTeachersWingV2 = lazy(() => import("./pages/DesignPreviewTeachersWingV2"));
const DesignPreviewCommunity = lazy(() => import("./pages/DesignPreviewCommunity"));
const DesignPreviewBibleBook = lazy(() => import("./pages/DesignPreviewBibleBook"));
const DesignPreviewDonate = lazy(() => import("./pages/DesignPreviewDonate"));
const DesignPreviewUsers = lazy(() => import("./pages/DesignPreviewUsers"));
const CourseCheckout = lazy(() => import("./pages/CourseCheckout"));
const DesignPreviewMemorialSaadia = lazy(() => import("./pages/DesignPreviewMemorialSaadia"));
const DesignPreviewResearch = lazy(() => import("./pages/DesignPreviewResearch"));
const DesignPreviewLessonPage = lazy(() => import("./pages/DesignPreviewLessonPage"));
const DesignPreviewMegillatEsther = lazy(() => import("./pages/DesignPreviewMegillatEsther"));
const DesignPreviewPortalSubscriber = lazy(() => import("./pages/DesignPreviewPortalSubscriber"));
const DesignPreviewSeriesPageV2 = lazy(() => import("./pages/DesignPreviewSeriesPageV2"));
const DesignPreviewCourseDetail = lazy(() => import("./pages/DesignPreviewCourseDetail"));
const DesignPreviewCoursesCatalog = lazy(() => import("./pages/DesignPreviewCoursesCatalog"));
const DesignPreviewParasha = lazy(() => import("./pages/DesignPreviewParasha"));
const DesignPreviewYehoshuaCampaign = lazy(() => import("./pages/DesignPreviewYehoshuaCampaign"));
const DesignPreviewYehoshuaAdmin = lazy(() => import("./pages/DesignPreviewYehoshuaAdmin"));
const DesignPreviewTeacherSeriesPage = lazy(() => import("./pages/DesignPreviewTeacherSeriesPage"));
const AdminCoupons = lazy(() => import("./pages/admin/Coupons"));
const AdminShortLinks = lazy(() => import("./pages/admin/ShortLinks"));
const ShortLinkRedirect = lazy(() => import("./pages/ShortLinkRedirect"));
const AdminPayments = lazy(() => import("./pages/admin/Payments"));
const AdminSubscribers = lazy(() => import("./pages/admin/Subscribers"));
const BenziKnowledge = lazy(() => import("./pages/admin/BenziKnowledge"));
const AdminBudget = lazy(() => import("./pages/admin/Budget"));
const AdminKenes = lazy(() => import("./pages/admin/Kenes"));
// רמה 30 (27.7.2026): מנגנון קמפיינים רב-פעמי — דף ציבורי + אדמין
const CampaignPage = lazy(() => import("./pages/CampaignPage"));
const AdminCampaigns = lazy(() => import("./pages/admin/Campaigns"));
const AdminCampaignDetail = lazy(() => import("./pages/admin/CampaignDetail"));
const AdminPromos = lazy(() => import("./pages/admin/Promos"));
const AdminSliders = lazy(() => import("./pages/admin/Sliders"));
const AdminFeedback = lazy(() => import("./pages/admin/Feedback"));
const AdminDorHaplaot = lazy(() => import("./pages/admin/DorHaplaot"));
const AdminDailyContent = lazy(() => import("./pages/admin/DailyContent"));
const AdminBenziConversations = lazy(() => import("./pages/admin/BenziConversations"));
const Terms = lazy(() => import("./pages/Terms"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const AccessibilityStatement = lazy(() => import("./pages/AccessibilityStatement"));
const Dedications = lazy(() => import("./pages/admin/Dedications"));
const FamilyTanach = lazy(() => import("./pages/FamilyTanach"));
const KenesShavuot2026 = lazy(() => import("./pages/KenesShavuot2026"));
const KenesMilhamotHatanach = lazy(() => import("./pages/KenesMilhamotHatanach"));
const KenesArchive = lazy(() => import("./pages/KenesArchive"));
const WeeklyProgramLibrary = lazy(() => import("./pages/WeeklyProgramLibrary"));
const WeeklyBookDetail = lazy(() => import("./pages/WeeklyBookDetail"));
// (סער 10.7) שאל את הרב — שו"ת באתר: טופס → תור אדמין → תשובה מתפרסמת
const AskRabbiPage = lazy(() => import("./pages/AskRabbiPage"));
const AdminQuestions = lazy(() => import("./pages/admin/Questions"));

/** Redirect /design-teachers-series/:id → /teachers/series/:id (client-side fallback) */
function SandboxSeriesRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/teachers/series/${id}`} replace />;
}

/**
 * Route dispatcher for /course/:slug.
 * - book-* slugs → WeeklyBookDetail (data-driven multi-book page)
 * - anything else → DesignPreviewCourseDetail (legacy single hardcoded page)
 */
function WeeklyBookDetailOrLegacy() {
  const { slug = "" } = useParams<{ slug: string }>();
  if (slug.startsWith("book-")) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <WeeklyBookDetail />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<LazyFallback />}>
      <DesignPreviewCourseDetail />
    </Suspense>
  );
}

const LazyFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
  </div>
);

/**
 * ChunkErrorBoundary — catches dynamic-import (lazy chunk) failures caused by
 * PWA Service Worker cache staleness.
 *
 * Root cause: the SW precaches index.html from build N. After build N+1 is
 * deployed, chunk hashes change. If the SW still serves index.html from build N,
 * lazy import() calls request chunks with OLD hashes → 404 → ChunkLoadError.
 *
 * Fix: detect the ChunkLoadError pattern and trigger ONE hard reload (bypasses
 * SW cache). A sessionStorage flag prevents an infinite reload loop if the
 * reload itself doesn't fix things.
 *
 * React 18 note: getDerivedStateFromError() is called in the render phase and
 * MUST be pure (no side effects). We store a flag in state and do the reload
 * in componentDidUpdate (commit phase), which is safe for side effects.
 */
class ChunkErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; isChunkError: boolean }
> {
  state = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(err: Error) {
    const isChunkError =
      err.name === "ChunkLoadError" ||
      /loading chunk/i.test(err.message) ||
      /failed to fetch dynamically imported module/i.test(err.message) ||
      /Importing a module script failed/i.test(err.message);

    return { hasError: true, isChunkError };
  }

  componentDidCatch(err: Error, info: { componentStack: string }) {
    console.error("[ChunkErrorBoundary]", err, info.componentStack);
  }

  componentDidUpdate() {
    const { hasError, isChunkError } = this.state;
    if (hasError && isChunkError) {
      const RELOAD_KEY = "bnz.chunk-reload";
      const already = sessionStorage.getItem(RELOAD_KEY);
      if (!already) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        // Hard reload — bypasses SW cached responses for assets
        window.location.reload();
      }
    }
  }

  render() {
    const { hasError, isChunkError } = this.state;
    if (!hasError) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1rem",
          fontFamily: "sans-serif",
          direction: "rtl",
        }}
      >
        <p style={{ color: "#555", fontSize: "1rem" }}>
          {isChunkError
            ? "גרסה חדשה של האתר זמינה — יש לרענן את הדף."
            : "אירעה שגיאה בטעינת הדף — נסו לרענן."}
        </p>
        <button
          onClick={() => {
            sessionStorage.removeItem("bnz.chunk-reload");
            window.location.reload();
          }}
          style={{
            padding: "0.6rem 1.5rem",
            borderRadius: 8,
            background: "#8B6F47",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          רענן
        </button>
      </div>
    );
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Routes that render as bare standalone landing pages — no site chrome
// (no navigator bot "בנצי", no floating player, no install prompt, no cart).
const BARE_CHROME_ROUTES = ["/kenes-2026-06"];
const GlobalChrome = () => {
  const { pathname } = useLocation();
  if (BARE_CHROME_ROUTES.some((r) => pathname.startsWith(r))) return null;
  return (
    <>
      <CartDrawer />
      <FloatingPlayer />
      <InstallPrompt />
      <UpdatePrompt />
      {/* הודעת עוגיות — גלובלית, מהעמוד הראשון שנכנסים אליו (הערת אלי 19.7; קודם חיה רק ב-Layout הישן) */}
      <CookieConsent />
      {/* Site navigator bot — gold floating button, RTL. Auto-hides on /admin, /design-*, /course/*, /program/* and bare landing routes.
          10.7 (סער): "בחנות הוא מיותר" — מוסתר גם ב-/store, /checkout, /cart */}
      <OnboardingBot disabledOnRoutes={["/admin", "/design-", "/course/", "/program/", "/store", "/checkout", "/cart"]} />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
          <PlayerProvider>
          <ScrollToTop />
          {/* שבת/חג בא"י → כיסוי "האתר שובת" (רמה 26ד; חל גם על דפי-נחיתה עירומים) */}
          <ShabbatGate />
          <GlobalChrome />
          {/* <GlobalAIChat /> */}
          <ChunkErrorBoundary>
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Suspense fallback={<LazyFallback />}><Index /></Suspense>} />
            {/* ── Teachers Wing v2 — production routes (rollout 2026-05-11) ── */}
            <Route path="/teachers" element={<Suspense fallback={<LazyFallback />}><TeachersWingPage /></Suspense>} />
            <Route path="/teachers/series/:id" element={<Suspense fallback={<LazyFallback />}><TeachersSeriesPage /></Suspense>} />
            <Route path="/teachers/lesson/:id" element={<Suspense fallback={<LazyFallback />}><TeachersLessonPage /></Suspense>} />
            {/* Teachers Wing category pages — 2026-06-02 (B/C/D/E) */}
            <Route path="/teachers/book/:book" element={<Suspense fallback={<LazyFallback />}><TeachersBookPage /></Suspense>} />
            <Route path="/teachers/content-type/:type" element={<Suspense fallback={<LazyFallback />}><TeachersContentTypePage /></Suspense>} />
            <Route path="/teachers/creator/:id" element={<Suspense fallback={<LazyFallback />}><TeachersCreatorPage /></Suspense>} />
            {/* Teachers Wing parasha + worksheets — 2026-06-02 (F) */}
            <Route path="/teachers/parasha/:book/:parasha" element={<Suspense fallback={<LazyFallback />}><TeachersParashaPage /></Suspense>} />
            <Route path="/teachers/worksheets/:book" element={<Suspense fallback={<LazyFallback />}><TeachersWorksheetsPage /></Suspense>} />
            <Route path="/chapter-weekly" element={<Suspense fallback={<LazyFallback />}><ChapterWeekly /></Suspense>} />
            <Route path="/megilat-esther" element={<Suspense fallback={<LazyFallback />}><MegilatEsther /></Suspense>} />
            <Route path="/proposal" element={<Suspense fallback={<LazyFallback />}><Proposal /></Suspense>} />
            <Route path="/s/:code" element={<Suspense fallback={<LazyFallback />}><ShortLinkRedirect /></Suspense>} />
            <Route path="/thank-you" element={<Suspense fallback={<LazyFallback />}><ThankYou /></Suspense>} />
            {/* PRODUCTION — new design (2026-04-30 swap) */}
            <Route path="/portal" element={<RequireAuth><Suspense fallback={<LazyFallback />}><DesignPreviewPortalSubscriber /></Suspense></RequireAuth>} />
            <Route path="/courses" element={<Navigate to="/design-my-courses" replace />} />
            {/* Weekly program library + per-book detail */}
            <Route path="/program/weekly-chapter" element={<Suspense fallback={<LazyFallback />}><WeeklyProgramLibrary /></Suspense>} />
            {/* Back-compat: /course/weekly-chapter → library (was hardcoded ezra) */}
            <Route path="/course/weekly-chapter" element={<Navigate to="/program/weekly-chapter" replace />} />
            {/* /course/:slug — WeeklyBookDetail handles book-* slugs; DesignPreviewCourseDetail handles the rest */}
            <Route path="/course/:slug/checkout" element={<Suspense fallback={<LazyFallback />}><CourseCheckout /></Suspense>} />
            <Route path="/course/:slug" element={<Suspense fallback={<LazyFallback />}><WeeklyBookDetailOrLegacy /></Suspense>} />
            {/* LEGACY — archived, accessible for rollback comparison */}
            <Route path="/portal-old" element={<RequireAuth><Suspense fallback={<LazyFallback />}><Portal /></Suspense></RequireAuth>} />
            {/* בלי RequireAuth ברמת-הראוט: הרכיב מפנה קורס-ספר ל-/course/<slug>
                (דף-מכירה לאורח) לפני בדיקת-ההתחברות, ובודק auth בעצמו לשאר. */}
            <Route path="/portal/course/:id" element={<Suspense fallback={<LazyFallback />}><CommunityCoursePage /></Suspense>} />
            <Route path="/roadmap" element={<Suspense fallback={<LazyFallback />}><Roadmap /></Suspense>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/portal-login" element={<Suspense fallback={<LazyFallback />}><PortalLogin /></Suspense>} />
            <Route path="/design-my-courses" element={<Suspense fallback={<LazyFallback />}><DesignPreviewMyCourses /></Suspense>} />
            <Route path="/lessons/:id" element={<LessonPage />} />
            <Route path="/rabbis" element={<RabbisList />} />
            <Route path="/rabbis/:id" element={<RabbiPage />} />
            <Route path="/parasha" element={<Suspense fallback={<LazyFallback />}><ParashaPage /></Suspense>} />
            <Route path="/profile" element={<Navigate to="/portal" replace />} />
            <Route path="/favorites" element={<RequireAuth><Suspense fallback={<LazyFallback />}><Favorites /></Suspense></RequireAuth>} />
            <Route path="/history" element={<RequireAuth><Suspense fallback={<LazyFallback />}><HistoryPage /></Suspense></RequireAuth>} />
            <Route path="/memorial" element={<Suspense fallback={<LazyFallback />}><Memorial /></Suspense>} />
            <Route path="/memorial/saadia" element={<Suspense fallback={<LazyFallback />}><MemorialSaadia /></Suspense>} />
            <Route path="/contact" element={<Suspense fallback={<LazyFallback />}><Contact /></Suspense>} />
            <Route path="/ask-rabbi" element={<Suspense fallback={<LazyFallback />}><AskRabbiPage /></Suspense>} />
            {/* ROLLOUT T05 (2.7.2026): דף התרומות החדש חי ב-/donate. הישן נשמר ב-Donate.tsx — החזרה = החלפת הקומפוננטה. */}
            <Route path="/donate" element={<Suspense fallback={<LazyFallback />}><DesignPreviewDonate /></Suspense>} />
            {/* רמה 30: דף קמפיין-גיוס גנרי מונע-DB (campaigns/campaign_tiers) */}
            <Route path="/campaign/:slug" element={<Suspense fallback={<LazyFallback />}><CampaignPage /></Suspense>} />
            <Route path="/checkout" element={<Suspense fallback={<LazyFallback />}><Checkout /></Suspense>} />
            <Route path="/kenes" element={<Suspense fallback={<LazyFallback />}><KnesPage /></Suspense>} />
            <Route path="/kenes-2026-05" element={<Suspense fallback={<LazyFallback />}><KenesShavuot2026 /></Suspense>} />
            <Route path="/kenes-2026-06" element={<Suspense fallback={<LazyFallback />}><KenesMilhamotHatanach /></Suspense>} />
            <Route path="/kenes-archive" element={<Suspense fallback={<LazyFallback />}><KenesArchive /></Suspense>} />
            <Route path="/dor-haplaot" element={<Suspense fallback={<LazyFallback />}><DorHaplaot /></Suspense>} />
            <Route path="/family-tanach" element={<Suspense fallback={<LazyFallback />}><FamilyTanach /></Suspense>} />
            <Route path="/daily-verse" element={<Suspense fallback={<LazyFallback />}><DailyVersePage /></Suspense>} />
            {/* רמה 20 (יואב 17.7): אוספי-מקורות כ"כרטיסיות נפתחות" ולא כסדרה רגילה */}
            <Route path="/sources/:seriesId" element={<Suspense fallback={<LazyFallback />}><SourcesCollectionPage /></Suspense>} />
            <Route path="/tanach-news" element={<Suspense fallback={<LazyFallback />}><TanachNewsPage /></Suspense>} />
            <Route path="/newsletter" element={<Suspense fallback={<LazyFallback />}><NewsletterPage /></Suspense>} />
            {import.meta.env.DEV && (
              <Route path="/dev-pages" element={<Suspense fallback={<LazyFallback />}><DevPages /></Suspense>} />
            )}
            {/* 27.5.2026 — /series restored as SeriesLibrary (new page), /pricing still removed */}
            <Route path="/series" element={<Suspense fallback={<LazyFallback />}><SeriesLibrary /></Suspense>} />
            {/* §12 / tree CA1: /bible index — book+chapter navigation */}
            <Route path="/bible" element={<Suspense fallback={<LazyFallback />}><BibleIndexPage /></Suspense>} />
            <Route path="/bible/:book" element={<Suspense fallback={<LazyFallback />}><BibleBookPage /></Suspense>} />
            {/* 17.7 (תרצה מקבוצת המבקרים + סער): עמוד הקהילה הישן ("הצטרף לקהילה"→login)
                לא אמור להתקיים — כל הקישורים נוחתים על עמוד תכנית הפרק השבועי. */}
            <Route path="/community" element={<Navigate to="/chapter-weekly" replace />} />
            <Route path="/community/:id" element={<Suspense fallback={<LazyFallback />}><CommunityDetailPage /></Suspense>} />
            <Route path="/series/:id" element={<Suspense fallback={<LazyFallback />}><DesignPreviewSeriesPageV2 /></Suspense>} />
            <Route path="/category/:id" element={<Suspense fallback={<LazyFallback />}><CategoryPage /></Suspense>} />
            <Route path="/topic/:slug" element={<Suspense fallback={<LazyFallback />}><TopicPage /></Suspense>} />
            {/* רמה 13 (יואב 9.7): ניווט לפי אופי-הלימוד — מוקלט / מוקלט+פירוש / PDF+פירוש / מבטים רחבים */}
            <Route path="/learning-style/:key" element={<Suspense fallback={<LazyFallback />}><LearningStylePage /></Suspense>} />
            <Route path="/store" element={<Suspense fallback={<LazyFallback />}><StorePage /></Suspense>} />
            <Route path="/store/:slug" element={<Suspense fallback={<LazyFallback />}><ProductPage /></Suspense>} />
            <Route path="/about" element={<Suspense fallback={<LazyFallback />}><About /></Suspense>} />
            <Route path="/terms" element={<Suspense fallback={<LazyFallback />}><Terms /></Suspense>} />
            <Route path="/privacy-policy" element={<Suspense fallback={<LazyFallback />}><PrivacyPolicy /></Suspense>} />
            <Route path="/accessibility" element={<Suspense fallback={<LazyFallback />}><AccessibilityStatement /></Suspense>} />
            {/* ── Admin routes — role-gated (wave-2) ───────────────────── */}
            {/* Admin-only management routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminUnifiedUsers /></Suspense></ProtectedRoute>} />
            <Route path="/admin/subscribers" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminSubscribers /></Suspense></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminSettings /></Suspense></ProtectedRoute>} />
            <Route path="/admin/products" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminProducts /></Suspense></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminOrders /></Suspense></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminPayments /></Suspense></ProtectedRoute>} />
            <Route path="/admin/dedications" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><Dedications /></Suspense></ProtectedRoute>} />
            <Route path="/admin/coupons" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminCoupons /></Suspense></ProtectedRoute>} />
            <Route path="/admin/short-links" element={<ProtectedRoute allowedRoles={["admin", "creator"]}><Suspense fallback={<PageSkeleton />}><AdminShortLinks /></Suspense></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><Analytics /></Suspense></ProtectedRoute>} />
            <Route path="/admin/messages" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminMessages /></Suspense></ProtectedRoute>} />
            <Route path="/admin/questions" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminQuestions /></Suspense></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminNotifications /></Suspense></ProtectedRoute>} />
            {/* רמה 13: מרכז שליטה — עריכת נוסחים/תמונות מהמרשם (siteCopyRegistry) */}
            <Route path="/admin/control-center" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><ControlCenter /></Suspense></ProtectedRoute>} />
            {/* Debug-only — not in nav */}
            <Route path="/admin/migration" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><Migration /></Suspense></ProtectedRoute>} />
            <Route path="/admin/content-compare" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><ContentCompare /></Suspense></ProtectedRoute>} />
            {/* Content routes — admin + creator */}
            <Route path="/admin/lessons" element={<ProtectedRoute allowedRoles={["admin", "creator"]}><Suspense fallback={<PageSkeleton />}><Lessons /></Suspense></ProtectedRoute>} />
            <Route path="/admin/content" element={<ProtectedRoute allowedRoles={["admin", "creator"]}><Suspense fallback={<PageSkeleton />}><ContentWorkspace /></Suspense></ProtectedRoute>} />
            <Route path="/admin/rabbis" element={<ProtectedRoute allowedRoles={["admin", "creator"]}><Suspense fallback={<PageSkeleton />}><Rabbis /></Suspense></ProtectedRoute>} />
            <Route path="/admin/series" element={<ProtectedRoute allowedRoles={["admin", "creator"]}><Suspense fallback={<PageSkeleton />}><SeriesPage /></Suspense></ProtectedRoute>} />
            <Route path="/admin/topics" element={<ProtectedRoute allowedRoles={["admin", "creator"]}><Suspense fallback={<PageSkeleton />}><Topics /></Suspense></ProtectedRoute>} />
            <Route path="/admin/upload" element={<ProtectedRoute allowedRoles={["admin", "creator"]}><Suspense fallback={<PageSkeleton />}><ContentUpload /></Suspense></ProtectedRoute>} />
            <Route path="/admin/community-courses" element={<ProtectedRoute allowedRoles={["admin", "creator"]}><Suspense fallback={<PageSkeleton />}><CommunityCourses /></Suspense></ProtectedRoute>} />
            <Route path="/admin/benzi" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><BenziKnowledge /></Suspense></ProtectedRoute>} />
            <Route path="/admin/budget" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminBudget /></Suspense></ProtectedRoute>} />
            <Route path="/admin/kenes" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminKenes /></Suspense></ProtectedRoute>} />
            {/* רמה 30: מנגנון קמפיינים — רשימה + דשבורד-קמפיין */}
            <Route path="/admin/campaigns" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminCampaigns /></Suspense></ProtectedRoute>} />
            <Route path="/admin/campaigns/:slug" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminCampaignDetail /></Suspense></ProtectedRoute>} />
            <Route path="/admin/promos" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminPromos /></Suspense></ProtectedRoute>} />
            <Route path="/admin/sliders" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminSliders /></Suspense></ProtectedRoute>} />
            <Route path="/admin/feedback" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminFeedback /></Suspense></ProtectedRoute>} />
            <Route path="/admin/dor-haplaot" element={<ProtectedRoute allowedRoles={["admin", "creator"]}><Suspense fallback={<PageSkeleton />}><AdminDorHaplaot /></Suspense></ProtectedRoute>} />
            <Route path="/admin/daily" element={<ProtectedRoute allowedRoles={["admin", "creator"]}><Suspense fallback={<PageSkeleton />}><AdminDailyContent /></Suspense></ProtectedRoute>} />
            <Route path="/admin/benzi-conversations" element={<ProtectedRoute allowedRoles={["admin"]}><Suspense fallback={<PageSkeleton />}><AdminBenziConversations /></Suspense></ProtectedRoute>} />
            {/* Design sandbox routes — accessible via direct URL only, not linked from main nav.
                Available in dev AND production (so Vercel previews work for review). */}
            <Route path="/design-lesson" element={<Suspense fallback={<LazyFallback />}><DesignPreviewLesson /></Suspense>} />
            <Route path="/design-lesson/:id" element={<Suspense fallback={<LazyFallback />}><DesignPreviewLesson /></Suspense>} />
            <Route path="/design-layout" element={<Suspense fallback={<LazyFallback />}><DesignPreviewLayout /></Suspense>} />
            <Route path="/design-series-list" element={<Suspense fallback={<LazyFallback />}><DesignPreviewSeriesList /></Suspense>} />
            <Route path="/design-series-page" element={<Suspense fallback={<LazyFallback />}><DesignPreviewSeriesPage /></Suspense>} />
            <Route path="/design-series-page/:id" element={<Suspense fallback={<LazyFallback />}><DesignPreviewSeriesPage /></Suspense>} />
            <Route path="/design-lesson-popup" element={<Suspense fallback={<LazyFallback />}><DesignPreviewLessonPopup /></Suspense>} />
            <Route path="/design-store" element={<Suspense fallback={<LazyFallback />}><DesignPreviewStore /></Suspense>} />
            <Route path="/design-product" element={<Suspense fallback={<LazyFallback />}><DesignPreviewProduct /></Suspense>} />
            <Route path="/design-product/:slug" element={<Suspense fallback={<LazyFallback />}><DesignPreviewProduct /></Suspense>} />
            <Route path="/design-portal" element={<Suspense fallback={<LazyFallback />}><DesignPreviewPortal /></Suspense>} />
            <Route path="/design-chapter-weekly" element={<Suspense fallback={<LazyFallback />}><DesignPreviewChapterWeekly /></Suspense>} />
            <Route path="/design-rabbis-list" element={<Suspense fallback={<LazyFallback />}><DesignPreviewRabbisList /></Suspense>} />
            <Route path="/design-rabbi" element={<Suspense fallback={<LazyFallback />}><DesignPreviewRabbi /></Suspense>} />
            <Route path="/design-rabbi/:id" element={<Suspense fallback={<LazyFallback />}><DesignPreviewRabbi /></Suspense>} />
            <Route path="/design-teachers-wing" element={<Suspense fallback={<LazyFallback />}><DesignPreviewTeachersWing /></Suspense>} />
            <Route path="/design-community" element={<Suspense fallback={<LazyFallback />}><DesignPreviewCommunity /></Suspense>} />
            <Route path="/design-bible-book" element={<Suspense fallback={<LazyFallback />}><DesignPreviewBibleBook /></Suspense>} />
            <Route path="/design-bible-book/:book" element={<Suspense fallback={<LazyFallback />}><DesignPreviewBibleBook /></Suspense>} />
            <Route path="/design-donate" element={<Suspense fallback={<LazyFallback />}><DesignPreviewDonate /></Suspense>} />
            <Route path="/design-users" element={<Suspense fallback={<LazyFallback />}><DesignPreviewUsers /></Suspense>} />
            <Route path="/design-memorial-saadia" element={<Suspense fallback={<LazyFallback />}><DesignPreviewMemorialSaadia /></Suspense>} />
            <Route path="/design-research" element={<Suspense fallback={<LazyFallback />}><DesignPreviewResearch /></Suspense>} />
            <Route path="/design-lesson-page" element={<Suspense fallback={<LazyFallback />}><DesignPreviewLessonPage /></Suspense>} />
            <Route path="/design-lesson-page/:id" element={<Suspense fallback={<LazyFallback />}><DesignPreviewLessonPage /></Suspense>} />
            <Route path="/design-megilat-esther" element={<Suspense fallback={<LazyFallback />}><DesignPreviewMegillatEsther /></Suspense>} />
            <Route path="/design-portal-subscriber" element={<Suspense fallback={<LazyFallback />}><DesignPreviewPortalSubscriber /></Suspense>} />
            <Route path="/design-series-page-v2" element={<Suspense fallback={<LazyFallback />}><DesignPreviewSeriesPageV2 /></Suspense>} />
            <Route path="/design-series-page-v2/:id" element={<Suspense fallback={<LazyFallback />}><DesignPreviewSeriesPageV2 /></Suspense>} />
            <Route path="/design-courses" element={<Suspense fallback={<LazyFallback />}><DesignPreviewCoursesCatalog /></Suspense>} />
            <Route path="/design-course" element={<Suspense fallback={<LazyFallback />}><DesignPreviewCourseDetail /></Suspense>} />
            <Route path="/design-course/:slug" element={<Suspense fallback={<LazyFallback />}><DesignPreviewCourseDetail /></Suspense>} />
            <Route path="/design-parasha" element={<Suspense fallback={<LazyFallback />}><DesignPreviewParasha /></Suspense>} />
            {/* Sandbox redirects → production (301 in vercel.json, Navigate here as fallback for client-side) */}
            <Route path="/design-yehoshua-campaign" element={<Suspense fallback={<LazyFallback />}><DesignPreviewYehoshuaCampaign /></Suspense>} />
            <Route path="/design-yehoshua-admin" element={<Suspense fallback={<LazyFallback />}><DesignPreviewYehoshuaAdmin /></Suspense>} />
            <Route path="/design-teachers-wing-v2" element={<Suspense fallback={<LazyFallback />}><DesignPreviewTeachersWingV2 /></Suspense>} />
            <Route path="/design-teachers-series/:id" element={<SandboxSeriesRedirect />} />

            {/* Catch-all: NotFound also resolves old-site (Umbraco) URLs in-house —
                deep content paths (/מאגר-עזרי-הלמידה/... etc.) are matched against
                Supabase to the exact series/lesson page (src/lib/legacyResolver.ts). */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
          </ChunkErrorBoundary>
        </PlayerProvider>
        </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
