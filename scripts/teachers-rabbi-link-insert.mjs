#!/usr/bin/env node
/**
 * Teachers Wing: Rabbi Link + Missing Lessons Insert
 *
 * Phase 1: Link rabbi_id on existing series that match scraped data
 * Phase 2: Create missing series + placeholder lessons for creators with 0 DB series
 * Phase 3: For creators where DB lesson_count << site lesson_count, add missing series
 *
 * Run: env -u HTTPS_PROXY -u HTTP_PROXY node scripts/teachers-rabbi-link-insert.mjs
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

const SUPABASE_TOKEN = 'SUPABASE_TOKEN_REMOVED';
const SUPABASE_REF = 'pzvmwfexeiruelwiujxn';
const MAAGAR_ROOT_ID = '6bfb7aaa-cd9e-4562-b087-a37fcc24d295'; // מאגר עזרי הלמידה

// Map from scraped series title + creator → rabbi_id
// These are IDs from the rabbis table (fetched above)
const RABBI_IDS = {
  'הרב אורי שטמלר': 'e1111111-1111-1111-1111-111111111105',
  'הרב אשי בלייכר': null, // not in DB yet — needs INSERT
  'הרב בניה כהן': 'e1111111-1111-1111-1111-111111111121',
  'הרב דביר אפלבוים': 'e1111111-1111-1111-1111-111111111101',
  'הרב מאיר גרשונזון': null, // need to find
  'הרב מאיר הילביץ\'': '71aa933c-5548-4ea7-8be0-dfb659202660',
  'הרב מנחם אליהו': '21815917-0c20-4ad2-b6ab-3943956c9a55',
  'הרב נחום אריאל': 'e1111111-1111-1111-1111-111111111120',
  'הרב עדי איצקוביץ\'': 'e1111111-1111-1111-1111-111111111102',
  'הרב עמוס נתנאל': 'e1111111-1111-1111-1111-111111111104',
  'הרב עמירם אלבה': '3da1df9d-4ed5-48ba-9ffa-e3c5271d40e1',
  'הרב עמנואל בן ארצי': '744da303-22be-4062-a822-4ba8e8f1b02d',
  'הרב שלמה כץ': 'd4e5f6a7-4444-4444-dddd-444444444444',
  'הרב שמעון לוי והרב נתן מולאיוף': '9f9362d5-5de7-42d8-8e7f-cac609e23216', // הרב שמעון לוי
  'ושננתם - אוצר התורה': '6f4b2572-b019-4832-9547-de7e8bc6d909',
  'ישקו העדרים': '7fcd7014-5eef-4e9b-b792-e6460d75e720',
  'מכון דעת סופרים': null, // not in DB — needs INSERT
  'נתן מארגל': 'e1111111-1111-1111-1111-111111111103',
  'תלמוד תורה מורשה': 'b5555555-5555-5555-5555-555555555555',
};

// Known content_type by series title keywords
const CONTENT_TYPE_MAP = {
  'ביאור הפסוקים': 'ביאור הפסוקים',
  'הכוונות בלימוד': 'הכוונה והדרכה למורה',
  'הכוונות ב': 'הכוונה והדרכה למורה',
  'מדריך להוראת': 'הכוונה והדרכה למורה',
  'מדריכים למורה': 'הכוונה והדרכה למורה',
  'אוסף מקורות עזר': 'מקורות עזר לפרקים',
  'שאלות חזרה': 'חידות חזרה',
  'פשט הפסוקים': 'ביאור הפסוקים',
  'ביאורי מילים': 'ביאורי מילים',
  'דפי עבודה': 'דפי עבודה',
  'סיכום': 'סיכום הפרקים והנושאים בקצרה',
  'מפות': 'מפות',
  'דגשים': 'דגשים והכוונה על סדר הפרקים',
  'שאלות ותשובות': 'שאלות ותשובות על סדר הפרקים',
};

function getContentType(seriesTitle) {
  for (const [keyword, contentType] of Object.entries(CONTENT_TYPE_MAP)) {
    if (seriesTitle.includes(keyword)) return contentType;
  }
  return 'הכוונה והדרכה למורה';
}

function sql(query) {
  const payload = JSON.stringify({ query });
  const escaped = payload.replace(/'/g, "'\\''");
  const cmd = `curl -s --noproxy '*' -X POST 'https://api.supabase.com/v1/projects/${SUPABASE_REF}/database/query' -H 'Authorization: Bearer ${SUPABASE_TOKEN}' -H 'Content-Type: application/json' -d '${escaped}'`;
  const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const parsed = JSON.parse(result);
  if (parsed.message) throw new Error(`SQL error: ${parsed.message}`);
  return parsed;
}

// Series → creator mapping from scrape
const SERIES_CREATOR_MAP = {
  'ביאור הפסוקים - חומש ויקרא': 'הרב אורי שטמלר',
  'ביאור הפסוקים - חומש במדבר': 'הרב אורי שטמלר',
  'ביאור הפסוקים - חומש דברים': 'הרב אורי שטמלר',
  'הכוונות בלימוד ספר יהושע': 'הרב אשי בלייכר',
  'אוסף מקורות עזר ללימוד ספר יהושע': 'הרב אשי בלייכר',
  'פשט הפסוקים': 'הרב בניה כהן', // multiple series with same name
  'שאלות חזרה על חומש בראשית': 'הרב בניה כהן',
  'שאלות חזרה על חומש שמות': 'הרב בניה כהן',
  'מדריך להוראת ספר יהושע': 'מכון דעת סופרים',
  'מדריך להוראת ספר שופטים': 'מכון דעת סופרים',
  'מדריך להוראת ספר שמואל א': 'מכון דעת סופרים',
  'מדריך להוראת ספר שמואל ב': 'מכון דעת סופרים',
  'מדריך להוראת ספר מלכים א': 'מכון דעת סופרים',
  'מדריך להוראת ספר מלכים ב': 'מכון דעת סופרים',
  'מדריכים למורה - יהושע': 'מכון דעת סופרים',
  'מדריכים למורה - שופטים': 'מכון דעת סופרים',
};

// Creators that need to be created in the rabbis table
const MISSING_CREATORS = [
  { name: 'הרב אשי בלייכר', entity_type: 'rabbi' },
  { name: 'מכון דעת סופרים', entity_type: 'content_creator' },
  { name: 'הרב מאיר גרשונזון', entity_type: 'rabbi' },
];

async function main() {
  const report = {
    timestamp: new Date().toISOString(),
    before: {},
    phase1_rabbi_links: [],
    phase2_new_creators: [],
    phase3_new_series: [],
    phase4_new_lessons: [],
    after: {},
    errors: [],
  };

  // Get before counts
  const beforeCount = sql('SELECT COUNT(*) as count FROM lessons WHERE audience_tags @> ARRAY[\'teachers\']::text[]')[0].count;
  const beforeSeries = sql('SELECT COUNT(*) as count FROM series')[0].count;
  report.before = { lessons: parseInt(beforeCount), series: parseInt(beforeSeries) };
  console.log(`BEFORE: ${beforeCount} teacher lessons, ${beforeSeries} series`);

  // === PHASE 1: Insert missing creators ===
  console.log('\n=== PHASE 2: Insert missing creators ===');
  for (const creator of MISSING_CREATORS) {
    const existing = sql(`SELECT id FROM rabbis WHERE name = '${creator.name.replace(/'/g, "''")}'`);
    if (existing.length > 0) {
      console.log(`  ${creator.name} already exists: ${existing[0].id}`);
      RABBI_IDS[creator.name] = existing[0].id;
      continue;
    }

    const newId = randomUUID();
    const slug = creator.name
      .replace(/'/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^֐-׿\w-]/g, '')
      .toLowerCase()
      .substring(0, 50);

    try {
      sql(`INSERT INTO rabbis (id, name, entity_type, slug, lesson_count) VALUES ('${newId}', '${creator.name.replace(/'/g, "''")}', '${creator.entity_type}', '${slug}-${newId.substring(0,8)}', 0)`);
      RABBI_IDS[creator.name] = newId;
      report.phase2_new_creators.push({ name: creator.name, id: newId });
      console.log(`  Created ${creator.name}: ${newId}`);
    } catch(e) {
      report.errors.push(`Create creator ${creator.name}: ${e.message}`);
      console.error(`  ERROR creating ${creator.name}: ${e.message}`);
    }
  }

  // === PHASE 1: Link rabbi_id on existing series ===
  console.log('\n=== PHASE 1: Link rabbi_id on series ===');

  for (const [seriesTitle, creatorName] of Object.entries(SERIES_CREATOR_MAP)) {
    const rabbiId = RABBI_IDS[creatorName];
    if (!rabbiId) {
      console.log(`  SKIP ${seriesTitle} - no rabbi_id for ${creatorName}`);
      continue;
    }

    try {
      const updated = sql(`UPDATE series SET rabbi_id = '${rabbiId}' WHERE title = '${seriesTitle.replace(/'/g, "''")}' AND rabbi_id IS NULL RETURNING id, title`);
      if (updated.length > 0) {
        report.phase1_rabbi_links.push({ series: seriesTitle, rabbi: creatorName, count: updated.length });
        console.log(`  Linked ${updated.length}x "${seriesTitle}" → ${creatorName}`);

        // Also update lessons in these series
        for (const s of updated) {
          sql(`UPDATE lessons SET rabbi_id = '${rabbiId}' WHERE series_id = '${s.id}' AND rabbi_id IS NULL`);
        }
      } else {
        console.log(`  Already linked or missing: "${seriesTitle}"`);
      }
    } catch(e) {
      report.errors.push(`Link series ${seriesTitle}: ${e.message}`);
      console.error(`  ERROR: ${e.message}`);
    }
  }

  // === PHASE 3: Create new series for scraped data ===
  console.log('\n=== PHASE 3: Create new series from scrape ===');

  const scrapeData = JSON.parse(readFileSync('migrations/umbraco_full_scrape_2026_05_27.json', 'utf8'));

  for (const creator of scrapeData.creators) {
    if (!creator.series || creator.series.length === 0) continue;
    const rabbiId = RABBI_IDS[creator.name];

    for (const series of creator.series) {
      // Check if series exists in DB
      const existing = sql(`SELECT id FROM series WHERE title = '${series.title.replace(/'/g, "''")}' LIMIT 1`);
      if (existing.length > 0) {
        // Series exists — just make sure rabbi_id is set
        if (rabbiId) {
          try {
            sql(`UPDATE series SET rabbi_id = '${rabbiId}' WHERE id = '${existing[0].id}' AND rabbi_id IS NULL`);
          } catch(e) {/* ignore */}
        }
        continue;
      }

      // Series doesn't exist — create it
      const newSeriesId = randomUUID();
      const contentType = getContentType(series.title);

      try {
        sql(`INSERT INTO series (id, title, rabbi_id, parent_id, status, audience_tags, lesson_count) VALUES ('${newSeriesId}', '${series.title.replace(/'/g, "''")}', ${rabbiId ? `'${rabbiId}'` : 'NULL'}, '${MAAGAR_ROOT_ID}', 'published', ARRAY['teachers']::text[], ${series.lesson_count})`);
        report.phase3_new_series.push({ title: series.title, creator: creator.name, id: newSeriesId });
        console.log(`  Created series: "${series.title}" (${creator.name})`);

        // Create placeholder lessons
        let lessonsCreated = 0;
        for (let i = 1; i <= series.lesson_count; i++) {
          const lessonId = randomUUID();
          const lessonTitle = `${series.title} — שיעור ${i}`;
          try {
            sql(`INSERT INTO lessons (id, title, series_id, rabbi_id, status, audience_tags, content_type, source_type) VALUES ('${lessonId}', '${lessonTitle.replace(/'/g, "''")}', '${newSeriesId}', ${rabbiId ? `'${rabbiId}'` : 'NULL'}, 'published', ARRAY['teachers']::text[], '${contentType.replace(/'/g, "''")}', 'pdf')`);
            lessonsCreated++;
          } catch(e) {
            // Ignore duplicate/constraint errors on lessons
          }
        }
        report.phase4_new_lessons.push({ series: series.title, count: lessonsCreated });
        console.log(`  Created ${lessonsCreated}/${series.lesson_count} placeholder lessons`);

      } catch(e) {
        report.errors.push(`Create series ${series.title}: ${e.message}`);
        console.error(`  ERROR creating series: ${e.message}`);
      }
    }
  }

  // Get after counts
  const afterCount = sql('SELECT COUNT(*) as count FROM lessons WHERE audience_tags @> ARRAY[\'teachers\']::text[]')[0].count;
  const afterSeries = sql('SELECT COUNT(*) as count FROM series')[0].count;
  report.after = { lessons: parseInt(afterCount), series: parseInt(afterSeries) };

  console.log(`\nAFTER: ${afterCount} teacher lessons (+${afterCount - beforeCount}), ${afterSeries} series (+${afterSeries - beforeSeries})`);
  console.log(`Errors: ${report.errors.length}`);
  if (report.errors.length > 0) {
    for (const e of report.errors) console.error(`  ${e}`);
  }

  writeFileSync('migrations/backups/teachers-rabbi-link-report-2026-05-27.json', JSON.stringify(report, null, 2));
  console.log('\nReport saved to migrations/backups/teachers-rabbi-link-report-2026-05-27.json');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
