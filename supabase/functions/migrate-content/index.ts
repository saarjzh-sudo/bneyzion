import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UMBRACO_BASE = "https://www.bneyzion.co.il";

const NODES = {
  HOME: 6294,
  LESSONS_BASE: 1069,
  QA_SYSTEM: 1198,
};

const CONTENT_TYPES = {
  LESSON: "lesson",
  SERIES: "lessonSeries",
  CATEGORY: "category",
  RABBI: "Rabbi",
  QAS: "QAs",
};

// Content types that are containers — always recurse into them
const CONTAINER_TYPES = new Set([
  "category", "dynamicCategory", "virtCat", "QASystem",
  "lessonsBase", "home", "search", "adminPages",
]);

// ─── Umbraco API helpers ────────────────────────────────────

interface UmbracoSession {
  cookieHeader: string;
  xsrfToken: string;
}

async function umbracoLogin(): Promise<UmbracoSession> {
  const username = Deno.env.get("UMBRACO_USERNAME");
  const password = Deno.env.get("UMBRACO_PASSWORD");
  if (!username || !password) throw new Error("Umbraco credentials not configured");

  const loginRes = await fetch(`${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/Authentication/PostLogin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    redirect: "manual",
  });

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
  if (!cookieHeader) throw new Error("Umbraco login failed - no cookies");
  return { cookieHeader, xsrfToken };
}

async function umbracoGet(session: UmbracoSession, endpoint: string): Promise<any> {
  const headers: Record<string, string> = {
    Cookie: session.cookieHeader,
    Accept: "application/json",
  };
  if (session.xsrfToken) headers["X-XSRF-TOKEN"] = session.xsrfToken;

  const res = await fetch(`${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/${endpoint}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`Umbraco API ${res.status}: ${text.substring(0, 200)}`);
  return JSON.parse(text.replace(/^\)\]\}',?\n?/, ""));
}

