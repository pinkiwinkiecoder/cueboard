import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  LayoutDashboard,
  ListChecks,
  Mic2,
  Siren,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  ARTIST_STATUS_COLOR,
  ARTIST_STATUS_LABEL,
  checklistProgress,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  sortIssues,
  useArtists,
  useIssues,
} from '@/lib/festival';
import { useDepartments, useEvent, useLocations, usePeople } from '@/lib/refdata';
import { startDelay, useSchedulePublished } from '@/lib/schedule';
import { useTasks } from '@/lib/tasks';
import { formatTime } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { useT } from '@/lib/usePrefs';
import type { ModuleKey, PaletteColor, Permission } from '@/lib/permissions';
import { NowNextView } from '@/features/schedule/NowNextView';

function Tile(props: {
  to: string;
  icon: LucideIcon;
  color: PaletteColor;
  value: number | string;
  label: string;
  detail?: string;
  alert?: boolean;
}) {
  const Icon = props.icon;
  return (
    <Link to={props.to} className="card link-card stack-sm" data-color={props.alert ? 'rose' : props.color}>
      <span className="row">
        <span className="bubble" aria-hidden>
          <Icon size={20} />
        </span>
        <span className="grow sub">{props.label}</span>
      </span>
      <span className="time hero-num">{props.value}</span>
      {props.detail && <span className="sub">{props.detail}</span>}
    </Link>
  );
}

