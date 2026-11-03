import { useState } from 'react';
import { CheckCircle2, MapPin, Plus, Siren, UserRound } from 'lucide-react';
import { EmptyState } from '@/app/EmptyState';
import { StaleNotice } from '@/app/StaleNotice';
import { useAuth } from '@/lib/auth';
import {
  ISSUE_STATUS_LABEL,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  sortIssues,
  useIssues,
  type Issue,
} from '@/lib/festival';
import { useDepartments, useLocations, usePeople } from '@/lib/refdata';
import { formatDayShort, formatTime } from '@/lib/time';
import { useT } from '@/lib/usePrefs';
import { IssueDialog } from './IssueDialog';
import { ReportDialog } from './ReportDialog';

type Filter = 'open' | 'mine' | 'resolved' | 'all';

/** Problemen op het terrein: melden met foto, toewijzen, opvolgen en oplossen. */
export function IssuesPage() {
  const { t, errText, locale } = useT();
  const { profile, can } = useAuth();
  const issues = useIssues();
  const locations = useLocations();
  const departments = useDepartments();
  const people = usePeople();
  const [filter, setFilter] = useState<Filter>('open');
  const [reporting, setReporting] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const list = sortIssues(issues.data ?? []);
  const me = profile?.id;
  const shown = list.filter((i) =>
    filter === 'open'
      ? i.status !== 'resolved'
      : filter === 'resolved'
        ? i.status === 'resolved'
        : filter === 'mine'
          ? i.assigned_to === me || i.reported_by === me
          : true,
  );
  const openCount = list.filter((i) => i.status !== 'resolved').length;
  const critical = list.filter((i) => i.status !== 'resolved' && i.severity === 'critical').length;
  const current = list.find((i) => i.id === openId) ?? null;
  const name = (id: string | null) => people.data?.find((p) => p.id === id)?.full_name;
  const canReport = can('view.issues') || can('issues.manage');

  const FILTERS: [Filter, string][] = [
    ['open', `${t('issues.filterOpen')} · ${openCount}`],
    ['mine', t('issues.filterMine')],
    ['resolved', t('issues.filterResolved')],
    ['all', t('common.all')],
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <span className="bubble bubble-lg" data-color="rose" aria-hidden>
          <Siren size={24} />
        </span>
        <div className="grow">
          <h1>{t('issues.title')}</h1>
          <p className="sub">{t('issues.subtitle')}</p>
        </div>
        {canReport && (
          <button type="button" className="btn btn-primary" onClick={() => setReporting(true)}>
            <Plus aria-hidden size={20} />
            {t('issues.report')}
          </button>
        )}
      </div>
      <StaleNotice fromCache={issues.fromCache} fetchedAt={issues.fetchedAt} />
      {issues.error && !issues.data && (
        <div className="alert alert-error" role="alert">
          {errText(issues.error)}
        </div>
      )}
      {critical > 0 && (
        <div className="urgent-banner" role="alert">
          <Siren aria-hidden size={20} /> {t('issues.criticalOpen', { n: critical })}
        </div>
      )}

      <div className="tabs" role="tablist" aria-label={t('issues.title')}>
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {issues.data && shown.length === 0 ? (
        <EmptyState
          icon={filter === 'open' ? CheckCircle2 : Siren}
          color={filter === 'open' ? 'mint' : 'rose'}
          title={t(filter === 'open' ? 'issues.allClear' : 'issues.emptyTitle')}
        >
          <p>{t('issues.emptyHint')}</p>
        </EmptyState>
      ) : (
        <ul className="list">
          {shown.map((i: Issue) => {
            const loc = locations.data?.find((l) => l.id === i.location_id);
            const team = departments.data?.find((d) => d.id === i.department_id);
            return (
              <li key={i.id}>
                <button
                  type="button"
                  className="list-item"
                  data-color={SEVERITY_COLOR[i.severity]}
                  style={{ width: '100%', textAlign: 'start', opacity: i.status === 'resolved' ? 0.7 : 1 }}
                  onClick={() => setOpenId(i.id)}
                >
                  <span className="bubble" aria-hidden>
                    <Siren size={20} />
                  </span>
                  <span className="grow">
                    <span className="title" style={{ display: 'block' }}>
                      {i.title}
                    </span>
                    <span className="sub">
                      {[
                        `${formatDayShort(i.created_at, locale)} ${formatTime(i.created_at, locale)}`,
                        loc?.name,
                        team?.name,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {i.assigned_to && (
                      <span className="sub" style={{ display: 'block' }}>
                        <UserRound aria-hidden size={13} /> {name(i.assigned_to)}
                      </span>
                    )}
                  </span>
                  <span className="stack-sm" style={{ alignItems: 'flex-end' }}>
                    <span className="badge" data-color={SEVERITY_COLOR[i.severity]}>
                      {t(SEVERITY_LABEL[i.severity])}
                    </span>
                    <span className="sub">{t(ISSUE_STATUS_LABEL[i.status])}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="hint">
        <MapPin aria-hidden size={14} /> {t('issues.footer')}
      </p>

      <ReportDialog open={reporting} onClose={() => setReporting(false)} onDone={() => void issues.reload()} />
      <IssueDialog issue={current} onClose={() => setOpenId(null)} onChanged={() => void issues.reload()} />
    </div>
  );
}
