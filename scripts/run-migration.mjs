#!/usr/bin/env node
/**
 * run-migration.mjs
 * Applies a SQL migration file to Supabase via the REST API (no psql needed).
 *
 * Usage:
 *   node scripts/run-migration.mjs <sql-file>
 *   node scripts/run-migration.mjs supabase/migrations/20260430_weekly_program_foundation.sql
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env or .env.local
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ── Env ─────────────────────────────────────────────────────────────────────
const envFiles = [".env.local", ".env"];
let env = {};
for (const f of envFiles) {
  const p = resolve(process.cwd(), f);
  if (existsSync(p)) {
    const lines = readFileSync(p, "utf8").split("\n");
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY =
  env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ── SQL file ──────────────────────────────────────────────────────────────
const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Usage: node scripts/run-migration.mjs <sql-file>");
  process.exit(1);
}

const sqlPath = resolve(process.cwd(), sqlFile);
if (!existsSync(sqlPath)) {
  console.error(`ERROR: File not found: ${sqlPath}`);
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
console.log(`Applying migration: ${sqlFile}`);
console.log(`File size: ${sql.length} chars`);

// ── Execute via Supabase REST sql endpoint ────────────────────────────────
// The /rest/v1/rpc/... approach doesn't work for DDL.
// We use the Management API: POST /rest/v1/sql (service role)
// Actually the pg endpoint is: POST {SUPABASE_URL}/rest/v1/ with Content-Type application/sql
// Supabase exposes raw SQL execution at the pg endpoint via service role.

const url = `${SUPABASE_URL}/rest/v1/`;

// Split SQL into individual statements to execute sequentially
// (some statements like CREATE TABLE IF NOT EXISTS are idempotent)
function splitStatements(sql) {
  // Split on semicolons, but be careful with dollar-quoted strings
  const statements = [];
  let current = "";
  let inDollarQuote = false;
  let dollarTag = "";

  const lines = sql.split("\n");
  for (const line of lines) {
    // Skip pure comment lines
    if (line.trim().startsWith("--")) {
      continue;
    }

    // Check for dollar-quote start/end
    const dollarMatch = line.match(/(\$[^$]*\$)/g);
    if (dollarMatch) {
      for (const tag of dollarMatch) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = tag;
        } else if (tag === dollarTag) {
          inDollarQuote = false;
          dollarTag = "";
        }
      }
    }

    current += line + "\n";

    if (!inDollarQuote && line.trim().endsWith(";")) {
      const stmt = current.trim();
      if (stmt && stmt !== ";") {
        statements.push(stmt);
      }
      current = "";
    }
  }
  // Remaining
  if (current.trim()) {
    statements.push(current.trim());
  }
  return statements.filter((s) => s.length > 2);
}

// Use Supabase's pg endpoint via the Management API
// The correct way to run raw SQL as service role: use the `sql` RPC on supabase
// Actually: POST to /rest/v1/rpc/exec_sql doesn't exist by default.
// The cleanest way: use the Supabase JS client with service role + raw() query.
// Since we can't import @supabase/supabase-js as ESM without install, use fetch directly.

// Supabase REST doesn't support raw DDL via the regular REST endpoint.
// BUT: we can use the internal postgres REST API at /pg endpoint IF enabled,
// OR use the Management API at api.supabase.com.
//
// The simplest approach: write a Postgres function that runs our SQL, then call it.
// Even simpler: use the @supabase/supabase-js rpc() to call postgres functions.
//
// ACTUAL solution: Use the Supabase Management API (api.supabase.com) which has
// a /projects/{ref}/database/query endpoint.
// OR: use the pg REST API that ships with every Supabase project at /pg/query
//
// Let's try the undocumented but working approach:
// POST {SUPABASE_URL}/rest/v1/rpc/ won't work for DDL.
// The correct endpoint is the PostgREST query endpoint via service role.
// PostgREST supports arbitrary SQL via the /rpc endpoint only for defined functions.
//
// REAL solution: Supabase Management API
// Reference: https://supabase.com/docs/reference/api/introduction
// POST https://api.supabase.com/v1/projects/{ref}/database/query
// Requires: Authorization: Bearer <access_token> (personal access token, NOT service role)
//
// We don't have the personal access token here.
// Alternative: use @supabase/supabase-js with service role to run the migration
// via individual REST calls that map to the SQL we need.
//
// SIMPLEST APPROACH THAT ACTUALLY WORKS:
// Create the migration as a series of fetch calls to the PostgREST API.
// PostgREST with service role can call stored procedures, but not raw DDL.
//
// The ONLY clean approach without psql or the Management API PAT is:
// Use the Supabase Edge Function approach - but that requires deployment.
//
// DECISION: Use the pg/query endpoint that exists on every Supabase project.
// URL: {SUPABASE_URL}/pg/query  - this is the internal postgres REST endpoint
// This is accessible with service role key.

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    // Try the alternative endpoint
    return null; // Signal to try alternative
  }

  return await response.json();
}

// Alternative: create a temporary RPC function to run DDL
async function runViaTempFunction(sql) {
  // Create a function that runs our migration
  const wrapperSQL = `
    CREATE OR REPLACE FUNCTION _run_migration_temp()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      ${sql.replace(/\$\$/g, "$$$$")}
    END;
    $$;
  `;

  // This is circular - we can't create the function without DDL privileges either.
  // Give up and try the direct approach.
  return null;
}

// The actual working approach: Supabase has an undocumented endpoint
// that accepts raw SQL via service role: POST to /rest/v1/ with special headers.
// Let's use the well-known approach: create a Supabase client with service role
// and use the .rpc() method to call a function that executes arbitrary SQL.
// But that requires a pre-existing function...

// FINAL APPROACH: Use the Supabase REST API's ability to call pg functions
// by creating the migration as individual table operations via the REST API.
// This is verbose but reliable for our specific migration.

console.log("\n--- Attempting migration via Supabase REST API ---\n");

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  apikey: SERVICE_ROLE_KEY,
  Prefer: "return=representation",
};

// Test connection
const testResp = await fetch(
  `${SUPABASE_URL}/rest/v1/community_courses?select=id&limit=1`,
  { headers }
);
console.log(`Connection test: ${testResp.status} ${testResp.statusText}`);
if (!testResp.ok) {
  console.error("Cannot connect to Supabase. Check credentials.");
  process.exit(1);
}
console.log("Connection OK.\n");

// Since PostgREST doesn't accept raw DDL, we'll use a different approach:
// Supabase's pg/query endpoint (works with service role on some versions)
// OR generate the SQL and print instructions.

// Try pg/query
const pgResp = await fetch(`${SUPABASE_URL}/pg/query`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
  },
  body: JSON.stringify({ query: "SELECT 1 as ping" }),
});

console.log(`pg/query test: ${pgResp.status}`);

if (pgResp.status === 200 || pgResp.status === 201) {
  // pg/query works! Run the full migration
  console.log("pg/query endpoint available. Running migration...\n");
  const stmts = splitStatements(sql);
  console.log(`Found ${stmts.length} statements to execute.\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, " ").trim();
    process.stdout.write(`[${i + 1}/${stmts.length}] ${preview}... `);

    const r = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: stmt }),
    });

    if (r.ok) {
      console.log("OK");
      success++;
    } else {
      const err = await r.text();
      console.log(`FAIL (${r.status}): ${err.substring(0, 200)}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} OK, ${failed} failed.`);
} else {
  // pg/query not available. Try the Management API approach with a temp function workaround.
  // We'll use the Supabase REST API to create records in a way that triggers DDL via triggers...
  // Actually, let's just use the proper Management API endpoint.

  console.log(
    "pg/query not available. Trying Management API...\n"
  );

  // The Supabase Management API at api.supabase.com requires a PAT (personal access token).
  // We don't have that in our env. However, we can extract the project ref from the URL.
  const projectRef = SUPABASE_URL.match(
    /https:\/\/([^.]+)\.supabase\.co/
  )?.[1];
  console.log(`Project ref: ${projectRef}`);

  // Try with service role as Bearer token (some self-hosted Supabase versions allow this)
  const mgmtResp = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: "SELECT 1 as ping" }),
    }
  );
  console.log(`Management API test: ${mgmtResp.status}`);

  if (mgmtResp.ok) {
    console.log("Management API available. Running migration...\n");
    const r = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    if (r.ok) {
      console.log("Migration applied successfully.");
    } else {
      const err = await r.text();
      console.log(`Failed: ${err}`);
    }
  } else {
    // Last resort: print the SQL for manual execution
    console.log("\n=== MANUAL EXECUTION REQUIRED ===");
    console.log("Neither pg/query nor Management API is available.");
    console.log("\nRun the following in Supabase Dashboard > SQL Editor:");
    console.log("\n--- START SQL ---");
    console.log(sql);
    console.log("--- END SQL ---");
  }
}
