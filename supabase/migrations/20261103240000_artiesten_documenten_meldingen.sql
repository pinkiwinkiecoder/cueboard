-- =============================================================================
-- Festivalmodules: artiesten (dossier + checklist), documenten (bestanden of
-- links, per team zichtbaar, leesbevestiging) en meldingen (problemen op het
-- terrein met foto, ernst, toewijzing en opvolging).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Artiesten
-- -----------------------------------------------------------------------------
create type public.artist_status as enum ('booked', 'advancing', 'ready', 'on_site', 'done');

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  genre text check (char_length(genre) <= 80),
  status public.artist_status not null default 'booked',
  color text not null default 'pink' check (color ~ '^[a-z]{3,12}$'),
  day_id uuid references public.event_days (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  /** Het optreden in de planning (voor tijden op het dossier). */
  schedule_item_id uuid references public.schedule_items (id) on delete set null,
  contact_name text check (char_length(contact_name) <= 120),
  contact_phone text check (char_length(contact_phone) <= 40),
  contact_email text check (char_length(contact_email) <= 200),
  arrival_at timestamptz,
  departure_at timestamptz,
  party_size int check (party_size between 0 and 500),
  hospitality text check (char_length(hospitality) <= 4000),
  technical text check (char_length(technical) <= 4000),
  notes text check (char_length(notes) <= 4000),
  liaison_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index artists_day_idx on public.artists (day_id);

create table public.artist_checklist (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  done boolean not null default false,
  done_by uuid references public.profiles (id) on delete set null,
  done_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index artist_checklist_artist_idx on public.artist_checklist (artist_id);

/** Standaardchecklist voor een nieuwe artiest (aanpasbaar per artiest). */
create function public.artist_default_checklist() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.artist_checklist (artist_id, title, sort_order)
  select new.id, x.title, x.n
    from unnest(array['Contract signed', 'Rider received', 'Tech rider checked',
                      'Travel and parking arranged', 'Hospitality arranged',
                      'Guest list received', 'Set times confirmed']) with ordinality as x(title, n);
  return new;
end;
$$;
create trigger artists_checklist after insert on public.artists
  for each row execute function public.artist_default_checklist();

/** Vink een checklistpunt af (of weer aan). Wie de artiest beheert of de liaison is. */
create function public.toggle_artist_check(item uuid, value boolean) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a uuid;
begin
  select c.artist_id into a from public.artist_checklist c where c.id = item;
  if a is null then
    raise exception 'AOF:unknown_item' using errcode = 'P0002';
  end if;
  if not (public.has_perm('artists.manage')
          or exists (select 1 from public.artists x where x.id = a and x.liaison_id = auth.uid())) then
    raise exception 'AOF:no_permission' using errcode = '42501';
  end if;
  update public.artist_checklist
     set done = value,
         done_by = case when value then auth.uid() end,
         done_at = case when value then now() end
   where id = item;
end;
$$;
revoke all on function public.toggle_artist_check(uuid, boolean) from public, anon;
grant execute on function public.toggle_artist_check(uuid, boolean) to authenticated;

create trigger artists_touch before insert or update on public.artists
  for each row execute function public.touch_updated();
create trigger artists_audit after insert or update or delete on public.artists
  for each row execute function public.audit_row();

alter table public.artists enable row level security;
alter table public.artist_checklist enable row level security;
revoke all on public.artists, public.artist_checklist from anon, authenticated;
grant select, insert, update, delete on public.artists, public.artist_checklist to authenticated;

create policy artists_read on public.artists for select to authenticated
  using (public.is_member() and (public.has_perm('view.artists') or public.has_perm('artists.manage')));
create policy artists_insert on public.artists for insert to authenticated
  with check (public.has_perm('artists.manage'));
create policy artists_update on public.artists for update to authenticated
  using (public.has_perm('artists.manage')) with check (public.has_perm('artists.manage'));
create policy artists_delete on public.artists for delete to authenticated
  using (public.has_perm('artists.manage'));

create policy artist_checklist_read on public.artist_checklist for select to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_id));
create policy artist_checklist_insert on public.artist_checklist for insert to authenticated
  with check (public.has_perm('artists.manage'));
create policy artist_checklist_update on public.artist_checklist for update to authenticated
  using (public.has_perm('artists.manage')) with check (public.has_perm('artists.manage'));
