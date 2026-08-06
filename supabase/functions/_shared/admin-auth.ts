/**
 * _shared/admin-auth — the one admin gate for every edge function.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * THE THING TO UNDERSTAND BEFORE CHANGING ANY OF THIS
 * ══════════════════════════════════════════════════════════════════════════
 * `verify_jwt = true` in supabase/config.toml is NOT authentication.
 *
 * It requires only that SOME JWT signed by the project secret is present — and
 * the anon key we ship in the browser bundle (src/integrations/supabase/
 * client.ts) is exactly such a JWT. So a function with `verify_jwt = true` and
 * no role check in its body is precisely as exposed as one with
 * `verify_jwt = false`. config.toml looks like it draws a security boundary;
 * it does not draw one.
 *
 * That misreading is what left the content-import functions callable by anyone:
 * import-series-content would run `lessons.delete().eq("series_id", ...)` with
 * the service-role key, on a series id readable straight off the public site.
 *
 * The gate has to be in the code. This module is that gate.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   import { corsHeaders, requireAdmin, jsonResponse } from "../_shared/admin-auth.ts";
 *
 *   Deno.serve(async (req) => {
 *     if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
 *     const auth = await requireAdmin(req);
 *     if (!auth.ok) return auth.response;
 *     // ... authorized work, safe to use the service-role key
 *   });
 *
 * For cron/machine callers use requireServiceSecret() instead — same idea, but
 * the credential is a shared secret in a header rather than a user JWT.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export interface AdminAuthOk {
  ok: true;
  userId: string;
  email: string | null;
  /** Service-role client — only handed out after authorization succeeds. */
  admin: ReturnType<typeof createClient>;
}
export interface AdminAuthFail {
  ok: false;
  response: Response;
}
export type AdminAuth = AdminAuthOk | AdminAuthFail;

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Require a signed-in user holding the `admin` role.
 *
 * The role lookup runs on the SERVICE-ROLE client on purpose. Reading
 * user_roles through the caller's own client would put the answer behind RLS,
 * so a policy gap on that table would decide who is an admin.
 */
export async function requireAdmin(req: Request): Promise<AdminAuth> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    console.error("[admin-auth] Supabase env not configured");
    return { ok: false, response: jsonResponse({ error: "server not configured" }, 500) };
  }

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return { ok: false, response: jsonResponse({ error: "unauthorized" }, 401) };
  }

  const admin = serviceClient();

  // Verifies the signature and resolves the user. The anon key is a valid JWT
  // but resolves to no user, which is what makes this a real check.
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user) {
    return { ok: false, response: jsonResponse({ error: "unauthorized" }, 401) };
  }

  const { data: roleRow, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleErr) {
    // Fail closed. An unreadable role table means "not proven admin".
    console.error("[admin-auth] user_roles lookup failed:", roleErr.message);
    return { ok: false, response: jsonResponse({ error: "authorization check failed" }, 500) };
  }
  if (!roleRow) {
    return { ok: false, response: jsonResponse({ error: "admin access required" }, 403) };
  }

  return { ok: true, userId: user.id, email: user.email ?? null, admin };
}

/**
 * Require a shared secret, for callers that are machines rather than people
 * (cron jobs, one-off maintenance scripts run from a terminal).
 *
 * Fails closed when the secret is unset — the mistake this replaces was
 * `if (secret) { check }`, which skipped the check entirely whenever the env
 * var was missing, i.e. exactly when something was misconfigured.
 */
export function requireServiceSecret(
  req: Request,
  envVar = "ADMIN_TASK_SECRET",
): AdminAuthFail | { ok: true; admin: ReturnType<typeof createClient> } {
  const expected = (Deno.env.get(envVar) || "").trim();
  if (!expected) {
    console.error(`[admin-auth] ${envVar} is not set — refusing to run.`);
    return { ok: false, response: jsonResponse({ error: "server not configured" }, 500) };
  }

  const provided = (
    req.headers.get("x-admin-secret") ||
    (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
  ).trim();

  if (!provided || !timingSafeEqualStr(provided, expected)) {
    return { ok: false, response: jsonResponse({ error: "unauthorized" }, 401) };
  }
  return { ok: true, admin: serviceClient() };
}

/**
 * Admin JWT **or** service secret — for maintenance functions driven both from
 * the admin UI and from a terminal.
 */
export async function requireAdminOrSecret(
  req: Request,
  envVar = "ADMIN_TASK_SECRET",
): Promise<AdminAuth> {
  const bySecret = requireServiceSecret(req, envVar);
  if (bySecret.ok) {
    return { ok: true, userId: "service", email: null, admin: bySecret.admin };
  }
  return await requireAdmin(req);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}
