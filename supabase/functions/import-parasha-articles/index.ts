const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UMBRACO_BASE = "https://www.bneyzion.co.il";
const HOME_NODE_ID = 6294;

const SERIES = {
  MABAT_RACHAV:  { id: "a1111111-1111-1111-1111-111111111111", rabbiId: "acd34d0f-1288-47b8-9e8e-38e69599c294", name: "הפרשה במבט רחב" },
  MIDOT:         { id: "a3333333-3333-3333-3333-333333333333", rabbiId: "b28770d5-1504-46ad-8613-3c3ca37a641c", name: "מידות בפרשה" },
  HAFTARA:       { id: "a4444444-4444-4444-4444-444444444444", rabbiId: "4822f2bb-9d1c-4adc-9554-d2a2db7bdbc8", name: "מבט על ההפטרה" },
  SIMAN_LABANIM: { id: "a2222222-2222-2222-2222-222222222222", rabbiId: "33865aa7-c9a6-4166-ae07-47466ec92e9f", name: "סימן לבנים" },
};

// Classify banner image to series
function classifyBanner(imagePath: string): typeof SERIES[keyof typeof SERIES] | null {
  const decoded = decodeURIComponent(imagePath).toLowerCase();
  // /media/144787/3.jpg → Mabat Rachav
  if (/\/3\.jpg$/i.test(imagePath) || /144787/i.test(imagePath)) return SERIES.MABAT_RACHAV;
  // ולוסקי → Midot
  if (decoded.includes("ולוסקי") || decoded.includes("voloski")) return SERIES.MIDOT;
  // שחור / 144895 / עותק → Haftara
  if (decoded.includes("שחור") || decoded.includes("shachor") || /144895/i.test(imagePath) || decoded.includes("עותק")) return SERIES.HAFTARA;
  // /media/144811/4.jpg → Siman LaBanim
  if (/\/4\.jpg$/i.test(imagePath) || /144788/i.test(imagePath) || /144811/i.test(imagePath)) return SERIES.SIMAN_LABANIM;
  return null;
}

// Extract title from HTML content
function extractTitle(html: string): string | null {
  const match = html.match(/<h[23][^>]*>\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (!match) return null;
  const title = match[1]
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim();
  if (!title || title.length < 3 || title === "מאמרים" || title === "תכנים שונים") return null;
  return title;
}

// Check if content has enough substance
function hasSubstance(html: string): boolean {
  const pCount = (html.match(/<p[\s>]/gi) || []).length;
  return pCount >= 2;
}

interface UmbracoSession {
  cookieHeader: string;
  xsrfToken: string;
}

async function umbracoLogin(): Promise<UmbracoSession> {
  const username = Deno.env.get("UMBRACO_USERNAME")!;
  const password = Deno.env.get("UMBRACO_PASSWORD")!;

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
  if (!res.ok) throw new Error(`Umbraco API error ${res.status}: ${text.substring(0, 200)}`);
  const clean = text.replace(/^\)\]\}',?\n?/, "");
  return JSON.parse(clean);
}

interface ExtractedArticle {
  title: string;
  content: string;
  seriesId: string;
  rabbiId: string;
  seriesName: string;
}

