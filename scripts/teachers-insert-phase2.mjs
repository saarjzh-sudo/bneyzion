#!/usr/bin/env node
/**
 * Teachers Insert Phase 2 — Batch with throttle
 * Creates remaining series + lessons from scrape data
 * Run: env -u HTTPS_PROXY -u HTTP_PROXY node scripts/teachers-insert-phase2.mjs
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

const SUPABASE_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const SUPABASE_REF = 'pzvmwfexeiruelwiujxn';
const MAAGAR_ROOT_ID = '6bfb7aaa-cd9e-4562-b087-a37fcc24d295';

const RABBI_IDS = {
  'הרב אורי שטמלר': 'e1111111-1111-1111-1111-111111111105',
  'הרב אשי בלייכר': '167ed180-6ced-45af-b5d7-e97a916fa93a',
  'הרב בניה כהן': 'e1111111-1111-1111-1111-111111111121',
  'הרב דביר אפלבוים': 'e1111111-1111-1111-1111-111111111101',
  'הרב מאיר גרשונזון': '9f357f02-5557-4dba-a941-fdb1ef681f4a',
  "הרב מאיר הילביץ'": '71aa933c-5548-4ea7-8be0-dfb659202660',
  'הרב מנחם אליהו': '21815917-0c20-4ad2-b6ab-3943956c9a55',
  'הרב נחום אריאל': 'e1111111-1111-1111-1111-111111111120',
  "הרב עדי איצקוביץ'": 'e1111111-1111-1111-1111-111111111102',
  'הרב עמוס נתנאל': 'e1111111-1111-1111-1111-111111111104',
  'הרב עמירם אלבה': '3da1df9d-4ed5-48ba-9ffa-e3c5271d40e1',
  'הרב עמנואל בן ארצי': '744da303-22be-4062-a822-4ba8e8f1b02d',
  'הרב שלמה כץ': 'd4e5f6a7-4444-4444-dddd-444444444444',
  'הרב שמעון לוי והרב נתן מולאיוף': '9f9362d5-5de7-42d8-8e7f-cac609e23216',
  'ושננתם - אוצר התורה': '6f4b2572-b019-4832-9547-de7e8bc6d909',
  'ישקו העדרים': '7fcd7014-5eef-4e9b-b792-e6460d75e720',
  'מכון דעת סופרים': '1be980e3-a688-47aa-9eaf-adfa23b105b6',
  'נתן מארגל': 'e1111111-1111-1111-1111-111111111103',
  'תלמוד תורה מורשה': 'b5555555-5555-5555-5555-555555555555',
};

const CONTENT_TYPE_MAP = {
  'ביאור הפסוקים': 'ביאור הפסוקים',
  'הכוונות': 'הכוונה והדרכה למורה',
  'מדריך להוראת': 'הכוונה והדרכה למורה',
  'מדריכים למורה': 'הכוונה והדרכה למורה',
  'הכוונה': 'הכוונה והדרכה למורה',
  'אוסף מקורות': 'מקורות עזר לפרקים',
  'שאלות חזרה': 'חידות חזרה',
  'חידות חזרה': 'חידות חזרה',
  'פשט הפסוקים': 'ביאור הפסוקים',
  'ביאורי מילים': 'ביאורי מילים',
  'דפי עבודה': 'דפי עבודה',
  'סיכום': 'סיכום הפרקים והנושאים בקצרה',
  'מפות': 'מפות',
  'דגשים': 'דגשים והכוונה על סדר הפרקים',
  'שאלות ותשובות': 'שאלות ותשובות על סדר הפרקים',
  'ביאור ושננתם': 'ביאור הפסוקים',
};

function getContentType(title) {
  for (const [kw, ct] of Object.entries(CONTENT_TYPE_MAP)) {
    if (title.includes(kw)) return ct;
  }
  return 'הכוונה והדרכה למורה';
}

let lastQuery = 0;
function sql(query) {
  // Throttle: at least 300ms between queries
  const now = Date.now();
  const wait = Math.max(0, 300 - (now - lastQuery));
  if (wait > 0) {
    execSync(`sleep ${(wait/1000).toFixed(2)}`);
  }
  lastQuery = Date.now();

  const payload = JSON.stringify({ query });
  const escaped = payload.replace(/'/g, "'\\''");
  const cmd = `curl -s --noproxy '*' -X POST 'https://api.supabase.com/v1/projects/${SUPABASE_REF}/database/query' -H 'Authorization: Bearer ${SUPABASE_TOKEN}' -H 'Content-Type: application/json' -d '${escaped}'`;
  const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const parsed = JSON.parse(result);
  if (parsed.message) {
    if (parsed.message.includes('Too Many Requests')) {
      console.log('  Rate limited, waiting 10s...');
      execSync('sleep 10');
      return sql(query); // retry once
    }
    throw new Error(`SQL error: ${parsed.message}`);
  }
  return parsed;
}

function seriesExists(title) {
  const r = sql(`SELECT id FROM series WHERE title = '${title.replace(/'/g, "''")}' LIMIT 1`);
  return r.length > 0 ? r[0].id : null;
}

function insertLessonsBatch(lessons) {
  // Insert in batches of 10
  const BATCH = 10;
  let inserted = 0;
  for (let i = 0; i < lessons.length; i += BATCH) {
    const batch = lessons.slice(i, i + BATCH);
    const values = batch.map(l =>
      `('${l.id}', '${l.title.replace(/'/g, "''")}', '${l.series_id}', ${l.rabbi_id ? `'${l.rabbi_id}'` : 'NULL'}, 'published', ARRAY['teachers']::text[], '${l.content_type.replace(/'/g, "''")}', 'pdf')`
    ).join(',\n');
    try {
      sql(`INSERT INTO lessons (id, title, series_id, rabbi_id, status, audience_tags, content_type, source_type) VALUES ${values} ON CONFLICT DO NOTHING`);
      inserted += batch.length;
    } catch(e) {
      console.error(`  Batch insert error: ${e.message}`);
    }
  }
  return inserted;
}

async function main() {
  const scrapeData = JSON.parse(readFileSync('migrations/umbraco_full_scrape_2026_05_27.json', 'utf8'));

  const beforeTotal = sql('SELECT COUNT(*) as c FROM lessons')[0].c;
  const beforeTeachers = sql('SELECT COUNT(*) as c FROM lessons WHERE audience_tags @> ARRAY[\'teachers\']::text[]')[0].c;
  console.log(`BEFORE: ${beforeTotal} total lessons, ${beforeTeachers} teacher lessons`);

  let totalSeriesCreated = 0;
  let totalLessonsInserted = 0;
  const report = [];

  for (const creator of scrapeData.creators) {
    if (!creator.series || creator.series.length === 0) continue;
    const rabbiId = RABBI_IDS[creator.name];

    console.log(`\n[${creator.name}] ${creator.series.length} series, ${creator.total_lessons_on_site} lessons`);

    for (const s of creator.series) {
      const existingId = seriesExists(s.title);

      if (existingId) {
        // Series exists — ensure rabbi_id is set + tag lessons
        if (rabbiId) {
          sql(`UPDATE series SET rabbi_id = '${rabbiId}' WHERE id = '${existingId}' AND rabbi_id IS NULL`);
          sql(`UPDATE lessons SET rabbi_id = '${rabbiId}' WHERE series_id = '${existingId}' AND rabbi_id IS NULL`);
        }
        // Ensure audience_tags includes teachers
        sql(`UPDATE lessons SET audience_tags = array_append(audience_tags, 'teachers') WHERE series_id = '${existingId}' AND NOT (audience_tags @> ARRAY['teachers']::text[])`);

        const lessonCount = sql(`SELECT COUNT(*) as c FROM lessons WHERE series_id = '${existingId}'`)[0].c;
        console.log(`  EXISTING "${s.title}" (${lessonCount} lessons in DB, ${s.lesson_count} on site)`);
        report.push({ action: 'existing', series: s.title, creator: creator.name, db_lessons: parseInt(lessonCount), site_lessons: s.lesson_count });
        continue;
      }

      // Create new series
      const newSeriesId = randomUUID();
      const contentType = getContentType(s.title);

      sql(`INSERT INTO series (id, title, rabbi_id, parent_id, status, audience_tags, lesson_count) VALUES ('${newSeriesId}', '${s.title.replace(/'/g, "''")}', ${rabbiId ? `'${rabbiId}'` : 'NULL'}, '${MAAGAR_ROOT_ID}', 'published', ARRAY['teachers']::text[], ${s.lesson_count})`);
      totalSeriesCreated++;
      console.log(`  CREATED series "${s.title}"`);

      // Create placeholder lessons
      const lessons = [];
      for (let i = 1; i <= s.lesson_count; i++) {
        lessons.push({
          id: randomUUID(),
          title: `${s.title} — שיעור ${i}`,
          series_id: newSeriesId,
          rabbi_id: rabbiId || null,
          content_type: contentType,
        });
      }

      const inserted = insertLessonsBatch(lessons);
      totalLessonsInserted += inserted;
      report.push({ action: 'created', series: s.title, creator: creator.name, lessons_created: inserted });
      console.log(`  Inserted ${inserted}/${s.lesson_count} placeholder lessons`);
    }
  }

  const afterTotal = sql('SELECT COUNT(*) as c FROM lessons')[0].c;
  const afterTeachers = sql('SELECT COUNT(*) as c FROM lessons WHERE audience_tags @> ARRAY[\'teachers\']::text[]')[0].c;

  console.log(`\n=== DONE ===`);
  console.log(`Series created: ${totalSeriesCreated}`);
  console.log(`Lessons inserted: ${totalLessonsInserted}`);
  console.log(`AFTER: ${afterTotal} total (+${afterTotal - beforeTotal}), ${afterTeachers} teacher (+${afterTeachers - beforeTeachers})`);

  const fullReport = {
    timestamp: new Date().toISOString(),
    before: { total: parseInt(beforeTotal), teachers: parseInt(beforeTeachers) },
    after: { total: parseInt(afterTotal), teachers: parseInt(afterTeachers) },
    series_created: totalSeriesCreated,
    lessons_inserted: totalLessonsInserted,
    details: report,
  };

  writeFileSync('migrations/backups/teachers-phase2-report-2026-05-27.json', JSON.stringify(fullReport, null, 2));
  console.log('Report: migrations/backups/teachers-phase2-report-2026-05-27.json');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
