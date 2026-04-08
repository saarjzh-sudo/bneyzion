import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OLD_SITE = "https://www.bneyzion.co.il";
const PAGES_PER_BATCH = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { action, batchId, offset } = await req.json();

    switch (action) {
      case "discover":
        return await handleDiscover(supabase);
      case "process-batch":
        return await handleProcessBatch(supabase, batchId, offset || 0);
      default:
        return json({ error: `Invalid action: ${action}` }, 400);
    }
  } catch (error) {
    console.error("HTML Migration error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// ─── DISCOVER: Crawl sitemap & category pages to find all lesson URLs ───

async function handleDiscover(supabase: any) {
  const log = (msg: string, level = "info") =>
    supabase.from("migration_logs").insert({ level, message: msg, details: { source: "html-migration" } });

  await log("מתחיל גילוי דפים מהאתר הישן (HTML)...");

  // Collect URLs from known category pages
  const categoryPaths = [
    "/מאגר-השיעורים/",
    "/מאגר-השיעורים-והמאמרים/",
  ];

  const allUrls = new Set<string>();

  // Try fetching sitemap first
  try {
    const sitemapRes = await fetch(`${OLD_SITE}/sitemap.xml`, { headers: { "User-Agent": "BneyZionMigrationBot/1.0" } });
    if (sitemapRes.ok) {
      const sitemapXml = await sitemapRes.text();
      const urlMatches = sitemapXml.matchAll(/<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/gi);
      for (const m of urlMatches) {
        const url = m[1].trim();
        if (url.includes("bneyzion.co.il") && !url.includes("/umbraco/")) {
          allUrls.add(url);
        }
      }
      await log(`נמצאו ${allUrls.size} כתובות מ-sitemap.xml`);
    }
  } catch (e) {
    await log(`לא נמצא sitemap: ${(e as Error).message}`, "warning");
  }

  // Crawl category pages for links
  for (const path of categoryPaths) {
    try {
      const html = await fetchPage(`${OLD_SITE}${encodeURI(path)}`);
      if (!html) continue;
      const links = extractLinks(html, OLD_SITE);
      for (const link of links) allUrls.add(link);
      await log(`נמצאו ${links.length} קישורים מ-${path}`);
    } catch (e) {
      await log(`שגיאה בקריאת ${path}: ${(e as Error).message}`, "warning");
    }
  }

  // Also crawl any sub-category pages found
  const categoryUrls = [...allUrls].filter(u => {
    const p = new URL(u).pathname;
    return p.split("/").filter(Boolean).length <= 2 && !p.includes("umbraco");
  });

  for (const catUrl of categoryUrls.slice(0, 30)) {
    try {
      const html = await fetchPage(catUrl);
      if (!html) continue;
      const links = extractLinks(html, OLD_SITE);
      for (const link of links) allUrls.add(link);
    } catch { /* skip */ }
  }

  // Filter to content pages only (exclude admin, static assets, etc.)
  const contentUrls = [...allUrls].filter(u => {
    const path = new URL(u).pathname.toLowerCase();
    return !path.includes("/umbraco") &&
           !path.includes("/media/") &&
           !path.endsWith(".css") &&
           !path.endsWith(".js") &&
           !path.endsWith(".png") &&
           !path.endsWith(".jpg") &&
           !path.endsWith(".gif") &&
           !path.endsWith(".ico") &&
           path !== "/" &&
           path.length > 1;
  });

  // Check which URLs are already in our system
  const existingUrls = await fetchAllRows(supabase, "migration_items", "source_url");
  const existingUrlSet = new Set(existingUrls.map((r: any) => r.source_url).filter(Boolean));

  // Also check redirects
  const existingRedirects = await fetchAllRows(supabase, "migration_redirects", "old_path");
  const existingPathSet = new Set(existingRedirects.map((r: any) => r.old_path).filter(Boolean));

  const newUrls = contentUrls.filter(u => {
    const path = decodeURIComponent(new URL(u).pathname);
    return !existingUrlSet.has(u) && !existingPathSet.has(path);
  });

  // Create batch with URL list
  const { data: batch } = await supabase.from("migration_batches").insert({
    name: `מיגרציית HTML - ${new Date().toLocaleDateString("he-IL")}`,
    description: JSON.stringify({ urls: newUrls, processedCount: 0 }),
    source_type: "html-crawl",
    status: "running",
    total_items: newUrls.length,
    started_at: new Date().toISOString(),
  }).select().single();

  await log(`גילוי הושלם: ${contentUrls.length} דפים סה"כ, ${newUrls.length} חדשים לעיבוד`);

  return json({
    success: true,
    batchId: batch.id,
    totalFound: contentUrls.length,
    newUrls: newUrls.length,
    alreadyExists: contentUrls.length - newUrls.length,
    hasMore: newUrls.length > 0,
  });
}

// ─── PROCESS BATCH: Scrape N pages and import content ───────

async function handleProcessBatch(supabase: any, batchId: string, offset: number) {
  if (!batchId) return json({ error: "Missing batchId" }, 400);

  const { data: batch, error: batchError } = await supabase
    .from("migration_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) return json({ error: "Batch not found" }, 404);

  let state: { urls: string[]; processedCount: number };
  try {
    state = JSON.parse(batch.description || "{}");
  } catch {
    return json({ error: "Invalid batch state" }, 400);
  }

  if (!state.urls?.length) {
    await supabase.from("migration_batches").update({
      status: "completed", completed_at: new Date().toISOString(),
    }).eq("id", batchId);
    return json({ success: true, processed: 0, imported: 0, skipped: 0, hasMore: false });
  }

  const urlsToProcess = state.urls.slice(offset, offset + PAGES_PER_BATCH);
  if (!urlsToProcess.length) {
    await supabase.from("migration_batches").update({
      status: "completed", completed_at: new Date().toISOString(),
    }).eq("id", batchId);
    return json({ success: true, processed: 0, imported: 0, skipped: 0, hasMore: false });
  }

  // Get existing titles & URLs for dedup
  const existingLessons = await fetchAllRows(supabase, "lessons", "title, audio_url, video_url");
  const existingTitleSet = new Set(existingLessons.map((l: any) => l.title?.trim()).filter(Boolean));
  const existingMediaSet = new Set([
    ...existingLessons.map((l: any) => l.audio_url).filter(Boolean),
    ...existingLessons.map((l: any) => l.video_url).filter(Boolean),
  ]);

  const existingSeries = await fetchAllRows(supabase, "series", "title");
  const existingSeriesTitleSet = new Set(existingSeries.map((s: any) => s.title?.trim()).filter(Boolean));

  const existingRabbis = await fetchAllRows(supabase, "rabbis", "name");
  const rabbiMap = new Map<string, string>();
  const existingRabbiRows = await fetchAllRows(supabase, "rabbis", "id, name");
  for (const r of existingRabbiRows) {
    if (r.name) rabbiMap.set(r.name.trim(), r.id);
  }

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const url of urlsToProcess) {
    try {
      const html = await fetchPage(url);
      if (!html) {
        skipped++;
        continue;
      }

      const pageData = extractPageContent(html, url);
      if (!pageData || !pageData.title) {
        skipped++;
        continue;
      }

      // Check if title already exists
      if (existingTitleSet.has(pageData.title.trim())) {
        skipped++;
        await supabase.from("migration_logs").insert({
          batch_id: batchId,
          level: "info",
          message: `דילוג - כבר קיים: "${pageData.title}"`,
        });
        continue;
      }

      // Check if media URL already exists
      if (pageData.audioUrl && existingMediaSet.has(pageData.audioUrl)) {
        skipped++;
        continue;
      }
      if (pageData.videoUrl && existingMediaSet.has(pageData.videoUrl)) {
        skipped++;
        continue;
      }

      // Determine type - is this a series page or a lesson?
      if (pageData.isSeriesPage) {
        if (!existingSeriesTitleSet.has(pageData.title.trim())) {
          const { data: newSeries } = await supabase.from("series").insert({
            title: pageData.title,
            description: pageData.description || null,
            image_url: pageData.imageUrl || null,
            status: "active",
          }).select("id").single();

          if (newSeries) {
            existingSeriesTitleSet.add(pageData.title.trim());
            imported++;
            
            // Create redirect
            const oldPath = decodeURIComponent(new URL(url).pathname);
            await supabase.from("migration_redirects").upsert({
              old_path: oldPath,
              new_path: `/series/${newSeries.id}`,
              status: "active",
              redirect_type: 301,
              meta_title: pageData.title,
            }, { onConflict: "old_path" });
          }
        } else {
          skipped++;
        }
      } else {
        // It's a lesson
        let rabbiId: string | null = null;
        if (pageData.author) {
          const authorName = pageData.author.trim();
          if (rabbiMap.has(authorName)) {
            rabbiId = rabbiMap.get(authorName)!;
          } else {
            // Create rabbi
            const { data: newRabbi } = await supabase.from("rabbis").insert({
              name: authorName,
              title: authorName.startsWith("הרבנית") ? "רבנית" : "הרב",
              status: "active",
            }).select("id").single();
            if (newRabbi) {
              rabbiId = newRabbi.id;
              rabbiMap.set(authorName, newRabbi.id);
            }
          }
        }

        // Find matching series
        let seriesId: string | null = null;
        if (pageData.breadcrumbs?.length) {
          const seriesName = pageData.breadcrumbs[pageData.breadcrumbs.length - 1];
          if (seriesName) {
            const { data: series } = await supabase
              .from("series")
              .select("id")
              .eq("title", seriesName)
              .maybeSingle();
            seriesId = series?.id || null;
          }
        }

        const hasContent = pageData.content || pageData.audioUrl || pageData.videoUrl || pageData.pdfUrl;
        const sourceType = pageData.videoUrl ? "video" : pageData.audioUrl ? "audio" : "text";

        const { data: newLesson } = await supabase.from("lessons").insert({
          title: pageData.title,
          description: pageData.description || null,
          content: pageData.content || null,
          rabbi_id: rabbiId,
          series_id: seriesId,
          source_type: sourceType,
          status: hasContent ? "published" : "draft",
          published_at: hasContent ? new Date().toISOString() : null,
          video_url: pageData.videoUrl || null,
          audio_url: pageData.audioUrl || null,
          attachment_url: pageData.pdfUrl || null,
        }).select("id").single();

        if (newLesson) {
          existingTitleSet.add(pageData.title.trim());
          if (pageData.audioUrl) existingMediaSet.add(pageData.audioUrl);
          if (pageData.videoUrl) existingMediaSet.add(pageData.videoUrl);
          imported++;

          // Create redirect
          const oldPath = decodeURIComponent(new URL(url).pathname);
          await supabase.from("migration_redirects").upsert({
            old_path: oldPath,
            new_path: `/lessons/${newLesson.id}`,
            status: "active",
            redirect_type: 301,
            meta_title: pageData.title,
          }, { onConflict: "old_path" });

          await supabase.from("migration_logs").insert({
            batch_id: batchId,
            level: "info",
            message: `יובא: "${pageData.title}" (${sourceType})`,
          });
        }
      }
    } catch (e) {
      errors++;
      await supabase.from("migration_logs").insert({
        batch_id: batchId,
        level: "error",
        message: `שגיאה בעיבוד ${url}: ${(e as Error).message}`,
      });
    }
  }

  const newOffset = offset + PAGES_PER_BATCH;
  const hasMore = newOffset < state.urls.length;

  // Update batch progress
  await supabase.from("migration_batches").update({
    completed_items: (batch.completed_items || 0) + imported,
    failed_items: (batch.failed_items || 0) + errors,
    ...(hasMore ? {} : { status: "completed", completed_at: new Date().toISOString() }),
  }).eq("id", batchId);

  return json({
    success: true,
    processed: urlsToProcess.length,
    imported,
    skipped,
    errors,
    hasMore,
    nextOffset: newOffset,
    totalUrls: state.urls.length,
    progress: Math.round((newOffset / state.urls.length) * 100),
  });
}

// ─── HTML Helpers ───────────────────────────────────────────

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BneyZionMigrationBot/1.0", "Accept": "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const regex = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    let href = match[1];
    if (href.startsWith("/")) href = `${baseUrl}${href}`;
    if (href.startsWith(baseUrl) && !href.includes("#")) {
      links.push(href.split("?")[0]);
    }
  }
  return [...new Set(links)];
}

