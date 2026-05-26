import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!error) setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
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
        } else {
          setIsAdmin(false);
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

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) console.error("Sign-in failed:", error);
    if (data?.url) window.location.href = data.url;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
