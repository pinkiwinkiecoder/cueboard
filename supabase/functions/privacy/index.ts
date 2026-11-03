// Edge Function "privacy": na het evenement alle persoonsgegevens wissen.
// Verwijdert alle accounts behalve dat van de beheerder die het vraagt.
// Planning, taken en berichten blijven bestaan, maar zonder namen.
// Enkel voor een beheerder, en enkel met de bevestigingstekst "DELETE".
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'invalid_request' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const asCaller = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: caller } = await asCaller.auth.getUser();
  if (!caller.user) return json(req, { error: 'not_signed_in' }, 401);
  const { data: isAdmin } = await asCaller.rpc('is_admin');
  if (isAdmin !== true) return json(req, { error: 'not_admin' }, 403);

  let body: { action?: string; confirm?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json(req, { error: 'invalid_request' }, 400);
  }
  if (body.action !== 'purge' || body.confirm !== 'DELETE') {
    return json(req, { error: 'invalid_request' }, 400);
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });
  let deleted = 0;
  let failed = 0;
  // Per pagina van 200 gebruikers; de beheerder zelf blijft bestaan.
  for (let page = 1; page < 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return json(req, { error: 'purge_failed', deleted }, 500);
    const others = data.users.filter((u) => u.id !== caller.user!.id);
    for (const u of others) {
      const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
      if (delErr) failed++;
      else deleted++;
    }
    if (data.users.length < 200) break;
  }
  await admin.from('client_errors').delete().gte('id', 0);
  await admin.from('invitations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('audit_log').insert({
    actor: caller.user.id,
    table_name: 'profiles',
    row_id: 'all',
    action: 'DELETE',
    detail: { purge: true, deleted, failed },
  });
  return json(req, { deleted, failed });
});
