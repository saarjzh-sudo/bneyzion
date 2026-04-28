import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import CartDrawer from "@/components/cart/CartDrawer";
import FloatingPlayer from "@/components/player/FloatingPlayer";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/ui/page-skeleton";
// Eager-loaded: frequently visited pages
import Index from "./pages/DesignPreviewHome";
import LessonPage from "./pages/LessonPage";
import RabbiPage from "./pages/RabbiPage";
import SeriesList from "./pages/SeriesList";
import RabbisList from "./pages/RabbisList";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded: less frequently visited pages
const TeachersWing = lazy(() => import("./pages/TeachersWing"));
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
const StorePage = lazy(() => import("./pages/StorePage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const Contact = lazy(() => import("./pages/Contact"));
const Donate = lazy(() => import("./pages/Donate"));
const ParashaPage = lazy(() => import("./pages/ParashaPage"));
const SeriesPagePublic = lazy(() => import("./pages/SeriesPagePublic"));
const Portal = lazy(() => import("./pages/Portal"));
const Checkout = lazy(() => import("./pages/Checkout"));
const KnesPage = lazy(() => import("./pages/KnesPage"));
const DorHaplaot = lazy(() => import("./pages/DorHaplaot"));
const DevPages = lazy(() => import("./pages/DevPages"));
const BibleBookPage = lazy(() => import("./pages/BibleBookPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const CommunityDetailPage = lazy(() => import("./pages/CommunityDetailPage"));
import { ScrollToTop } from "./components/ScrollToTop";
import InstallPrompt from "./components/pwa/InstallPrompt";
import GlobalAIChat from "./components/ai/GlobalAIChat";

// Lazy-loaded admin pages
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Lessons = lazy(() => import("./pages/admin/Lessons"));
const Rabbis = lazy(() => import("./pages/admin/Rabbis"));
const SeriesPage = lazy(() => import("./pages/admin/Series"));
const Topics = lazy(() => import("./pages/admin/Topics"));
const Users = lazy(() => import("./pages/admin/Users"));
const Migration = lazy(() => import("./pages/admin/Migration"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminMessages = lazy(() => import("./pages/admin/Messages"));
const ContentUpload = lazy(() => import("./pages/admin/ContentUpload"));
const ContentCompare = lazy(() => import("./pages/admin/ContentCompare"));
const CommunityCourses = lazy(() => import("./pages/admin/CommunityCourses"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));
const HomepageManager = lazy(() => import("./pages/admin/HomepageManager"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const DesignPreviewLesson = lazy(() => import("./pages/DesignPreviewLesson"));
const DesignPreviewLayout = lazy(() => import("./pages/DesignPreviewLayout"));
const DesignPreviewSeriesList = lazy(() => import("./pages/DesignPreviewSeriesList"));
const DesignPreviewSeriesPage = lazy(() => import("./pages/DesignPreviewSeriesPage"));
const DesignPreviewLessonPopup = lazy(() => import("./pages/DesignPreviewLessonPopup"));
const AdminCoupons = lazy(() => import("./pages/admin/Coupons"));
const ContentHealth = lazy(() => import("./pages/admin/ContentHealth"));

const LazyFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
          <PlayerProvider>
          <CartDrawer />
          <FloatingPlayer />
          <ScrollToTop />
          <InstallPrompt />
          {/* <GlobalAIChat /> */}
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/teachers" element={<Suspense fallback={<LazyFallback />}><TeachersWing /></Suspense>} />
            <Route path="/chapter-weekly" element={<Suspense fallback={<LazyFallback />}><ChapterWeekly /></Suspense>} />
            <Route path="/megilat-esther" element={<Suspense fallback={<LazyFallback />}><MegilatEsther /></Suspense>} />
            <Route path="/proposal" element={<Suspense fallback={<LazyFallback />}><Proposal /></Suspense>} />
            <Route path="/thank-you" element={<Suspense fallback={<LazyFallback />}><ThankYou /></Suspense>} />
            <Route path="/portal" element={<RequireAuth><Suspense fallback={<LazyFallback />}><Portal /></Suspense></RequireAuth>} />
            <Route path="/portal/course/:id" element={<RequireAuth><Suspense fallback={<LazyFallback />}><CommunityCoursePage /></Suspense></RequireAuth>} />
            <Route path="/roadmap" element={<Suspense fallback={<LazyFallback />}><Roadmap /></Suspense>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/lessons/:id" element={<LessonPage />} />
            <Route path="/rabbis" element={<RabbisList />} />
            <Route path="/rabbis/:id" element={<RabbiPage />} />
            <Route path="/parasha" element={<Suspense fallback={<LazyFallback />}><ParashaPage /></Suspense>} />
            <Route path="/profile" element={<RequireAuth><Suspense fallback={<LazyFallback />}><Profile /></Suspense></RequireAuth>} />
            <Route path="/favorites" element={<RequireAuth><Suspense fallback={<LazyFallback />}><Favorites /></Suspense></RequireAuth>} />
            <Route path="/history" element={<RequireAuth><Suspense fallback={<LazyFallback />}><HistoryPage /></Suspense></RequireAuth>} />
            <Route path="/memorial" element={<Suspense fallback={<LazyFallback />}><Memorial /></Suspense>} />
            <Route path="/memorial/saadia" element={<Suspense fallback={<LazyFallback />}><MemorialSaadia /></Suspense>} />
            <Route path="/contact" element={<Suspense fallback={<LazyFallback />}><Contact /></Suspense>} />
            <Route path="/donate" element={<Suspense fallback={<LazyFallback />}><Donate /></Suspense>} />
            <Route path="/checkout" element={<Suspense fallback={<LazyFallback />}><Checkout /></Suspense>} />
            <Route path="/kenes" element={<Suspense fallback={<LazyFallback />}><KnesPage /></Suspense>} />
            <Route path="/dor-haplaot" element={<Suspense fallback={<LazyFallback />}><DorHaplaot /></Suspense>} />
            {import.meta.env.DEV && (
              <Route path="/dev-pages" element={<Suspense fallback={<LazyFallback />}><DevPages /></Suspense>} />
            )}
            <Route path="/series" element={<SeriesList />} />
            <Route path="/bible/:book" element={<Suspense fallback={<LazyFallback />}><BibleBookPage /></Suspense>} />
            <Route path="/pricing" element={<Suspense fallback={<LazyFallback />}><PricingPage /></Suspense>} />
            <Route path="/community" element={<Suspense fallback={<LazyFallback />}><CommunityPage /></Suspense>} />
            <Route path="/community/:id" element={<Suspense fallback={<LazyFallback />}><CommunityDetailPage /></Suspense>} />
            <Route path="/series/:id" element={<Suspense fallback={<LazyFallback />}><SeriesPagePublic /></Suspense>} />
            <Route path="/store" element={<Suspense fallback={<LazyFallback />}><StorePage /></Suspense>} />
            <Route path="/store/:slug" element={<Suspense fallback={<LazyFallback />}><ProductPage /></Suspense>} />
            <Route path="/about" element={<Suspense fallback={<LazyFallback />}><About /></Suspense>} />
            <Route path="/admin" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense></ProtectedRoute>} />
            <Route path="/admin/lessons" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Lessons /></Suspense></ProtectedRoute>} />
            <Route path="/admin/rabbis" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Rabbis /></Suspense></ProtectedRoute>} />
            <Route path="/admin/series" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><SeriesPage /></Suspense></ProtectedRoute>} />
            <Route path="/admin/topics" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Topics /></Suspense></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Users /></Suspense></ProtectedRoute>} />
            <Route path="/admin/migration" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Migration /></Suspense></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><AdminSettings /></Suspense></ProtectedRoute>} />
            <Route path="/admin/products" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><AdminProducts /></Suspense></ProtectedRoute>} />
            <Route path="/admin/messages" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><AdminMessages /></Suspense></ProtectedRoute>} />
            <Route path="/admin/upload" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><ContentUpload /></Suspense></ProtectedRoute>} />
            <Route path="/admin/content-compare" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><ContentCompare /></Suspense></ProtectedRoute>} />
            <Route path="/admin/community-courses" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><CommunityCourses /></Suspense></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Analytics /></Suspense></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><AdminNotifications /></Suspense></ProtectedRoute>} />
            <Route path="/admin/homepage" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><HomepageManager /></Suspense></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><AdminOrders /></Suspense></ProtectedRoute>} />
            <Route path="/admin/coupons" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><AdminCoupons /></Suspense></ProtectedRoute>} />
            <Route path="/admin/content-health" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><ContentHealth /></Suspense></ProtectedRoute>} />
            {/* Design sandbox routes — accessible via direct URL only, not linked from main nav.
                Available in dev AND production (so Vercel previews work for review). */}
            <Route path="/design-lesson" element={<Suspense fallback={<LazyFallback />}><DesignPreviewLesson /></Suspense>} />
            <Route path="/design-lesson/:id" element={<Suspense fallback={<LazyFallback />}><DesignPreviewLesson /></Suspense>} />
            <Route path="/design-layout" element={<Suspense fallback={<LazyFallback />}><DesignPreviewLayout /></Suspense>} />
            <Route path="/design-series-list" element={<Suspense fallback={<LazyFallback />}><DesignPreviewSeriesList /></Suspense>} />
            <Route path="/design-series-page" element={<Suspense fallback={<LazyFallback />}><DesignPreviewSeriesPage /></Suspense>} />
            <Route path="/design-series-page/:id" element={<Suspense fallback={<LazyFallback />}><DesignPreviewSeriesPage /></Suspense>} />
            <Route path="/design-lesson-popup" element={<Suspense fallback={<LazyFallback />}><DesignPreviewLessonPopup /></Suspense>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </PlayerProvider>
        </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
