import { supabase } from './supabase';
import { useCachedQuery } from './query';
import { compressImage } from './image';
import { AppError } from '@/i18n';

/** Naam van de app zelf. Het evenement heeft daarnaast een eigen naam en logo. */
export const APP_NAME = 'Cueboard';
export const APP_LOGO = '/logo.svg';

export function logoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from('branding').getPublicUrl(path).data.publicUrl;
}

/** Naam + logo van het evenement, ook zonder in te loggen (inlogscherm). */
export function useBranding() {
  return useCachedQuery('branding', async () => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEMO_LOGIN === '1') {
      return { name: 'Art of Faith', logo_path: null as string | null, needs_setup: false };
    }
    const { data, error } = await supabase.rpc('public_branding');
    if (error) throw new AppError('errors.network');
    return data as { name: string; logo_path: string | null; needs_setup: boolean };
  });
}

/** Logo verkleinen (max. 512 px, PNG voor transparantie) en uploaden; geeft het nieuwe pad. */
export async function uploadLogo(file: File, oldPath: string | null): Promise<string> {
  const small = await compressImage(file, 512, 0.92, 'image/png');
  const path = `logo-${Date.now()}.png`;
  const up = await supabase.storage
    .from('branding')
    .upload(path, small, { contentType: 'image/png', upsert: false, cacheControl: '31536000' });
  if (up.error) throw new AppError('errors.logoFailed');
  const { error } = await supabase.from('event').update({ logo_path: path }).eq('id', true);
  if (error) throw new AppError('errors.noPermission');
  if (oldPath) await supabase.storage.from('branding').remove([oldPath]);
  return path;
}

export async function removeLogo(oldPath: string | null): Promise<void> {
  const { error } = await supabase.from('event').update({ logo_path: null }).eq('id', true);
  if (error) throw new AppError('errors.noPermission');
  if (oldPath) await supabase.storage.from('branding').remove([oldPath]);
}

/** Logo van het evenement, of het app-logo als er (nog) geen is. */
export function EventLogo(props: { path: string | null | undefined; size?: number; alt: string }) {
  const size = props.size ?? 40;
  const src = logoUrl(props.path) ?? APP_LOGO;
  return (
    <img
      className="event-logo"
      src={src}
      alt={props.alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}
