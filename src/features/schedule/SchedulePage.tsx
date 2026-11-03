import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  CalendarPlus,
  Clapperboard,
  Eye,
  FileUp,
  MoveVertical,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';
import { EmptyState } from '@/app/EmptyState';
import { StaleNotice } from '@/app/StaleNotice';
import { useAuth } from '@/lib/auth';
import {
  teamTree,
  useDepartments,
  useEventDays,
  useLocations,
  useMemberships,
  usePeople,
  withChildren,
} from '@/lib/refdata';
import { useT } from '@/lib/usePrefs';
import { isoToLocal } from '@/lib/time';
import {
  changedSince,
  dependencyConflicts,
  getSeen,
  overlaps,
  scheduleActions,
  setSeen,
  sortByStart,
  usePublications,
  useScheduleDraft,
  useSchedulePublished,
  type ScheduleItem,
} from '@/lib/schedule';
import { ItemRow } from './ItemRow';
import { TimelineView } from './TimelineView';
import { NowNextView } from './NowNextView';
import { ItemDialog } from './ItemDialog';
import { ShiftDialog } from './ShiftDialog';
import { OverviewView } from './OverviewView';
import { ImportDialog } from './ImportDialog';

type View = 'list' | 'timeline' | 'now' | 'overview';
type Mode = 'draft' | 'published';

const KEYS: (keyof ScheduleItem)[] = [
  'title',
  'kind',
  'starts_at',
  'ends_at',
  'status',
  'location_id',
  'notes',
  'responsible_id',
  'depends_on',
];

function differs(draft: ScheduleItem[], published: ScheduleItem[]): boolean {
  if (draft.length !== published.length) return true;
  const pub = new Map(published.map((p) => [p.id, p]));
  return draft.some((d) => {
    const p = pub.get(d.id);
    if (!p) return true;
    if (d.department_ids.join() !== p.department_ids.join()) return true;
    return KEYS.some((k) => {
      const a = d[k];
      const b = p[k];
      // Tijden kunnen anders geformatteerd zijn (Z vs +00:00): vergelijk als moment.
      if (k === 'starts_at' || k === 'ends_at')
        return Date.parse(String(a)) !== Date.parse(String(b));
      return a !== b;
    });
  });
}

