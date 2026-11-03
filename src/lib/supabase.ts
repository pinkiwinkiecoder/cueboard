import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True als de app geen Supabase-gegevens heeft gekregen bij de build. */
export const configMissing = !url || !anonKey;

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
