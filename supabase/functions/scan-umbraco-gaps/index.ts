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

interface UmbracoNode {
  id: number;
  name: string;
  contentTypeAlias: string;
  hasChildren: boolean;
  childCount?: number;
}

interface GapItem {
  umbracoId: number;
  umbracoName: string;
  umbracoType: string;
  parentName: string;
  parentId: number;
  status: "missing" | "empty" | "partial";
  dbSeriesId?: string;
  dbLessonCount?: number;
  umbracoChildCount?: number;
  path: string;
}

// ─── Umbraco helpers ───

async function umbracoLogin(): Promise<UmbracoSession> {
  const username = Deno.env.get("UMBRACO_USERNAME")!;
  const password = Deno.env.get("UMBRACO_PASSWORD")!;

  const loginRes = await fetch(
    `${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/Authentication/PostLogin`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      redirect: "manual",
    }
  );

  if (!loginRes.ok && loginRes.status !== 200) {
    throw new Error(`Umbraco login failed: ${loginRes.status}`);
  }

  const setCookieHeaders: string[] = [];
  loginRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") setCookieHeaders.push(value);
  });

  const cookieHeader = setCookieHeaders.map((c) => c.split(";")[0]).join("; ");
  let xsrfToken = "";
  for (const c of setCookieHeaders) {
    const match = c.match(/(?:^|\s)XSRF-TOKEN=([^;]+)/);
    if (match) {
      xsrfToken = decodeURIComponent(match[1]);
      break;
    }
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

  const res = await fetch(
    `${UMBRACO_BASE}/umbraco/backoffice/UmbracoApi/${endpoint}`,
    { headers }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Umbraco API error ${res.status}: ${text.substring(0, 200)}`);
  const clean = text.replace(/^\)\]\}',?\n?/, "");
  return JSON.parse(clean);
}

async function getChildren(session: UmbracoSession, parentId: number, pageSize = 500): Promise<any[]> {
  const data = await umbracoGet(
    session,
    `Content/GetChildren?id=${parentId}&pageSize=${pageSize}&pageNumber=1&orderBy=SortOrder&orderDirection=Ascending`
  );
  const items = data.items || data;
  return Array.isArray(items) ? items : [];
}

// ─── Recursive tree walker ───

interface TreeNode {
  id: number;
  name: string;
  type: string;
  childCount: number;
  children: TreeNode[];
  path: string;
}

async function walkTree(
  session: UmbracoSession,
  parentId: number,
  parentPath: string,
  maxDepth: number,
  currentDepth: number
): Promise<TreeNode[]> {
  if (currentDepth >= maxDepth) return [];

  const children = await getChildren(session, parentId);
  const nodes: TreeNode[] = [];

  for (const child of children) {
    const nodePath = `${parentPath} > ${child.name}`;
    const node: TreeNode = {
      id: child.id,
      name: child.name,
      type: child.contentTypeAlias || "unknown",
      childCount: child.childCount || 0,
      path: nodePath,
      children: [],
    };

    // Always recurse if has children
    if (child.hasChildren && currentDepth < maxDepth - 1) {
      node.children = await walkTree(session, child.id, nodePath, maxDepth, currentDepth + 1);
    }

    nodes.push(node);
  }

  return nodes;
}

// ─── DB helpers ───

interface DbSeries {
  id: string;
  title: string;
  lesson_count: number;
}

async function loadDbSeries(supabase: any): Promise<DbSeries[]> {
  const all: DbSeries[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("series")
      .select("id, title, lesson_count")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to load series: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function normalizeTitle(t: string): string {
  return t.replace(/[\u0591-\u05C7]/g, "").replace(/[^א-תa-zA-Z0-9]/g, "").toLowerCase();
}

function findMatchingSeries(umbracoName: string, dbSeries: DbSeries[]): DbSeries | undefined {
  const norm = normalizeTitle(umbracoName);
  return dbSeries.find((s) => normalizeTitle(s.title) === norm);
}

// ─── Gap analysis ───

function analyzeGaps(tree: TreeNode[], dbSeries: DbSeries[], parentName: string, parentId: number): GapItem[] {
  const gaps: GapItem[] = [];

  for (const node of tree) {
    // Only analyze nodes that have children (containers/series)
    // Leaf nodes without children are individual content items
    if (node.childCount === 0 && node.children.length === 0) continue;

    const match = findMatchingSeries(node.name, dbSeries);

    if (!match) {
      gaps.push({
        umbracoId: node.id,
        umbracoName: node.name,
        umbracoType: node.type,
        parentName,
        parentId,
        status: "missing",
        umbracoChildCount: node.childCount,
        path: node.path,
      });
    } else if (match.lesson_count === 0 && node.childCount > 0) {
      gaps.push({
        umbracoId: node.id,
        umbracoName: node.name,
        umbracoType: node.type,
        parentName,
        parentId,
        status: "empty",
        dbSeriesId: match.id,
        dbLessonCount: match.lesson_count,
        umbracoChildCount: node.childCount,
        path: node.path,
      });
    } else if (node.childCount > 0 && match.lesson_count < node.childCount * 0.5) {
      gaps.push({
        umbracoId: node.id,
        umbracoName: node.name,
        umbracoType: node.type,
        parentName,
        parentId,
        status: "partial",
        dbSeriesId: match.id,
        dbLessonCount: match.lesson_count,
        umbracoChildCount: node.childCount,
        path: node.path,
      });
    }

    // Recurse into children
    if (node.children.length > 0) {
      gaps.push(...analyzeGaps(node.children, dbSeries, node.name, node.id));
    }
  }

  return gaps;
}

// ─── Main handler ───

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
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const rootNodeId = body.rootNodeId || 6294; // דף הבית
    const maxDepth = body.maxDepth || 6;

    console.log(`Starting Umbraco gap scan from node ${rootNodeId}, maxDepth=${maxDepth}`);

    // Step 1: Login to Umbraco
    const session = await umbracoLogin();
    console.log("Umbraco login successful");

    // Step 2: Walk the tree
    const tree = await walkTree(session, rootNodeId, "root", maxDepth, 0);
    console.log(`Tree walk complete: ${tree.length} top-level nodes found`);

    // Step 3: Load all DB series
    const dbSeries = await loadDbSeries(supabase);
    console.log(`Loaded ${dbSeries.length} series from DB`);

    // Step 4: Analyze gaps
    const gaps = analyzeGaps(tree, dbSeries, "root", rootNodeId);

    // Step 5: Build summary
    const summary = {
      totalUmbracoNodes: countNodes(tree),
      totalDbSeries: dbSeries.length,
      totalGaps: gaps.length,
      missing: gaps.filter((g) => g.status === "missing").length,
      empty: gaps.filter((g) => g.status === "empty").length,
      partial: gaps.filter((g) => g.status === "partial").length,
    };

    // Step 6: Build tree overview (compact)
    const treeOverview = tree.map((n) => compactTree(n));

    return json({
      summary,
      gaps: gaps.sort((a, b) => {
        const order = { missing: 0, empty: 1, partial: 2 };
        return order[a.status] - order[b.status];
      }),
      treeOverview,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

function countNodes(nodes: TreeNode[]): number {
  let count = 0;
  for (const n of nodes) {
    count += 1 + countNodes(n.children);
  }
  return count;
}

function compactTree(node: TreeNode): any {
  const result: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    childCount: node.childCount,
  };
  if (node.children.length > 0) {
    result.children = node.children.map(compactTree);
  }
  return result;
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
