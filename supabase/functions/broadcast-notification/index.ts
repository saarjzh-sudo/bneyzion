import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller is an admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role using service role client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, body, link, target } = await req.json();

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target user IDs
    let userIds: string[] = [];

    if (target === "all") {
      // Get all users from profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id");
      if (profilesError) throw profilesError;
      userIds = profiles?.map((p) => p.id) ?? [];
    } else if (target === "community") {
      // Get community members with linked user_id
      const { data: members, error: membersError } = await supabase
        .from("community_members")
        .select("user_id")
        .eq("status", "active")
        .not("user_id", "is", null);
      if (membersError) throw membersError;
      userIds = members?.map((m) => m.user_id!).filter(Boolean) ?? [];
    } else if (Array.isArray(target)) {
      userIds = target;
    }

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ error: "No target users found", sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert notifications in batches
    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize).map((uid) => ({
        user_id: uid,
        title: title.trim(),
        body: body?.trim() || null,
        link: link?.trim() || null,
      }));

      const { error: insertError, data } = await supabase
        .from("user_notifications")
        .insert(batch);

      if (insertError) throw insertError;
      totalInserted += batch.length;
    }

    return new Response(JSON.stringify({ success: true, sent: totalInserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
