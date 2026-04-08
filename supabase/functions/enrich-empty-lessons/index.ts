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
  if (!loginRes.ok && loginRes.status !== 200) throw new Error(`Umbraco login failed: ${loginRes.status}`);
  const setCookieHeaders: string[] = [];
  loginRes.headers.forEach((value, key) => { if (key.toLowerCase() === "set-cookie") setCookieHeaders.push(value); });
  const cookieHeader = setCookieHeaders.map((c) => c.split(";")[0]).join("; ");
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
  const res = await fetch(`${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/${endpoint}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`Umbraco ${res.status}: ${text.substring(0, 200)}`);
  const clean = text.replace(/^\)\]\}',?\n?/, "");
  return JSON.parse(clean);
}

async function getChildren(session: UmbracoSession, parentId: number): Promise<any[]> {
  const data = await umbracoGet(session, `Content/GetChildren?id=${parentId}&pageSize=500&pageNumber=1&orderBy=SortOrder&orderDirection=Ascending`);
  const items = data.items || data;
  return Array.isArray(items) ? items : [];
}

async function getContentById(session: UmbracoSession, id: number): Promise<any> {
  try { return await umbracoGet(session, `Content/GetById?id=${id}`); }
  catch (e) { console.error(`GetById ${id} failed:`, e); return null; }
}

async function searchUmbraco(session: UmbracoSession, query: string): Promise<any[]> {
  const endpoints = [
    `Entity/SearchAll?query=${encodeURIComponent(query)}`,
    `Entity/Search?query=${encodeURIComponent(query)}&type=Document`,
  ];
  
  for (const ep of endpoints) {
    try {
      const data = await umbracoGet(session, ep);
      if (Array.isArray(data)) {
        const allResults: any[] = [];
        for (const section of data) {
          if (section.results) allResults.push(...section.results);
        }
        if (allResults.length > 0) return allResults;
      }
      if (data && !Array.isArray(data) && data.items) return data.items;
    } catch (e) {
      console.log(`Search endpoint ${ep} failed, trying next...`);
    }
  }
  return [];
}

// Recursively walk a tree node to find descendants matching a title
async function findInTree(session: UmbracoSession, parentId: number, targetTitle: string, depth = 0): Promise<any | null> {
  if (depth > 5) return null;
  const children = await getChildren(session, parentId);
  const normTarget = normalizeTitle(targetTitle);
  
  for (const child of children) {
    const normChild = normalizeTitle(child.name || "");
    if (normChild === normTarget || normChild.includes(normTarget) || normTarget.includes(normChild)) {
      return child;
    }
  }
  
  // If not found at this level, recurse into children that look like series/folders
  for (const child of children) {
    if (child.hasChildren) {
      const found = await findInTree(session, child.id, targetTitle, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// Find a series node in Umbraco by searching for the series title
async function findSeriesNode(session: UmbracoSession, seriesTitle: string): Promise<any | null> {
  const results = await searchUmbraco(session, seriesTitle);
  const normTitle = normalizeTitle(seriesTitle);
  
  for (const r of results) {
    const rNorm = normalizeTitle(r.name || r.title || "");
    if (rNorm === normTitle || rNorm.includes(normTitle) || normTitle.includes(rNorm)) {
      return r;
    }
  }
  return results.length > 0 ? results[0] : null;
}

function extractContent(node: any, debug = false): { content: string | null; audio_url: string | null; video_url: string | null; attachment_url: string | null; debugProps?: any[] } {
  const result = { content: null as string | null, audio_url: null as string | null, video_url: null as string | null, attachment_url: null as string | null, debugProps: debug ? [] as any[] : undefined };
  if (!node?.tabs) return result;

  // Collect QA parts separately
  let question = "";
  let answer = "";

  for (const tab of node.tabs) {
    if (!tab.properties) continue;
    for (const prop of tab.properties) {
      const alias = (prop.alias || "").toLowerCase();
      const value = prop.value;
      
      if (debug && value) {
        result.debugProps!.push({ alias: prop.alias, type: typeof value, preview: typeof value === "string" ? value.substring(0, 100) : JSON.stringify(value).substring(0, 100) });
      }
      
      if (!value) continue;

      // Handle QA content types
      if (alias === "question" && typeof value === "string" && value.length > 5) {
        question = value;
      }
      if (alias === "answer" && typeof value === "string" && value.length > 10) {
        answer = value;
      }

      // Check for umb://media links in any string value
      if (typeof value === "string" && value.includes("umb://media/")) {
        const mediaMatch = value.match(/umb:\/\/media\/([a-f0-9-]+)/gi);
        if (mediaMatch && !result.attachment_url) {
          console.log(`Found umb://media link in prop ${prop.alias}`);
        }
      }

      if (alias.includes("content") || alias.includes("body") || alias.includes("text") || alias === "maincontent" || alias === "fullcontent" || alias === "description" || alias.includes("rte") || alias.includes("richtext") || alias.includes("editor") || alias === "promo") {
        if (typeof value === "string" && value.length > 20) {
          if (!result.content || value.length > result.content.length) result.content = value;
        }
        if (typeof value === "object") {
          const jsonStr = JSON.stringify(value);
          if (jsonStr.length > 50) {
            if (!result.content || jsonStr.length > result.content.length) result.content = jsonStr;
          }
        }
      }
      if (alias.includes("audio") || alias.includes("mp3") || alias.includes("sound")) {
        const url = extractUrl(value);
        if (url) result.audio_url = url;
      }
      if (alias.includes("video") || alias.includes("youtube") || alias.includes("vimeo") || alias.includes("embedurl") || alias.includes("embed")) {
        const url = typeof value === "string" && value.length > 5 ? value : extractUrl(value);
        if (url) result.video_url = url;
      }
      if (alias.includes("pdf") || alias.includes("file") || alias.includes("attachment") || alias.includes("document") || alias.includes("media") || alias.includes("upload") || alias.includes("download")) {
        const url = extractUrl(value);
        if (url) result.attachment_url = url;
      }
    }
  }

  // Combine QA content if found
  if (answer && answer.length > 10) {
    const qaContent = question 
      ? `<div class="qa-content"><h3>שאלה</h3>${question}<h3>תשובה</h3>${answer}</div>`
      : answer;
    if (!result.content || qaContent.length > result.content.length) {
      result.content = qaContent;
    }
  }

  return result;
}

