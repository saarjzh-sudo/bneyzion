/**
 * api/lib/admin-auth — the single admin gate for Vercel serverless routes.
 *
 * Pattern (mirrors supabase/functions/broadcast-notification, which was already
 * doing this correctly):
 *   1. Read the caller's JWT from the Authorization header.
 *   2. Verify it with Supabase — this is what proves identity. A JWT is only
 *      trustworthy because Supabase checks the signature; nothing here parses
 *      claims by hand.
 *   3. Look up `user_roles` with the SERVICE ROLE key. Deliberately not with
 *      the caller's own client: that read would go through RLS, and a policy
 *      gap on user_roles would then decide the answer.
 *
 * NOTE on the anon key: it is a JWT signed by the project secret and it ships
 * in the browser bundle. `supabase.auth.getUser(anonKey)` does NOT return a
 * user, which is exactly why step 2 is the real check. Any gate built on "a
 * valid JWT was present" is not a gate.
 */

import type { VercelRequest } from "@vercel/node";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

export interface AdminAuthResult {
  ok: boolean;
  status: number;
  error?: string;
  userId?: string;
  email?: string;
}

export function extractBearer(req: VercelRequest): string | null {
  const header = req.headers.authorization || (req.headers as any).Authorization;
  if (!header || typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Resolve the caller and require the `admin` role.
 * Returns a result object rather than writing the response, so each route keeps
 * control of its own error shape.
 */
export async function requireAdmin(req: VercelRequest): Promise<AdminAuthResult> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("requireAdmin: Supabase env not configured");
    return { ok: false, status: 500, error: "server not configured" };
  }

  const jwt = extractBearer(req);
  if (!jwt) return { ok: false, status: 401, error: "unauthorized" };

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verified server-side. Passing the JWT explicitly avoids needing the anon
  // key here at all, and works whether or not SUPABASE_ANON_KEY is set.
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user) return { ok: false, status: 401, error: "unauthorized" };

  const { data: roleRow, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  // Fail closed on a lookup error — an unreadable role table means "not proven
  // admin", never "assume admin".
  if (roleErr) {
    console.error("requireAdmin: user_roles lookup failed", roleErr);
    return { ok: false, status: 500, error: "authorization check failed" };
  }
  if (!roleRow) return { ok: false, status: 403, error: "admin access required" };

  return { ok: true, status: 200, userId: user.id, email: user.email || undefined };
}

/** Service-role client for routes that have already passed requireAdmin. */
export function getServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const ANON_KEY_CONFIGURED = !!SUPABASE_ANON_KEY;
