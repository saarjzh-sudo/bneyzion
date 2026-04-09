import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://bneyzion.vercel.app";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date().toISOString();

  // Fetch all data in parallel
  const [lessonsRes, seriesRes, rabbisRes] = await Promise.all([
    supabase.from("lessons").select("id, updated_at").eq("status", "published").order("updated_at", { ascending: false }),
    supabase.from("series").select("id, created_at").eq("status", "active").order("created_at", { ascending: false }),
    supabase.from("rabbis").select("id, created_at").eq("status", "active").order("created_at", { ascending: false }),
  ]);

  const lessons = lessonsRes.data ?? [];
  const series = seriesRes.data ?? [];
  const rabbis = rabbisRes.data ?? [];

  const urls: string[] = [];

  // Static pages
  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/rabbis", priority: "0.8", changefreq: "weekly" },
    { path: "/series", priority: "0.8", changefreq: "weekly" },
    { path: "/store", priority: "0.7", changefreq: "weekly" },
    { path: "/parasha", priority: "0.8", changefreq: "weekly" },
    { path: "/about", priority: "0.5", changefreq: "monthly" },
    { path: "/contact", priority: "0.4", changefreq: "monthly" },
    { path: "/donate", priority: "0.5", changefreq: "monthly" },
    { path: "/memorial", priority: "0.5", changefreq: "monthly" },
    { path: "/teachers", priority: "0.6", changefreq: "monthly" },
  ];

  for (const page of staticPages) {
    urls.push(`  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${now.split("T")[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
  }

  // Lessons
  for (const l of lessons) {
    urls.push(`  <url>
    <loc>${SITE_URL}/lessons/${l.id}</loc>
    <lastmod>${(l.updated_at || now).split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  // Series
  for (const s of series) {
    urls.push(`  <url>
    <loc>${SITE_URL}/series/${s.id}</loc>
    <lastmod>${(s.created_at || now).split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  // Rabbis
  for (const r of rabbis) {
    urls.push(`  <url>
    <loc>${SITE_URL}/rabbis/${r.id}</loc>
    <lastmod>${(r.created_at || now).split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
