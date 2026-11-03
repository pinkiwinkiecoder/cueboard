import type { MsgKey } from '@/i18n';
import { supabase } from './supabase';
import { dbError, must, useCachedQuery } from './query';
import type { PaletteColor } from './permissions';

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Task {
  id: string;
  group_id: string | null;
  title: string;
  description: string | null;
  department_id: string | null;
  location_id: string | null;
  day_id: string | null;
  due_at: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  blocked_reason: string | null;
  pool: boolean;
  requires_signoff: boolean;
  signed_off_by: string | null;
  signed_off_at: string | null;
  sort_order: number;
  task_assignees: { profile_id: string }[];
  task_subtasks: { id: string; title: string; done: boolean; sort_order: number }[];
}

export interface TaskGroup {
  id: string;
  package_id: string | null;
  name: string;
  color: PaletteColor;
  day_id: string | null;
  location_id: string | null;
  department_id: string | null;
  anchor_at: string | null;
  created_at: string;
}

export interface PackageItem {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  offset_minutes: number | null;
  requires_signoff: boolean;
  sort_order: number;
}

export interface TaskPackage {
  id: string;
  name: string;
  description: string | null;
  color: PaletteColor;
  department_id: string | null;
  package_items: PackageItem[];
}

export const STATUS_LABEL: Record<TaskStatus, MsgKey> = {
  open: 'tasks.statusOpen',
  in_progress: 'tasks.statusInProgress',
  blocked: 'tasks.statusBlocked',
  done: 'tasks.statusDone',
};
export const STATUS_COLOR: Record<TaskStatus, PaletteColor> = {
  open: 'sky',
  in_progress: 'gold',
  blocked: 'rose',
  done: 'mint',
};
export const PRIORITY_LABEL: Record<TaskPriority, MsgKey> = {
  low: 'tasks.priorityLow',
  normal: 'tasks.priorityNormal',
  high: 'tasks.priorityHigh',
  critical: 'tasks.priorityCritical',
};
export const PRIORITIES: TaskPriority[] = ['low', 'normal', 'high', 'critical'];

/** Eén tik = volgende stap. Geblokkeerd gaat via een aparte knop (reden verplicht). */
export function nextStatus(s: TaskStatus): TaskStatus {
  switch (s) {
    case 'open':
      return 'in_progress';
    case 'in_progress':
      return 'done';
    case 'blocked':
      return 'in_progress';
    case 'done':
      return 'open';
  }
}

const PRIORITY_RANK: Record<TaskPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };

/** Sorteert: niet-klaar eerst, dan deadline, dan prioriteit, dan volgorde. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const doneA = a.status === 'done' ? 1 : 0;
    const doneB = b.status === 'done' ? 1 : 0;
    if (doneA !== doneB) return doneA - doneB;
    const dueA = a.due_at ? Date.parse(a.due_at) : Infinity;
    const dueB = b.due_at ? Date.parse(b.due_at) : Infinity;
    if (dueA !== dueB) return dueA - dueB;
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return pr !== 0 ? pr : a.sort_order - b.sort_order;
  });
}

export function progress(tasks: Task[]): { done: number; total: number; pct: number } {
  const total = tasks.length;
  const done = tasks.filter((x) => x.status === 'done').length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

const TASK_SELECT =
  'id, group_id, title, description, department_id, location_id, day_id, due_at, priority, status, blocked_reason, pool, requires_signoff, signed_off_by, signed_off_at, sort_order, task_assignees(profile_id), task_subtasks(id, title, done, sort_order)';

export function useTasks() {
  return useCachedQuery(
    'tasks',
    async () => must(await supabase.from('tasks').select(TASK_SELECT)) as Task[],
    { realtime: ['tasks', 'task_assignees', 'task_subtasks'] },
  );
}

export function useTaskGroups() {
  return useCachedQuery(
    'task_groups',
    async () =>
      must(
        await supabase
          .from('task_groups')
          .select(
            'id, package_id, name, color, day_id, location_id, department_id, anchor_at, created_at',
          )
          .order('created_at', { ascending: false }),
      ) as TaskGroup[],
    { realtime: ['task_groups'] },
  );
}

export function usePackages() {
  return useCachedQuery(
    'task_packages',
    async () =>
      must(
        await supabase
          .from('task_packages')
          .select(
            'id, name, description, color, department_id, package_items(id, title, description, priority, offset_minutes, requires_signoff, sort_order)',
          )
          .order('name'),
      ) as TaskPackage[],
    { realtime: ['task_packages', 'package_items'] },
  );
}

async function rpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw dbError(error);
  return data as unknown;
}

export const taskActions = {
  setStatus: (task: string, status: TaskStatus, reason?: string) =>
    rpc('set_task_status', { task, new_status: status, reason: reason ?? null }),
  claim: (task: string) => rpc('claim_task', { task }),
  toggleSubtask: (subtask: string, done: boolean) =>
    rpc('toggle_subtask', { subtask, is_done: done }),
  applyPackage: (args: {
    package: string;
    day: string | null;
    location: string | null;
    department: string | null;
    assignee: string | null;
    anchor: string | null;
    group_name: string | null;
  }) => rpc('apply_package', args) as Promise<string>,
};
