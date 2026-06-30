-- T08 app-push — Web Push subscription store.
-- Each row is one browser/device push endpoint owned by a logged-in user.
-- The broadcast-notification edge function (service role) reads these to fan
-- out OS-level notifications; the client writes/removes its own rows.

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text,
  auth        text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- A user may see and manage only their own subscriptions.
-- The service role (used by the edge function) bypasses RLS, so no read
-- policy is needed for the fan-out path.
drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
