import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True als de app geen Supabase-gegevens heeft gekregen bij de build. */
export const configMissing = !url || !anonKey;

/**
 * Kwam de gebruiker binnen via een uitnodigings- of resetlink? Lezen vóór de client
 * de tokens uit de URL haalt: het PASSWORD_RECOVERY-event kan anders al voorbij zijn
 * voordat de app luistert, en dan zou je ingelogd raken zonder een wachtwoord te kiezen.
 */
export const arrivedViaSetPasswordLink =
  typeof window !== 'undefined' &&
  /(?:^|[#&?])type=(recovery|invite|signup)(?:&|$)/.test(window.location.hash + '&' + window.location.search.slice(1));

/** Foutcode van Supabase in de URL na een ongeldige of verlopen e-maillink (bv. otp_expired). */
export const linkError =
  typeof window !== 'undefined'
    ? (/[#&?]error_code=([a-z_]+)/.exec(window.location.hash + '&' + window.location.search)?.[1] ?? null)
    : null;

// Bij ontbrekende config maken we een client met dummywaarden, zodat de app
// een uitlegscherm kan tonen in plaats van een witte pagina.
export const supabase: SupabaseClient = createClient(
  url ?? 'http://config-ontbreekt.invalid',
  anonKey ?? 'config-ontbreekt',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
