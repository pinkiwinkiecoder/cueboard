-- Supabase blokkeert UPDATE zonder WHERE (pg-safeupdate) voor API-verzoeken.
-- apply_setup paste de modules aan zonder WHERE en faalde daardoor live.

create or replace function public.apply_setup(setup jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  d jsonb;
  c jsonb;
  r jsonb;
  l jsonb;
  p jsonb;
  i jsonb;
  parent uuid;
  pkg uuid;
  n_teams int := 0;
  n_roles int := 0;
  n_locations int := 0;
  n_packages int := 0;
  inserted int;
  idx int;
begin
  if not public.is_admin() then
    raise exception 'AOF:not_admin' using errcode = '42501';
  end if;

  -- Teams en subteams
  for d in select * from jsonb_array_elements(coalesce(setup -> 'departments', '[]')) loop
    insert into public.departments (name, color, description, sort_order)
    values (d ->> 'name', coalesce(d ->> 'color', 'violet'), d ->> 'description',
            coalesce((select max(sort_order) from public.departments), 0) + 1)
    on conflict (name) do nothing;
    get diagnostics inserted = row_count;
    n_teams := n_teams + inserted;
    select id into parent from public.departments where name = d ->> 'name';
    for c in select * from jsonb_array_elements(coalesce(d -> 'children', '[]')) loop
      insert into public.departments (name, color, description, parent_id, sort_order)
      values (c ->> 'name', coalesce(c ->> 'color', d ->> 'color', 'violet'), c ->> 'description', parent,
              coalesce((select max(sort_order) from public.departments), 0) + 1)
      on conflict (name) do nothing;
      get diagnostics inserted = row_count;
      n_teams := n_teams + inserted;
    end loop;
  end loop;

  -- Rollen (nooit een beheerdersrol; onbekende rechten worden genegeerd)
  for r in select * from jsonb_array_elements(coalesce(setup -> 'roles', '[]')) loop
    insert into public.roles (name, description, color, permissions, sort_order)
    values (
      r ->> 'name', r ->> 'description', coalesce(r ->> 'color', 'violet'),
      array(select x from jsonb_array_elements_text(coalesce(r -> 'permissions', '[]')) x
             where x = any (public.permission_keys())),
      coalesce((select max(sort_order) from public.roles), 0) + 1)
    on conflict (name) do nothing;
    get diagnostics inserted = row_count;
    n_roles := n_roles + inserted;
  end loop;

  -- Locaties
  for l in select * from jsonb_array_elements(coalesce(setup -> 'locations', '[]')) loop
    insert into public.locations (name, color, sort_order)
    values (l ->> 'name', coalesce(l ->> 'color', 'violet'),
            coalesce((select max(sort_order) from public.locations), 0) + 1)
    on conflict (name) do nothing;
    get diagnostics inserted = row_count;
    n_locations := n_locations + inserted;
  end loop;

  -- Takenpakketten
  for p in select * from jsonb_array_elements(coalesce(setup -> 'packages', '[]')) loop
    insert into public.task_packages (name, description, color, department_id)
    values (p ->> 'name', p ->> 'description', coalesce(p ->> 'color', 'mint'),
            (select id from public.departments where name = p ->> 'department'))
    on conflict (name) do nothing
    returning id into pkg;
    if pkg is not null then
      n_packages := n_packages + 1;
      idx := 0;
      for i in select * from jsonb_array_elements(coalesce(p -> 'items', '[]')) loop
        idx := idx + 1;
        insert into public.package_items (package_id, title, priority, offset_minutes, requires_signoff, sort_order)
        values (pkg, i ->> 'title', coalesce(i ->> 'priority', 'normal')::public.task_priority,
                (i ->> 'offset')::int, coalesce((i ->> 'signoff')::boolean, false), idx);
      end loop;
    end if;
    pkg := null;
  end loop;

  -- Modules: enkel aanzetten wat de preset nodig heeft (nooit uitzetten).
  if setup ? 'modules' then
    update public.event set modules = array(
      select distinct x from unnest(modules || array(
        select y from jsonb_array_elements_text(setup -> 'modules') y
         where y = any (public.module_keys()))) x
    ) where id;
  end if;

  insert into public.audit_log (actor, table_name, row_id, action, detail)
  values (auth.uid(), 'event', 'setup', 'OTHER',
          jsonb_build_object('preset', setup ->> 'id', 'teams', n_teams, 'roles', n_roles,
                             'locations', n_locations, 'packages', n_packages));

  return jsonb_build_object('teams', n_teams, 'roles', n_roles, 'locations', n_locations,
                            'packages', n_packages);
end;
$$;
revoke all on function public.apply_setup(jsonb) from public, anon;
grant execute on function public.apply_setup(jsonb) to authenticated;
