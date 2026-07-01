import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

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
    } else if (target === "weekly-learners" || target === "weekly") {
      // Learners of the CURRENT weekly chapter only.
      // The current book is community_courses where is_current & in_weekly_program.
      // Who "learns" it, in order of reliability (only account-linked user_ids can
      // receive an in-app/push notification; email-only subscribers go via Smoove):
      //   1. program subscribers — user_access_tags.tag = 'program:weekly-chapter'
      //      (the ongoing weekly subscription; grants access to every current book)
      //   2. per-book buyers    — user_access_tags.tag = the book's access_tag (course:*)
      //   3. active learners    — weekly_program_progress.program_slug = current slug
      // Union of the three, valid tags only, distinct, account-linked.
      const WEEKLY_PROGRAM_TAG = "program:weekly-chapter";

      const { data: currentBooks, error: booksError } = await supabase
        .from("community_courses")
        .select("program_slug, access_tag")
        .eq("in_weekly_program", true)
        .eq("is_current", true);
      if (booksError) throw booksError;

      const slugs = [...new Set((currentBooks ?? []).map((b) => b.program_slug).filter(Boolean))];
      if (slugs.length === 0) {
        return new Response(
          JSON.stringify({ error: "No current weekly chapter is set", sent: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tags = [
        ...new Set([
          WEEKLY_PROGRAM_TAG,
          ...(currentBooks ?? []).map((b) => b.access_tag).filter(Boolean),
        ]),
      ];

      // 1+2: subscribers / buyers via access tags (linked to an account, not expired)
      const nowIso = new Date().toISOString();
      const { data: tagged, error: tagError } = await supabase
        .from("user_access_tags")
        .select("user_id, valid_until")
        .in("tag", tags as string[])
        .not("user_id", "is", null)
        .or(`valid_until.is.null,valid_until.gt.${nowIso}`);
      if (tagError) throw tagError;

      // 3: active learners via progress
      const { data: learners, error: learnersError } = await supabase
        .from("weekly_program_progress")
        .select("user_id")
        .in("program_slug", slugs as string[]);
      if (learnersError) throw learnersError;

      userIds = [
        ...new Set([
          ...(tagged ?? []).map((t) => t.user_id),
          ...(learners ?? []).map((l) => l.user_id),
        ].filter(Boolean)),
      ] as string[];
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

    // ── Web Push fan-out (OS-level notifications even when the app is closed) ──
    // Requires a VAPID key pair in the function env. When it's missing we simply
    // skip this step — the in-app bell above already delivered the notification.
    let pushSent = 0;
    let pushStatus: "sent" | "skipped_no_vapid" | "no_subscriptions" = "skipped_no_vapid";

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:office@bneyzion.co.il";

    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .in("user_id", userIds);

      if (!subs || subs.length === 0) {
        pushStatus = "no_subscriptions";
      } else {
        const payload = JSON.stringify({
          title: title.trim(),
          body: body?.trim() || "",
          link: link?.trim() || "/",
        });
        const goneEndpoints: string[] = [];

        await Promise.all(
          subs.map(async (s) => {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload
              );
              pushSent++;
            } catch (e) {
              // 404/410 = subscription expired/unsubscribed → prune it.
              const code = (e as { statusCode?: number }).statusCode;
              if (code === 404 || code === 410) goneEndpoints.push(s.endpoint);
            }
          })
        );

        if (goneEndpoints.length > 0) {
          await supabase.from("push_subscriptions").delete().in("endpoint", goneEndpoints);
        }
        pushStatus = "sent";
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalInserted, pushSent, pushStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
