import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UMBRACO_BASE = "https://www.bneyzion.co.il";

interface UmbracoSession {
  cookieHeader: string;
  xsrfToken: string;
}

async function umbracoLogin(): Promise<UmbracoSession> {
  const username = Deno.env.get("UMBRACO_USERNAME")!;
  const password = Deno.env.get("UMBRACO_PASSWORD")!;
  const loginRes = await fetch(
    `${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/Authentication/PostLogin`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }), redirect: "manual" }
  );
  const setCookieHeaders: string[] = [];
  loginRes.headers.forEach((v, k) => { if (k.toLowerCase() === "set-cookie") setCookieHeaders.push(v); });
  const cookieHeader = setCookieHeaders.map(c => c.split(";")[0]).join("; ");
  let xsrfToken = "";
  for (const c of setCookieHeaders) { const m = c.match(/XSRF-TOKEN=([^;]+)/); if (m) { xsrfToken = decodeURIComponent(m[1]); break; } }
  await loginRes.text();
  if (!cookieHeader) throw new Error("Umbraco login failed");
  return { cookieHeader, xsrfToken };
}

async function umbracoGet(session: UmbracoSession, endpoint: string): Promise<any> {
  const headers: Record<string, string> = { Cookie: session.cookieHeader, Accept: "application/json" };
  if (session.xsrfToken) headers["X-XSRF-TOKEN"] = session.xsrfToken;
  const res = await fetch(`${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/${endpoint}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`Umbraco ${res.status}: ${text.substring(0, 200)}`);
  return JSON.parse(text.replace(/^\)\]\}',?\n?/, ""));
}

async function getChildren(session: UmbracoSession, parentId: number): Promise<any[]> {
  const data = await umbracoGet(session, `Content/GetChildren?id=${parentId}&pageSize=500&pageNumber=1&orderBy=SortOrder&orderDirection=Ascending`);
  return Array.isArray(data.items || data) ? (data.items || data) : [];
}

async function getNode(session: UmbracoSession, id: number): Promise<any> {
  return umbracoGet(session, `Content/GetById?id=${id}`);
}

// Extract riddle content from a gridPage node
function extractRiddlesFromGrid(node: any): { inline: string | null; linkedDocUdi: string | null } {
  let inline: string | null = null;
  let linkedDocUdi: string | null = null;

  const content = node.properties?.find?.((p: any) => p.alias === "content")?.value;
  const gridContent = typeof content === "string" ? null : content;

  // Also check tabs
  let gridValue: any = gridContent;
  if (!gridValue && node.tabs) {
    for (const tab of node.tabs) {
      for (const prop of tab.properties || []) {
        if (prop.alias === "content" && prop.value && typeof prop.value !== "string") {
          gridValue = prop.value;
          break;
        }
      }
      if (gridValue) break;
    }
  }

  if (!gridValue?.sections) return { inline, linkedDocUdi };

  // Walk all RTE controls looking for riddle content
  for (const section of gridValue.sections) {
    for (const row of section.rows || []) {
      for (const area of row.areas || []) {
        for (const control of area.controls || []) {
          if (control.editor?.alias !== "rte" || !control.value) continue;
          const val = control.value as string;

          // Check for link to dedicated riddle page
          const linkMatch = val.match(/umb:\/\/document\/([a-f0-9-]+).*?title="(חידות לילדים[^"]*)"/);
          if (linkMatch) {
            linkedDocUdi = linkMatch[1];
          }

          // Check for inline riddle questions (numbered list pattern)
          if (val.includes("חידות") || val.includes("חידון") || 
              (val.match(/\d\.\s/) && val.includes("?"))) {
            // Extract if it has numbered questions
            const questionCount = (val.match(/\d+\.\s/g) || []).length;
            if (questionCount >= 3) {
              inline = val;
            }
          }
        }
      }
    }
  }

  return { inline, linkedDocUdi };
}

// Extract content from a lesson-type node (the dedicated riddle page)
function extractLessonContent(node: any): string | null {
  if (!node?.tabs) return null;
  for (const tab of node.tabs) {
    for (const prop of tab.properties || []) {
      if ((prop.alias === "content" || prop.alias === "bodyText" || prop.alias === "rte" || prop.alias === "mainContent") 
          && prop.value && typeof prop.value === "string" && prop.value.length > 50) {
        return prop.value;
      }
    }
  }
  // Fallback: any RTE with substantial content
  for (const tab of node.tabs) {
    for (const prop of tab.properties || []) {
      if ((prop.editor === "Umbraco.TinyMCEv3" || prop.editor === "Umbraco.TinyMCE") 
          && prop.value && typeof prop.value === "string" && prop.value.length > 50) {
        return prop.value;
      }
    }
  }
  return null;
}

// Find node by UDI (guid) - search in tree
async function findNodeByUdi(session: UmbracoSession, udi: string): Promise<any | null> {
  // Try the Entity API to resolve UDI
  try {
    const data = await umbracoGet(session, `Entity/GetByIds?type=Document&ids=${udi}`);
    if (Array.isArray(data) && data.length > 0) {
      return await getNode(session, data[0].id);
    }
  } catch (_) { /* fallback below */ }

  // Try search
  try {
    const searchData = await umbracoGet(session, `Entity/SearchAll?query=חידות+לילדים`);
    if (Array.isArray(searchData)) {
      for (const section of searchData) {
        for (const result of section.results || []) {
          if (result.key === udi || result.udi?.includes(udi)) {
            return await getNode(session, result.id);
          }
        }
      }
    }
  } catch (_) { /* ignore */ }

  return null;
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "import";

    if (action === "scan") {
      // Scan parasha pages and report what riddle content exists
      const session = await umbracoLogin();
      const homeId = 6294;
      const children = await getChildren(session, homeId);
      const parashaPages = children.filter((c: any) => c.name.startsWith("פרשת ") && c.contentTypeAlias === "gridPage");
      
      const results: any[] = [];
      for (const page of parashaPages) {
        const node = await getNode(session, page.id);
        const { inline, linkedDocUdi } = extractRiddlesFromGrid(node);
        results.push({
          name: page.name,
          nodeId: page.id,
          hasInlineRiddles: !!inline,
          hasLinkedRiddlePage: !!linkedDocUdi,
          linkedDocUdi,
          inlineLength: inline?.length || 0,
        });
        await new Promise(r => setTimeout(r, 200));
      }

      return json({ success: true, count: results.length, results });
    }

    if (action === "import") {
      const session = await umbracoLogin();
      const limit = body.limit || 999;

      // Get or create the riddles series
      let { data: series } = await supabase
        .from("series")
        .select("id")
        .eq("title", "חידות לילדים - פרשת השבוע")
        .maybeSingle();

      if (!series) {
        const { data: newSeries, error } = await supabase
          .from("series")
          .insert({
            title: "חידות לילדים - פרשת השבוע",
            description: "חידות לילדים על פרשת השבוע לפי סדר העולים לתורה",
            status: "active",
          })
          .select("id")
          .single();
        if (error) throw error;
        series = newSeries;
      }

      // Get all parasha gridPages under home (6294)
      const homeId = 6294;
      const children = await getChildren(session, homeId);
      const parashaPages = children
        .filter((c: any) => c.name.startsWith("פרשת ") && c.contentTypeAlias === "gridPage")
        .slice(0, limit);

      console.log(`Found ${parashaPages.length} parasha pages`);

      const results: any[] = [];
      let imported = 0;

      for (const page of parashaPages) {
        const parashaName = page.name; // e.g., "פרשת בראשית"
        const lessonTitle = `חידות לילדים - ${parashaName}`;

        try {
          // Check if already exists
          const { data: existing } = await supabase
            .from("lessons")
            .select("id")
            .eq("title", lessonTitle)
            .eq("series_id", series!.id)
            .maybeSingle();

          if (existing) {
            results.push({ parasha: parashaName, status: "exists" });
            continue;
          }

          // Fetch the full page
          const node = await getNode(session, page.id);
          const { inline, linkedDocUdi } = extractRiddlesFromGrid(node);

          let riddleContent: string | null = null;

          // Try to get the linked dedicated riddle page first
          if (linkedDocUdi) {
            console.log(`${parashaName}: Found linked riddle page UDI ${linkedDocUdi}`);
            const riddlePage = await findNodeByUdi(session, linkedDocUdi);
            if (riddlePage) {
              riddleContent = extractLessonContent(riddlePage);
              if (riddleContent) {
                console.log(`${parashaName}: Got content from dedicated page (${riddleContent.length} chars)`);
              }
            }
          }

          // Fall back to inline content
          if (!riddleContent && inline) {
            riddleContent = inline;
            console.log(`${parashaName}: Using inline content (${inline.length} chars)`);
          }

          if (!riddleContent) {
            results.push({ parasha: parashaName, status: "no_content", nodeId: page.id });
            continue;
          }

          // Insert lesson
          const { error: insertError } = await supabase
            .from("lessons")
            .insert({
              title: lessonTitle,
              description: `חידות לילדים על ${parashaName} לפי סדר העולים לתורה`,
              content: riddleContent,
              source_type: "text",
              series_id: series!.id,
              status: "published",
            });

          if (insertError) {
            results.push({ parasha: parashaName, status: "error", error: insertError.message });
          } else {
            imported++;
            results.push({ parasha: parashaName, status: "imported", contentLength: riddleContent.length });
          }

          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          results.push({ parasha: parashaName, status: "error", error: String(err) });
        }
      }

      // Update lesson count
      const { count } = await supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .eq("series_id", series!.id);

      await supabase
        .from("series")
        .update({ lesson_count: count || 0 })
        .eq("id", series!.id);

      return json({ success: true, imported, total: parashaPages.length, seriesId: series!.id, results });
    }

    return json({ error: "Invalid action. Use: scan, import" }, 400);
  } catch (error) {
    console.error("Error:", error);
    return json({ success: false, error: String(error) }, 500);
  }
});
