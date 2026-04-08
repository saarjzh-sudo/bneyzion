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
import { PageSkeleton } from "@/components/ui/page-skeleton";
import Index from "./pages/Index";
import TeachersWing from "./pages/TeachersWing";
import ChapterWeekly from "./pages/ChapterWeekly";
import MegilatEsther from "./pages/MegilatEsther";
import Proposal from "./pages/Proposal";
import ThankYou from "./pages/ThankYou";
import Roadmap from "./pages/Roadmap";
import Auth from "./pages/Auth";
import LessonPage from "./pages/LessonPage";
import RabbiPage from "./pages/RabbiPage";
import SeriesList from "./pages/SeriesList";
import About from "./pages/About";
import Profile from "./pages/Profile";
import CommunityCoursePage from "./pages/CommunityCoursePage";
import Favorites from "./pages/Favorites";
import HistoryPage from "./pages/HistoryPage";
import Memorial from "./pages/Memorial";
import MemorialSaadia from "./pages/MemorialSaadia";
import StorePage from "./pages/StorePage";
import ProductPage from "./pages/ProductPage";
import Contact from "./pages/Contact";
import Donate from "./pages/Donate";
import RabbisList from "./pages/RabbisList";
import ParashaPage from "./pages/ParashaPage";
import SeriesPagePublic from "./pages/SeriesPagePublic";
import Portal from "./pages/Portal";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import KnesPage from "./pages/KnesPage";
import BibleBookPage from "./pages/BibleBookPage";
import PricingPage from "./pages/PricingPage";
import CommunityPage from "./pages/CommunityPage";
import CommunityDetailPage from "./pages/CommunityDetailPage";
import { ScrollToTop } from "./components/ScrollToTop";
import InstallPrompt from "./components/pwa/InstallPrompt";

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
const AdminCoupons = lazy(() => import("./pages/admin/Coupons"));
const ContentHealth = lazy(() => import("./pages/admin/ContentHealth"));

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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/teachers" element={<TeachersWing />} />
            <Route path="/chapter-weekly" element={<ChapterWeekly />} />
            <Route path="/megilat-esther" element={<MegilatEsther />} />
            <Route path="/proposal" element={<Proposal />} />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/portal/course/:id" element={<CommunityCoursePage />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/lessons/:id" element={<LessonPage />} />
            <Route path="/rabbis" element={<RabbisList />} />
            <Route path="/rabbis/:id" element={<RabbiPage />} />
            <Route path="/parasha" element={<ParashaPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/memorial" element={<Memorial />} />
            <Route path="/memorial/saadia" element={<MemorialSaadia />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/kenes" element={<KnesPage />} />
            <Route path="/series" element={<SeriesList />} />
            <Route path="/bible/:book" element={<BibleBookPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/community/:id" element={<CommunityDetailPage />} />
            <Route path="/series/:id" element={<SeriesPagePublic />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/store/:slug" element={<ProductPage />} />
            <Route path="/about" element={<About />} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PlayerProvider>
        </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
