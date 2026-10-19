alter table public.reporter_permissions
  add column if not exists manage_news_cuts boolean not null default false;

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
        when 'manage_news_cuts' then r.manage_news_cuts
        else false
      end
  );
$$;
