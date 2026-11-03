import { FunctionsHttpError } from '@supabase/supabase-js';
import { AppError, type MsgKey } from '@/i18n';
import { supabase } from './supabase';

export interface InviteInput {
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  role_id: string;
  send_email: boolean;
}

/** Foutcodes van de Edge Function "invite" → vertaalsleutels. */
const CODES: Record<string, MsgKey> = {
  not_signed_in: 'errors.notSignedIn',
  not_admin: 'errors.notAdmin',
  no_permission: 'errors.noPermission',
  rate_limited: 'errors.rateLimited',
  invalid_request: 'errors.invalidRequest',
  invalid_name: 'errors.invalidName',
  invalid_email: 'errors.invalidEmail',
  invalid_phone: 'errors.invalidPhone',
  unknown_department: 'errors.unknownDepartment',
  unknown_role: 'errors.unknownRole',
  unknown_person: 'errors.unknownPerson',
  activate_first: 'errors.activateFirst',
  link_failed: 'errors.linkFailed',
  already_registered: 'errors.alreadyRegistered',
  email_rate_limited: 'errors.emailRateLimited',
  invite_failed: 'errors.inviteFailed',
  role_partial: 'errors.rolePartial',
  weak_password: 'auth.pwWeak',
  password_failed: 'auth.pwSaveFailed',
};

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('invite', { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = (await error.context.json().catch(() => null)) as {
        error?: string;
        max?: number;
      } | null;
      const key = (payload?.error && CODES[payload.error]) || 'errors.inviteFailed';
      throw new AppError(key, payload?.max ? { max: payload.max } : undefined);
    }
    throw new AppError('errors.network');
  }
  return data as T;
}

export function invitePerson(input: InviteInput) {
  return call<{ user_id: string; link: string | null }>({ action: 'invite', ...input });
}

export function newLinkFor(userId: string) {
  return call<{ link: string }>({ action: 'link', user_id: userId });
}

/** Beheerder kiest een nieuw wachtwoord voor iemand. */
export function setPasswordFor(userId: string, password: string) {
  return call<{ ok: true }>({ action: 'set_password', user_id: userId, password });
}

/** Sterk, leesbaar wachtwoord (geen 0/O of 1/l) dat aan de regels voldoet. */
export function generatePassword(length = 14): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = lower + upper + digits;
  const rand = (n: number) => (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % n;
  const pick = (set: string) => set.charAt(rand(set.length));
  const chars = [pick(lower), pick(upper), pick(digits)];
  while (chars.length < length) chars.push(pick(all));
  // Schudden, zodat de verplichte tekens niet altijd vooraan staan.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    const tmp = chars[i] ?? '';
    chars[i] = chars[j] ?? '';
    chars[j] = tmp;
  }
  return chars.join('');
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