create policy artist_checklist_delete on public.artist_checklist for delete to authenticated
  using (public.has_perm('artists.manage'));

-- -----------------------------------------------------------------------------
-- Documenten
-- -----------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 140),
  description text check (char_length(description) <= 1000),
  category text check (char_length(category) <= 40),
  /** Leeg = iedereen met view.documents. Anders enkel deze teams (en hun subteams). */
  department_ids uuid[] not null default '{}',
  artist_id uuid references public.artists (id) on delete set null,
  file_path text check (char_length(file_path) <= 300),
  file_name text check (char_length(file_name) <= 200),
  mime_type text check (char_length(mime_type) <= 100),
  size_bytes bigint check (size_bytes >= 0),
  external_url text check (external_url ~ '^https://' and char_length(external_url) <= 1000),
  version int not null default 1 check (version >= 1),
  requires_read boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check (file_path is not null or external_url is not null)
);
create index documents_updated_idx on public.documents (updated_at desc);

create table public.document_reads (
  document_id uuid not null references public.documents (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  version int not null,
  read_at timestamptz not null default now(),
  primary key (document_id, profile_id)
);

create function public.can_see_document(dept_ids uuid[]) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_member() and (
    public.has_perm('documents.manage')
    or (public.has_perm('view.documents')
        and (cardinality(dept_ids) = 0 or dept_ids && public.team_tree()))
  )
$$;
revoke all on function public.can_see_document(uuid[]) from public, anon;
grant execute on function public.can_see_document(uuid[]) to authenticated;

/** "Gelezen" voor de huidige versie van een document. */
create function public.mark_document_read(doc uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  d record;
begin
  select department_ids, version into d from public.documents where id = doc;
  if d is null or not public.can_see_document(d.department_ids) then
    raise exception 'AOF:no_permission' using errcode = '42501';
  end if;
  insert into public.document_reads (document_id, profile_id, version)
  values (doc, auth.uid(), d.version)
  on conflict (document_id, profile_id) do update set version = excluded.version, read_at = now();
end;
$$;
revoke all on function public.mark_document_read(uuid) from public, anon;
grant execute on function public.mark_document_read(uuid) to authenticated;

create trigger documents_touch before insert or update on public.documents
  for each row execute function public.touch_updated();
create trigger documents_audit after insert or update or delete on public.documents
  for each row execute function public.audit_row();

alter table public.documents enable row level security;
alter table public.document_reads enable row level security;
revoke all on public.documents, public.document_reads from anon, authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select on public.document_reads to authenticated;

create policy documents_read on public.documents for select to authenticated
  using (public.can_see_document(department_ids));
create policy documents_insert on public.documents for insert to authenticated
  with check (public.has_perm('documents.manage'));
create policy documents_update on public.documents for update to authenticated
  using (public.has_perm('documents.manage')) with check (public.has_perm('documents.manage'));
create policy documents_delete on public.documents for delete to authenticated
  using (public.has_perm('documents.manage'));
create policy document_reads_read on public.document_reads for select to authenticated
  using (profile_id = auth.uid() or public.has_perm('documents.manage'));

-- -----------------------------------------------------------------------------
-- Meldingen (issues)
-- -----------------------------------------------------------------------------
create type public.issue_severity as enum ('low', 'normal', 'high', 'critical');
create type public.issue_status as enum ('open', 'in_progress', 'resolved');

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 140),
  description text check (char_length(description) <= 4000),
  severity public.issue_severity not null default 'normal',
  status public.issue_status not null default 'open',
  location_id uuid references public.locations (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  assigned_to uuid references public.profiles (id) on delete set null,
  photo_path text check (char_length(photo_path) <= 300),
  reported_by uuid default auth.uid() references public.profiles (id) on delete set null,
  resolution text check (char_length(resolution) <= 2000),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index issues_status_idx on public.issues (status, created_at desc);

create table public.issue_notes (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index issue_notes_issue_idx on public.issue_notes (issue_id, created_at);

/** Mag deze persoon de melding opvolgen? Beheerders van meldingen, de toegewezene en het team. */
create function public.can_handle_issue(assignee uuid, dept uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.has_perm('issues.manage')
      or assignee is not distinct from auth.uid() and assignee is not null
      or (dept is not null and dept = any (public.team_scope())), false)
$$;
revoke all on function public.can_handle_issue(uuid, uuid) from public, anon;
grant execute on function public.can_handle_issue(uuid, uuid) to authenticated;

/** Status wijzigen; "opgelost" vraagt een korte uitleg. */
create function public.set_issue_status(issue uuid, new_status public.issue_status, note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  i record;
begin
  select assigned_to, department_id into i from public.issues where id = issue;
  if not found then
    raise exception 'AOF:unknown_item' using errcode = 'P0002';
  end if;
  if not public.can_handle_issue(i.assigned_to, i.department_id) then
    raise exception 'AOF:no_permission' using errcode = '42501';
  end if;
  if new_status = 'resolved' and coalesce(btrim(note), '') = '' then
    raise exception 'AOF:reason_required' using errcode = '22023';
  end if;
  update public.issues
     set status = new_status,
         resolution = case when new_status = 'resolved' then btrim(note) else resolution end,
         resolved_at = case when new_status = 'resolved' then now() end,
         resolved_by = case when new_status = 'resolved' then auth.uid() end
   where id = issue;
  if coalesce(btrim(note), '') <> '' then
    insert into public.issue_notes (issue_id, body) values (issue, left(btrim(note), 2000));
  end if;
end;
$$;
revoke all on function public.set_issue_status(uuid, public.issue_status, text) from public, anon;
grant execute on function public.set_issue_status(uuid, public.issue_status, text) to authenticated;

create trigger issues_touch before insert or update on public.issues
  for each row execute function public.touch_updated();
create trigger issues_audit after insert or update or delete on public.issues
  for each row execute function public.audit_row();

alter table public.issues enable row level security;
alter table public.issue_notes enable row level security;
revoke all on public.issues, public.issue_notes from anon, authenticated;
grant select, insert, update, delete on public.issues to authenticated;
grant select, insert on public.issue_notes to authenticated;

create policy issues_read on public.issues for select to authenticated
  using (public.is_member() and (public.has_perm('view.issues') or public.has_perm('issues.manage')));
-- Iedereen die meldingen ziet, mag er een maken (in eigen naam, altijd "open").
create policy issues_insert on public.issues for insert to authenticated
  with check (public.is_member()
              and (public.has_perm('view.issues') or public.has_perm('issues.manage'))
              and reported_by = auth.uid() and status = 'open');
create policy issues_update on public.issues for update to authenticated
  using (public.has_perm('issues.manage')) with check (public.has_perm('issues.manage'));
create policy issues_delete on public.issues for delete to authenticated
  using (public.has_perm('issues.manage'));

create policy issue_notes_read on public.issue_notes for select to authenticated
  using (exists (select 1 from public.issues i where i.id = issue_id));
create policy issue_notes_insert on public.issue_notes for insert to authenticated
  with check (created_by = auth.uid() and exists (select 1 from public.issues i where i.id = issue_id));

-- -----------------------------------------------------------------------------
-- Realtime en opslag
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.artists, public.artist_checklist, public.documents, public.document_reads,
      public.issues, public.issue_notes;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('documents', 'documents', false, 52428800, null),
           ('issues', 'issues', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;

    -- Documenten: lezen als je het document mag zien; schrijven met documents.manage.
    create policy documents_files_read on storage.objects for select to authenticated
      using (bucket_id = 'documents' and exists (
        select 1 from public.documents d where d.file_path = name));
    create policy documents_files_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'documents' and public.has_perm('documents.manage'));
    create policy documents_files_update on storage.objects for update to authenticated
      using (bucket_id = 'documents' and public.has_perm('documents.manage'))
      with check (bucket_id = 'documents' and public.has_perm('documents.manage'));
    create policy documents_files_delete on storage.objects for delete to authenticated
      using (bucket_id = 'documents' and public.has_perm('documents.manage'));

    -- Foto's bij meldingen: uploaden in je eigen map; lezen wie meldingen ziet.
    create policy issues_files_read on storage.objects for select to authenticated
      using (bucket_id = 'issues' and public.is_member()
             and (public.has_perm('view.issues') or public.has_perm('issues.manage')));
    create policy issues_files_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'issues' and public.is_member()
                  and (storage.foldername(name))[1] = auth.uid()::text);
    create policy issues_files_delete on storage.objects for delete to authenticated
      using (bucket_id = 'issues' and public.has_perm('issues.manage'));
  end if;
end $$;
