import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ListChecks, Package, PartyPopper } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEvent, usePeople } from '@/lib/refdata';
import { useT } from '@/lib/usePrefs';
import { progress, sortTasks, useTaskGroups, useTasks } from '@/lib/tasks';
import type { Profile } from '@/lib/types';
import { TaskRow } from '@/features/tasks/TaskRow';
import { PinnedList } from '@/features/announcements/PinnedList';
import { SetupChecklist } from './SetupChecklist';
import { useAnnouncements } from '@/lib/announcements';

function greetingKey(d: Date) {
  const h = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'Europe/Brussels',
    }).format(d),
  );
  if (h < 12 && h >= 5) return 'today.morning' as const;
  if (h < 18 && h >= 12) return 'today.afternoon' as const;
  return 'today.evening' as const;
}

/** Startscherm: in één oogopslag wat ik nu moet doen. */
export function TodayPage() {
  const { t, errText } = useT();
  const { profile, access, can } = useAuth();
  const event = useEvent();
  const showTasks = can('view.tasks') && (event.data?.modules.includes('tasks') ?? true);
  const tasks = useTasks();
  const groups = useTaskGroups();
  const people = usePeople();
  const [error, setError] = useState<unknown>(null);
  const announcements = useAnnouncements();
  const showAnnouncements = event.data?.modules.includes('announcements') ?? true;
  const pinned = announcements.items.filter((a) => a.pinned);
  const peopleMap = useMemo(
    () => new Map<string, Profile>((people.data ?? []).map((p) => [p.id, p])),
    [people.data],
  );
  const manager = can('tasks.manage_all') || can('tasks.manage_department');

  const mine = sortTasks(
    (tasks.data ?? []).filter((x) => x.task_assignees.some((a) => a.profile_id === profile?.id)),
  );
  const openMine = mine.filter((x) => x.status !== 'done');
  const firstName = profile?.full_name.split(' ')[0] ?? '';
  const groupStats = (groups.data ?? [])
    .map((g) => ({ g, p: progress((tasks.data ?? []).filter((x) => x.group_id === g.id)) }))
    .filter(({ p }) => p.total > 0 && p.done < p.total)
    .slice(0, 6);

  return (
    <div className="stack">
      <div className="hero card" data-color="gold">
        <div className="grow">
          <h1 style={{ margin: 0 }}>{t(greetingKey(new Date()), { name: firstName })}</h1>
          <p className="sub" style={{ margin: '4px 0 0' }}>
            {event.data?.name}
            {access ? ` · ${access.role_name}` : ''}
          </p>
        </div>
        {showTasks && (
          <div className="hero-stat">
            <span className="time hero-num">{openMine.length}</span>
            <span className="sub">{t('tasks.statusOpen')}</span>
          </div>
        )}
      </div>
      <SetupChecklist />
      {showAnnouncements && pinned.length > 0 && <PinnedList items={pinned} compact />}

      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}

      {showTasks && (
        <section className="card" data-color="mint" aria-labelledby="h-mine">
          <div className="row" style={{ marginBottom: 'var(--space-3)' }}>
            <span className="bubble" aria-hidden>
              <ListChecks size={20} />
            </span>
            <h2 id="h-mine" className="grow" style={{ margin: 0 }}>
              {t('today.myTasks')}
            </h2>
            <Link to="/taken" className="chip">
              {t('today.allTasks')} <ArrowRight aria-hidden size={14} />
            </Link>
          </div>
          {openMine.length === 0 ? (
            <div className="row muted" style={{ padding: 'var(--space-3) 0' }}>
              <PartyPopper aria-hidden size={20} />
              {t('today.nothing')}
            </div>
          ) : (
            <ul className="task-list">
              {openMine.slice(0, 6).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  people={peopleMap}
                  canManage={manager}
                  onError={setError}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {showTasks && groupStats.length > 0 && (
        <section className="stack-sm" aria-labelledby="h-pk">
          <h2 id="h-pk" style={{ margin: 'var(--space-2) 0' }}>
            {t('today.packages')}
          </h2>
          <div className="cards">
            {groupStats.map(({ g, p }) => (
              <Link
                key={g.id}
                to="/taken"
                className="card pkg-card stack-sm link-card"
                data-color={g.color}
              >
                <div className="row">
                  <span className="bubble" aria-hidden>
                    <Package size={20} />
                  </span>
                  <span className="grow">
                    <span className="title" style={{ display: 'block', fontWeight: 750 }}>
                      {g.name}
                    </span>
                    <span className="sub">
                      {t('tasks.progress', { done: p.done, total: p.total })}
                    </span>
                  </span>
                </div>
                <div className="progress" aria-hidden>
                  <span style={{ width: `${p.pct}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
