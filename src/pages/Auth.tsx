import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import GoogleIcon from "@/components/auth/GoogleIcon";
import logoColor from "@/assets/logo-centered-color.png";

export default function Auth() {
  const { user, isAdmin, isLoading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [user, isAdmin, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center space-y-4">
          <img src={logoColor} alt="בני ציון" className="h-20 mx-auto" />
          <CardTitle className="text-2xl font-heading gradient-teal">כניסה לדשבורד ניהול</CardTitle>
          <CardDescription>התחבר באמצעות חשבון Google כדי לגשת לדשבורד</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            onClick={() => signInWithGoogle()}
            disabled={isLoading}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl
              border border-border bg-white text-base font-display text-foreground
              shadow-sm hover:border-primary/40 hover:shadow-md transition-all
              disabled:opacity-60 disabled:cursor-wait
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60"
          >
            <GoogleIcon size={20} />
            {isLoading ? "מתחבר..." : "התחבר עם Google"}
          </button>
          {!isLoading && user && !isAdmin && (
            <p className="text-sm text-destructive text-center">
              אין לחשבון זה הרשאות גישה. פנה למנהל המערכת.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