async function getChildren(session: UmbracoSession, parentId: number, pageSize = 500, pageNumber = 1): Promise<{ items: any[]; totalItems: number }> {
  const data = await umbracoGet(session,
    `Content/GetChildren?id=${parentId}&pageSize=${pageSize}&pageNumber=${pageNumber}&orderBy=SortOrder&orderDirection=Ascending`
  );
  return {
    items: data.items || (Array.isArray(data) ? data : []),
    totalItems: data.totalItems || 0,
  };
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

function extractUrl(node: any): string | null {
  const raw = extractProperty(node, "_umb_urls");
  if (!raw) return null;
  return `${UMBRACO_BASE}${encodeURI(raw)}`;
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Main handler ───────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData?.user?.id) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return jsonResponse({ error: "Forbidden" }, 403);

    const { action, options } = await req.json();

    switch (action) {
      case "scan":
        return await handleScan(supabase);
      case "deep-scan":
        return await handleDeepScan(supabase, options);
      case "process":
        return await handleProcess(supabase);
      case "enrich":
        return await handleEnrich(supabase, options);
      case "fix-drafts":
        return await handleFixDrafts(supabase, options);
      case "seed-critical-redirects":
        return await handleSeedCriticalRedirects(supabase);
      case "generate-redirects":
        return await handleGenerateRedirects(supabase);
      case "link-series":
        return await handleLinkSeries(supabase, options);
      case "rescan-item":
        return await handleRescanItem(supabase, options);
      default:
        return jsonResponse({ error: `Invalid action: ${action}` }, 400);
    }
  } catch (error) {
    console.error("Migration error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// ─── Logging helper ─────────────────────────────────────────

async function logMessage(supabase: any, batchId: string | null, itemId: string | null, level: string, message: string) {
  await supabase.from("migration_logs").insert({ batch_id: batchId, item_id: itemId, level, message });
}

// ─── SCAN: Queue-based BFS scan with time budget ────────────

interface QueueItem {
  parentId: number;
  path: string[];
  parentSeriesSourceId?: string;
}

const TIME_BUDGET_MS = 80_000;
const MAX_ITEMS_PER_CALL = 200;

async function handleScan(supabase: any) {
  const startTime = Date.now();
  const session = await umbracoLogin();

  // Get existing source_ids to avoid duplicates
  const existingItems = await fetchAllRows(supabase, "migration_items", "source_id");
  const existingIds = new Set(existingItems.map((e: any) => e.source_id).filter(Boolean));

  // Check for an existing running scan batch with saved queue
  let batch: any;
  let queue: QueueItem[] = [];

  const { data: runningBatch } = await supabase
    .from("migration_batches")
    .select("*")
    .eq("source_type", "api-scan")
    .eq("status", "running")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runningBatch) {
    batch = runningBatch;
    // Resume queue from description
    try {
      const state = JSON.parse(runningBatch.description || "{}");
      if (state.queue?.length) {
        queue = state.queue;
        await logMessage(supabase, batch.id, null, "info", `ממשיך סריקה — ${queue.length} ענפים בתור`);
      }
    } catch { /* start fresh */ }
  }

  if (!batch || queue.length === 0) {
    // Start a new scan
    const { data: newBatch } = await supabase
      .from("migration_batches")
      .insert({
        name: `סריקת API - ${new Date().toLocaleDateString("he-IL")}`,
        description: JSON.stringify({ queue: [] }),
        source_type: "api-scan",
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select().single();
    batch = newBatch;

    // Seed queue with root nodes
    queue = [
      { parentId: NODES.LESSONS_BASE, path: [] },
      { parentId: NODES.QA_SYSTEM, path: ["שו״ת"] },
    ];

    await logMessage(supabase, batch.id, null, "info", "מתחיל סריקה חדשה דרך Umbraco API");
  }

  const stats = { lessons: 0, series: 0, rabbis: 0, qa: 0, categories: 0, total: 0 };
  const batchItems: any[] = [];
  let nodesProcessed = 0;

  // BFS: process queue items until time runs out
  while (queue.length > 0 && (Date.now() - startTime) < TIME_BUDGET_MS && stats.total < MAX_ITEMS_PER_CALL) {
    const current = queue.shift()!;
    nodesProcessed++;

    try {
      // Fetch all children of current node (paginate if needed)
      let allChildren: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { items, totalItems } = await getChildren(session, current.parentId, 500, page);
        allChildren = allChildren.concat(items);
        hasMore = allChildren.length < totalItems;
        page++;
      }

      if (nodesProcessed <= 20 || allChildren.length > 10) {
        await logMessage(supabase, batch.id, null, "info",
          `סורק "${current.path.join(" > ") || "שורש"}" — ${allChildren.length} פריטים`);
      }

      for (const item of allChildren) {
        const sourceId = `umbraco-${item.id}`;
        const itemPath = [...current.path, item.name];

        switch (item.contentTypeAlias) {
          case CONTENT_TYPES.LESSON: {
            if (!existingIds.has(sourceId)) {
              batchItems.push({
                source_type: "lesson",
                source_id: sourceId,
                source_title: item.name,
                source_url: null,
                status: "pending",
                target_table: "lessons",
                source_data: { umbraco_id: item.id, topics: itemPath, parent_series_source_id: current.parentSeriesSourceId || null },
              });
              existingIds.add(sourceId);
              stats.lessons++;
              stats.total++;
            }
            break;
          }

          case CONTENT_TYPES.SERIES: {
            if (!existingIds.has(sourceId)) {
              batchItems.push({
                source_type: "series",
                source_id: sourceId,
                source_title: item.name,
                source_url: null,
                status: "pending",
                target_table: "series",
                source_data: { umbraco_id: item.id, topics: itemPath },
              });
              existingIds.add(sourceId);
              stats.series++;
              stats.total++;
            }
            // Series always may have child lessons — always recurse
            queue.push({ parentId: item.id, path: itemPath, parentSeriesSourceId: sourceId });
            break;
          }

          case CONTENT_TYPES.QAS: {
            if (!existingIds.has(sourceId)) {
              batchItems.push({
                source_type: "qa",
                source_id: sourceId,
                source_title: item.name,
                source_url: null,
                status: "pending",
                target_table: "lessons",
                source_data: { umbraco_id: item.id, topics: itemPath },
              });
              existingIds.add(sourceId);
              stats.qa++;
              stats.total++;
            }
            // QA items may have children — always recurse
            queue.push({ parentId: item.id, path: itemPath });
            break;
          }

          case CONTENT_TYPES.RABBI: {
            if (!existingIds.has(sourceId)) {
              batchItems.push({
                source_type: "rabbi",
                source_id: sourceId,
                source_title: item.name,
                source_url: null,
                status: "pending",
                target_table: "rabbis",
                source_data: { umbraco_id: item.id, content_type: item.contentTypeAlias },
              });
              existingIds.add(sourceId);
              stats.rabbis++;
              stats.total++;
            }
            break;
          }

          case CONTENT_TYPES.CATEGORY: {
            stats.categories++;
            // ALWAYS recurse into categories — hasChildren/childCount are unreliable in Umbraco GetChildren API
            queue.push({ parentId: item.id, path: itemPath });
            break;
          }

          default:
            // For known container types, always recurse
            if (CONTAINER_TYPES.has(item.contentTypeAlias)) {
              queue.push({ parentId: item.id, path: itemPath });
            }
            break;
        }

        // Flush batch periodically
        if (batchItems.length >= 50) {
          await batchInsert(supabase, "migration_items", batchItems.splice(0));
        }
      }
    } catch (e: any) {
      console.error(`Error scanning node ${current.parentId}:`, e.message);
      await logMessage(supabase, batch.id, null, "error",
        `שגיאה בסריקת node ${current.parentId}: ${e.message}`);
    }
  }

  // Flush remaining items
  if (batchItems.length > 0) {
    await batchInsert(supabase, "migration_items", batchItems.splice(0));
  }

  const hasMore = queue.length > 0;

  if (hasMore) {
    // Save remaining queue for next call
    await supabase.from("migration_batches").update({
      description: JSON.stringify({ queue }),
      total_items: (batch.total_items || 0) + stats.total,
    }).eq("id", batch.id);

    await logMessage(supabase, batch.id, null, "info",
      `חלק מהסריקה הושלם: +${stats.total} פריטים. נותרו ${queue.length} ענפים — לחץ שוב!`);
  } else {
    // All done
    await supabase.from("migration_batches").update({
      total_items: (batch.total_items || 0) + stats.total,
      completed_items: (batch.total_items || 0) + stats.total,
      status: "completed",
      completed_at: new Date().toISOString(),
      description: `סריקה הושלמה: ${stats.lessons} שיעורים, ${stats.series} סדרות, ${stats.rabbis} רבנים, ${stats.qa} שו"ת, ${stats.categories} קטגוריות`,
    }).eq("id", batch.id);

    await logMessage(supabase, batch.id, null, "info",
      `סריקה הושלמה: ${stats.lessons} שיעורים, ${stats.series} סדרות, ${stats.rabbis} רבנים, ${stats.qa} שו"ת`);
  }

  return jsonResponse({
    success: true,
    batch_id: batch.id,
    ...stats,
    nodesProcessed,
    hasMore,
    queueRemaining: queue.length,
  });
}

// ─── ENRICH: Fetch full details for pending items ───────────

async function handleEnrich(supabase: any, options?: any) {
  const batchSize = options?.batchSize || 50;
  const session = await umbracoLogin();

  const { data: batch } = await supabase
    .from("migration_batches")
    .insert({
      name: `העשרת פריטים - ${new Date().toLocaleDateString("he-IL")}`,
      description: `שליפת פרטים מלאים מ-Umbraco (עד ${batchSize} פריטים)`,
      source_type: "enrich",
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select().single();

  // Get pending lessons/series that haven't been enriched yet
  const { data: items, error } = await supabase
    .from("migration_items")
    .select("*")
    .in("source_type", ["lesson", "series", "qa"])
    .eq("status", "pending")
    .is("source_data->>enriched_at", null)
    .not("source_data->>umbraco_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) throw error;
  if (!items || items.length === 0) {
    await supabase.from("migration_batches").update({
      status: "completed", completed_at: new Date().toISOString(),
      total_items: 0, completed_items: 0,
    }).eq("id", batch.id);
    await logMessage(supabase, batch.id, null, "info", "אין פריטים להעשרה");
    return jsonResponse({ success: true, enriched: 0, authorsFound: 0, rabbisDiscovered: 0, hasMore: false });
  }

  await logMessage(supabase, batch.id, null, "info", `מעשיר ${items.length} פריטים...`);

  const discoveredAuthors = new Set<string>();
  let enriched = 0;
  let failed = 0;

  for (const item of items) {
    const umbracoId = item.source_data?.umbraco_id;
    if (!umbracoId) continue;

    try {
      const full = await getNode(session, umbracoId);
      const author = extractProperty(full, "author");
      const content = extractProperty(full, "content");
      const promo = extractProperty(full, "promo");
      const tags = extractProperty(full, "tags");
      const duration = extractProperty(full, "duration");
      const youtubeId = extractProperty(full, "youTubeID");
      const videoPath = extractProperty(full, "videoServerPath");
      const audioPath = extractProperty(full, "audioServerPath");
      const pdf = extractProperty(full, "overContentPDF");
      const url = extractUrl(full);

      if (author) {
        author.split(",").forEach((a: string) => {
          const trimmed = a.trim();
          if (trimmed) discoveredAuthors.add(trimmed);
        });
      }

      let mediaType = "text";
      if (youtubeId || videoPath) mediaType = "video";
      else if (audioPath) mediaType = "audio";

      const enrichedData = {
        ...item.source_data,
        author,
        description: content ? cleanHtml(content).substring(0, 500) : promo || null,
        full_content: content || null,
        tags: tags?.split(",").map((t: string) => t.trim()).filter(Boolean) || [],
        duration,
        media_type: mediaType,
        youtube_id: youtubeId || null,
        video_url: videoPath ? (videoPath.startsWith("http") ? videoPath : `${UMBRACO_BASE}${videoPath}`) : (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null),
        audio_url: audioPath ? (audioPath.startsWith("http") ? audioPath : `${UMBRACO_BASE}${audioPath}`) : null,
        pdf_url: pdf ? (pdf.startsWith("http") ? pdf : `${UMBRACO_BASE}${pdf}`) : null,
        source_url: url,
        enriched_at: new Date().toISOString(),
      };

      await supabase.from("migration_items").update({
        source_title: full.name || item.source_title,
        source_url: url || item.source_url,
        source_data: enrichedData,
      }).eq("id", item.id);

      enriched++;

      if (enriched % 10 === 0) {
        await new Promise(r => setTimeout(r, 200));
        await logMessage(supabase, batch.id, null, "info", `הועשרו ${enriched}/${items.length} פריטים...`);
      }
    } catch (e: any) {
      failed++;
      console.error(`Error enriching item ${item.id}:`, e.message);
      await supabase.from("migration_items").update({
        error_message: `Enrich failed: ${e.message}`,
      }).eq("id", item.id);
    }
  }

  // Create rabbi entries from discovered authors
  const existingItemsAll = await fetchAllRows(supabase, "migration_items", "source_id, source_title, source_type");
  const existingIds = new Set(existingItemsAll.map((e: any) => e.source_id).filter(Boolean));
  const existingRabbiNames = new Set(
    existingItemsAll.filter((r: any) => r.source_type === "rabbi").map((r: any) => r.source_title?.trim())
  );

  let rabbisAdded = 0;
  const newRabbis: any[] = [];
  for (const authorName of discoveredAuthors) {
    const trimmed = authorName.trim();
    if (!trimmed || trimmed === "כל הרבנים") continue;
    if (existingRabbiNames.has(trimmed)) continue;
    const sourceId = `author-${trimmed.replace(/\s+/g, "-")}`;
    if (existingIds.has(sourceId)) continue;

    newRabbis.push({
      source_type: "rabbi",
      source_id: sourceId,
      source_title: trimmed,
      source_url: null,
      status: "pending",
      target_table: "rabbis",
      source_data: { discovered_from: "lesson-author-tag", author_name: trimmed },
    });
    existingRabbiNames.add(trimmed);
  }

  if (newRabbis.length > 0) {
    await batchInsert(supabase, "migration_items", newRabbis);
    rabbisAdded = newRabbis.length;
    await logMessage(supabase, batch.id, null, "info", `נוספו ${rabbisAdded} רבנים חדשים מתוך שדות מחבר`);
  }

  // Check if more to enrich
  const { count } = await supabase
    .from("migration_items")
    .select("id", { count: "exact", head: true })
    .in("source_type", ["lesson", "series", "qa"])
    .eq("status", "pending")
    .is("source_data->>enriched_at", null)
    .not("source_data->>umbraco_id", "is", null);

  const hasMore = (count || 0) > 0;

  await supabase.from("migration_batches").update({
    total_items: items.length,
    completed_items: enriched,
    failed_items: failed,
    status: "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", batch.id);

  return jsonResponse({
    success: true,
    enriched,
    failed,
    authorsFound: discoveredAuthors.size,
    rabbisDiscovered: rabbisAdded,
    hasMore,
    remaining: count || 0,
  });
}

// ─── DEEP SCAN: scan + create topics ────────────────────────

async function handleDeepScan(supabase: any, _options?: any) {
  const scanResult = await handleScan(supabase);
  const scanBody = await scanResult.text();
  const scanData = JSON.parse(scanBody);

  if (!scanData.success) return jsonResponse(scanData);
  if (scanData.hasMore) {
    // Don't create topics until scan is fully complete
    return jsonResponse({ ...scanData, message: "סריקה עדיין בתהליך - לחץ שוב" });
  }

  const session = await umbracoLogin();

  const { data: batch } = await supabase
    .from("migration_batches")
    .insert({
      name: `יצירת תגיות - ${new Date().toLocaleDateString("he-IL")}`,
      description: "יצירת עץ תגיות מהיררכיית אומברקו",
      source_type: "topics",
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select().single();

  const topicsCreated = await createTopicsFromTree(supabase, session, batch.id, NODES.LESSONS_BASE, null, []);

  await supabase.from("migration_batches").update({
    total_items: topicsCreated,
    completed_items: topicsCreated,
    status: "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", batch.id);

  return jsonResponse({ ...scanData, topics_created: topicsCreated });
}

// ─── Create topics from tree ────────────────────────────────

async function createTopicsFromTree(
  supabase: any, session: UmbracoSession, batchId: string,
  parentUmbracoId: number, parentTopicId: string | null, pathChain: string[], depth = 0
): Promise<number> {
  if (depth > 8) return 0;

  const { items } = await getChildren(session, parentUmbracoId);
  let created = 0;

  for (const item of items) {
    if (item.contentTypeAlias !== CONTENT_TYPES.CATEGORY) continue;

    const slug = [...pathChain, item.name].join("/");

    const { data: existing } = await supabase.from("topics").select("id").eq("slug", slug).maybeSingle();

    let topicId: string;
    if (existing) {
      topicId = existing.id;
    } else {
      const { data: newTopic, error } = await supabase
        .from("topics")
        .insert({ name: item.name, slug, parent_id: parentTopicId, sort_order: created })
        .select("id").single();

      if (error) {
        await logMessage(supabase, batchId, null, "error", `שגיאה ביצירת תגית "${item.name}": ${error.message}`);
        continue;
      }
      topicId = newTopic.id;
      created++;
    }

    if (item.hasChildren || item.childCount > 0) {
      const sub = await createTopicsFromTree(supabase, session, batchId, item.id, topicId, [...pathChain, item.name], depth + 1);
      created += sub;
    }
  }

  return created;
}

// ─── PROCESS: Create actual records from migration items ────

async function handleProcess(supabase: any) {
  const { data: pendingItems, error } = await supabase
    .from("migration_items")
    .select("*")
    .eq("status", "pending")
    .limit(50);

  if (error) throw error;
  if (!pendingItems?.length) {
    return jsonResponse({ success: true, message: "אין פריטים ממתינים", processed: 0, completed: 0, failed: 0 });
  }

  const session = await umbracoLogin();

  const { data: batch } = await supabase
    .from("migration_batches")
    .insert({
      name: `עיבוד API - ${new Date().toLocaleDateString("he-IL")}`,
      description: `עיבוד ${pendingItems.length} פריטים מ-Umbraco`,
      source_type: "process",
      status: "running",
      total_items: pendingItems.length,
      started_at: new Date().toISOString(),
    })
    .select().single();

  let completed = 0;
  let failed = 0;

  for (const item of pendingItems) {
    try {
      await supabase.from("migration_items").update({ status: "in_progress" }).eq("id", item.id);

      if (item.source_type === "rabbi") {
        await processRabbi(supabase, item, batch.id);
      } else if (item.source_type === "lesson" || item.source_type === "qa") {
        await processLesson(supabase, item, batch.id, session);
      } else if (item.source_type === "series") {
        await processSeries(supabase, item, batch.id);
      } else {
        await supabase.from("migration_items").update({ status: "skipped" }).eq("id", item.id);
        continue;
      }
      completed++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : "Unknown error";
      await supabase.from("migration_items").update({ status: "failed", error_message: msg }).eq("id", item.id);
      await logMessage(supabase, batch.id, item.id, "error", `שגיאה: ${msg}`);
    }
  }

  await supabase.from("migration_batches").update({
    completed_items: completed,
    failed_items: failed,
    status: "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", batch.id);

  return jsonResponse({ success: true, processed: pendingItems.length, completed, failed });
}

// ─── Process rabbi ──────────────────────────────────────────

async function processRabbi(supabase: any, item: any, batchId: string) {
  const name = item.source_title;

  const { data: existing } = await supabase.from("rabbis").select("id").eq("name", name).maybeSingle();
  if (existing) {
    await supabase.from("migration_items")
      .update({ status: "completed", target_id: existing.id, migrated_at: new Date().toISOString() })
      .eq("id", item.id);
    return;
  }

  const isRabbanit = name.startsWith("הרבנית");
  const { data: newRabbi, error } = await supabase
    .from("rabbis")
    .insert({ name, title: isRabbanit ? "רבנית" : "הרב", status: "active" })
    .select().single();
  if (error) throw error;

  await supabase.from("migration_items")
    .update({ status: "completed", target_id: newRabbi.id, migrated_at: new Date().toISOString() })
    .eq("id", item.id);

  await logMessage(supabase, batchId, item.id, "info", `רב "${name}" נוצר`);
}

// ─── Process lesson ─────────────────────────────────────────

async function processLesson(supabase: any, item: any, batchId: string, session: UmbracoSession) {
  const sd = item.source_data || {};
  const title = sd.title || item.source_title;

  let rabbiId = null;
  if (sd.author) {
    const firstAuthor = sd.author.split(",")[0].trim();
    const { data: rabbi } = await supabase.from("rabbis").select("id").eq("name", firstAuthor).maybeSingle();
    rabbiId = rabbi?.id || null;
  }

  const { data: existing } = await supabase.from("lessons").select("id").eq("title", title).maybeSingle();
  if (existing) {
    await supabase.from("migration_items")
      .update({ status: "completed", target_id: existing.id, migrated_at: new Date().toISOString() })
      .eq("id", item.id);
    return;
  }

  // Find series_id from parent series
  let seriesId = null;
  if (sd.parent_series_source_id) {
    const { data: seriesItem } = await supabase
      .from("migration_items")
      .select("target_id")
      .eq("source_id", sd.parent_series_source_id)
      .eq("status", "completed")
      .maybeSingle();
    seriesId = seriesItem?.target_id || null;
  }

  // Determine if this lesson has real content
  const hasContent = sd.full_content || sd.audio_url || sd.video_url || sd.pdf_url;
  const lessonStatus = hasContent ? "published" : "draft";

  const { data: newLesson, error } = await supabase
    .from("lessons")
    .insert({
      title,
      description: sd.description || null,
      content: sd.full_content || null,
      rabbi_id: rabbiId,
      series_id: seriesId,
      source_type: sd.media_type || "video",
      status: lessonStatus,
      published_at: hasContent ? new Date().toISOString() : null,
      video_url: sd.video_url || null,
      audio_url: sd.audio_url || null,
      attachment_url: sd.pdf_url || null,
    })
    .select().single();
  if (error) throw error;

  if (sd.topics?.length) {
    await linkTopicsToLesson(supabase, newLesson.id, sd.topics);
  }

  if (item.source_url) {
    try {
      const oldPath = new URL(item.source_url).pathname;
      await supabase.from("migration_redirects").insert({
        old_path: decodeURIComponent(oldPath),
        new_path: `/lessons/${newLesson.id}`,
        status: "active", redirect_type: 301, priority: "normal", meta_title: title,
      });
    } catch { /* skip */ }
  }

  await supabase.from("migration_items")
    .update({ status: "completed", target_id: newLesson.id, migrated_at: new Date().toISOString() })
    .eq("id", item.id);

  await logMessage(supabase, batchId, item.id, "info", `שיעור "${title}" נוצר`);
}

// ─── Process series ─────────────────────────────────────────

async function processSeries(supabase: any, item: any, batchId: string) {
  const title = item.source_title;
  const sd = item.source_data || {};

  const { data: existing } = await supabase.from("series").select("id").eq("title", title).maybeSingle();
  if (existing) {
    await supabase.from("migration_items")
      .update({ status: "completed", target_id: existing.id, migrated_at: new Date().toISOString() })
      .eq("id", item.id);
    return;
  }

  let rabbiId = null;
  if (sd.author) {
    const { data: rabbi } = await supabase.from("rabbis").select("id").eq("name", sd.author).maybeSingle();
    rabbiId = rabbi?.id || null;
  }

  const { data: newSeries, error } = await supabase
    .from("series")
    .insert({ title, description: sd.promo || null, rabbi_id: rabbiId, status: "draft" })
    .select().single();
  if (error) throw error;

  if (item.source_url) {
    try {
      const oldPath = new URL(item.source_url).pathname;
      await supabase.from("migration_redirects").insert({
        old_path: decodeURIComponent(oldPath),
        new_path: `/series/${newSeries.id}`,
        status: "active", redirect_type: 301, priority: "normal", meta_title: title,
      });
    } catch { /* skip */ }
  }

  await supabase.from("migration_items")
    .update({ status: "completed", target_id: newSeries.id, migrated_at: new Date().toISOString() })
    .eq("id", item.id);

  await logMessage(supabase, batchId, item.id, "info", `סדרה "${title}" נוצרה`);
}

// ─── Link topics to lesson ──────────────────────────────────

async function linkTopicsToLesson(supabase: any, lessonId: string, topics: string[]) {
  for (let i = 1; i <= topics.length; i++) {
    const slug = topics.slice(0, i).join("/");
    const { data: topic } = await supabase.from("topics").select("id").eq("slug", slug).maybeSingle();
    if (topic) {
      await supabase.from("lesson_topics")
        .upsert({ lesson_id: lessonId, topic_id: topic.id }, { onConflict: "lesson_id,topic_id", ignoreDuplicates: true });
    }
  }
}

// ─── FIX DRAFTS: Re-enrich and publish draft lessons ────────

async function handleFixDrafts(supabase: any, options?: any) {
  const batchSize = options?.batchSize || 50;
  const session = await umbracoLogin();

  // Find draft lessons that have migration items with umbraco IDs
  const { data: draftLessons, error } = await supabase
    .from("migration_items")
    .select("id, source_id, source_title, source_data, target_id")
    .eq("source_type", "lesson")
    .eq("status", "completed")
    .not("target_id", "is", null)
    .not("source_data->>umbraco_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) throw error;
  
  // Filter to only those whose target lesson is still draft
  const targetIds = (draftLessons || []).map((d: any) => d.target_id).filter(Boolean);
  if (!targetIds.length) {
    return jsonResponse({ success: true, fixed: 0, enriched: 0, hasMore: false });
  }

  const { data: drafts } = await supabase
    .from("lessons")
    .select("id")
    .in("id", targetIds)
    .eq("status", "draft");

  const draftIdSet = new Set((drafts || []).map((d: any) => d.id));
  const itemsToFix = (draftLessons || []).filter((d: any) => draftIdSet.has(d.target_id));

  if (!itemsToFix.length) {
    return jsonResponse({ success: true, fixed: 0, enriched: 0, hasMore: false, message: "אין שיעורי טיוטה לתקן" });
  }

  let fixed = 0;
  let enriched = 0;
  let stillEmpty = 0;

  for (const item of itemsToFix) {
    const sd = item.source_data || {};
    const umbracoId = sd.umbraco_id;

    try {
      // Re-fetch from Umbraco if not enriched or missing content
      let content = sd.full_content;
      let audioUrl = sd.audio_url;
      let videoUrl = sd.video_url;
      let pdfUrl = sd.pdf_url;
      let description = sd.description;
      let mediaType = sd.media_type;
      let author = sd.author;

      if (!sd.enriched_at || (!content && !audioUrl && !videoUrl && !pdfUrl)) {
        // Need to re-fetch from Umbraco
        const full = await getNode(session, umbracoId);
        content = extractProperty(full, "content");
        const promo = extractProperty(full, "promo");
        const youtubeId = extractProperty(full, "youTubeID");
        const videoPath = extractProperty(full, "videoServerPath");
        const audioPath = extractProperty(full, "audioServerPath");
        const pdf = extractProperty(full, "overContentPDF");
        author = extractProperty(full, "author") || author;
        
        mediaType = "text";
        if (youtubeId || videoPath) mediaType = "video";
        else if (audioPath) mediaType = "audio";

        videoUrl = videoPath ? (videoPath.startsWith("http") ? videoPath : `${UMBRACO_BASE}${videoPath}`) : (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null);
        audioUrl = audioPath ? (audioPath.startsWith("http") ? audioPath : `${UMBRACO_BASE}${audioPath}`) : null;
        pdfUrl = pdf ? (pdf.startsWith("http") ? pdf : `${UMBRACO_BASE}${pdf}`) : null;
        description = content ? cleanHtml(content).substring(0, 500) : promo || description;

        // Update migration item with enriched data
        await supabase.from("migration_items").update({
          source_data: {
            ...sd,
            full_content: content,
            audio_url: audioUrl, video_url: videoUrl, pdf_url: pdfUrl,
            description, media_type: mediaType, author,
            enriched_at: new Date().toISOString(),
          },
        }).eq("id", item.id);

        enriched++;
      }

      // Check if we now have content
      const hasContent = content || audioUrl || videoUrl || pdfUrl;
      if (!hasContent) {
        stillEmpty++;
        continue;
      }

      // Find rabbi
      let rabbiId = null;
      if (author) {
        const firstAuthor = author.split(",")[0].trim();
        const { data: rabbi } = await supabase.from("rabbis").select("id").eq("name", firstAuthor).maybeSingle();
        rabbiId = rabbi?.id || null;
      }

      // Update the lesson
      await supabase.from("lessons").update({
        content: content || null,
        audio_url: audioUrl || null,
        video_url: videoUrl || null,
        attachment_url: pdfUrl || null,
        source_type: mediaType || "text",
        description: description || null,
        rabbi_id: rabbiId || undefined,
        status: "published",
        published_at: new Date().toISOString(),
      }).eq("id", item.target_id);

      fixed++;
    } catch (e: any) {
      console.error(`Error fixing draft ${item.source_title}:`, e.message);
    }

    // Small delay to avoid rate limiting
    if ((fixed + enriched) % 10 === 0) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Check if more drafts remain
  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft");

  return jsonResponse({
    success: true,
    fixed,
    enriched,
    stillEmpty,
    remainingDrafts: count || 0,
    hasMore: (count || 0) > 0,
  });
}

// ─── Seed critical redirects ────────────────────────────────

async function handleSeedCriticalRedirects(supabase: any) {
  const criticalRedirects = [
    { old_path: "/", new_path: "/", meta_title: "בני ציון - מאגר שיעורי תורה", priority: "critical" },
    { old_path: "/מאגר-השיעורים/", new_path: "/lessons", meta_title: "מאגר השיעורים", priority: "critical" },
    { old_path: "/מאגר-השיעורים-והמאמרים/", new_path: "/lessons", meta_title: "מאגר השיעורים והמאמרים", priority: "critical" },
    { old_path: "/רבנים/", new_path: "/rabbis", meta_title: "הרבנים שלנו", priority: "critical" },
    { old_path: "/אודותינו/", new_path: "/about", meta_title: "אודות בני ציון", priority: "high" },
    { old_path: "/צור-קשר/", new_path: "/contact", meta_title: "צור קשר", priority: "high" },
    { old_path: "/qas/", new_path: "/qa", meta_title: "שאלות ותשובות", priority: "high" },
  ];

  let added = 0;
  for (const r of criticalRedirects) {
    const { data: existing } = await supabase.from("migration_redirects").select("id").eq("old_path", r.old_path).maybeSingle();
    if (!existing) {
      await supabase.from("migration_redirects").insert({ ...r, status: "active", redirect_type: 301 });
      added++;
    }
  }

  return jsonResponse({ success: true, added, total: criticalRedirects.length });
}

// ─── RESCAN ITEM ────────────────────────────────────────────

async function handleRescanItem(supabase: any, options?: any) {
  if (!options?.itemId) return jsonResponse({ error: "Missing itemId" }, 400);

  const { data: item, error } = await supabase
    .from("migration_items")
    .select("*")
    .eq("id", options.itemId)
    .single();

  if (error || !item) return jsonResponse({ error: "Item not found" }, 404);

  const sourceData = item.source_data as any;
  const umbracoId = sourceData?.umbraco_id;
  if (!umbracoId) return jsonResponse({ error: "No umbraco_id in source_data" }, 400);

  const session = await umbracoLogin();
  const full = await getNode(session, umbracoId);

  let updatedData: any = { ...sourceData };
  let updatedTitle = full.name || item.source_title;
  let updatedUrl = item.source_url;

  if (item.source_type === "lesson" || item.source_type === "qa") {
    const author = extractProperty(full, "author");
    const content = extractProperty(full, "content");
    const promo = extractProperty(full, "promo");
    const tags = extractProperty(full, "tags");
    const duration = extractProperty(full, "duration");
    const youtubeId = extractProperty(full, "youTubeID");
    const videoPath = extractProperty(full, "videoServerPath");
    const audioPath = extractProperty(full, "audioServerPath");
    const pdf = extractProperty(full, "overContentPDF");
    const url = extractUrl(full);

    let mediaType = "text";
    if (youtubeId || videoPath) mediaType = "video";
    else if (audioPath) mediaType = "audio";

    updatedData = {
      ...updatedData,
      author, description: content ? cleanHtml(content).substring(0, 500) : promo || null,
      full_content: content || null,
      tags: tags?.split(",").map((t: string) => t.trim()).filter(Boolean) || [],
      duration, media_type: mediaType, youtube_id: youtubeId || null,
      video_url: videoPath ? (videoPath.startsWith("http") ? videoPath : `${UMBRACO_BASE}${videoPath}`) : (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null),
      audio_url: audioPath ? (audioPath.startsWith("http") ? audioPath : `${UMBRACO_BASE}${audioPath}`) : null,
      pdf_url: pdf ? (pdf.startsWith("http") ? pdf : `${UMBRACO_BASE}${pdf}`) : null,
      source_url: url,
    };
    updatedUrl = url || updatedUrl;
  } else if (item.source_type === "series") {
    updatedData.author = extractProperty(full, "author");
    updatedData.promo = extractProperty(full, "promo");
    updatedData.tags = extractProperty(full, "tags")?.split(",").map((t: string) => t.trim()).filter(Boolean) || [];
    const url = extractUrl(full);
    updatedData.source_url = url;
    updatedUrl = url || updatedUrl;
  } else if (item.source_type === "rabbi") {
    updatedData.email = extractProperty(full, "RabbiMail");
  }

  updatedData.last_rescanned = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("migration_items")
    .update({ source_title: updatedTitle, source_url: updatedUrl, source_data: updatedData, error_message: null })
    .eq("id", options.itemId);

  if (updateError) return jsonResponse({ error: updateError.message }, 500);

  return jsonResponse({ success: true, itemId: options.itemId, title: updatedTitle, source_type: item.source_type });
}

// ─── LINK SERIES: Retroactively connect lessons to series ───

async function handleLinkSeries(supabase: any, options?: any) {
  const batchSize = options?.batchSize || 50;
  const offset = options?.offset || 0;
  const session = await umbracoLogin();

  // Get a batch of completed series with their umbraco IDs
  const { data: seriesItems, error: seriesError } = await supabase
    .from("migration_items")
    .select("id, source_id, source_data, target_id")
    .eq("source_type", "series")
    .eq("status", "completed")
    .not("target_id", "is", null)
    .order("created_at", { ascending: true })
    .range(offset, offset + batchSize - 1);

  if (seriesError) throw seriesError;
  if (!seriesItems?.length) {
    return jsonResponse({ success: true, linked: 0, seriesProcessed: 0, hasMore: false, message: "אין סדרות לקישור" });
  }

  // Get all lesson migration items keyed by source_id
  const allLessonItems = await fetchAllRows(supabase, "migration_items", "source_id, target_id, status");
  const lessonBySourceId = new Map<string, any>();
  for (const li of allLessonItems) {
    if (li.source_id) lessonBySourceId.set(li.source_id, li);
  }

  let linked = 0;
  let seriesProcessed = 0;

  for (const seriesItem of seriesItems) {
    const umbracoId = seriesItem.source_data?.umbraco_id;
    if (!umbracoId) continue;

    try {
      let allChildren: any[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const { items, totalItems } = await getChildren(session, umbracoId, 500, page);
        allChildren = allChildren.concat(items);
        hasMore = allChildren.length < totalItems;
        page++;
      }

      const lessonIds: string[] = [];

      for (const child of allChildren) {
        if (child.contentTypeAlias === CONTENT_TYPES.LESSON || child.contentTypeAlias === CONTENT_TYPES.QAS) {
          const childSourceId = `umbraco-${child.id}`;
          const migItem = lessonBySourceId.get(childSourceId);
          if (migItem?.target_id && migItem.status === "completed") {
            lessonIds.push(migItem.target_id);
          }
        }
      }

      if (lessonIds.length > 0) {
        for (let i = 0; i < lessonIds.length; i += 100) {
          const chunk = lessonIds.slice(i, i + 100);
          await supabase
            .from("lessons")
            .update({ series_id: seriesItem.target_id })
            .in("id", chunk);
        }

        await supabase
          .from("series")
          .update({ lesson_count: lessonIds.length })
          .eq("id", seriesItem.target_id);

        linked += lessonIds.length;
      }

      seriesProcessed++;

      if (seriesProcessed % 20 === 0) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e: any) {
      console.error(`Error linking series ${seriesItem.source_id}:`, e.message);
    }
  }

  // Check if there are more series to process
  const { count } = await supabase
    .from("migration_items")
    .select("id", { count: "exact", head: true })
    .eq("source_type", "series")
    .eq("status", "completed")
    .not("target_id", "is", null);

  const nextOffset = offset + batchSize;
  const hasMore = nextOffset < (count || 0);

  return jsonResponse({ success: true, linked, seriesProcessed, hasMore, nextOffset, totalSeries: count || 0 });
}

// ─── GENERATE REDIRECTS from enriched items ─────────────────

async function handleGenerateRedirects(supabase: any) {
  // Find all completed/pending items that have a source_url but no redirect yet
  const { data: items, error } = await supabase
    .from("migration_items")
    .select("id, source_url, source_title, source_type, target_id, target_table")
    .not("source_url", "is", null)
    .in("source_type", ["lesson", "series", "qa"])
    .limit(1000);

  if (error) throw error;
  if (!items?.length) {
    return jsonResponse({ success: true, created: 0, skipped: 0, message: "אין פריטים עם כתובות" });
  }

  // Get existing redirects
  const { data: existingRedirects } = await supabase
    .from("migration_redirects")
    .select("old_path")
    .limit(10000);
  
  const existingPaths = new Set((existingRedirects || []).map((r: any) => r.old_path));

  let created = 0;
  let skipped = 0;
  const toInsert: any[] = [];

  for (const item of items) {
    try {
      const oldPath = decodeURIComponent(new URL(item.source_url).pathname);
      if (existingPaths.has(oldPath)) {
        skipped++;
        continue;
      }

      let newPath = "/";
      if (item.target_id && item.target_table === "lessons") {
        newPath = `/lessons/${item.target_id}`;
      } else if (item.target_id && item.target_table === "series") {
        newPath = `/series/${item.target_id}`;
      } else if (item.source_type === "lesson" || item.source_type === "qa") {
        newPath = `/lessons`;
      } else if (item.source_type === "series") {
        newPath = `/series`;
      }

      toInsert.push({
        old_path: oldPath,
        new_path: newPath,
        status: "active",
        redirect_type: 301,
        priority: "normal",
        meta_title: item.source_title || null,
      });
      existingPaths.add(oldPath);
      created++;
    } catch {
      skipped++;
    }
  }

  if (toInsert.length > 0) {
    await batchInsert(supabase, "migration_redirects", toInsert);
  }

  return jsonResponse({ success: true, created, skipped });
}

// ─── Utility ────────────────────────────────────────────────

async function batchInsert(supabase: any, table: string, items: any[]) {
  if (!items.length) return;
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) console.error(`Batch insert error (${table}):`, error.message);
  }
}

async function fetchAllRows(supabase: any, table: string, columns: string): Promise<any[]> {
  const pageSize = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw error;
    allData = allData.concat(data || []);
    hasMore = (data?.length || 0) === pageSize;
    from += pageSize;
  }
  return allData;
}

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
