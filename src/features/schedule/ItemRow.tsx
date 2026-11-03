import { AlertTriangle, MapPin, Sparkles } from 'lucide-react';
import { Avatar } from '@/app/Avatar';
import { useT } from '@/lib/usePrefs';
import { formatTime } from '@/lib/time';
import {
  SCHEDULE_STATUS_COLOR,
  SCHEDULE_STATUS_LABEL,
  startDelay,
  type ScheduleItem,
} from '@/lib/schedule';
import type { Profile } from '@/lib/types';
import { KindBadge, KindBubble } from './parts';

export function ItemRow(props: {
  item: ScheduleItem;
  locationName: string | null;
  responsible: Profile | undefined;
  dependsTitle: string | null;
  conflictDep: boolean;
  conflictOverlap: boolean;
  changed: boolean;
  onOpen?: () => void;
}) {
  const { t, locale } = useT();
  const { item } = props;
  const delay = startDelay(item);
  const live = item.status === 'live';

  const body = (
    <>
      <div className="sched-time">
        <span className="time">{formatTime(item.starts_at, locale)}</span>
        <span className="sub">{formatTime(item.ends_at, locale)}</span>
      </div>
      <KindBubble kind={item.kind} />
      <div className="grow stack-sm" style={{ gap: 4 }}>
        <span className="title">{item.title}</span>
        <span className="task-meta">
          <KindBadge kind={item.kind} />
          {item.status !== 'planned' && (
            <span className="badge" data-color={SCHEDULE_STATUS_COLOR[item.status]}>
              {t(SCHEDULE_STATUS_LABEL[item.status])}
            </span>
          )}
          {props.locationName && (
            <span className="badge">
              <MapPin aria-hidden size={13} />
              {props.locationName}
            </span>
          )}
          {props.changed && (
            <span className="badge" data-color="gold">
              <Sparkles aria-hidden size={13} />
              {t('schedule.changed')}
            </span>
          )}
          {delay !== null && (
            <span className="badge" data-color={delay > 2 ? 'rose' : 'mint'}>
              {delay > 0
                ? t('schedule.late', { n: delay })
                : delay < 0
                  ? t('schedule.early', { n: -delay })
                  : t('schedule.onTime')}
            </span>
          )}
        </span>
        {(props.conflictDep || props.conflictOverlap) && (
          <span className="hint" style={{ color: 'var(--warning)' }}>
            <AlertTriangle aria-hidden size={15} />
            {props.conflictDep
              ? t('schedule.conflictDep', { title: props.dependsTitle ?? '' })
              : t('schedule.conflictOverlap')}
          </span>
        )}
        {item.notes && <span className="sub pre">{item.notes}</span>}
      </div>
      {props.responsible && <Avatar name={props.responsible.full_name} size={32} />}
    </>
  );

  return (
    <li className={`sched-row${live ? ' sched-live' : ''}`} data-color="mint">
      {props.onOpen ? (
        <button type="button" className="sched-btn" onClick={props.onOpen}>
          {body}
        </button>
      ) : (
        <div className="sched-btn">{body}</div>
      )}
    </li>
  );
}
