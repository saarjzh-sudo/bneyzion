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
    // 18.7 (תרצה+יפעת מקבוצת המבקרים): אורח שלחץ "מועדפים" נחת על "כניסה
    // לדשבורד ניהול" ונבהל. כל הראוטים שעטופים ב-RequireAuth הם דפי-לומד
    // (פורטל/מועדפים/היסטוריה) → תמיד PortalLogin הידידותי. מסך האדמין
    // נשאר רק ל-/admin דרך ProtectedRoute.
    return <Navigate to={`/portal-login?next=${next}`} replace />;
  }

  return <>{children}</>;
};
