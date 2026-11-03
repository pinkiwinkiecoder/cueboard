import { supabase } from './supabase';
import { must, useCachedQuery } from './query';
import type { Profile, RoleRow } from './types';
import { MODULES, type ModuleKey, type PaletteColor } from './permissions';

export interface Department {
  id: string;
  name: string;
  color: PaletteColor;
  sort_order: number;
  parent_id: string | null;
  description: string | null;
}

export interface Membership {
  department_id: string;
  profile_id: string;
  title: string | null;
  is_lead: boolean;
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
  logo_path: string | null;
}

export function useDepartments() {
  return useCachedQuery(
    'departments',
    async () =>
      must(
        await supabase
          .from('departments')
          .select('id, name, color, sort_order, parent_id, description')
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
  logo_path: null,
};

export function useEvent() {
  return useCachedQuery(
    'event',
    async () => {
      if (import.meta.env.DEV && import.meta.env.VITE_DEMO_LOGIN === '1') return DEMO_EVENT;
      return must(
        await supabase
          .from('event')
          .select('name, venue, modules, retention_until, max_pdf_mb, logo_path')
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

export function useMemberships() {
  return useCachedQuery(
    'department_members',
    async () =>
      must(
        await supabase
          .from('department_members')
          .select('department_id, profile_id, title, is_lead'),
      ) as Membership[],
    { realtime: ['department_members'] },
  );
}

/** Teams als boom: hoofdteams met hun subteams, in volgorde. */
export function teamTree(depts: Department[]): { team: Department; children: Department[] }[] {
  const byOrder = (a: Department, b: Department) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name);
  const ids = new Set(depts.map((d) => d.id));
  return depts
    .filter((d) => !d.parent_id || !ids.has(d.parent_id))
    .sort(byOrder)
    .map((team) => ({
      team,
      children: depts.filter((d) => d.parent_id === team.id).sort(byOrder),
    }));
}

/** Een team plus zijn subteams (voor filters: Productie toont ook Main Stage). */
export function withChildren(depts: Department[], id: string): Set<string> {
  return new Set([id, ...depts.filter((d) => d.parent_id === id).map((d) => d.id)]);
}
