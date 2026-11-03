-- =============================================================================
-- Logo per evenement. Het logo is publiek (ook zichtbaar op het inlogscherm),
-- dus bewaren we het in een openbare bucket "branding" met kleine limieten.
-- Uploaden/vervangen enkel met settings.manage.
-- =============================================================================

alter table public.event add column logo_path text check (char_length(logo_path) <= 200);

/** Naam en logo van het evenement voor het inlogscherm (ook voor niet-ingelogden). */
create function public.public_branding() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('name', e.name, 'logo_path', e.logo_path) from public.event e limit 1
$$;
revoke all on function public.public_branding() from public;
grant execute on function public.public_branding() to anon, authenticated;

-- Storage enkel als het storage-schema bestaat (niet in de lokale PGlite-test).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('branding', 'branding', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
    on conflict (id) do nothing;

    create policy branding_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'branding' and public.has_perm('settings.manage'));
    create policy branding_update on storage.objects for update to authenticated
      using (bucket_id = 'branding' and public.has_perm('settings.manage'))
      with check (bucket_id = 'branding' and public.has_perm('settings.manage'));
    create policy branding_delete on storage.objects for delete to authenticated
      using (bucket_id = 'branding' and public.has_perm('settings.manage'));
  end if;
end $$;
