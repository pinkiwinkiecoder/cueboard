import { FunctionsHttpError } from '@supabase/supabase-js';
import { AppError, type MsgKey } from '@/i18n';
import { supabase } from './supabase';
import type { Role } from './types';

export interface InviteInput {
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  role: Role;
  send_email: boolean;
}

/** Foutcodes van de Edge Function "invite" → vertaalsleutels. */
const CODES: Record<string, MsgKey> = {
  not_signed_in: 'errors.notSignedIn',
  not_admin: 'errors.notAdmin',
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

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