function extractUrl(value: any): string | null {
  if (typeof value === "string") {
    if (value.startsWith("http")) return value;
    if (value.startsWith("/media/") || value.startsWith("/")) return `${UMBRACO_BASE}${value}`;
    // Handle umb://media links
    if (value.startsWith("umb://media/")) return null; // Can't resolve without media API
    try { const p = JSON.parse(value); return extractUrl(p); } catch {}
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = extractUrl(item);
      if (url) return url;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const k of ["src", "mediaUrl", "url", "source", "umbracoFile", "umbracoMedia"]) {
      if (value[k]) {
        const u = value[k];
        if (typeof u === "string") return u.startsWith("/") ? `${UMBRACO_BASE}${u}` : u.startsWith("http") ? u : null;
        const nested = extractUrl(u);
        if (nested) return nested;
      }
    }
    // Check for media items in Umbraco media picker format
    if (value.mediaKey || value.image) {
      const mediaUrl = value.mediaUrl || value.url || value.src;
      if (mediaUrl) return typeof mediaUrl === "string" && mediaUrl.startsWith("/") ? `${UMBRACO_BASE}${mediaUrl}` : mediaUrl;
    }
  }
  return null;
}

function normalizeTitle(t: string): string {
  return t.replace(/[\u0591-\u05C7]/g, "").replace(/[^א-תa-zA-Z0-9]/g, "").toLowerCase();
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 20;
    const offset = body.offset || 0;
    const dryRun = body.dryRun ?? false;
    const mode = body.mode || "series_search";
    const parentNodeId = body.parentNodeId;
    const debugMode = body.debug ?? false;
    const debugNodeId = body.debugNodeId; // Fetch specific Umbraco node and return all properties

    // Debug mode: fetch a specific Umbraco node
    if (debugNodeId) {
      const session = await umbracoLogin();
      const node = await getContentById(session, debugNodeId);
      if (!node) return json({ error: "Node not found" }, 404);
      const extracted = extractContent(node, true);
      const allProps: any[] = [];
      for (const tab of (node.tabs || [])) {
        for (const prop of (tab.properties || [])) {
          allProps.push({ tab: tab.label, alias: prop.alias, editor: prop.editor, hasValue: !!prop.value, valueType: typeof prop.value, preview: prop.value ? JSON.stringify(prop.value).substring(0, 200) : null });
        }
      }
      return json({ nodeId: debugNodeId, name: node.name, contentTypeAlias: node.contentTypeAlias, properties: allProps, extracted });
    }

    console.log(`Mode: ${mode}, batch=${batchSize}, offset=${offset}, dryRun=${dryRun}`);

    // Get empty lessons WITH series info
    const { data: emptyLessons, error: fetchErr } = await supabase
      .from("lessons")
      .select("id, title, series_id, series:series(title)")
      .eq("status", "published")
      .or("video_url.is.null,video_url.eq.")
      .or("audio_url.is.null,audio_url.eq.")
      .or("content.is.null,content.eq.")
      .or("attachment_url.is.null,attachment_url.eq.")
      .order("created_at", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (fetchErr) throw new Error(`Fetch lessons: ${fetchErr.message}`);
    if (!emptyLessons || emptyLessons.length === 0) return json({ message: "No more empty lessons", processed: 0 });

    // Filter to truly empty (all 4 fields null/empty)
    const trulyEmpty = emptyLessons.filter((l: any) => {
      return (!l.video_url || l.video_url === '') && 
             (!l.audio_url || l.audio_url === '') && 
             (!l.content || l.content === '') && 
             (!l.attachment_url || l.attachment_url === '');
    });

    console.log(`Processing ${trulyEmpty.length} truly empty lessons (from ${emptyLessons.length} fetched)`);

    const session = await umbracoLogin();
    console.log("Umbraco login OK");

    const results: any[] = [];
    let updated = 0, notFound = 0, noContent = 0;

    // Cache series node lookups
    const seriesNodeCache = new Map<string, any>();

    for (const lesson of trulyEmpty) {
      const seriesTitle = (lesson as any).series?.title || "";
      let found = false;

      if (mode === "series_search" && seriesTitle) {
        // Strategy 1: Search for series in Umbraco, then find lesson among children
        const cacheKey = seriesTitle;
        let seriesNode = seriesNodeCache.get(cacheKey);
        
        if (seriesNode === undefined) {
          seriesNode = await findSeriesNode(session, seriesTitle);
          seriesNodeCache.set(cacheKey, seriesNode || null);
          if (seriesNode) {
            console.log(`Found series "${seriesTitle}" -> Umbraco node ${seriesNode.id}`);
          }
          await new Promise(r => setTimeout(r, 100));
        }

        if (seriesNode) {
          // Search for the lesson within this series' children
          const lessonNode = await findInTree(session, seriesNode.id, lesson.title, 0);
          if (lessonNode) {
            const fullNode = await getContentById(session, lessonNode.id);
            if (fullNode) {
              const extracted = extractContent(fullNode);
              const hasAny = extracted.content || extracted.audio_url || extracted.video_url || extracted.attachment_url;
              if (hasAny) {
                if (!dryRun) {
                  const upd: any = { updated_at: new Date().toISOString() };
                  if (extracted.content) upd.content = extracted.content;
                  if (extracted.audio_url) upd.audio_url = extracted.audio_url;
                  if (extracted.video_url) upd.video_url = extracted.video_url;
                  if (extracted.attachment_url) upd.attachment_url = extracted.attachment_url;
                  await supabase.from("lessons").update(upd).eq("id", lesson.id);
                }
                updated++;
                results.push({ id: lesson.id, title: lesson.title, series: seriesTitle, status: dryRun ? "would_update" : "updated", umbracoId: lessonNode.id,
                  has: { content: !!extracted.content, audio: !!extracted.audio_url, video: !!extracted.video_url, pdf: !!extracted.attachment_url }
                });
                found = true;
              } else {
                noContent++;
                results.push({ id: lesson.id, title: lesson.title, series: seriesTitle, status: "no_content_in_node", umbracoId: lessonNode.id });
                found = true;
              }
            }
          }
        }
      }

      // Strategy 2: Direct title search (fallback)
      if (!found) {
        // Try combined search: "series title lesson title"
        const searchQueries = seriesTitle 
          ? [lesson.title, `${seriesTitle} ${lesson.title}`]
          : [lesson.title];

        for (const sq of searchQueries) {
          if (found) break;
          const searchResults = await searchUmbraco(session, sq);
          const normTitle = normalizeTitle(lesson.title);
          
          let bestMatch: any = null;
          for (const r of searchResults) {
            const rNorm = normalizeTitle(r.name || r.title || "");
            if (rNorm === normTitle || rNorm.includes(normTitle) || normTitle.includes(rNorm)) {
              bestMatch = r;
              break;
            }
          }

          if (bestMatch) {
            const fullNode = await getContentById(session, bestMatch.id);
            if (fullNode) {
              const extracted = extractContent(fullNode);
              const hasAny = extracted.content || extracted.audio_url || extracted.video_url || extracted.attachment_url;
              if (hasAny) {
                if (!dryRun) {
                  const upd: any = { updated_at: new Date().toISOString() };
                  if (extracted.content) upd.content = extracted.content;
                  if (extracted.audio_url) upd.audio_url = extracted.audio_url;
                  if (extracted.video_url) upd.video_url = extracted.video_url;
                  if (extracted.attachment_url) upd.attachment_url = extracted.attachment_url;
                  await supabase.from("lessons").update(upd).eq("id", lesson.id);
                }
                updated++;
                results.push({ id: lesson.id, title: lesson.title, series: seriesTitle, status: dryRun ? "would_update" : "updated", umbracoId: bestMatch.id, method: "search_fallback",
                  has: { content: !!extracted.content, audio: !!extracted.audio_url, video: !!extracted.video_url, pdf: !!extracted.attachment_url }
                });
                found = true;
              } else {
                noContent++;
                results.push({ id: lesson.id, title: lesson.title, series: seriesTitle, status: "no_content", umbracoId: bestMatch.id });
                found = true;
              }
            }
          }
          await new Promise(r => setTimeout(r, 150));
        }
      }

      if (!found) {
        notFound++;
        results.push({ id: lesson.id, title: lesson.title, series: seriesTitle, status: "not_found" });
      }

      await new Promise(r => setTimeout(r, 100));
    }

    return json({ processed: trulyEmpty.length, updated, notFound, noContent, nextOffset: offset + batchSize, results });
  } catch (error) {
    console.error("Error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
