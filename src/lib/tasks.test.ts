import { describe, expect, it } from 'vitest';
import { nextStatus, progress, sortTasks, type Task } from './tasks';

function task(p: Partial<Task>): Task {
  return {
    id: Math.random().toString(36),
    group_id: null,
    title: 't',
    description: null,
    department_id: null,
    location_id: null,
    day_id: null,
    due_at: null,
    priority: 'normal',
    status: 'open',
    blocked_reason: null,
    pool: false,
    requires_signoff: false,
    signed_off_by: null,
    signed_off_at: null,
    sort_order: 0,
    task_assignees: [],
    task_subtasks: [],
    ...p,
  };
}

describe('taken', () => {
  it('één tik gaat naar de volgende status', () => {
    expect(nextStatus('open')).toBe('in_progress');
    expect(nextStatus('in_progress')).toBe('done');
    expect(nextStatus('done')).toBe('open');
    expect(nextStatus('blocked')).toBe('in_progress');
  });

  it('sorteert open voor klaar, dan op deadline, dan prioriteit', () => {
    const sorted = sortTasks([
      task({ title: 'klaar', status: 'done', due_at: '2027-07-16T10:00:00Z' }),
      task({ title: 'later', due_at: '2027-07-16T12:00:00Z' }),
      task({ title: 'geen deadline kritiek', priority: 'critical' }),
      task({ title: 'eerst', due_at: '2027-07-16T09:00:00Z' }),
      task({ title: 'geen deadline laag', priority: 'low' }),
    ]);
    expect(sorted.map((x) => x.title)).toEqual([
      'eerst',
      'later',
      'geen deadline kritiek',
      'geen deadline laag',
      'klaar',
    ]);
  });

  it('berekent voortgang', () => {
    expect(
      progress([task({ status: 'done' }), task({}), task({}), task({ status: 'done' })]),
    ).toEqual({
      done: 2,
      total: 4,
      pct: 50,
    });
    expect(progress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });
});
