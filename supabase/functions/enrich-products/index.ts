import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Get all products with source_url that have no content
    const { data: products, error } = await supabase
      .from("products")
      .select("id, title, slug, source_url, description, content")
      .not("source_url", "is", null)
      .order("sort_order");

    if (error) throw error;
    if (!products?.length) {
      return json({ success: true, updated: 0, message: "אין מוצרים עם כתובת מקור" });
    }

    // Filter to products missing full content
    const toEnrich = products.filter((p: any) => !p.content || p.content.length < 100);

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const results: any[] = [];

    for (const product of toEnrich) {
      try {
        const html = await fetchPage(product.source_url);
        if (!html) {
          skipped++;
          results.push({ title: product.title, status: "skipped", reason: "page not accessible" });
          continue;
        }

        const extracted = extractProductContent(html);
        if (!extracted.content && !extracted.description) {
          skipped++;
          results.push({ title: product.title, status: "skipped", reason: "no content found" });
          continue;
        }

        const updates: any = {};
        
        // Update content (full HTML description)
        if (extracted.content) {
          updates.content = extracted.content;
        }

        // Update description if current one is shorter
        if (extracted.description && (!product.description || extracted.description.length > product.description.length)) {
          updates.description = extracted.description;
        }

        // Update image if missing
        if (extracted.imageUrl && !products.find((p: any) => p.id === product.id)?.image_url) {
          updates.image_url = extracted.imageUrl;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from("products")
            .update(updates)
            .eq("id", product.id);

          if (updateError) {
            failed++;
            results.push({ title: product.title, status: "failed", error: updateError.message });
          } else {
            updated++;
            results.push({ 
              title: product.title, 
              status: "updated", 
              contentLength: extracted.content?.length || 0,
              descriptionLength: extracted.description?.length || 0,
            });
          }
        } else {
          skipped++;
          results.push({ title: product.title, status: "skipped", reason: "no new content" });
        }

        // Small delay between requests
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        failed++;
        results.push({ title: product.title, status: "failed", error: (e as Error).message });
      }
    }

    return json({
      success: true,
      total: products.length,
      enriched: toEnrich.length,
      updated,
      skipped,
      failed,
      results,
    });
  } catch (error) {
    console.error("Product enrichment error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BneyZionBot/1.0", "Accept": "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractProductContent(html: string): {
  content: string | null;
  description: string | null;
  imageUrl: string | null;
} {
  // Primary: Elementor text-editor widget (used by this WooCommerce/Elementor theme)
  // The product description lives inside elementor-widget-text-editor > elementor-widget-container
  const textEditorRegex = /data-widget_type=["']text-editor\.default["'][^>]*>\s*<div[^>]*class=["'][^"']*elementor-widget-container[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  
  let fullContent: string | null = null;
  let shortDesc: string | null = null;
  
  // Collect all text-editor widget contents
  const allTextBlocks: string[] = [];
  let match;
  while ((match = textEditorRegex.exec(html)) !== null) {
    const block = match[1].trim();
    if (block.length > 30) {
      allTextBlocks.push(block);
    }
  }
  
  if (allTextBlocks.length > 0) {
    // Join all text blocks as the full content
    fullContent = cleanProductHtml(allTextBlocks.join("\n"));
    shortDesc = stripHtml(allTextBlocks[0]).substring(0, 500);
  }

  // Fallback: try standard WooCommerce selectors
  if (!fullContent) {
    const fallbackSelectors = [
      /<div[^>]*class=["'][^"']*woocommerce-product-details__short-description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id=["']tab-description["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=["'][^"']*woocommerce-Tabs-panel--description[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
    ];
    for (const regex of fallbackSelectors) {
      const m = html.match(regex);
      if (m && m[1].trim().length > 50) {
        fullContent = cleanProductHtml(m[1]);
        shortDesc = stripHtml(m[1]).substring(0, 500);
        break;
      }
    }
  }

  // Fallback: extract all <p> tags from the product area
  if (!fullContent) {
    const productArea = html.match(/class=["'][^"']*product[^"']*["'][^>]*>([\s\S]*?)(?:<section|אולי יעניין)/i);
    if (productArea) {
      const parts = productArea[1].match(/<p[^>]*>[\s\S]*?<\/p>/gi);
      if (parts && parts.length > 0) {
        fullContent = cleanProductHtml(parts.join("\n"));
        shortDesc = stripHtml(parts[0]).substring(0, 500);
      }
    }
  }

  // Meta description fallback for short description
  if (!shortDesc) {
    const metaMatch = html.match(/<meta\s+(?:name|property)=["'](?:description|og:description)["']\s+content=["']([^"']+)["']/i);
    if (metaMatch) {
      shortDesc = decodeEntities(metaMatch[1]).trim();
    }
  }

  // Extract product image
  let imageUrl: string | null = null;
  const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (imgMatch) {
    imageUrl = imgMatch[1];
  }

  return {
    content: fullContent,
    description: shortDesc,
    imageUrl,
  };
}

function cleanProductHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/\s+class=["'][^"']*["']/gi, "")
    .replace(/\s+style=["'][^"']*["']/gi, "")
    .replace(/\s+id=["'][^"']*["']/gi, "")
    .replace(/\s+data-[a-z-]+=["'][^"']*["']/gi, "")
    .replace(/<div[^>]*>\s*<\/div>/gi, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&hellip;/gi, "…")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&lrm;/gi, "")
    .replace(/&rlm;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