interface PageContent {
  title: string;
  description: string | null;
  content: string | null;
  author: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  pdfUrl: string | null;
  imageUrl: string | null;
  breadcrumbs: string[];
  isSeriesPage: boolean;
}

function extractPageContent(html: string, url: string): PageContent | null {
  // Extract title
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                     html.match(/<title>([^<]+)<\/title>/i);
  if (!titleMatch) return null;

  const title = decodeHtmlEntities(titleMatch[1]).trim();
  if (!title || title.length < 2) return null;

  // Extract meta description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const description = descMatch ? decodeHtmlEntities(descMatch[1]).trim() : null;

  // Extract main content
  const contentMatch = html.match(/<div[^>]*class=["'][^"']*(?:lesson-content|article-content|entry-content|main-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const content = contentMatch ? contentMatch[1].trim() : null;

  // Extract author
  const authorMatch = html.match(/(?:מרצה|מחבר|רב|הרב)\s*:?\s*<[^>]*>([^<]+)<\/[^>]+>/i) ||
                      html.match(/<span[^>]*class=["'][^"']*author[^"']*["'][^>]*>([^<]+)<\/span>/i) ||
                      html.match(/<a[^>]*class=["'][^"']*rabbi[^"']*["'][^>]*>([^<]+)<\/a>/i);
  const author = authorMatch ? decodeHtmlEntities(authorMatch[1]).trim() : null;

  // Extract audio URL
  const audioMatch = html.match(/(?:src|href)=["']([^"']*\.(?:mp3|m4a|wav|ogg)(?:\?[^"']*)?)['"]/i) ||
                     html.match(/data-(?:audio|src|url)=["']([^"']*\.(?:mp3|m4a|wav|ogg)(?:\?[^"']*)?)['"]/i) ||
                     html.match(/<source[^>]*src=["']([^"']*\.(?:mp3|m4a)(?:\?[^"']*)?)['"]/i);
  let audioUrl = audioMatch ? resolveUrl(audioMatch[1], url) : null;

  // Extract video URL (YouTube or direct)
  let videoUrl: string | null = null;
  const ytMatch = html.match(/(?:youtube\.com\/(?:embed|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    videoUrl = `https://www.youtube.com/watch?v=${ytMatch[1]}`;
  } else {
    const videoMatch = html.match(/(?:src|href)=["']([^"']*\.(?:mp4|webm)(?:\?[^"']*)?)['"]/i);
    if (videoMatch) videoUrl = resolveUrl(videoMatch[1], url);
  }

  // Extract PDF
  const pdfMatch = html.match(/(?:src|href)=["']([^"']*\.pdf(?:\?[^"']*)?)['"]/i);
  const pdfUrl = pdfMatch ? resolveUrl(pdfMatch[1], url) : null;

  // Extract image
  const imgMatch = html.match(/<img[^>]*class=["'][^"']*(?:lesson|series|main)[^"']*["'][^>]*src=["']([^"']+)["']/i) ||
                   html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  const imageUrl = imgMatch ? resolveUrl(imgMatch[1], url) : null;

  // Extract breadcrumbs
  const breadcrumbs: string[] = [];
  const bcMatch = html.match(/<(?:nav|div|ul)[^>]*class=["'][^"']*breadcrumb[^"']*["'][^>]*>([\s\S]*?)<\/(?:nav|div|ul)>/i);
  if (bcMatch) {
    const bcLinks = bcMatch[1].matchAll(/<a[^>]*>([^<]+)<\/a>/gi);
    for (const m of bcLinks) {
      const crumb = decodeHtmlEntities(m[1]).trim();
      if (crumb && crumb !== "ראשי" && crumb !== "דף הבית") {
        breadcrumbs.push(crumb);
      }
    }
  }

  // Determine if this is a series page (has lesson list, no single audio/video)
  const hasLessonList = /<div[^>]*class=["'][^"']*lesson[^"']*["']/i.test(html) &&
                        (html.match(/class=["'][^"']*lesson/gi) || []).length > 3;
  const isSeriesPage = hasLessonList && !audioUrl && !videoUrl;

  return {
    title,
    description,
    content,
    author,
    audioUrl,
    videoUrl,
    pdfUrl,
    imageUrl,
    breadcrumbs,
    isSeriesPage,
  };
}

function resolveUrl(href: string, base: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${OLD_SITE}${href}`;
  return `${new URL(base).origin}/${href}`;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .trim();
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

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
