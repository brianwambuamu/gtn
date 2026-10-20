-- Let active Super Admins publish stories while preserving reporter permissions.
drop policy if exists "permitted reporters create own stories" on public.stories;
drop policy if exists "super admins and permitted reporters create stories" on public.stories;

create policy "super admins and permitted reporters create stories" on public.stories
  for insert to authenticated
  with check (
    (
      (select public.is_super_admin())
      and reporter_id = (select auth.uid())
      and status in ('draft', 'published')
    )
    or (
      reporter_id = (select auth.uid())
      and (select public.is_active_staff())
      and (select public.reporter_can('publish_stories'))
      and status in ('draft', 'published')
    )
  );
