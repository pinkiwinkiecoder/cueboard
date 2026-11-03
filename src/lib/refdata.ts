import { supabase } from './supabase';
import { must, useCachedQuery } from './query';
import type { Profile } from './types';

export interface Department {
  id: string;
  name: string;
  sort_order: number;
}
export interface Stage {
  id: string;
  name: string;
  sort_order: number;
}
export interface FestivalDay {
  id: string;
  date: string;
  label: string;
}
export interface Festival {
  name: string;
  venue: string | null;
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
          .select('id, name, sort_order')
          .order('sort_order')
          .order('name'),
      ) as Department[],
    { realtime: ['departments'] },
  );
}

export function useStages() {
  return useCachedQuery(
    'stages',
    async () =>
      must(
        await supabase
          .from('stages')
          .select('id, name, sort_order')
          .order('sort_order')
          .order('name'),
      ) as Stage[],
    { realtime: ['stages'] },
  );
}

export function useFestivalDays() {
  return useCachedQuery(
    'festival_days',
    async () =>
      must(
        await supabase.from('festival_days').select('id, date, label').order('date'),
      ) as FestivalDay[],
    { realtime: ['festival_days'] },
  );
}

export function useFestival() {
  return useCachedQuery(
    'festival',
    async () =>
      must(
        await supabase.from('festival').select('name, venue, retention_until, max_pdf_mb').single(),
      ) as Festival,
    { realtime: ['festival'] },
  );
}

export function usePeople() {
  return useCachedQuery(
    'profiles',
    async () =>
      must(
        await supabase
          .from('profiles')
          .select('id, full_name, email, phone, department_id, role, active')
          .order('full_name'),
      ) as Profile[],
    { realtime: ['profiles'] },
  );
}
