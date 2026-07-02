import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/contexts/AuthContext";
import AccessDenied from "./AccessDenied";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Which roles are allowed to access this route.
   * Defaults to ["admin"] — no change to existing behavior.
   *
   * Examples:
   *   allowedRoles={["admin"]}              — admin only (default)
   *   allowedRoles={["admin", "creator"]}   — admin + creator
   */
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({
  children,
  allowedRoles = ["admin"],
}: ProtectedRouteProps) => {
  const { user, isAdmin, userRole, isLoading } = useAuth();

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

  if (!user) return <Navigate to="/auth" replace />;

  // Admin always passes — they have all permissions
  if (isAdmin) return <>{children}</>;

  // For non-admin: check if userRole is in the allowedRoles list
  const hasAccess = userRole != null && allowedRoles.includes(userRole);

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};