export function SchedulePage() {
  const { t, errText } = useT();
  const { can, profile } = useAuth();
  const manager = can('schedule.manage');
  const departments = useDepartments();
  const memberships = useMemberships();
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const days = useEventDays();
  const locations = useLocations();
  const people = usePeople();
  const draft = useScheduleDraft(manager);
  const published = useSchedulePublished();
  const publications = usePublications();
  const [mode, setMode] = useState<Mode>(manager ? 'draft' : 'published');
  const [view, setView] = useState<View>('list');
  const [dayId, setDayId] = useState<string | null>(null);
  const [locFilter, setLocFilter] = useState<string>('all');
  const [editing, setEditing] = useState<
    ScheduleItem | { new: true; day_id: string; location_id: string | null } | null
  >(null);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [seenAt, setSeenAt] = useState<number | null>(null);

  // Standaard: vandaag als dat een evenementdag is, anders de eerste dag.
  useEffect(() => {
    if (dayId || !days.data?.length) return;
    const today = isoToLocal(new Date().toISOString()).day;
    setDayId((days.data.find((d) => d.date === today) ?? days.data[0])?.id ?? null);
  }, [days.data, dayId]);

  const day = days.data?.find((d) => d.id === dayId);
  useEffect(() => {
    if (!dayId) return;
    const s = getSeen(dayId);
    if (s === null) setSeen(dayId); // eerste keer: niets om te vergelijken
    setSeenAt(s);
  }, [dayId]);

  const dayItems = useMemo(() => {
    const source = mode === 'draft' ? (draft.data ?? []) : (published.data ?? []);
    return sortByStart(source.filter((i) => i.day_id === dayId));
  }, [mode, draft.data, published.data, dayId]);
  // Teamfilter: "mijn teams" = mijn teams + hun subteams; een hoofdteam toont ook zijn subteams.
  const allDepts = departments.data ?? [];
  const myScope = new Set(
    (memberships.data ?? [])
      .filter((m) => m.profile_id === profile?.id)
      .flatMap((m) => [...withChildren(allDepts, m.department_id)]),
  );
  const teamScope =
    teamFilter === 'all'
      ? null
      : teamFilter === 'mine'
        ? myScope
        : withChildren(allDepts, teamFilter);
  const matches = (i: ScheduleItem) =>
    (locFilter === 'all' || i.location_id === locFilter) &&
    (!teamScope ||
      i.department_ids.some((d) => teamScope.has(d)) ||
      (teamFilter === 'mine' && i.responsible_id === profile?.id));
  const shown = dayItems.filter(matches);
  const overviewItems = (mode === 'draft' ? (draft.data ?? []) : (published.data ?? [])).filter(
    matches,
  );
  const depConflicts = dependencyConflicts(dayItems);
  const overlap = overlaps(dayItems);
  const pubDay = (published.data ?? []).filter((i) => i.day_id === dayId);
  const draftDay = (draft.data ?? []).filter((i) => i.day_id === dayId);
  const unpublished = manager && draft.data !== undefined && differs(draftDay, pubDay);
  const changed = mode === 'published' ? changedSince(pubDay, seenAt) : [];
  const changedIds = new Set(changed.map((c) => c.id));
  const removedSince = (publications.data ?? [])
    .filter((p) => p.day_id === dayId && seenAt !== null && Date.parse(p.published_at) > seenAt)
    .flatMap((p) => p.removed_titles);
  const locName = (id: string | null) =>
    id ? (locations.data?.find((l) => l.id === id)?.name ?? null) : null;
  const titleOf = (id: string | null) => dayItems.find((i) => i.id === id)?.title ?? null;

  async function publish() {
    if (!dayId) return;
    setError(null);
    try {
      const r = await scheduleActions.publish(dayId);
      setNotice(t('schedule.publishedResult', r));
      void published.reload();
      void publications.reload();
    } catch (e) {
      setError(e);
    }
  }

  function markSeen() {
    if (!dayId) return;
    setSeen(dayId);
    setSeenAt(Date.now());
  }

  return (
    <div className="stack">
      <div className="page-head">
        <span className="bubble bubble-lg" data-color="violet" aria-hidden>
          <CalendarClock size={24} />
        </span>
        <div className="grow">
          <h1>{t('schedule.title')}</h1>
          <p className="sub">{t('schedule.subtitle')}</p>
        </div>
        {manager && day && (
          <div className="row">
            <Link to="/planning/showcaller" className="btn">
              <Clapperboard aria-hidden size={20} />
              {t('schedule.showcaller')}
            </Link>
            <button type="button" className="btn" onClick={() => setImportOpen(true)}>
              <FileUp aria-hidden size={20} />
              {t('import.button')}
            </button>
            <button type="button" className="btn" onClick={() => setShiftOpen(true)}>
              <MoveVertical aria-hidden size={20} />
              {t('schedule.shift')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                setEditing({
                  new: true,
                  day_id: day.id,
                  location_id: locFilter === 'all' ? null : locFilter,
                })
              }
            >
              <Plus aria-hidden size={20} />
              {t('schedule.newItem')}
            </button>
          </div>
        )}
      </div>
      <StaleNotice fromCache={published.fromCache} fetchedAt={published.fetchedAt} />
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}

      {days.data && days.data.length === 0 && (
        <EmptyState icon={CalendarPlus} color="violet" title={t('schedule.emptyTitle')}>
          <p>{t('schedule.noDays')}</p>
        </EmptyState>
      )}

      {days.data && days.data.length > 0 && (
        <>
          {view !== 'overview' && (
            <div className="tabs" role="tablist" aria-label={t('schedule.day')}>
              {days.data.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={d.id === dayId}
                  onClick={() => setDayId(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          <div className="row">
            <div className="segmented" role="group" aria-label={t('schedule.title')}>
              {(['list', 'timeline', 'now', 'overview'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className="chip"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                >
                  {t(
                    v === 'list'
                      ? 'schedule.viewList'
                      : v === 'timeline'
                        ? 'schedule.viewTimeline'
                        : v === 'now'
                          ? 'schedule.viewNow'
                          : 'schedule.viewOverview',
                  )}
                </button>
              ))}
            </div>
            <span className="spacer" />
            {manager && (
              <div className="segmented" role="group" aria-label={t('schedule.draft')}>
                {(['draft', 'published'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="chip"
                    data-color={m === 'draft' ? 'gold' : 'mint'}
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                  >
                    {m === 'draft' ? (
                      <MoveVertical aria-hidden size={14} />
                    ) : (
                      <Eye aria-hidden size={14} />
                    )}
                    {t(m === 'draft' ? 'schedule.draft' : 'schedule.published')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {allDepts.length > 0 && (
            <div className="segmented" role="group" aria-label={t('teams.title')}>
              <button
                type="button"
                className="chip"
                aria-pressed={teamFilter === 'all'}
                onClick={() => setTeamFilter('all')}
              >
                {t('schedule.allTeams')}
              </button>
              {myScope.size > 0 && (
                <button
                  type="button"
                  className="chip"
                  data-color="gold"
                  aria-pressed={teamFilter === 'mine'}
                  onClick={() => setTeamFilter('mine')}
                >
                  {t('schedule.myTeams')}
                </button>
              )}
              {teamTree(allDepts).map(({ team }) => (
                <button
                  key={team.id}
                  type="button"
                  className="chip"
                  data-color={team.color}
                  aria-pressed={teamFilter === team.id}
                  onClick={() => setTeamFilter(team.id)}
                >
                  <span className="dot" aria-hidden />
                  {team.name}
                </button>
              ))}
            </div>
          )}

          {(locations.data?.length ?? 0) > 1 && (
            <div className="segmented" role="group" aria-label={t('schedule.location')}>
              <button
                type="button"
                className="chip"
                aria-pressed={locFilter === 'all'}
                onClick={() => setLocFilter('all')}
              >
                {t('common.all')}
              </button>
              {(locations.data ?? []).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className="chip"
                  data-color={l.color}
                  aria-pressed={locFilter === l.id}
                  onClick={() => setLocFilter(l.id)}
                >
                  <span className="dot" aria-hidden />
                  {l.name}
                </button>
              ))}
            </div>
          )}

          {manager && (
            <div className="card row" data-color={unpublished ? 'gold' : 'mint'}>
              <span className="bubble" aria-hidden>
                <Send size={20} />
              </span>
              <span className="grow">
                <strong style={{ display: 'block' }}>
                  {t(unpublished ? 'schedule.unpublished' : 'schedule.upToDate')}
                </strong>
                <span className="sub">{t('schedule.publishHint')}</span>
              </span>
              <button
                type="button"
                className={`btn ${unpublished ? 'btn-primary' : ''}`}
                disabled={!unpublished}
                onClick={() => void publish()}
              >
                <Send aria-hidden size={18} />
                {t('schedule.publish')} {day?.label}
              </button>
            </div>
          )}

          {(changed.length > 0 || removedSince.length > 0) && (
            <div className="card row" data-color="gold" role="status">
              <span className="bubble" aria-hidden>
                <Sparkles size={20} />
              </span>
              <span className="grow">
                <strong style={{ display: 'block' }}>
                  {t('schedule.changedBanner', { n: changed.length + removedSince.length })}
                </strong>
                {removedSince.length > 0 && (
                  <span className="sub">
                    {t('schedule.removedTitles', { list: removedSince.join(', ') })}
                  </span>
                )}
              </span>
              <button type="button" className="btn btn-sm" onClick={markSeen}>
                {t('schedule.markSeen')}
              </button>
            </div>
          )}

          {view === 'overview' ? (
            <OverviewView
              items={overviewItems}
              days={days.data}
              locations={locations.data ?? []}
              {...(manager && mode === 'draft'
                ? { onOpen: (i: ScheduleItem) => setEditing(i) }
                : {})}
            />
          ) : shown.length === 0 ? (
            <EmptyState icon={CalendarClock} color="violet" title={t('schedule.emptyTitle')}>
              <p>{t(manager ? 'schedule.emptyManager' : 'schedule.emptyCrew')}</p>
            </EmptyState>
          ) : view === 'list' ? (
            <ul className="sched-list card">
              {shown.map((i) => (
                <ItemRow
                  key={i.id}
                  item={i}
                  locationName={locFilter === 'all' ? locName(i.location_id) : null}
                  responsible={people.data?.find((p) => p.id === i.responsible_id)}
                  dependsTitle={titleOf(i.depends_on)}
                  conflictDep={depConflicts.has(i.id)}
                  conflictOverlap={overlap.has(i.id)}
                  changed={changedIds.has(i.id)}
                  {...(manager && mode === 'draft' ? { onOpen: () => setEditing(i) } : {})}
                />
              ))}
            </ul>
          ) : view === 'timeline' ? (
            <TimelineView
              items={shown}
              locations={locations.data ?? []}
              {...(manager && mode === 'draft'
                ? { onOpen: (i: ScheduleItem) => setEditing(i) }
                : {})}
            />
          ) : (
            <NowNextView items={shown} locations={locations.data ?? []} />
          )}
        </>
      )}

      {manager && (
        <ItemDialog
          value={editing}
          allItems={draft.data ?? []}
          onClose={() => setEditing(null)}
          onDone={() => void draft.reload()}
        />
      )}
      {manager && (
        <ImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onDone={(n) => {
            setMode('draft');
            setNotice(t('import.done', { n }));
            void draft.reload();
          }}
        />
      )}
      {manager && day && (
        <ShiftDialog
          open={shiftOpen}
          dayId={day.id}
          dayDate={day.date}
          items={draftDay}
          locations={locations.data ?? []}
          defaultLocation={locFilter === 'all' ? null : locFilter}
          onClose={() => setShiftOpen(false)}
          onDone={() => {
            void draft.reload();
            void published.reload();
          }}
        />
      )}
    </div>
  );
}
