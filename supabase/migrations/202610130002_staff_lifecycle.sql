alter table public.staff_profiles
  add column if not exists is_active boolean not null default true;

alter table public.stories alter column reporter_id drop not null;
alter table public.stories drop constraint if exists stories_reporter_id_fkey;
alter table public.stories add constraint stories_reporter_id_fkey
  foreign key (reporter_id) references public.staff_profiles(id) on delete set null;

create or replace function public.is_active_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_profiles p
    where p.id = (select auth.uid()) and p.is_active
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_profiles p
    where p.id = (select auth.uid()) and p.role = 'super_admin' and p.is_active
  );
$$;

drop policy if exists "reporters create own stories" on public.stories;
drop policy if exists "reporters update own stories; admins all" on public.stories;
drop policy if exists "reporters delete own stories; admins all" on public.stories;
create policy "active reporters create own stories" on public.stories
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select public.is_active_staff()) and status in ('draft','published'));
create policy "active reporters update own; admins all" on public.stories
  for update to authenticated
  using ((reporter_id = (select auth.uid()) and (select public.is_active_staff())) or (select public.is_super_admin()))
  with check ((reporter_id = (select auth.uid()) and (select public.is_active_staff())) or (select public.is_super_admin()));
create policy "active reporters delete own; admins all" on public.stories
  for delete to authenticated
  using ((reporter_id = (select auth.uid()) and (select public.is_active_staff())) or (select public.is_super_admin()));

drop policy if exists "staff upload editorial media" on storage.objects;
create policy "active staff upload editorial media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'editorial-media' and (select public.is_active_staff()));
