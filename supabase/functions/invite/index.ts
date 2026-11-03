// Edge Function "invite": iemand met het recht people.manage nodigt iemand uit, of maakt een nieuwe
// eenmalige link voor iemand die al bestaat (bv. mail niet ontvangen).
//
// De service-role key bestaat ENKEL hier (Supabase-secret), nooit in de app.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, siteUrl } from '../_shared/cors.ts';

const MAX_PER_HOUR = 30;

interface NewPerson {
  action: 'invite';
  full_name: string;
  email: string;
  phone?: string | null;
  department_id?: string | null;
  role_id: string;
  send_email: boolean;
}
interface NewLink {
  action: 'link';
  user_id: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body: unknown): NewPerson | NewLink | string {
  if (typeof body !== 'object' || body === null) return 'invalid_request';
  const b = body as Record<string, unknown>;
  if (b.action === 'link') {
    return typeof b.user_id === 'string' && UUID.test(b.user_id)
      ? { action: 'link', user_id: b.user_id }
      : 'unknown_person';
  }
  if (b.action !== 'invite') return 'invalid_request';
  const name = typeof b.full_name === 'string' ? b.full_name.trim() : '';
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const phone = typeof b.phone === 'string' && b.phone.trim() ? b.phone.trim() : null;
  const dept = typeof b.department_id === 'string' && b.department_id ? b.department_id : null;
  if (name.length < 1 || name.length > 120) return 'invalid_name';
  if (!EMAIL.test(email) || email.length > 200) return 'invalid_email';
  if (phone && !/^\+?[0-9 ()-]{6,20}$/.test(phone)) return 'invalid_phone';
  if (dept && !UUID.test(dept)) return 'unknown_department';
  if (typeof b.role_id !== 'string' || !UUID.test(b.role_id)) return 'unknown_role';
  return {
    action: 'invite',
    full_name: name,
    email,
    phone,
    department_id: dept,
    role_id: b.role_id,
    send_email: b.send_email === true,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'invalid_request' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // 1. Wie roept aan? Controle met het JWT van de gebruiker, via RLS-helpers.
  const asCaller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: caller } = await asCaller.auth.getUser();
  if (!caller.user) return json(req, { error: 'not_signed_in' }, 401);
  const { data: canManage } = await asCaller.rpc('has_perm', { perm: 'people.manage' });
  if (canManage !== true) return json(req, { error: 'no_permission' }, 403);
  const { data: callerIsAdmin } = await asCaller.rpc('is_admin');

  const admin = createClient(url, service, { auth: { persistSession: false } });

  // 2. Rate limit per beheerder.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin
    .from('invitations')
    .select('id', { count: 'exact', head: true })
    .eq('invited_by', caller.user.id)
    .gte('created_at', since);
  if ((count ?? 0) >= MAX_PER_HOUR) {
    return json(req, { error: 'rate_limited', max: MAX_PER_HOUR }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: 'invalid_request' }, 400);
  }
  const input = validate(body);
  if (typeof input === 'string') return json(req, { error: input }, 400);

  const redirectTo = `${siteUrl(req)}/nieuw-wachtwoord`;

  // Enkel een beheerder mag iemand meteen beheerder maken.
  if (input.action === 'invite') {
    const { data: role } = await admin
      .from('roles')
      .select('is_admin')
      .eq('id', input.role_id)
      .maybeSingle();
    if (!role) return json(req, { error: 'unknown_role' }, 400);
    if (role.is_admin && callerIsAdmin !== true) return json(req, { error: 'not_admin' }, 403);
  }

  // 3a. Nieuwe link voor een bestaand account.
  if (input.action === 'link') {
    const { data: prof } = await admin
      .from('profiles')
      .select('email, active')
      .eq('id', input.user_id)
      .maybeSingle();
    if (!prof) return json(req, { error: 'unknown_person' }, 404);
    if (!prof.active) return json(req, { error: 'activate_first' }, 409);
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: prof.email,
      options: { redirectTo },
    });
    if (error) return json(req, { error: 'link_failed' }, 500);
    await admin
      .from('invitations')
      .insert({ user_id: input.user_id, invited_by: caller.user.id, method: 'link' });
    return json(req, { link: data.properties.action_link });
  }

  // 3b. Nieuwe persoon.
  const meta = { full_name: input.full_name, phone: input.phone };
  let userId: string;
  let link: string | null = null;

  if (input.send_email) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
      data: meta,
      redirectTo,
    });
    if (error) return json(req, { error: friendly(error.message) }, 400);
    userId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'invite',
      email: input.email,
      options: { data: meta, redirectTo },
    });
    if (error) return json(req, { error: friendly(error.message) }, 400);
    userId = data.user.id;
    link = data.properties.action_link;
  }

  // Rol en afdeling zetten we met de service-role (gebruikers kunnen dat zelf niet).
  const { error: profErr } = await admin
    .from('profiles')
    .update({
      role_id: input.role_id,
      department_id: input.department_id,
      phone: input.phone,
      full_name: input.full_name,
    })
    .eq('id', userId);
  if (profErr) return json(req, { error: 'role_partial' }, 500);

  await admin.from('invitations').insert({
    user_id: userId,
    invited_by: caller.user.id,
    method: input.send_email ? 'email' : 'link',
  });

  return json(req, { user_id: userId, link });
});

/** Zet een Supabase-foutmelding om naar een foutcode die de app vertaalt. */
function friendly(message: string): string {
  if (/already been registered|already exists/i.test(message)) return 'already_registered';
  if (/rate limit/i.test(message)) return 'email_rate_limited';
  return 'invite_failed';
}
