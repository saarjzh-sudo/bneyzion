import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// app_role mirrors the Supabase enum. "creator" is a future role
// (not yet in the DB enum) so we extend it locally here.
export type AppRole = "admin" | "moderator" | "user" | "creator";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  /** Raw role fetched from user_roles. null while loading or unauthenticated. */
  userRole: AppRole | null;
  /** True for admin AND creator — both can access content management routes. */
  isCreator: boolean;
  isLoading: boolean;
  /**
   * Sign in with Google. Optional `next` param = the path the user should
   * land on after the OAuth round-trip. We pipe it through `redirectTo` so
   * Google → Supabase → /portal-login?next=… and PortalLogin's own
   * "already-logged-in" effect carries the user to `next` automatically.
   */
  signInWithGoogle: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminRole = async (userId: string) => {
    try {
      // First check admin via RPC (existing path — keep working)
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!error) setIsAdmin(!!data);

      // Also fetch the raw role for role-gated sidebar/routes
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (roles?.role) {
        setUserRole(roles.role as AppRole);
      } else if (!error && !!data) {
        // Has admin via RPC but no row — treat as admin
        setUserRole("admin");
      } else {
        setUserRole("user");
      }
    } catch {
      setIsAdmin(false);
      setUserRole("user");
    }
  };

  /**
   * When a user signs in via OAuth, link any existing user_access_tags rows
   * that were created before they had an account (pending_user_link=true).
   * This resolves the Smoove→Supabase subscriber drift:
   * Smoove import creates rows with the email but no user_id.
   * On first login the user gets their access retroactively.
   */
  const linkPendingAccessTags = async (userId: string, email: string) => {
    try {
      await supabase
        .from("user_access_tags" as never)
        .update({ user_id: userId, pending_user_link: false } as never)
        .eq("email" as never, email)
        .eq("pending_user_link" as never, true);
    } catch {
      // Non-blocking — failure here should not break login
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => checkAdminRole(session.user.id), 0);
          // Link pending access tags on SIGNED_IN event (OAuth callback)
          if (_event === "SIGNED_IN" && session.user.email) {
            setTimeout(() => linkPendingAccessTags(session.user.id, session.user.email!), 0);
          }
          // NOTE: portal-next redirect logic moved to PortalLogin.tsx.
          // The next path is now passed via redirectTo URL param, not sessionStorage,
          // so navigation happens automatically when PortalLogin sees `user && next`.
        } else {
          setIsAdmin(false);
          setUserRole(null);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async (next?: string) => {
    // If a `next` path is provided (e.g. user clicked login from /portal or
    // landed on /portal-login?next=/course/X), we send Google → Supabase →
    // /portal-login?next=ENCODED, and PortalLogin's "already-logged-in"
    // effect immediately forwards to `next`. This avoids race conditions
    // with sessionStorage and survives hard reloads / new tabs.
    const origin = window.location.origin;
    const redirectTo = next
      ? `${origin}/portal-login?next=${encodeURIComponent(next)}`
      : origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) console.error("Sign-in failed:", error);
    if (data?.url) window.location.href = data.url;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setUserRole(null);
  };

  const isCreator = isAdmin || userRole === "creator";

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, userRole, isCreator, isLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
