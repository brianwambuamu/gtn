create table if not exists public.site_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.site_categories enable row level security;
grant select on public.site_categories to anon, authenticated;
grant insert, update, delete on public.site_categories to authenticated;

drop policy if exists "public reads site categories" on public.site_categories;
create policy "public reads site categories" on public.site_categories
  for select to anon, authenticated using (true);
drop policy if exists "super admins manage site categories" on public.site_categories;
create policy "super admins manage site categories" on public.site_categories
  for all to authenticated using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

create or replace function public.rename_site_category(p_category_id uuid, p_name text, p_slug text)
returns void language plpgsql security definer set search_path = '' as $$
declare old_name text;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can rename news categories';
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

insert into public.site_categories(name, slug, sort_order) values
  ('News','news',1),
  ('GTN Originals','gtn-originals',2),
  ('Wananchi Reporting','wananchi-reporting',3),
  ('Business','business',4),
  ('Sports','sports',5),
  ('Games','games',6),
  ('Entertainment','entertainment',7),
  ('Tech','tech',8),
  ('Lifestyle','lifestyle',9),
  ('Live Events','live-events',10),
  ('Opinion & Blogs','opinion-and-blogs',11),
  ('Shopping','shopping',12)
on conflict (name) do nothing;
