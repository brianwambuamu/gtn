create table if not exists public.push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_notification_log (
  story_id text primary key references public.stories(id) on delete cascade,
  sent_at timestamptz not null default now(),
  delivered_count integer not null default 0
);

alter table public.push_subscriptions enable row level security;
alter table public.push_notification_log enable row level security;
revoke all on public.push_subscriptions, public.push_notification_log from anon, authenticated;

create table if not exists public.youtube_live_events_cache (
  id boolean primary key default true check (id),
  events jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now()
);
alter table public.youtube_live_events_cache enable row level security;
revoke all on public.youtube_live_events_cache from anon, authenticated;
