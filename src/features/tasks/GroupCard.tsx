import { useState } from 'react';
import { ChevronDown, Package, Trash2 } from 'lucide-react';
import { useT } from '@/lib/usePrefs';
import { formatDayShort, formatTime } from '@/lib/time';
import { progress, sortTasks, type Task, type TaskGroup } from '@/lib/tasks';
import type { Profile } from '@/lib/types';
import { TaskRow } from './TaskRow';

/** Een toegepast pakket: kaart met voortgang, open te klappen tot de taken. */
export function GroupCard(props: {
  group: TaskGroup;
  tasks: Task[];
  people: Map<string, Profile>;
  locationName: string | null;
  canManage: boolean;
  onDelete: () => void;
  onError: (e: unknown) => void;
}) {
  const { t, locale } = useT();
  const [open, setOpen] = useState(true);
  const p = progress(props.tasks);
  const { group } = props;

  return (
    <article className="card group-card" data-color={group.color}>
      <div className="row">
        <span className="bubble" aria-hidden>
          <Package size={20} />
        </span>
        <button
          type="button"
          className="grow group-head"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="title">{group.name}</span>
          <span className="sub">
            {[
              props.locationName,
              group.anchor_at &&
                `${formatDayShort(group.anchor_at, locale)} ${formatTime(group.anchor_at, locale)}`,
              t('tasks.progress', { done: p.done, total: p.total }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </button>
        {props.canManage && (
          <button
            type="button"
            className="icon-btn"
            aria-label={t('tasks.deleteGroup')}
            onClick={() => {
              if (window.confirm(t('tasks.confirmDeleteGroup', { name: group.name })))
                props.onDelete();
            }}
          >
            <Trash2 aria-hidden size={20} />
          </button>
        )}
        <ChevronDown
          aria-hidden
          size={20}
          className="chev"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={p.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('tasks.progress', { done: p.done, total: p.total })}
      >
        <span style={{ width: `${p.pct}%` }} />
      </div>
      {open && (
        <ul className="task-list">
          {sortTasks(props.tasks).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              people={props.people}
              canManage={props.canManage}
              onError={props.onError}
            />
          ))}
        </ul>
      )}
    </article>
  );
}
