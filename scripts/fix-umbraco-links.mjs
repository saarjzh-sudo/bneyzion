/**
 * Fix broken umb://document links in Supabase lessons.
 * Replaces <a ...umb://document/...>text</a> with just the text.
 */

const SUPABASE_URL = 'https://pzvmwfexeiruelwiujxn.supabase.co';
const SERVICE_ROLE_KEY = 'SUPABASE_SERVICE_ROLE_REDACTED';

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

async function main() {
  // Directly query lessons where content contains umb://document
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/lessons?select=id,title,content&content=like.*umb%3A%2F%2Fdocument*`,
    { headers }
  );

  if (!res.ok) {
    console.error('Failed to fetch:', await res.text());
    process.exit(1);
  }

  const rows = await res.json();
  console.log(`Found ${rows.length} lessons with umb://document links\n`);

  let totalLinksFixed = 0;
  let rowsFixed = 0;

  for (const row of rows) {
    const original = row.content;

    // Replace <a ...umb://document/...>text</a> with just the text
    // Also handles surrounding brackets: [<a ...>text</a>]
    const fixed = original.replace(/\[?<a\s[^>]*umb:\/\/document\/[^>]*>([\s\S]*?)<\/a>\]?/gi, '$1');

    if (fixed === original) {
      console.log(`  Row ${row.id} ("${row.title?.slice(0, 40)}") - no regex match (skipped)`);
      continue;
    }

    // Count links fixed
    const linkCount = (original.match(/<a\s[^>]*umb:\/\/document\/[^>]*/gi) || []).length;
    totalLinksFixed += linkCount;

    // Update the row
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/lessons?id=eq.${row.id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ content: fixed }),
      }
    );

    if (updateRes.ok) {
      rowsFixed++;
      console.log(`  Fixed row ${row.id} ("${row.title?.slice(0, 40)}") - ${linkCount} link(s) removed`);
    } else {
      console.error(`  ERROR updating ${row.id}: ${await updateRes.text()}`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Rows fixed: ${rowsFixed}`);
  console.log(`Total umb://document links removed: ${totalLinksFixed}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
