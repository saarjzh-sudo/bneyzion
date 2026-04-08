import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UMBRACO_BASE = "https://www.bneyzion.co.il";

// ─── Umbraco helpers ───

interface UmbracoSession {
  cookieHeader: string;
  xsrfToken: string;
}

async function umbracoLogin(): Promise<UmbracoSession> {
  const username = Deno.env.get("UMBRACO_USERNAME")!;
  const password = Deno.env.get("UMBRACO_PASSWORD")!;

  const loginRes = await fetch(
    `${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/Authentication/PostLogin`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      redirect: "manual",
    }
  );

  const setCookieHeaders: string[] = [];
  loginRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") setCookieHeaders.push(value);
  });

  const cookieHeader = setCookieHeaders.map((c) => c.split(";")[0]).join("; ");
  let xsrfToken = "";
  for (const c of setCookieHeaders) {
    const match = c.match(/(?:^|\s)XSRF-TOKEN=([^;]+)/);
    if (match) {
      xsrfToken = decodeURIComponent(match[1]);
      break;
    }
  }
  await loginRes.text();
  if (!cookieHeader) throw new Error("Umbraco login failed");
  return { cookieHeader, xsrfToken };
}

async function umbracoGet(session: UmbracoSession, endpoint: string): Promise<any> {
  const headers: Record<string, string> = {
    Cookie: session.cookieHeader,
    Accept: "application/json",
  };
  if (session.xsrfToken) headers["X-XSRF-TOKEN"] = session.xsrfToken;

  const res = await fetch(
    `${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/${endpoint}`,
    { headers }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Umbraco API error ${res.status}: ${text.substring(0, 200)}`);
  return JSON.parse(text.replace(/^\)\]\}',?\n?/, ""));
}

async function umbracoGetMedia(session: UmbracoSession, mediaId: number): Promise<any> {
  const headers: Record<string, string> = {
    Cookie: session.cookieHeader,
    Accept: "application/json",
  };
  if (session.xsrfToken) headers["X-XSRF-TOKEN"] = session.xsrfToken;

  const res = await fetch(
    `${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/Media/GetById?id=${mediaId}`,
    { headers }
  );
  const text = await res.text();
  if (!res.ok) return null;
  try {
    const data = JSON.parse(text.replace(/^\)\]\}',?\n?/, ""));
    // Extract the file URL from media node
    for (const tab of data.tabs || []) {
      for (const prop of tab.properties || []) {
        if (prop.alias === "umbracoFile" && prop.value) {
          const val = typeof prop.value === "string" ? prop.value : prop.value?.src || prop.value?.umbracoFile || null;
          if (val) return val.startsWith("http") ? val : `${UMBRACO_BASE}${val}`;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getChildren(session: UmbracoSession, parentId: number, pageSize = 500): Promise<any[]> {
  const data = await umbracoGet(
    session,
    `Content/GetChildren?id=${parentId}&pageSize=${pageSize}&pageNumber=1&orderBy=SortOrder&orderDirection=Ascending`
  );
  const items = data.items || data;
  return Array.isArray(items) ? items : [];
}

async function getNode(session: UmbracoSession, id: number): Promise<any> {
  return umbracoGet(session, `Content/GetById?id=${id}`);
}

function extractProperty(node: any, alias: string): string | null {
  if (!node.tabs) return null;
  for (const tab of node.tabs) {
    for (const prop of tab.properties || []) {
      if (prop.alias === alias) {
        const val = prop.value;
        if (val === null || val === undefined || val === "") return null;
        return typeof val === "string" ? val : String(val);
      }
    }
  }
  return null;
}

function normalizeTitle(t: string): string {
  return t.replace(/[\u0591-\u05C7]/g, "").replace(/[^א-תa-zA-Z0-9\s]/g, "").trim().toLowerCase();
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth: verify_jwt is false in config.toml, skip auth for internal tool usage

    const body = await req.json().catch(() => ({}));
    const action = body.action || "find-and-import";

    if (action === "find-nodes") {
      return await findNodes(supabase, body);
    } else if (action === "import") {
      return await importFromNode(supabase, body);
    } else if (action === "find-and-import") {
      return await findAndImport(supabase, body);
    } else if (action === "inspect") {
      return await inspectNode(body);
    } else if (action === "list-children") {
      return await listChildren(body);
    } else if (action === "import-bulk") {
      return await importBulkMappings(supabase, body);
    } else if (action === "re-import") {
      return await reImportLessons(supabase, body);
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// ─── Find Umbraco nodes by name (search the tree) ───

async function findNodes(_supabase: any, body: any) {
  const session = await umbracoLogin();
  const searchNames: string[] = body.names || [];
  const rootId = body.rootId || 1069; // lessonsBase

  console.log(`Searching for ${searchNames.length} nodes under root ${rootId}`);

  const found: Record<string, { id: number; name: string; childCount: number; type: string }> = {};
  await searchTree(session, rootId, searchNames, found, 0, 8);

  return json({ found, searchedFor: searchNames });
}

async function searchTree(
  session: UmbracoSession,
  parentId: number,
  searchNames: string[],
  found: Record<string, any>,
  depth: number,
  maxDepth: number
) {
  if (depth >= maxDepth) return;

  const children = await getChildren(session, parentId);
  for (const child of children) {
    const normChild = normalizeTitle(child.name);
    for (const name of searchNames) {
      if (normalizeTitle(name) === normChild && !found[name]) {
        found[name] = {
          id: child.id,
          name: child.name,
          childCount: child.childCount || 0,
          type: child.contentTypeAlias,
        };
      }
    }

    // Recurse into containers/categories/series
    const containerTypes = new Set(["category", "dynamicCategory", "virtCat", "lessonsBase", "lessonSeries"]);
    if (containerTypes.has(child.contentTypeAlias) && child.hasChildren) {
      await searchTree(session, child.id, searchNames, found, depth + 1, maxDepth);
    }
  }
}

// ─── Import content from a specific Umbraco node into a target series ───

async function importFromNode(supabase: any, body: any) {
  const umbracoNodeId: number = body.umbracoNodeId;
  const targetSeriesId: string = body.targetSeriesId;
  const recursive = body.recursive !== false; // default true

  if (!umbracoNodeId || !targetSeriesId) {
    return json({ error: "umbracoNodeId and targetSeriesId required" }, 400);
  }

  const session = await umbracoLogin();
  console.log(`Importing from Umbraco node ${umbracoNodeId} into series ${targetSeriesId}`);

  const stats = { lessonsCreated: 0, lessonsSkipped: 0, seriesCreated: 0, errors: 0 };
  await importChildren(supabase, session, umbracoNodeId, targetSeriesId, stats, recursive, 0, 6);

  // Update lesson count
  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("series_id", targetSeriesId);
  await supabase.from("series").update({ lesson_count: count || 0 }).eq("id", targetSeriesId);

  return json({ success: true, ...stats });
}

async function importChildren(
  supabase: any,
  session: UmbracoSession,
  umbracoParentId: number,
  dbSeriesId: string,
  stats: any,
  recursive: boolean,
  depth: number,
  maxDepth: number
) {
  if (depth >= maxDepth) return;

  const children = await getChildren(session, umbracoParentId);
  console.log(`  Node ${umbracoParentId}: ${children.length} children at depth ${depth}`);

  for (const child of children) {
    const type = child.contentTypeAlias;

    if (type === "lesson" || type === "QAs" || type === "shortSliderItem") {
      // It's a lesson/item - import it
      await importLesson(supabase, session, child, dbSeriesId, stats);
    } else if ((type === "lessonSeries" || type === "shortSliderCat") && recursive) {
      // It's a sub-series - find or create matching DB series, then recurse
      const subSeriesId = await findOrCreateSubSeries(supabase, child.name, dbSeriesId);
      if (subSeriesId) {
        stats.seriesCreated++;
        await importChildren(supabase, session, child.id, subSeriesId, stats, recursive, depth + 1, maxDepth);
        // Update lesson count for sub-series
        const { count } = await supabase
          .from("lessons")
          .select("id", { count: "exact", head: true })
          .eq("series_id", subSeriesId);
        await supabase.from("series").update({ lesson_count: count || 0 }).eq("id", subSeriesId);
      }
    } else if ((type === "category" || type === "dynamicCategory" || type === "virtCat" || type === "shortSlider") && recursive) {
      // Container - recurse into it with same target series
      await importChildren(supabase, session, child.id, dbSeriesId, stats, recursive, depth + 1, maxDepth);
    }
  }
}

async function importLesson(supabase: any, session: UmbracoSession, child: any, seriesId: string, stats: any) {
  const title = child.name;

  // Check for duplicate
  const { data: existing } = await supabase
    .from("lessons")
    .select("id")
    .eq("title", title)
    .eq("series_id", seriesId)
    .maybeSingle();

  if (existing) {
    stats.lessonsSkipped++;
    return;
  }

  try {
    // Fetch full node details
    const full = await getNode(session, child.id);
    const content = extractProperty(full, "content");
    const promo = extractProperty(full, "promo");
    const author = extractProperty(full, "author");
    const creator = extractProperty(full, "creator");
    const youtubeId = extractProperty(full, "youTubeID");
    const videoPath = extractProperty(full, "videoServerPath");
    const audioPath = extractProperty(full, "audioServerPath");
    const pdf = extractProperty(full, "overContentPDF");
    const pdfMediaId = extractProperty(full, "PDFs");
    const duration = extractProperty(full, "duration");

    // Resolve rabbi from author or creator
    let rabbiId = null;
    const authorName = author || creator;
    if (authorName) {
      const firstAuthor = authorName.split(",")[0].trim();
      const { data: rabbi } = await supabase.from("rabbis").select("id").eq("name", firstAuthor).maybeSingle();
      rabbiId = rabbi?.id || null;
    }

    // Determine media type
    let mediaType = "text";
    if (youtubeId || videoPath) mediaType = "video";
    else if (audioPath) mediaType = "audio";

    const videoUrl = videoPath
      ? (videoPath.startsWith("http") ? videoPath : `${UMBRACO_BASE}${videoPath}`)
      : (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null);
    const audioUrl = audioPath
      ? (audioPath.startsWith("http") ? audioPath : `${UMBRACO_BASE}${audioPath}`)
      : null;
    
    // Resolve PDF: try overContentPDF first, then PDFs media reference
    let pdfUrl = pdf
      ? (pdf.startsWith("http") ? pdf : `${UMBRACO_BASE}${pdf}`)
      : null;
    if (!pdfUrl && pdfMediaId) {
      // PDFs property can be comma-separated media IDs
      const firstMediaId = pdfMediaId.split(",")[0].trim();
      const mediaIdNum = parseInt(firstMediaId);
      if (!isNaN(mediaIdNum)) {
        const mediaUrl = await umbracoGetMedia(session, mediaIdNum);
        if (mediaUrl) pdfUrl = mediaUrl;
      }
    }

    const hasContent = content || audioUrl || videoUrl || pdfUrl;

    let durationSec: number | null = null;
    if (duration) {
      const match = duration.match(/(\d+)/);
      if (match) durationSec = parseInt(match[1]) * 60;
    }

    const cleanDescription = content
      ? content.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim().substring(0, 500)
      : promo || null;

    const { error } = await supabase.from("lessons").insert({
      title,
      description: cleanDescription,
      content: content || null,
      rabbi_id: rabbiId,
      series_id: seriesId,
      source_type: mediaType,
      status: hasContent ? "published" : "draft",
      published_at: hasContent ? new Date().toISOString() : null,
      video_url: videoUrl,
      audio_url: audioUrl,
      attachment_url: pdfUrl,
      duration: durationSec,
    });

    if (error) {
      console.error(`Error inserting lesson "${title}":`, error.message);
      stats.errors++;
    } else {
      stats.lessonsCreated++;
    }
  } catch (e: any) {
    console.error(`Error importing lesson "${title}":`, e.message);
    stats.errors++;
  }
}

async function findOrCreateSubSeries(supabase: any, name: string, parentSeriesId: string): Promise<string | null> {
  // Check if exists
  const { data: existing } = await supabase
    .from("series")
    .select("id")
    .eq("title", name)
    .eq("parent_id", parentSeriesId)
    .maybeSingle();

  if (existing) return existing.id;

  // Create
  const { data: newSeries, error } = await supabase
    .from("series")
    .insert({ title: name, parent_id: parentSeriesId, status: "active" })
    .select("id")
    .single();

  if (error) {
    console.error(`Error creating sub-series "${name}":`, error.message);
    return null;
  }

  return newSeries.id;
}

// ─── Find and import: automated flow ───

async function findAndImport(supabase: any, body: any) {
  const mappings: Array<{ seriesName: string; targetSeriesId: string; rootId?: number }> = body.mappings || [];

  if (!mappings.length) {
    return json({ error: "mappings array required" }, 400);
  }

  const session = await umbracoLogin();
  console.log(`Finding and importing ${mappings.length} series...`);

  const results: any[] = [];

  for (const mapping of mappings) {
    const rootId = mapping.rootId || 1069;
    console.log(`Searching for "${mapping.seriesName}" under root ${rootId}...`);

    // Search for the node
    const found: Record<string, any> = {};
    await searchTree(session, rootId, [mapping.seriesName], found, 0, 8);

    const node = found[mapping.seriesName];
    if (!node) {
      console.log(`  Not found: "${mapping.seriesName}"`);
      results.push({ seriesName: mapping.seriesName, status: "not_found" });
      continue;
    }

    console.log(`  Found: "${mapping.seriesName}" -> Umbraco ID ${node.id} (${node.childCount} children)`);

    // Import children
    const stats = { lessonsCreated: 0, lessonsSkipped: 0, seriesCreated: 0, errors: 0 };
    await importChildren(supabase, session, node.id, mapping.targetSeriesId, stats, true, 0, 6);

    // Update lesson count
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("series_id", mapping.targetSeriesId);
    await supabase.from("series").update({ lesson_count: count || 0 }).eq("id", mapping.targetSeriesId);

    results.push({ seriesName: mapping.seriesName, umbracoId: node.id, ...stats, status: "imported" });
  }

  return json({ success: true, results });
}

async function inspectNode(body: any) {
  const session = await umbracoLogin();
  const nodeId = body.nodeId;
  if (!nodeId) return json({ error: "nodeId required" }, 400);
  const node = await getNode(session, nodeId);
  
  const props: Record<string, any> = {};
  for (const tab of node.tabs || []) {
    for (const prop of tab.properties || []) {
      if (prop.value !== null && prop.value !== undefined && prop.value !== "") {
        props[prop.alias] = typeof prop.value === "string" && prop.value.length > 500 
          ? prop.value.substring(0, 500) + "..." 
          : prop.value;
      }
    }
  }
  
  return json({
    id: node.id,
    name: node.name,
    type: node.contentTypeAlias,
    hasChildren: node.hasChildren,
    properties: props,
  });
}

async function listChildren(body: any) {
  const session = await umbracoLogin();
  const parentId = body.parentId;
  if (!parentId) return json({ error: "parentId required" }, 400);
  
  const children = await getChildren(session, parentId);
  return json({
    parentId,
    count: children.length,
    children: children.map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.contentTypeAlias,
      hasChildren: c.hasChildren,
    })),
  });
}

async function importBulkMappings(supabase: any, body: any) {
  const mappings: Array<{ umbracoNodeId: number; targetSeriesId: string }> = body.mappings || [];
  if (!mappings.length) return json({ error: "mappings array required" }, 400);

  const session = await umbracoLogin();
  console.log(`Bulk importing ${mappings.length} direct mappings...`);

  const results: any[] = [];
  for (const m of mappings) {
    console.log(`  Importing Umbraco ${m.umbracoNodeId} → series ${m.targetSeriesId}`);
    const stats = { lessonsCreated: 0, lessonsSkipped: 0, seriesCreated: 0, errors: 0 };
    await importChildren(supabase, session, m.umbracoNodeId, m.targetSeriesId, stats, false, 0, 2);

    // Update lesson count
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("series_id", m.targetSeriesId);
    await supabase.from("series").update({ lesson_count: count || 0 }).eq("id", m.targetSeriesId);

    results.push({ umbracoNodeId: m.umbracoNodeId, targetSeriesId: m.targetSeriesId, ...stats });
  }

  return json({ success: true, results });
}

// ─── Re-import: delete existing lessons and re-import from Umbraco ───

async function reImportLessons(supabase: any, body: any) {
  const mappings: Array<{ umbracoNodeId: number; seriesId: string }> = body.mappings || [];
  if (!mappings.length) return json({ error: "mappings array required: [{umbracoNodeId, seriesId}]" }, 400);

  const session = await umbracoLogin();
  const results: any[] = [];

  for (const m of mappings) {
    // Delete existing lessons in this series
    const { data: deleted } = await supabase
      .from("lessons")
      .delete()
      .eq("series_id", m.seriesId)
      .select("id");
    console.log(`Deleted ${deleted?.length || 0} existing lessons from series ${m.seriesId}`);

    // Re-import
    const stats = { lessonsCreated: 0, lessonsSkipped: 0, seriesCreated: 0, errors: 0 };
    await importChildren(supabase, session, m.umbracoNodeId, m.seriesId, stats, false, 0, 2);

    // Update lesson count
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("series_id", m.seriesId);
    await supabase.from("series").update({ lesson_count: count || 0 }).eq("id", m.seriesId);

    results.push({ ...m, deleted: deleted?.length || 0, ...stats });
  }

  return json({ success: true, results });
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
