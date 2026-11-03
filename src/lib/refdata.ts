import { supabase } from './supabase';
import { must, useCachedQuery } from './query';
import type { Profile, RoleRow } from './types';
import { MODULES, type ModuleKey, type PaletteColor } from './permissions';

export interface Department {
  id: string;
  name: string;
  color: PaletteColor;
  sort_order: number;
}
export interface Location {
  id: string;
  name: string;
  color: PaletteColor;
  sort_order: number;
}
export interface EventDay {
  id: string;
  date: string;
  label: string;
}
export interface EventInfo {
  name: string;
  venue: string | null;
  modules: ModuleKey[];
  retention_until: string | null;
  max_pdf_mb: number;
}

export function useDepartments() {
  return useCachedQuery(
    'departments',
    async () =>
      must(
        await supabase
          .from('departments')
          .select('id, name, color, sort_order')
          .order('sort_order')
          .order('name'),
      ) as Department[],
    { realtime: ['departments'] },
  );
}

export function useLocations() {
  return useCachedQuery(
    'locations',
    async () =>
      must(
        await supabase
          .from('locations')
          .select('id, name, color, sort_order')
          .order('sort_order')
          .order('name'),
      ) as Location[],
    { realtime: ['locations'] },
  );
}

export function useEventDays() {
  return useCachedQuery(
    'event_days',
    async () =>
      must(await supabase.from('event_days').select('id, date, label').order('date')) as EventDay[],
    { realtime: ['event_days'] },
  );
}

const DEMO_EVENT: EventInfo = {
  name: 'Art of Faith',
  venue: null,
  modules: [...MODULES],
  retention_until: null,
  max_pdf_mb: 15,
};

export function useEvent() {
  return useCachedQuery(
    'event',
    async () => {
      if (import.meta.env.DEV && import.meta.env.VITE_DEMO_LOGIN === '1') return DEMO_EVENT;
      return must(
        await supabase
          .from('event')
          .select('name, venue, modules, retention_until, max_pdf_mb')
          .single(),
      ) as EventInfo;
    },
    { realtime: ['event'] },
  );
}

export function useRoles() {
  return useCachedQuery(
    'roles',
    async () =>
      must(
        await supabase
          .from('roles')
          .select('id, name, description, color, is_admin, is_default, permissions, sort_order')
          .order('sort_order')
          .order('name'),
      ) as RoleRow[],
    { realtime: ['roles'] },
  );
}

export function usePeople() {
  return useCachedQuery(
    'profiles',
    async () =>
      must(
        await supabase
          .from('profiles')
          .select('id, full_name, email, phone, department_id, role_id, active')
          .order('full_name'),
      ) as Profile[],
    { realtime: ['profiles'] },
  );
}
