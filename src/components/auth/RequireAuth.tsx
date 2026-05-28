import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground font-display">טוען...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    // נתיבי פורטל ולומד → PortalLogin (ממשק ידידותי, לא "דשבורד ניהול")
    const isPortalPath =
      location.pathname.startsWith("/portal") ||
      location.pathname.startsWith("/course") ||
      location.pathname.startsWith("/my-courses");
    const loginPath = isPortalPath ? "/portal-login" : "/auth";
    return <Navigate to={`${loginPath}?next=${next}`} replace />;
  }

  return <>{children}</>;
};
