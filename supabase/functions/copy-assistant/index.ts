/**
 * copy-assistant — שכבת הצ'אט של מרכז-השליטה (רמה 13, אישור סער 10.7).
 *
 * הרב יואב כותב בקשה חופשית ("תשנה את הכותרת של החנות ל...") והפונקציה מציעה
 * שינוי לשדה אחד מהמרשם (siteCopyRegistry שנשלח מהקליינט) — היא לעולם לא
 * כותבת בעצמה: ההצעה חוזרת ל-UI, שם יש תצוגת לפני/אחרי וכפתור אישור מפורש,
 * וההחלה עוברת דרך RLS (כתיבת-אדמין רק על מפתחות-תוכן).
 *
 * אבטחה: הקריאה דורשת JWT של משתמש עם role=admin (נבדק כאן מול user_roles
 * עם service key). GEMINI_API_KEY = secret קיים (של navigation-bot).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface RegistryField {
  key: string;
  label: string;
  group: string;
  hint?: string;
  sensitive?: boolean;
  current: string;
}

async function requireAdmin(req: Request): Promise<string | null> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
  });
  if (!userRes.ok) return null;
  const user = await userRes.json();
  if (!user?.id) return null;

  const rolesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${user.id}&role=eq.admin&select=role`,
    { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } },
  );
  if (!rolesRes.ok) return null;
  const roles = await rolesRes.json();
  return Array.isArray(roles) && roles.length > 0 ? (user.email ?? user.id) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const admin = await requireAdmin(req);
  if (!admin) return json({ error: "admin only" }, 403);

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY not configured" }, 500);

  let body: { message?: string; registry?: RegistryField[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const message = (body.message ?? "").trim().slice(0, 600);
  const registry = (body.registry ?? []).slice(0, 80);
  if (!message || registry.length === 0) {
    return json({ error: "message + registry required" }, 400);
  }

  const registryText = registry
    .map(
      (f) =>
        `- key: ${f.key} | קבוצה: ${f.group} | תווית: ${f.label}${f.hint ? ` | איפה: ${f.hint}` : ""}${f.sensitive ? " | (רגיש — עריכה רק לסער)" : ""}\n  נוסח נוכחי: "${f.current.slice(0, 300)}"`,
    )
    .join("\n");

  const systemPrompt = `אתה עוזר עריכת-נוסחים של אתר "בני ציון" (אתר תנ"ך). מולך עורך-תוכן מורשה.
לפניך מרשם השדות היחידים שמותר להציע לשנות. על סמך בקשת העורך, בחר שדה אחד מתאים והצע נוסח חדש.

חוקים:
1. מותר להציע רק key שקיים במרשם — לעולם לא להמציא key.
2. הנוסח החדש בעברית טבעית, באורך דומה לנוסח הנוכחי (אלא אם התבקש אחרת), בלי אמוג'י.
3. אם הבקשה לא מתאימה לאף שדה במרשם — החזר key ריק והסבר קצר מה כן אפשר.
4. החזר JSON בלבד במבנה: {"key": "...", "new_value": "...", "explanation": "הסבר קצר בעברית"}

המרשם:
${registryText}`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!geminiRes.ok) {
    const detail = await geminiRes.text();
    console.error("[copy-assistant] gemini error", geminiRes.status, detail.slice(0, 300));
    return json({ error: "model error" }, 502);
  }
  const data = await geminiRes.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let suggestion: { key?: string; new_value?: string; explanation?: string };
  try {
    suggestion = JSON.parse(raw);
  } catch {
    return json({ error: "model returned non-json", raw: raw.slice(0, 200) }, 502);
  }

  // fail-closed: ההצעה חייבת להצביע על שדה מהמרשם שנשלח
  const field = registry.find((f) => f.key === suggestion.key);
  if (!field) {
    return json({
      key: null,
      explanation: suggestion.explanation ?? "הבקשה לא מתאימה לאף שדה במרשם הנוכחי.",
    });
  }

  console.log(`[copy-assistant] ${admin} → ${field.key}`);
  return json({
    key: field.key,
    label: field.label,
    current: field.current,
    new_value: String(suggestion.new_value ?? "").slice(0, 2000),
    explanation: suggestion.explanation ?? "",
    sensitive: !!field.sensitive,
  });
});