function extractArticlesFromGrid(gridData: any, parashaName: string): ExtractedArticle[] {
  const articles: ExtractedArticle[] = [];
  if (!gridData?.sections) return articles;

  for (const section of gridData.sections) {
    for (const row of section.rows || []) {
      for (const area of row.areas || []) {
        const controls = area.controls || [];
        let currentSeries: typeof SERIES[keyof typeof SERIES] | null = null;

        for (const control of controls) {
          // Media control = banner image
          if (control.editor?.alias === "media" && control.value?.image) {
            const cls = classifyBanner(control.value.image);
            if (cls) currentSeries = cls;
            continue;
          }

          // RTE control = article content
          if (control.editor?.alias === "rte" && typeof control.value === "string" && currentSeries) {
            const html = control.value;
            if (!html || html.length < 100) continue;

            const title = extractTitle(html);
            if (!title) continue;
            if (!hasSubstance(html)) continue;

            // Clean content
            const content = html
              .replace(/<img[^>]*nothing\.jpg[^>]*>/gi, "")
              .replace(/<p[^>]*>\s*(&nbsp;\s*)*<\/p>/gi, "")
              .trim();

            articles.push({
              title,
              content,
              seriesId: currentSeries.id,
              rabbiId: currentSeries.rabbiId,
              seriesName: currentSeries.name,
            });

            // Reset series after consuming article
            currentSeries = null;
          }
        }
      }
    }
  }
  return articles;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startIndex = 0, batchSize = 5 } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Step 1: Login to Umbraco
    console.log("Logging into Umbraco...");
    const session = await umbracoLogin();
    console.log("Umbraco login successful");

    // Step 2: Get all children of home page to find parasha pages
    const childrenData = await umbracoGet(session, `Content/GetChildren?id=${HOME_NODE_ID}&pageSize=200&pageNumber=1&orderBy=SortOrder&orderDirection=Ascending`);
    const allItems = childrenData.items || childrenData || [];

    // Filter parasha pages (name starts with "פרשת" or "פרשות")
    const parashaPages = allItems.filter((item: any) =>
      item.name?.startsWith("פרשת") || item.name?.startsWith("פרשות")
    );

    console.log(`Found ${parashaPages.length} parasha pages total`);

    // Batch
    const batch = parashaPages.slice(startIndex, startIndex + batchSize);
    const results: { parasha: string; nodeId: number; articles: number; errors: string[] }[] = [];

    for (const page of batch) {
      const parashaName = page.name;
      const errors: string[] = [];
      let articleCount = 0;

      try {
        console.log(`Processing ${parashaName} (node ${page.id})...`);

        // Get full node content
        const nodeData = await umbracoGet(session, `Content/GetById?id=${page.id}`);

        // Find the grid content property
        let gridData: any = null;
        for (const tab of nodeData.tabs || []) {
          for (const prop of tab.properties || []) {
            if (prop.alias === "content" && prop.editor === "Umbraco.Grid" && prop.value) {
              gridData = prop.value;
              break;
            }
          }
          if (gridData) break;
        }

        if (!gridData) {
          errors.push("No grid content found");
          results.push({ parasha: parashaName, nodeId: page.id, articles: 0, errors });
          continue;
        }

        const extracted = extractArticlesFromGrid(gridData, parashaName);
        console.log(`${parashaName}: ${extracted.length} articles: ${extracted.map(a => `[${a.seriesName}] ${a.title}`).join(", ")}`);

        if (extracted.length === 0) {
          errors.push("No articles extracted from grid");
        }

        for (const article of extracted) {
          const lessonTitle = `${article.title} - ${parashaName}`;

          const { data: existing } = await supabase
            .from("lessons")
            .select("id")
            .eq("title", lessonTitle)
            .eq("series_id", article.seriesId)
            .maybeSingle();

          if (existing) {
            await supabase.from("lessons").update({ content: article.content }).eq("id", existing.id);
            articleCount++;
            continue;
          }

          const { error: insertError } = await supabase.from("lessons").insert({
            title: lessonTitle,
            content: article.content,
            series_id: article.seriesId,
            rabbi_id: article.rabbiId,
            source_type: "article",
            status: "published",
            published_at: new Date().toISOString(),
          });

          if (insertError) {
            errors.push(`Insert "${article.title}": ${insertError.message}`);
          } else {
            articleCount++;
          }
        }
      } catch (e) {
        errors.push(`Error: ${e.message}`);
      }

      results.push({ parasha: parashaName, nodeId: page.id, articles: articleCount, errors });
    }

    // Update lesson counts for each series
    for (const series of Object.values(SERIES)) {
      const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("series_id", series.id);
      await supabase.from("series").update({ lesson_count: count ?? 0 }).eq("id", series.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: batch.length,
        totalParashaPages: parashaPages.length,
        startIndex,
        nextIndex: startIndex + batchSize < parashaPages.length ? startIndex + batchSize : null,
        totalArticles: results.reduce((s, r) => s + r.articles, 0),
        totalErrors: results.reduce((s, r) => s + r.errors.length, 0),
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
