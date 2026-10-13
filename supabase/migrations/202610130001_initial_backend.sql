create extension if not exists pgcrypto;

create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  role text not null default 'reporter' check (role in ('super_admin', 'reporter')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_staff_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.staff_profiles (id, email, display_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 'reporter')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_gtn on auth.users;
create trigger on_auth_user_created_gtn after insert on auth.users
for each row execute function public.handle_new_staff_user();

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.role = 'super_admin');
$$;

create table if not exists public.stories (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  excerpt text,
  category text not null,
  author text not null,
  badge text check (badge is null or badge in ('live','video','analysis','exclusive')),
  media jsonb,
  placement text check (placement is null or placement in ('for-you','news')),
  seed integer not null default 1,
  reporter_id uuid not null references public.staff_profiles(id),
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stories_feed_idx on public.stories (status, created_at desc);
create index if not exists stories_reporter_idx on public.stories (reporter_id, created_at desc);

create table if not exists public.ads (
  id text primary key default gen_random_uuid()::text,
  headline text not null,
  url text,
  media jsonb,
  target text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.staff_profiles enable row level security;
alter table public.stories enable row level security;
alter table public.ads enable row level security;

revoke all on public.staff_profiles from anon, authenticated;
grant select on public.staff_profiles to authenticated;
grant select on public.stories, public.ads to anon, authenticated;
grant insert, update, delete on public.stories, public.ads to authenticated;

create policy "staff can read own profile; admins read all" on public.staff_profiles
for select to authenticated using (id = (select auth.uid()) or (select public.is_super_admin()));
create policy "public reads published stories" on public.stories
for select to anon, authenticated using (status = 'published');
create policy "reporters create own stories" on public.stories
for insert to authenticated with check (reporter_id = (select auth.uid()) and status in ('draft','published'));
create policy "reporters update own stories; admins all" on public.stories
for update to authenticated using (reporter_id = (select auth.uid()) or (select public.is_super_admin()))
with check (reporter_id = (select auth.uid()) or (select public.is_super_admin()));
create policy "reporters delete own stories; admins all" on public.stories
for delete to authenticated using (reporter_id = (select auth.uid()) or (select public.is_super_admin()));
create policy "public reads active ads" on public.ads
for select to anon, authenticated using (active);
create policy "admins manage ads" on public.ads
for all to authenticated using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('editorial-media', 'editorial-media', true, 83886080, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/ogg','video/quicktime']),
       ('ad-media', 'ad-media', true, 83886080, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/ogg','video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "public reads published media" on storage.objects for select to anon, authenticated
using (bucket_id in ('editorial-media','ad-media'));
create policy "staff upload editorial media" on storage.objects for insert to authenticated
with check (bucket_id = 'editorial-media' and exists (select 1 from public.staff_profiles p where p.id = (select auth.uid())));
create policy "admins upload ad media" on storage.objects for insert to authenticated
with check (bucket_id = 'ad-media' and (select public.is_super_admin()));
create policy "admins delete media" on storage.objects for delete to authenticated
using ((select public.is_super_admin()));

-- Bootstrap the first account: create it with Supabase Auth, then run:
-- update public.staff_profiles set role = 'super_admin' where email = 'you@example.com';
