import { useState } from 'react';
import {
  Ban,
  Check,
  ChevronDown,
  Circle,
  CircleDot,
  Clock,
  Hand,
  PenLine,
  ShieldCheck,
} from 'lucide-react';
import { Avatar } from '@/app/Avatar';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/usePrefs';
import { formatTime } from '@/lib/time';
import {
  nextStatus,
  PRIORITY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  taskActions,
  type Task,
  type TaskStatus,
} from '@/lib/tasks';
import type { Profile } from '@/lib/types';

const STATUS_ICON: Record<TaskStatus, typeof Circle> = {
  open: Circle,
  in_progress: CircleDot,
  blocked: Ban,
  done: Check,
};

export function TaskRow(props: {
  task: Task;
  people: Map<string, Profile>;
  canManage: boolean;
  onError: (e: unknown) => void;
}) {
  const { task } = props;
  const { t, locale } = useT();
  const { profile, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = task.task_assignees.some((a) => a.profile_id === profile?.id);
  const mayChange = props.canManage || mine;
  const canClaim =
    task.pool &&
    task.task_assignees.length === 0 &&
    can('tasks.claim') &&
    task.department_id === profile?.department_id;
  const overdue =
    task.status !== 'done' && task.due_at !== null && Date.parse(task.due_at) < Date.now();
  const Icon = STATUS_ICON[task.status];
  const next = nextStatus(task.status);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      props.onError(e);
    } finally {
      setBusy(false);
    }
  }

  function block() {
    const reason = window.prompt(t('tasks.blockedPrompt'), task.blocked_reason ?? '');
    if (reason?.trim()) void act(() => taskActions.setStatus(task.id, 'blocked', reason));
  }

  return (
    <li className={`task${task.status === 'done' ? ' task-done' : ''}`}>
      <div className="task-main">
        <button
          type="button"
          className="status-btn"
          data-color={STATUS_COLOR[task.status]}
          disabled={!mayChange || busy}
          aria-label={`${t(STATUS_LABEL[task.status])}. ${t('tasks.nextStatus', {
            status: t(STATUS_LABEL[next]),
          })}`}
          onClick={() => void act(() => taskActions.setStatus(task.id, next))}
        >
          <Icon aria-hidden size={22} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          className="task-body"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="task-title">{task.title}</span>
          <span className="task-meta">
            <span className="badge" data-color={STATUS_COLOR[task.status]}>
              {t(STATUS_LABEL[task.status])}
            </span>
            {task.due_at && (
              <span className={`badge${overdue ? ' badge-danger' : ''}`}>
                <Clock aria-hidden size={13} />
                {overdue ? t('tasks.overdue') + ' · ' : ''}
                {formatTime(task.due_at, locale)}
              </span>
            )}
            {(task.priority === 'high' || task.priority === 'critical') && (
              <span className="badge" data-color={task.priority === 'critical' ? 'rose' : 'peach'}>
                {t(PRIORITY_LABEL[task.priority])}
              </span>
            )}
            {task.requires_signoff && (
              <span className="badge" data-color="violet">
                <PenLine aria-hidden size={13} />
                {t('tasks.signoff')}
              </span>
            )}
            {task.pool && (
              <span className="badge" data-color="teal">
                {t('tasks.pool')}
              </span>
            )}
          </span>
        </button>

        <span className="avatars" aria-label={t('tasks.assignees')}>
          {task.task_assignees.slice(0, 3).map((a) => {
            const p = props.people.get(a.profile_id);
            return p ? <Avatar key={a.profile_id} name={p.full_name} size={30} /> : null;
          })}
        </span>
        <ChevronDown
          aria-hidden
          size={20}
          className="chev"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </div>

      {open && (
        <div className="task-detail stack-sm">
          {task.description && <p style={{ margin: 0 }}>{task.description}</p>}
          {task.status === 'blocked' && task.blocked_reason && (
            <div className="alert alert-error" style={{ margin: 0 }}>
              {task.blocked_reason}
            </div>
          )}
          {task.signed_off_at && (
            <p className="hint" style={{ margin: 0 }}>
              <ShieldCheck aria-hidden size={16} />
              {t('tasks.signedOff', {
                name: props.people.get(task.signed_off_by ?? '')?.full_name ?? '—',
                time: formatTime(task.signed_off_at, locale),
              })}
            </p>
          )}
          {task.task_subtasks.length > 0 && (
            <ul className="checklist" aria-label={t('tasks.subtasks')}>
              {[...task.task_subtasks]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((s) => (
                  <li key={s.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={s.done}
                        disabled={!mayChange || busy}
                        onChange={(e) =>
                          void act(() => taskActions.toggleSubtask(s.id, e.target.checked))
                        }
                      />
                      <span>{s.title}</span>
                    </label>
                  </li>
                ))}
            </ul>
          )}
          <div className="row">
            {canClaim && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={() => void act(() => taskActions.claim(task.id))}
              >
                <Hand aria-hidden size={18} />
                {t('tasks.claim')}
              </button>
            )}
            {mayChange && task.status !== 'blocked' && task.status !== 'done' && (
              <button type="button" className="btn btn-sm" disabled={busy} onClick={block}>
                <Ban aria-hidden size={18} />
                {t('tasks.statusBlocked')}
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
