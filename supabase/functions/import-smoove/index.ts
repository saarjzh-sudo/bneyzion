import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SMOOVE_API_KEY = Deno.env.get("SMOOVE_API_KEY");
    if (!SMOOVE_API_KEY) throw new Error("SMOOVE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action } = body;
    const smooveHeaders = {
      Authorization: `Bearer ${SMOOVE_API_KEY}`,
      "Content-Type": "application/json",
    };
    const json = (h: Record<string, string>) => ({ ...corsHeaders, ...h });

    if (action === "test-api") {
      // Test specific list contacts with pagination info
      const testListId = body.listId || 1045078;
      const testPage = body.page || 1;
      const testPageSize = body.pageSize || 100;
      
      const contactsRes = await fetch(
        `https://rest.smoove.io/v1/Lists/${testListId}/Contacts?page=${testPage}&pageSize=${testPageSize}`,
        { headers: smooveHeaders }
      );
      const contactsText = await contactsRes.text();
      
      // Also try the active contacts endpoint
      const activeRes = await fetch(
        `https://rest.smoove.io/v1/Contacts/Active?page=1&pageSize=5`,
        { headers: smooveHeaders }
      );
      const activeText = await activeRes.text();

      return new Response(JSON.stringify({
        listContacts: {
          status: contactsRes.status,
          count: (() => { try { return JSON.parse(contactsText).length } catch { return contactsText.substring(0, 500) } })(),
          headers: Object.fromEntries(contactsRes.headers.entries()),
        },
        activeContacts: {
          status: activeRes.status,
          data: activeText.substring(0, 1000),
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list-lists") {
      const listsRes = await fetch("https://rest.smoove.io/v1/Lists", { headers: smooveHeaders });
      const listsData = await listsRes.json();
      return new Response(JSON.stringify({ lists: listsData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import-subscribers") {
      let page = 1;
      let imported = 0;
      let skipped = 0;
      let total = 0;
      let hasMore = true;

      while (hasMore) {
        const contactsRes = await fetch(
          `https://rest.smoove.io/v1/Contacts/Active?page=${page}&pageSize=100`,
          { headers: smooveHeaders }
        );
        const contacts = await contactsRes.json();

        if (!Array.isArray(contacts) || contacts.length === 0) {
          hasMore = false;
          break;
        }

        total += contacts.length;
        
        for (const contact of contacts) {
          const email = contact.email;
          if (!email) { skipped++; continue; }

          const { error } = await supabase
            .from("community_members")
            .upsert({
              email: email.toLowerCase(),
              first_name: contact.firstName || null,
              last_name: contact.lastName || null,
              phone: contact.cellPhone || null,
              smoove_id: contact.id || null,
              joined_at: contact.createdOn || new Date().toISOString(),
              status: "active",
            }, { onConflict: "email" });

          if (!error) imported++;
          else { console.error("Import error:", email, error); skipped++; }
        }

        if (contacts.length < 100) hasMore = false;
        else page++;
      }

      return new Response(JSON.stringify({ imported, skipped, total }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import-list-subscribers") {
      const listId = body.listId;
      if (!listId) throw new Error("listId required");

      let page = 1;
      let imported = 0, skipped = 0, total = 0;
      let hasMore = true;

      while (hasMore) {
        const contactsRes = await fetch(
          `https://rest.smoove.io/v1/Lists/${listId}/Contacts?page=${page}&pageSize=100`,
          { headers: smooveHeaders }
        );
        const contacts = await contactsRes.json();

        if (!Array.isArray(contacts) || contacts.length === 0) {
          hasMore = false;
          break;
        }

        total += contacts.length;

        // Batch upsert for speed
        const rows = contacts
          .filter((c: any) => c.email)
          .map((c: any) => ({
            email: c.email.toLowerCase(),
            first_name: c.firstName || null,
            last_name: c.lastName || null,
            phone: c.cellPhone || null,
            smoove_id: c.id || null,
            joined_at: c.createdOn || new Date().toISOString(),
            status: "active",
          }));

        const noEmail = contacts.length - rows.length;
        skipped += noEmail;

        // Upsert in chunks of 50
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50);
          const { error, count } = await supabase
            .from("community_members")
            .upsert(chunk, { onConflict: "email" });
          if (!error) imported += chunk.length;
          else { console.error("Batch error:", error); skipped += chunk.length; }
        }

        if (contacts.length < 100) hasMore = false;
        else page++;
      }

      return new Response(JSON.stringify({ imported, skipped, total, pages: page }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-courses") {
      const coursesRes = await fetch("https://rest.smoove.io/v1/courses", { headers: smooveHeaders });
      const data = await coursesRes.text();
      return new Response(JSON.stringify({ status: coursesRes.status, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-course-details") {
      const courseId = body.courseId;
      if (!courseId) throw new Error("courseId required");
      const courseRes = await fetch(`https://rest.smoove.io/v1/courses/${courseId}`, { headers: smooveHeaders });
      const data = await courseRes.text();
      return new Response(JSON.stringify({ status: courseRes.status, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
