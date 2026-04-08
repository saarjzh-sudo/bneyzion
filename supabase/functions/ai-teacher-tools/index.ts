import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tool, topic, content, level } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (tool) {
      case "lesson-plan":
        systemPrompt = "אתה מומחה חינוכי ליצירת מערכי שיעור בתנ\"ך. צור מערך שיעור מפורט ומסודר בעברית הכולל: מטרות, חומרים, פעילויות, שאלות לדיון, ומשימות. השתמש בעיצוב Markdown.";
        userPrompt = `צור מערך שיעור בנושא: ${topic}${level ? `\nרמה: ${level}` : ""}`;
        break;
      case "quiz":
        systemPrompt = "אתה יוצר מבחנים בתנ\"ך. צור מבחן מסודר בעברית עם שאלות רבות-ברירה ושאלות פתוחות. כלול תשובות בסוף. השתמש בעיצוב Markdown.";
        userPrompt = `צור מבחן בנושא: ${topic}${level ? `\nרמה: ${level}` : ""}${content ? `\nתוכן השיעור: ${content.substring(0, 2000)}` : ""}`;
        break;
      case "word-search":
        systemPrompt = "אתה יוצר תפזורות מילים בעברית. צור רשימת מילים לתפזורת (15-20 מילים) עם הגדרות קצרות. הצג את המילים בטבלה מסודרת. השתמש בעיצוב Markdown.";
        userPrompt = `צור תפזורת מילים בנושא: ${topic}${content ? `\nבהתבסס על התוכן: ${content.substring(0, 2000)}` : ""}`;
        break;
      default:
        return new Response(JSON.stringify({ error: "כלי לא תקין" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "יותר מדי בקשות, נסה שוב בעוד דקה" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש חידוש מנוי AI" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI teacher tools error:", response.status, t);
      return new Response(JSON.stringify({ error: "שגיאה בשירות AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("teacher tools error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "שגיאה לא ידועה" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
