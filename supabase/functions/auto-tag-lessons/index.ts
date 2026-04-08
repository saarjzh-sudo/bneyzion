import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UMBRACO_BASE = "https://www.bneyzion.co.il";

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ").replace(/[״""]/g, '"').replace(/[׳'']/g, "'").replace(/–/g, "-").replace(/[\u200F\u200E]/g, "");
}

/** Extract H3 lesson titles from the scraped HTML/markdown of a category page */
function extractLessonTitles(markdown: string): string[] {
  const titles: string[] = [];
  // Match ### [title](url) pattern
  const regex = /^###\s*\[([^\]]+)\]/gm;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const title = normalize(match[1]);
    if (title && !titles.includes(title)) {
      titles.push(title);
    }
  }
  return titles;
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

    if (action === "scrape-and-tag") {
      return await scrapeAndTag(supabase, body);
    } else if (action === "tag-by-titles") {
      return await tagByTitles(supabase, body);
    } else if (action === "list-tagged") {
      return await listTagged(supabase, body);
    }

    return json({ error: "Invalid action. Use: scrape-and-tag, tag-by-titles, list-tagged" }, 400);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

/** Scrape a category page from the original site and auto-tag matching lessons */
async function scrapeAndTag(supabase: any, body: any) {
  const { topicName, topicSlug, pageUrl, parentTopicId } = body;
  if (!topicName || !pageUrl) return json({ error: "topicName and pageUrl required" }, 400);

  console.log(`Scraping ${pageUrl} for topic "${topicName}"...`);

  // 1. Fetch the page
  const res = await fetch(pageUrl.startsWith("http") ? pageUrl : `${UMBRACO_BASE}${pageUrl}`);
  if (!res.ok) return json({ error: `Failed to fetch page: ${res.status}` }, 500);
  const html = await res.text();

  // Extract titles from the HTML (look for lesson title links)
  const titles: string[] = [];
  // Pattern 1: <h3><a ...>title</a></h3>
  const h3Regex = /<h3[^>]*>\s*<a[^>]*>([^<]+)<\/a>\s*<\/h3>/gi;
  let match;
  while ((match = h3Regex.exec(html)) !== null) {
    const title = normalize(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    if (title && !titles.includes(title)) titles.push(title);
  }
  // Pattern 2: class="lesson-title" or similar
  const titleRegex2 = /class="[^"]*lesson[^"]*title[^"]*"[^>]*>([^<]+)</gi;
  while ((match = titleRegex2.exec(html)) !== null) {
    const title = normalize(match[1]);
    if (title && !titles.includes(title)) titles.push(title);
  }

  console.log(`Found ${titles.length} lesson titles on page`);

  if (titles.length === 0) {
    return json({ error: "No lesson titles found on page", htmlLength: html.length }, 400);
  }

  return await doTagging(supabase, topicName, topicSlug || topicName.replace(/\s+/g, '-'), parentTopicId, titles);
}

/** Tag lessons by explicit list of titles */
async function tagByTitles(supabase: any, body: any) {
  const { topicName, topicSlug, parentTopicId, titles } = body;
  if (!topicName || !titles?.length) return json({ error: "topicName and titles[] required" }, 400);

  const normalizedTitles = titles.map((t: string) => normalize(t));
  return await doTagging(supabase, topicName, topicSlug || topicName.replace(/\s+/g, '-'), parentTopicId, normalizedTitles);
}

/** Core tagging logic */
async function doTagging(supabase: any, topicName: string, topicSlug: string, parentTopicId: string | null, titles: string[]) {
  // 1. Find or create the topic
  let topicId: string;
  const { data: existingTopic } = await supabase
    .from("topics")
    .select("id")
    .eq("name", topicName)
    .maybeSingle();

  if (existingTopic) {
    topicId = existingTopic.id;
    console.log(`Topic "${topicName}" already exists: ${topicId}`);
  } else {
    const { data: newTopic, error: topicError } = await supabase
      .from("topics")
      .insert({ name: topicName, slug: topicSlug, parent_id: parentTopicId || null })
      .select("id")
      .single();
    if (topicError) return json({ error: `Failed to create topic: ${topicError.message}` }, 500);
    topicId = newTopic.id;
    console.log(`Created topic "${topicName}": ${topicId}`);
  }

  // 2. Match titles to lessons in DB
  const matched: Array<{ lessonId: string; title: string }> = [];
  const notFound: string[] = [];

  // Batch search: for each title, try exact match first, then normalized
  for (const title of titles) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, title")
      .eq("title", title)
      .limit(1);

    if (lessons && lessons.length > 0) {
      matched.push({ lessonId: lessons[0].id, title: lessons[0].title });
      continue;
    }

    // Try ilike match
    const { data: fuzzyLessons } = await supabase
      .from("lessons")
      .select("id, title")
      .ilike("title", `%${title}%`)
      .limit(5);

    if (fuzzyLessons && fuzzyLessons.length > 0) {
      // Pick the closest match by title length
      const best = fuzzyLessons.sort((a: any, b: any) => 
        Math.abs(a.title.length - title.length) - Math.abs(b.title.length - title.length)
      )[0];
      matched.push({ lessonId: best.id, title: best.title });
    } else {
      notFound.push(title);
    }
  }

  console.log(`Matched ${matched.length}/${titles.length} lessons, ${notFound.length} not found`);

  // 3. Get existing associations to avoid duplicates
  const matchedIds = matched.map(m => m.lessonId);
  const existingAssocs = new Set<string>();
  for (let i = 0; i < matchedIds.length; i += 500) {
    const chunk = matchedIds.slice(i, i + 500);
    const { data: existing } = await supabase
      .from("lesson_topics")
      .select("lesson_id")
      .eq("topic_id", topicId)
      .in("lesson_id", chunk);
    if (existing) existing.forEach((e: any) => existingAssocs.add(e.lesson_id));
  }

  // 4. Insert new associations
  const newAssocs = matched.filter(m => !existingAssocs.has(m.lessonId));
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < newAssocs.length; i += 50) {
    const batch = newAssocs.slice(i, i + 50).map(m => ({
      lesson_id: m.lessonId,
      topic_id: topicId,
    }));
    const { error } = await supabase.from("lesson_topics").insert(batch);
    if (error) {
      console.error(`Insert batch error:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
    }
  }

  return json({
    success: true,
    topicId,
    topicName,
    totalTitlesScraped: titles.length,
    matchedInDb: matched.length,
    alreadyTagged: existingAssocs.size,
    newlyTagged: inserted,
    notFoundInDb: notFound.length,
    errors,
    notFound,
    matched: matched.map(m => m.title),
  });
}

/** List lessons tagged with a given topic */
async function listTagged(supabase: any, body: any) {
  const { topicName } = body;
  if (!topicName) return json({ error: "topicName required" }, 400);

  const { data: topic } = await supabase
    .from("topics")
    .select("id, name")
    .eq("name", topicName)
    .maybeSingle();

  if (!topic) return json({ error: "Topic not found" }, 404);

  const { data: associations, count } = await supabase
    .from("lesson_topics")
    .select("lesson_id, lessons(id, title, rabbi_id, rabbis(name))", { count: "exact" })
    .eq("topic_id", topic.id)
    .limit(500);

  return json({
    topicId: topic.id,
    topicName: topic.name,
    totalLessons: count,
    lessons: (associations || []).map((a: any) => ({
      id: a.lessons?.id,
      title: a.lessons?.title,
      rabbi: a.lessons?.rabbis?.name,
    })),
  });
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
