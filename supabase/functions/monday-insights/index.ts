/**
 * monday-insights — נתוני מנויים + תרומות מלוחות ה-Monday של בני ציון (server-side).
 *
 * הטוקן נשמר כ-Supabase secret `MONDAY_API_TOKEN` ואינו נחשף ל-client.
 * מקורות:
 *  - מנויים: לוח "היסטוריית מנויים חודשית" (5094769002).
 *  - תרומות: לוח "תרומות-קמפיינים — Grow live (יהושע/סעדיה)" (5099487161).
 *
 * תגובה:
 *  {
 *    months: [{ month, newSubs, left, active, mrr, churn }],
 *    current: {...},
 *    donations: { campaigns: [{ key, label, count, total }], total, count }
 *  }
 *
 * Deploy:  supabase functions deploy monday-insights
 * Secret:  supabase secrets set MONDAY_API_TOKEN=<token>
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUBS_BOARD = 5094769002;
const DONATIONS_BOARD = 5099487161;

const SUBS_COL = {
  month: "date_mm2fttq4", newSubs: "numeric_mm2fqsmn", left: "numeric_mm2fy996",
  active: "numeric_mm2f40ak", mrr: "numeric_mm2f63pe", churn: "numeric_mm2f4kqs",
};
const DON_COL = { amount: "numeric_mm4tc062", date: "date_mm4t1bh2", desc: "text_mm4tkcbp" };

async function mondayFetch(token: string, query: string) {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Authorization": token, "Content-Type": "application/json", "API-Version": "2024-10" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function fetchMonths(token: string) {
  const q = `query { boards(ids: [${SUBS_BOARD}]) { items_page(limit: 100) { items { name column_values { id text } } } } }`;
  const items = (await mondayFetch(token, q))?.boards?.[0]?.items_page?.items ?? [];
  const num = (cvs: any[], id: string) => { const n = Number(cvs.find((c) => c.id === id)?.text); return Number.isFinite(n) ? n : 0; };
  const txt = (cvs: any[], id: string) => cvs.find((c) => c.id === id)?.text ?? "";
  return items
    .map((it: any) => ({
      month: txt(it.column_values, SUBS_COL.month) || it.name,
      newSubs: num(it.column_values, SUBS_COL.newSubs),
      left: num(it.column_values, SUBS_COL.left),
      active: num(it.column_values, SUBS_COL.active),
      mrr: num(it.column_values, SUBS_COL.mrr),
      churn: num(it.column_values, SUBS_COL.churn),
    }))
    .filter((m: any) => m.month)
    .sort((a: any, b: any) => a.month.localeCompare(b.month));
}

/** מסווג תרומה לקמפיין לפי תיאור-העסקה */
function classify(desc: string): "yehoshua" | "saadia" | "other" {
  if (desc.includes("יהושע")) return "yehoshua";
  if (desc.includes("סעדיה")) return "saadia";
  return "other";
}

async function fetchDonations(token: string) {
  const totals: Record<string, { count: number; total: number }> = {
    yehoshua: { count: 0, total: 0 }, saadia: { count: 0, total: 0 }, other: { count: 0, total: 0 },
  };
  let cursor: string | null = null;
  let guard = 0;
  do {
    const data: any = cursor
      ? await mondayFetch(token, `query { next_items_page(limit: 500, cursor: "${cursor}") { cursor items { column_values { id text } } } }`)
      : await mondayFetch(token, `query { boards(ids: [${DONATIONS_BOARD}]) { items_page(limit: 500) { cursor items { column_values { id text } } } } }`);
    const pageData = cursor ? data.next_items_page : data.boards?.[0]?.items_page;
    const items = pageData?.items ?? [];
    for (const it of items) {
      const cv: Record<string, string> = {};
      for (const c of it.column_values) cv[c.id] = c.text;
      const amt = Number(cv[DON_COL.amount]) || 0;
      const key = classify(cv[DON_COL.desc] || "");
      totals[key].count += 1;
      totals[key].total += amt;
    }
    cursor = pageData?.cursor ?? null;
    guard += 1;
  } while (cursor && guard < 10);

  const labels: Record<string, string> = {
    yehoshua: "קמפיין ספר יהושע",
    saadia: 'לזכר סעדיה הי"ד',
    other: "אחר / לא מסווג",
  };
  const campaigns = Object.entries(totals).map(([key, v]) => ({
    key, label: labels[key], count: v.count, total: Math.round(v.total),
  }));
  return {
    campaigns,
    total: campaigns.reduce((s, c) => s + c.total, 0),
    count: campaigns.reduce((s, c) => s + c.count, 0),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const token = Deno.env.get("MONDAY_API_TOKEN");
    if (!token) throw new Error("MONDAY_API_TOKEN not configured");

    const [months, donations] = await Promise.all([fetchMonths(token), fetchDonations(token)]);
    const current = months[months.length - 1] ?? null;

    return new Response(JSON.stringify({ months, current, donations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
