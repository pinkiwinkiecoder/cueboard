-- =============================================================================
-- Eigen sjablonen: een opzet (teams, rollen, locaties, pakketten, modules) die
-- enkel in deze database bestaat. Handig voor één organisatie die elk jaar
-- dezelfde opzet gebruikt. Bewaren = de huidige opzet vastleggen; toepassen
-- gaat via public.apply_setup (voegt enkel toe, verwijdert nooit).
-- =============================================================================

create table public.custom_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 300),
  color text not null default 'gold' check (color ~ '^[a-z]{3,12}$'),
  setup jsonb not null check (jsonb_typeof(setup) = 'object' and octet_length(setup::text) <= 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.custom_templates enable row level security;

create policy custom_templates_select on public.custom_templates for select to authenticated
  using (public.is_admin());
create policy custom_templates_insert on public.custom_templates for insert to authenticated
  with check (public.is_admin());
create policy custom_templates_update on public.custom_templates for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy custom_templates_delete on public.custom_templates for delete to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.custom_templates to authenticated;

create trigger custom_templates_touch before update on public.custom_templates
  for each row execute function public.touch_updated();

/** De huidige opzet als jsonb, in de vorm die public.apply_setup verwacht. */
create function public.capture_setup() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'AOF:not_admin' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'id', 'custom',
    'departments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', d.name, 'color', d.color, 'description', d.description,
        'children', coalesce((
          select jsonb_agg(jsonb_build_object('name', c.name, 'color', c.color, 'description', c.description)
                           order by c.sort_order, c.name)
            from public.departments c where c.parent_id = d.id), '[]'::jsonb))
        order by d.sort_order, d.name)
        from public.departments d where d.parent_id is null), '[]'::jsonb),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object('name', r.name, 'description', r.description,
                                          'color', r.color, 'permissions', to_jsonb(r.permissions))
                       order by r.sort_order, r.name)
        from public.roles r where not r.is_admin), '[]'::jsonb),
    'locations', coalesce((
      select jsonb_agg(jsonb_build_object('name', l.name, 'color', l.color) order by l.sort_order, l.name)
        from public.locations l), '[]'::jsonb),
    'packages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', p.name, 'description', p.description, 'color', p.color,
        'department', (select d.name from public.departments d where d.id = p.department_id),
        'items', coalesce((
          select jsonb_agg(jsonb_build_object('title', i.title, 'priority', i.priority,
                                              'offset', i.offset_minutes, 'signoff', i.requires_signoff)
                           order by i.sort_order)
            from public.package_items i where i.package_id = p.id), '[]'::jsonb))
        order by p.name)
        from public.task_packages p), '[]'::jsonb),
    'modules', (select to_jsonb(e.modules) from public.event e limit 1)
  );
end;
$$;
revoke all on function public.capture_setup() from public, anon;
grant execute on function public.capture_setup() to authenticated;
