create table if not exists public.reporter_permissions (
  id boolean primary key default true check (id),
  dashboard_view boolean not null default true,
  publish_stories boolean not null default true,
  manage_own_stories boolean not null default true,
  manage_all_stories boolean not null default false,
  manage_categories boolean not null default false,
  manage_ads boolean not null default false,
  manage_staff boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.reporter_permissions(id) values (true) on conflict (id) do nothing;
alter table public.reporter_permissions enable row level security;
grant select on public.reporter_permissions to authenticated;
grant update on public.reporter_permissions to authenticated;
drop policy if exists "authenticated read reporter permissions" on public.reporter_permissions;
create policy "authenticated read reporter permissions" on public.reporter_permissions
  for select to authenticated using (true);
drop policy if exists "super admins manage reporter permissions" on public.reporter_permissions;
create policy "super admins manage reporter permissions" on public.reporter_permissions
  for update to authenticated using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

create or replace function public.reporter_can(p_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_profiles p
    join public.reporter_permissions r on r.id = true
    where p.id = (select auth.uid()) and p.role = 'reporter' and p.is_active
      and case p_permission
        when 'dashboard_view' then r.dashboard_view
        when 'publish_stories' then r.publish_stories
        when 'manage_own_stories' then r.manage_own_stories
        when 'manage_all_stories' then r.manage_all_stories
        when 'manage_categories' then r.manage_categories
        when 'manage_ads' then r.manage_ads
        when 'manage_staff' then r.manage_staff
        else false
      end
  );
$$;
revoke all on function public.reporter_can(text) from public;
grant execute on function public.reporter_can(text) to authenticated;
drop policy if exists "permitted staff read staff directory" on public.staff_profiles;
create policy "permitted staff read staff directory" on public.staff_profiles
  for select to authenticated using (
    id = (select auth.uid()) or (select public.is_super_admin()) or (select public.reporter_can('manage_staff'))
  );

drop policy if exists "active reporters create own stories" on public.stories;
create policy "permitted reporters create own stories" on public.stories
  for insert to authenticated with check (
    reporter_id = (select auth.uid()) and (select public.is_active_staff())
    and (select public.reporter_can('publish_stories')) and status in ('draft','published')
  );
drop policy if exists "active reporters update own; admins all" on public.stories;
create policy "permitted reporters update own; admins all" on public.stories
  for update to authenticated using (
    (reporter_id = (select auth.uid()) and (select public.is_active_staff()) and ((select public.reporter_can('manage_own_stories')) or (select public.reporter_can('manage_all_stories'))))
    or (select public.reporter_can('manage_all_stories'))
    or (select public.is_super_admin())
  ) with check (
    (reporter_id = (select auth.uid()) and (select public.is_active_staff()) and ((select public.reporter_can('manage_own_stories')) or (select public.reporter_can('manage_all_stories'))))
    or (select public.reporter_can('manage_all_stories'))
    or (select public.is_super_admin())
  );
drop policy if exists "active reporters delete own; admins all" on public.stories;
create policy "permitted reporters delete own; admins all" on public.stories
  for delete to authenticated using (
    (reporter_id = (select auth.uid()) and (select public.is_active_staff()) and ((select public.reporter_can('manage_own_stories')) or (select public.reporter_can('manage_all_stories'))))
    or (select public.reporter_can('manage_all_stories'))
    or (select public.is_super_admin())
  );

drop policy if exists "super admins manage site categories" on public.site_categories;
create policy "permitted staff manage site categories" on public.site_categories
  for all to authenticated using (
    (select public.is_super_admin()) or (select public.reporter_can('manage_categories'))
  ) with check (
    (select public.is_super_admin()) or (select public.reporter_can('manage_categories'))
  );
create or replace function public.rename_site_category(p_category_id uuid, p_name text, p_slug text)
returns void language plpgsql security definer set search_path = '' as $$
declare old_name text;
begin
  if not public.is_super_admin() and not public.reporter_can('manage_categories') then
    raise exception 'You do not have permission to manage news categories';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 or length(p_name) > 50 then
    raise exception 'Category name must be between 1 and 50 characters';
  end if;
  select name into old_name from public.site_categories where id = p_category_id for update;
  if old_name is null then raise exception 'Category not found'; end if;
  update public.stories set category = trim(p_name) where category = old_name;
  update public.site_categories set name = trim(p_name), slug = p_slug where id = p_category_id;
end;
$$;
revoke all on function public.rename_site_category(uuid,text,text) from public;
grant execute on function public.rename_site_category(uuid,text,text) to authenticated;

drop policy if exists "admins manage ads" on public.ads;
create policy "permitted staff manage ads" on public.ads
  for all to authenticated using (
    (select public.is_super_admin()) or (select public.reporter_can('manage_ads'))
  ) with check (
    (select public.is_super_admin()) or (select public.reporter_can('manage_ads'))
  );
drop policy if exists "permitted staff upload ad media" on storage.objects;
create policy "permitted staff upload ad media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'ad-media' and ((select public.is_super_admin()) or (select public.reporter_can('manage_ads')))
  );