/** Commandocentrum: alles wat nu aandacht vraagt, op één scherm. */
export function DashboardPage() {
  const { t, locale } = useT();
  const { can } = useAuth();
  const event = useEvent();
  const now = useNow(30_000);
  const on = (m: ModuleKey, p: Permission) =>
    (event.data?.modules.includes(m) ?? true) && can(p);
  const showSchedule = on('schedule', 'view.schedule');
  const showTasks = on('tasks', 'view.tasks');
  const showIssues = on('issues', 'view.issues') || can('issues.manage');
  const showArtists = on('artists', 'view.artists') || can('artists.manage');

  const schedule = useSchedulePublished();
  const locations = useLocations();
  const tasks = useTasks();
  const issues = useIssues();
  const artists = useArtists();
  const departments = useDepartments();
  const people = usePeople();

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(now);
  const todayItems = (schedule.data ?? []).filter(
    (s) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date(s.starts_at)) === today,
  );
  const delayed = todayItems.filter((s) => (startDelay(s) ?? 0) >= 5);
  const live = todayItems.filter((s) => s.status === 'live');

  const allTasks = tasks.data ?? [];
  const openTasks = allTasks.filter((x) => x.status !== 'done');
  const overdue = openTasks.filter((x) => x.due_at && Date.parse(x.due_at) < now.getTime());
  const blocked = openTasks.filter((x) => x.status === 'blocked');
  const unassigned = openTasks.filter((x) => x.task_assignees.length === 0);
  const attention = [...blocked, ...overdue.filter((x) => x.status !== 'blocked')].slice(0, 6);

  const openIssues = sortIssues((issues.data ?? []).filter((i) => i.status !== 'resolved'));
  const critical = openIssues.filter((i) => i.severity === 'critical' || i.severity === 'high');

  const allArtists = artists.data ?? [];
  const onSite = allArtists.filter((a) => a.status === 'on_site').length;
  const notReady = allArtists.filter((a) => a.status === 'booked' || a.status === 'advancing');
  const arriving = allArtists
    .filter(
      (a) =>
        a.arrival_at &&
        a.status !== 'on_site' &&
        a.status !== 'done' &&
        Date.parse(a.arrival_at) > now.getTime() - 3_600_000 &&
        Date.parse(a.arrival_at) < now.getTime() + 6 * 3_600_000,
    )
    .sort((x, y) => (x.arrival_at ?? '').localeCompare(y.arrival_at ?? ''));

  // Werklast per hoofdteam (open taken).
  const load = (departments.data ?? [])
    .filter((d) => !d.parent_id)
    .map((d) => {
      const ids = new Set([d.id, ...(departments.data ?? []).filter((c) => c.parent_id === d.id).map((c) => c.id)]);
      return { d, n: openTasks.filter((x) => x.department_id && ids.has(x.department_id)).length };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxLoad = Math.max(1, ...load.map((x) => x.n));
  const crew = (people.data ?? []).filter((p) => p.active).length;
  const name = (id: string | null) => people.data?.find((p) => p.id === id)?.full_name;

  return (
    <div className="stack">
      <div className="page-head">
        <span className="bubble bubble-lg" data-color="lime" aria-hidden>
          <LayoutDashboard size={24} />
        </span>
        <div className="grow">
          <h1>{t('dashboard.title')}</h1>
          <p className="sub">{t('dashboard.subtitle', { time: formatTime(now, locale) })}</p>
        </div>
      </div>

      <div className="cards dash-tiles">
        {showIssues && (
          <Tile
            to="/issues"
            icon={Siren}
            color="rose"
            value={openIssues.length}
            label={t('dashboard.openIssues')}
            detail={t('dashboard.urgentIssues', { n: critical.length })}
            alert={critical.length > 0}
          />
        )}
        {showTasks && (
          <Tile
            to="/tasks"
            icon={ListChecks}
            color="mint"
            value={openTasks.length}
            label={t('dashboard.openTasks')}
            detail={t('dashboard.taskDetail', {
              overdue: overdue.length,
              blocked: blocked.length,
              unassigned: unassigned.length,
            })}
            alert={overdue.length + blocked.length > 0}
          />
        )}
        {showSchedule && (
          <Tile
            to="/schedule"
            icon={CalendarClock}
            color="violet"
            value={live.length}
            label={t('dashboard.liveNow')}
            detail={t('dashboard.delays', { n: delayed.length })}
            alert={delayed.length > 0}
          />
        )}
        {showArtists && (
          <Tile
            to="/artists"
            icon={Mic2}
            color="pink"
            value={`${onSite}/${allArtists.length}`}
            label={t('dashboard.artistsOnSite')}
            detail={t('dashboard.artistsNotReady', { n: notReady.length })}
          />
        )}
        <Tile to="/people" icon={Users} color="teal" value={crew} label={t('dashboard.crew')} />
      </div>

      {showSchedule && (schedule.data ?? []).length > 0 && (
        <section className="stack-sm" aria-labelledby="h-stages">
          <h2 id="h-stages" style={{ margin: 'var(--space-2) 0' }}>
            {t('dashboard.stages')}
          </h2>
          <NowNextView items={todayItems.length ? todayItems : (schedule.data ?? [])} locations={locations.data ?? []} />
        </section>
      )}

      <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
        {showIssues && (
          <section className="card stack-sm" data-color="rose" aria-labelledby="h-di">
            <div className="row">
              <h2 id="h-di" className="grow" style={{ margin: 0 }}>
                <Siren aria-hidden size={18} /> {t('dashboard.issuesTitle')}
              </h2>
              <Link to="/issues" className="chip">
                {t('dashboard.all')} <ArrowRight aria-hidden size={14} />
              </Link>
            </div>
            {openIssues.length === 0 ? (
              <p className="sub" style={{ margin: 0 }}>{t('issues.allClear')}</p>
            ) : (
              <ul className="list">
                {openIssues.slice(0, 5).map((i) => (
                  <li key={i.id} className="list-item">
                    <span className="grow">
                      <span className="title" style={{ display: 'block' }}>{i.title}</span>
                      <span className="sub">
                        {[locations.data?.find((l) => l.id === i.location_id)?.name, name(i.assigned_to) ?? t('dashboard.unassigned')]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span className="badge" data-color={SEVERITY_COLOR[i.severity]}>
                      {t(SEVERITY_LABEL[i.severity])}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {showTasks && (
          <section className="card stack-sm" data-color="mint" aria-labelledby="h-dt">
            <div className="row">
              <h2 id="h-dt" className="grow" style={{ margin: 0 }}>
                <AlertTriangle aria-hidden size={18} /> {t('dashboard.tasksTitle')}
              </h2>
              <Link to="/tasks" className="chip">
                {t('dashboard.all')} <ArrowRight aria-hidden size={14} />
              </Link>
            </div>
            {attention.length === 0 ? (
              <p className="sub" style={{ margin: 0 }}>{t('dashboard.tasksOk')}</p>
            ) : (
              <ul className="list">
                {attention.map((x) => (
                  <li key={x.id} className="list-item">
                    <span className="grow">
                      <span className="title" style={{ display: 'block' }}>{x.title}</span>
                      <span className="sub">
                        {x.status === 'blocked'
                          ? `${t('dashboard.blocked')}${x.blocked_reason ? `: ${x.blocked_reason}` : ''}`
                          : t('dashboard.overdueSince', { time: formatTime(x.due_at ?? now, locale) })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {showArtists && allArtists.length > 0 && (
          <section className="card stack-sm" data-color="pink" aria-labelledby="h-da">
            <div className="row">
              <h2 id="h-da" className="grow" style={{ margin: 0 }}>
                <Mic2 aria-hidden size={18} /> {t('dashboard.arrivingTitle')}
              </h2>
              <Link to="/artists" className="chip">
                {t('dashboard.all')} <ArrowRight aria-hidden size={14} />
              </Link>
            </div>
            {arriving.length === 0 ? (
              <p className="sub" style={{ margin: 0 }}>{t('dashboard.noArrivals')}</p>
            ) : (
              <ul className="list">
                {arriving.slice(0, 5).map((a) => {
                  const p = checklistProgress(a);
                  return (
                    <li key={a.id}>
                      <Link to={`/artists/${a.id}`} className="list-item">
                        <span className="time">{formatTime(a.arrival_at ?? now, locale)}</span>
                        <span className="grow">
                          <span className="title" style={{ display: 'block' }}>{a.name}</span>
                          <span className="sub">{t('artists.checklistProgress', { done: p.done, total: p.total })}</span>
                        </span>
                        <span className="badge" data-color={ARTIST_STATUS_COLOR[a.status]}>
                          {t(ARTIST_STATUS_LABEL[a.status])}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {showTasks && load.length > 0 && (
          <section className="card stack-sm" data-color="sky" aria-labelledby="h-dl">
            <h2 id="h-dl" style={{ margin: 0 }}>
              <Users aria-hidden size={18} /> {t('dashboard.workload')}
            </h2>
            <ul className="list">
              {load.map(({ d, n }) => (
                <li key={d.id} className="stack-sm" data-color={d.color}>
                  <span className="row">
                    <span className="dot" aria-hidden />
                    <span className="grow">{d.name}</span>
                    <span className="sub">{t('dashboard.openCount', { n })}</span>
                  </span>
                  <div className="progress" aria-hidden>
                    <span style={{ width: `${(n / maxLoad) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
