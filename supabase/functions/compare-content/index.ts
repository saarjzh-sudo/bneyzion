import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UMBRACO_BASE = "https://www.bneyzion.co.il";

interface UmbracoSession { cookieHeader: string; xsrfToken: string; }

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delayMs = 2000): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      const isRetryable = err instanceof TypeError && (err.message.includes("dns") || err.message.includes("name resolution") || err.message.includes("Connect"));
      if (!isRetryable || attempt === retries) throw err;
      console.warn(`Fetch attempt ${attempt}/${retries} failed, retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error("Unreachable");
}

async function umbracoLogin(): Promise<UmbracoSession> {
  const loginRes = await fetchWithRetry(`${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/Authentication/PostLogin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: Deno.env.get("UMBRACO_USERNAME")!, password: Deno.env.get("UMBRACO_PASSWORD")! }),
    redirect: "manual",
  }, 3, 2000);
  const setCookieHeaders: string[] = [];
  loginRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") setCookieHeaders.push(value);
  });
  const cookieHeader = setCookieHeaders.map(c => c.split(";")[0]).join("; ");
  let xsrfToken = "";
  for (const c of setCookieHeaders) {
    const match = c.match(/(?:^|\s)XSRF-TOKEN=([^;]+)/);
    if (match) { xsrfToken = decodeURIComponent(match[1]); break; }
  }
  await loginRes.text();
  return { cookieHeader, xsrfToken };
}

async function umbracoGet(session: UmbracoSession, endpoint: string): Promise<any> {
  const headers: Record<string, string> = { Cookie: session.cookieHeader, Accept: "application/json" };
  if (session.xsrfToken) headers["X-XSRF-TOKEN"] = session.xsrfToken;
  const res = await fetchWithRetry(`${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/${endpoint}`, { headers }, 3, 1500);
  const text = await res.text();
  if (!res.ok) throw new Error(`Umbraco API error ${res.status}: ${text.substring(0, 200)}`);
  return JSON.parse(text.replace(/^\)\]\}',?\n?/, ""));
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ").replace(/[״""]/g, '"').replace(/[׳'']/g, "'").replace(/–/g, "-").replace(/[\u200F\u200E]/g, "");
}

async function getChildren(session: UmbracoSession, nodeId: number): Promise<any[]> {
  const data = await umbracoGet(session, `Content/GetChildren?id=${nodeId}&pageSize=500&pageNumber=1&orderBy=SortOrder&orderDirection=Ascending`);
  const items = data.items || data || [];
  return Array.isArray(items) ? items : [];
}

async function collectTitlesRecursive(session: UmbracoSession, nodeId: number, depth = 0, maxDepth = 4): Promise<string[]> {
  if (depth > maxDepth) return [];
  const children = await getChildren(session, nodeId);
  const titles: string[] = [];
  for (const child of children) {
    titles.push(child.name);
    if (child.hasChildren && depth < maxDepth) {
      titles.push(...await collectTitlesRecursive(session, child.id, depth + 1, maxDepth));
    }
  }
  return titles;
}

async function batchIn(supabase: any, table: string, column: string, ids: string[], select: string, extra?: (q: any) => any): Promise<any[]> {
  const results: any[] = [];
  for (let i = 0; i < ids.length; i += 500) {
    let q = supabase.from(table).select(select).in(column, ids.slice(i, i + 500));
    if (extra) q = extra(q);
    const { data } = await q;
    if (data) results.push(...data);
  }
  return results;
}

