import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UMBRACO_BASE = "https://www.bneyzion.co.il";

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

  if (!loginRes.ok && loginRes.status !== 200) {
    throw new Error(`Umbraco login failed: ${loginRes.status}`);
  }

  const setCookieHeaders: string[] = [];
  loginRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      setCookieHeaders.push(value);
    }
  });

  const cookieHeader = setCookieHeaders.map(c => c.split(";")[0]).join("; ");
  let xsrfToken = "";
  for (const c of setCookieHeaders) {
    const match = c.match(/(?:^|\s)XSRF-TOKEN=([^;]+)/);
    if (match) {
      xsrfToken = decodeURIComponent(match[1]);
      break;
    }
  }

  // Consume body
  await loginRes.text();
  return { cookieHeader, xsrfToken };
}

async function umbracoGet(session: UmbracoSession, endpoint: string): Promise<any> {
  const headers: Record<string, string> = {
    Cookie: session.cookieHeader,
    Accept: "application/json",
  };
  if (session.xsrfToken) {
    headers["X-XSRF-TOKEN"] = session.xsrfToken;
  }

  const res = await fetch(`${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/${endpoint}`, { headers });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Umbraco API error ${res.status}: ${text.substring(0, 200)}`);
  }

  const clean = text.replace(/^\)\]\}',?\n?/, "");
  return JSON.parse(clean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { action, nodeId } = await req.json();

    const session = await umbracoLogin();

    if (action === "explore-node") {
      // Get a specific node's full details
      const id = nodeId || -1;
      const data = await umbracoGet(session, `Content/GetById?id=${id}`);
      return json({
        id: data.id,
        name: data.name,
        contentTypeAlias: data.contentTypeAlias,
        tabs: data.tabs?.map((t: any) => ({
          label: t.label,
          properties: t.properties?.map((p: any) => ({
            alias: p.alias,
            label: p.label,
            value: typeof p.value === "string" ? p.value.substring(0, 200) : p.value,
            editor: p.editor,
          })),
        })),
        childCount: data.childCount || 0,
      });
    }

    if (action === "explore-children") {
      const id = nodeId || -1;
      const pageSize = 500;
      const data = await umbracoGet(session, `Content/GetChildren?id=${id}&pageSize=${pageSize}&pageNumber=1&orderBy=SortOrder&orderDirection=Ascending`);
      const items = data.items || data;
      const allItems = Array.isArray(items) ? items : [];
      
      // Count by contentTypeAlias
      const typeCounts: Record<string, number> = {};
      for (const item of allItems) {
        typeCounts[item.contentTypeAlias] = (typeCounts[item.contentTypeAlias] || 0) + 1;
      }
      
      return json({
        total: data.totalItems || allItems.length,
        typeCounts,
        items: allItems.slice(0, 50).map((item: any) => ({
          id: item.id,
          name: item.name,
          contentTypeAlias: item.contentTypeAlias,
          hasChildren: item.hasChildren,
          childCount: item.childCount,
        })),
      });
    }

    if (action === "explore-tree") {
      // Recursively explore the tree up to 2 levels
      const id = nodeId || 6294; // default: דף הבית
      const root = await umbracoGet(session, `Content/GetById?id=${id}`);

      const children = await umbracoGet(session, `Content/GetChildren?id=${id}&pageSize=50&pageNumber=1&orderBy=SortOrder&orderDirection=Ascending`);
      const childItems = children.items || children || [];

      const tree: any = {
        id: root.id,
        name: root.name,
        contentTypeAlias: root.contentTypeAlias,
        children: [],
      };

      for (const child of (Array.isArray(childItems) ? childItems : []).slice(0, 50)) {
        const childNode: any = {
          id: child.id,
          name: child.name,
          contentTypeAlias: child.contentTypeAlias,
          hasChildren: child.hasChildren,
          childCount: child.childCount,
        };

        // If has children, get grandchildren count
        if (child.hasChildren) {
          try {
            const gc = await umbracoGet(session, `Content/GetChildren?id=${child.id}&pageSize=5&pageNumber=1&orderBy=SortOrder&orderDirection=Ascending`);
            const gcItems = gc.items || gc || [];
            childNode.sampleChildren = (Array.isArray(gcItems) ? gcItems : []).slice(0, 5).map((g: any) => ({
              id: g.id,
              name: g.name,
              contentTypeAlias: g.contentTypeAlias,
              childCount: g.childCount,
            }));
            childNode.totalChildren = gc.totalItems || gcItems.length;
          } catch { /* skip */ }
        }

        tree.children.push(childNode);
      }

      return json(tree);
    }

    return json({ error: "Invalid action. Use: explore-node, explore-children, explore-tree" }, 400);

  } catch (error) {
    console.error("Error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
