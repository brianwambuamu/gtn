create table if not exists public.social_oauth_states (
  state text primary key,
  provider text not null check (provider in ('meta', 'x')),
  staff_id uuid not null references auth.users(id) on delete cascade,
  code_verifier text,
  expires_at timestamptz not null
);
alter table public.social_oauth_states enable row level security;
revoke all on public.social_oauth_states from anon, authenticated;

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('facebook', 'instagram', 'x')),
  account_id text not null,
  account_name text not null,
  token_ciphertext text not null,
  refresh_ciphertext text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (provider, account_id)
);
alter table public.social_accounts enable row level security;
revoke all on public.social_accounts from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-news-cuts', 'social-news-cuts', true, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "public reads social news cut images" on storage.objects;
create policy "public reads social news cut images" on storage.objects for select to anon, authenticated
using (bucket_id = 'social-news-cuts');
