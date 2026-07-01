-- RLS audit — read-only inventory queries (T15). Run each via Management API
-- (run-audit.sh) or the Supabase SQL editor. No mutations. Safe any time.

-- 1) RLS on/off per table
select relname, relrowsecurity as rls_enabled, relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
order by relrowsecurity, relname;

-- 2) THE LEAK SURFACE: tables anon can SELECT/ALL with an unrestricted qual
select tablename, policyname, cmd, roles::text
from pg_policies
where schemaname='public' and cmd in ('SELECT','ALL')
  and (roles @> '{public}' or roles @> '{anon}')
  and (qual is null or qual='true')
order by tablename;

-- 3) Full policy dump for the tables the hardening migration touches
select tablename, policyname, cmd, roles::text,
       coalesce(qual,'<null>') qual, coalesce(with_check,'<null>') with_check
from pg_policies
where schemaname='public'
  and tablename in ('order_items','user_roles','fix_items','fix_rounds',
                    'ohp_messages','ohp_chat_messages','ohp_send_logs','lessons','series')
order by tablename, cmd;

-- 4) Indexes backing the public content queries
select tablename, indexname, indexdef
from pg_indexes where schemaname='public' and tablename in ('lessons','series')
order by tablename, indexname;

-- 5) EXPLAIN ANALYZE — canonical public queries (baseline; expect index use)
explain (analyze, buffers) select * from series
  where status in ('active','published') and lesson_count>0
    and not (audience_tags @> '{teachers}')
  order by lesson_count desc limit 50;                       -- useTopSeries

explain (analyze, buffers) select * from lessons
  where series_id = (select id from series where lesson_count>0 order by lesson_count desc limit 1)
    and status='published' and not (audience_tags @> '{teachers}')
  order by sort_order asc nulls last, bible_chapter asc nulls last, title asc
  limit 2000;                                                 -- useLessonsBySeries
