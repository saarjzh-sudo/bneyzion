/**
 * monday-insights — מושך נתוני מנויים מלוח Monday של בני ציון (server-side).
 *
 * הטוקן נשמר כ-Supabase secret `MONDAY_API_TOKEN` ואינו נחשף ל-client.
 * מקור: לוח "היסטוריית מנויים חודשית" (5094769002) — 15 חודשים של
 * מנויים-חדשים / עזבו / סהכ-פעיל / MRR / אחוז-נטישה.
 *
 * תגובה:
 *  { months: [{ month, newSubs, left, active, mrr, churn }], current: {...} }
 *
 * Deploy:  supabase functions deploy monday-insights
 * Secret:  supabase secrets set MONDAY_API_TOKEN=<token>
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOARD_ID = 5094769002;
const COL = {
  month:  "date_mm2fttq4",
  newSubs:"numeric_mm2fqsmn",
  left:   "numeric_mm2fy996",
  active: "numeric_mm2f40ak",
  mrr:    "numeric_mm2f63pe",
  churn:  "numeric_mm2f4kqs",
};

const QUERY = `query {
  boards(ids: [${BOARD_ID}]) {
    items_page(limit: 100) {
      items { name column_values { id text } }
    }
  }
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token = Deno.env.get("MONDAY_API_TOKEN");
    if (!token) throw new Error("MONDAY_API_TOKEN not configured");

    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
        "API-Version": "2024-10",
      },
      body: JSON.stringify({ query: QUERY }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));

    const items = json?.data?.boards?.[0]?.items_page?.items ?? [];
    const num = (cvs: any[], id: string) => {
      const v = cvs.find((c) => c.id === id)?.text;
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const txt = (cvs: any[], id: string) => cvs.find((c) => c.id === id)?.text ?? "";

    const months = items
      .map((it: any) => ({
        month:   txt(it.column_values, COL.month) || it.name,
        newSubs: num(it.column_values, COL.newSubs),
        left:    num(it.column_values, COL.left),
        active:  num(it.column_values, COL.active),
        mrr:     num(it.column_values, COL.mrr),
        churn:   num(it.column_values, COL.churn),
      }))
      .filter((m: any) => m.month)
      .sort((a: any, b: any) => a.month.localeCompare(b.month));

    const current = months[months.length - 1] ?? null;

    return new Response(JSON.stringify({ months, current }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
