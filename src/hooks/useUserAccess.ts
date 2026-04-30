/**
 * useUserAccess — checks if the current user has an active access grant for a tag.
 *
 * Uses the has_access_tag(uuid, text) SECURITY DEFINER RPC that is defined in
 * supabase/migrations/20260430_weekly_program_foundation.sql.
 *
 * Until the migration is applied this hook falls back to false (safe default).
 *
 * Usage:
 *   const { hasAccess, isLoading } = useUserAccess("program:weekly-chapter");
 *
 * The tag format is:
 *   "program:<slug>"   — e.g. "program:weekly-chapter"
 *   "course:<id>"      — e.g. "course:abc123"
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isHardcodedSubscriber } from "@/lib/hardcodedSubscribers";

export function useUserAccess(tag: string) {
  const { user, isLoading: authLoading } = useAuth();

  // Hardcoded fallback: if the user's email is in the approved list, grant
  // access immediately without waiting for the DB migration.
  const userEmail = user?.email ?? null;
  const hardcodedGrant = isHardcodedSubscriber(userEmail);

  const { data: dbAccess = false, isLoading: queryLoading } = useQuery({
    queryKey: ["user-access", user?.id ?? "anon", tag],
    queryFn: async () => {
      if (!user?.id) return false;
      try {
        const { data, error } = await (supabase as any).rpc("has_access_tag", {
          p_user_id: user.id,
          p_tag: tag,
        });
        if (error) {
          // Migration not yet applied — table / function doesn't exist yet.
          // Return false (safe fallback — hardcoded list above still applies).
          if (
            error.code === "42883" ||  // function not found
            error.code === "42P01" ||  // table not found
            error.message?.includes("has_access_tag")
          ) {
            return false;
          }
          throw error;
        }
        return !!data;
      } catch {
        return false;
      }
    },
    enabled: !authLoading && !!user?.id,
    staleTime: 1000 * 60 * 5,  // 5 minutes — re-check after a refresh
  });

  // Grant access if either the DB RPC or the hardcoded list says yes
  const hasAccess = dbAccess || hardcodedGrant;

  return {
    hasAccess,
    isLoading: authLoading || queryLoading,
    isAuthenticated: !!user,
    user,
  };
}