// Find best matching series in our DB by name
async function findSeriesMatch(supabase: any, name: string, preferParentId?: string | null) {
  // First try exact title match
  const { data: exactMatches } = await supabase
    .from("series")
    .select("id, title, parent_id, lesson_count")
    .eq("title", name)
    .limit(10);

  // Fallback to partial match
  let matches = exactMatches && exactMatches.length > 0 ? exactMatches : null;
  if (!matches) {
    const { data: partialMatches } = await supabase
      .from("series")
      .select("id, title, parent_id, lesson_count")
      .ilike("title", `%${name}%`)
      .limit(10);
    matches = partialMatches;
  }

  if (!matches || matches.length === 0) return { ourSeriesId: null, ourSeriesTitle: null, ourMatchCandidates: [] };

  // Priority: 1) exact match with preferred parent, 2) any match with preferred parent, 3) exact title match (shortest), 4) first result
  const best =
    (preferParentId && matches.find((s: any) => s.parent_id === preferParentId && s.title === name)) ||
    (preferParentId && matches.find((s: any) => s.parent_id === preferParentId)) ||
    matches.find((s: any) => s.title === name) ||
    matches.sort((a: any, b: any) => a.title.length - b.title.length)[0];

  return {
    ourSeriesId: best.id,
    ourSeriesTitle: best.title,
    ourMatchCandidates: matches.map((s: any) => ({ id: s.id, title: s.title, parentId: s.parent_id })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await anonClient.auth.getUser();
    if (!userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { action } = body;

    const session = await umbracoLogin();

    // ====== discover-tree: discover Umbraco sidebar for a specific section ======
    if (action === "discover-tree") {
      const { section } = body; // "series" | "teachers"

      const homepage = await getChildren(session, 6294);

      // Find the right container based on section
      let container: any = null;
      if (section === "teachers") {
        container = homepage.find((n: any) => {
          const norm = normalize(n.name);
          return norm.includes("אגף המורים") || norm.includes("אגף מורים") || norm.includes("מורים");
        });
      }
      if (!container) {
        // Default: lesson repository (מאגר שיעורים)
        container = homepage.find((n: any) => {
          const norm = normalize(n.name);
          return norm.includes("מאגר שיעורים") || norm.includes("מאגר");
        });
      }

      if (!container) {
        // Fallback: return all homepage children so user can see what's available
        return json({
          error: `לא נמצא קונטיינר עבור ${section}`,
          homepageItems: homepage.map((n: any) => ({ id: n.id, name: n.name })),
        }, 404);
      }

      // Get top-level categories
      const umbCategories = await getChildren(session, container.id);

      const tree: any[] = [];
      for (const cat of umbCategories) {
        const catMatch = await findSeriesMatch(supabase, cat.name);
        const catNode: any = {
          umbracoId: cat.id,
          umbracoName: cat.name,
          hasChildren: cat.hasChildren,
          ...catMatch,
          books: [],
        };

        if (cat.hasChildren) {
          const books = await getChildren(session, cat.id);
          for (const book of books) {
            const bookMatch = await findSeriesMatch(supabase, book.name, catNode.ourSeriesId);
            catNode.books.push({
              umbracoId: book.id,
              umbracoName: book.name,
              hasChildren: book.hasChildren,
              childCount: book.childCount || 0,
              ...bookMatch,
            });
          }
        }

        tree.push(catNode);
      }

      return json({
        section,
        containerId: container.id,
        containerName: container.name,
        tree,
      });
    }

    // ====== compare-node ======
    if (action === "compare-node") {
      const { seriesId, umbracoNodeId, depth } = body;
      if (!seriesId || !umbracoNodeId) return json({ error: "seriesId and umbracoNodeId required" }, 400);

      // Get the title of the requested series
      const { data: mainSeries } = await supabase.from("series").select("id, title").eq("id", seriesId).single();
      const seriesTitle = mainSeries?.title || "";

      // Find ALL series with the same title (handles duplicates)
      const { data: allMatchingSeries } = await supabase
        .from("series").select("id").eq("title", seriesTitle);
      const rootIds = allMatchingSeries?.map((s: any) => s.id) || [seriesId];

      // Collect descendants from ALL matching root series
      const allIds = new Set<string>(rootIds);
      for (const rootId of rootIds) {
        const { data: descendants } = await supabase.rpc("get_series_descendant_ids", { root_id: rootId });
        if (descendants) descendants.forEach((d: any) => allIds.add(d.series_id));
      }
      const allIdsArr = [...allIds];

      const ourSeries = await batchIn(supabase, "series", "id", allIdsArr, "id, title, lesson_count");
      const ourLessons = await batchIn(supabase, "lessons", "series_id", allIdsArr, "id, title", (q: any) => q.eq("status", "published"));
      const ourAllTitles = [...new Set([...ourSeries.map((s: any) => s.title), ...ourLessons.map((l: any) => l.title)])];

      const umbracoTitles = await collectTitlesRecursive(session, umbracoNodeId, 0, depth || 3);
      const uniqueUmbraco = [...new Set(umbracoTitles)];

      // Virtual/aggregate pages to skip (common Umbraco patterns)
      const virtualPatterns = [/^כל השיעורים/, /^דף פרשת שבוע נוכחי$/, /נוכחי$/];

      const ourNorm = new Set(ourAllTitles.map(normalize));
      const matched: string[] = [], missing: string[] = [], skipped: string[] = [];

      for (const t of uniqueUmbraco) {
        const isVirtual = virtualPatterns.some(p => p.test(t.trim()));
        if (isVirtual) { skipped.push(t); continue; }
        if (ourNorm.has(normalize(t))) matched.push(t); else missing.push(t);
      }

      // For remaining missing, try fuzzy match (abbreviations like פ"ש → פרשת השבוع)
      const stillMissing: string[] = [];
      for (const t of missing) {
        const normT = normalize(t);
        const found = ourAllTitles.some(ourT => {
          const normOur = normalize(ourT);
          return normOur.includes(normT) || normT.includes(normOur);
        });
        if (found) matched.push(t); else stillMissing.push(t);
      }

      const umbNorm = new Set(uniqueUmbraco.map(normalize));
      const extra: string[] = [];
      for (const t of ourAllTitles) {
        if (!umbNorm.has(normalize(t))) extra.push(t);
      }

      return json({
        ourSeriesCount: ourSeries.length, ourLessonCount: ourLessons.length,
        ourTotalTitles: ourAllTitles.length, umbracoTotalTitles: uniqueUmbraco.length,
        matchedCount: matched.length, missingCount: stillMissing.length, extraCount: extra.length,
        skippedCount: skipped.length,
        matched, missing: stillMissing, extra, skipped,
        debug: { rootSeriesIds: rootIds, totalDescendantIds: allIdsArr.length },
      });
    }

    return json({ error: "Invalid action. Use: discover-tree, compare-node" }, 400);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
