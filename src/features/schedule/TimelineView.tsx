import { useT } from '@/lib/usePrefs';
import { useNow } from '@/lib/useNow';
import { formatTime } from '@/lib/time';
import { KIND_COLOR, sortByStart, type ScheduleItem } from '@/lib/schedule';
import type { Location } from '@/lib/refdata';
import { KIND_ICON } from './parts';

const PX_PER_MIN = 1.6;

/** Tijdlijn: een kolom per locatie, tijd van boven naar onder. */
export function TimelineView(props: {
  items: ScheduleItem[];
  locations: Location[];
  onOpen?: (item: ScheduleItem) => void;
}) {
  const { t, locale } = useT();
  const now = useNow(30_000);
  if (props.items.length === 0) return null;

  const starts = props.items.map((i) => Date.parse(i.starts_at));
  const ends = props.items.map((i) => Date.parse(i.ends_at));
  const hour = 3_600_000;
  const from = Math.floor(Math.min(...starts) / hour) * hour;
  const to = Math.ceil(Math.max(...ends) / hour) * hour;
  const height = ((to - from) / 60_000) * PX_PER_MIN;
  const hours: number[] = [];
  for (let h = from; h <= to; h += hour) hours.push(h);

  const usedIds = new Set(props.items.map((i) => i.location_id));
  const columns: { id: string | null; name: string }[] = [
    ...props.locations.filter((l) => usedIds.has(l.id)).map((l) => ({ id: l.id, name: l.name })),
    ...(usedIds.has(null) ? [{ id: null, name: t('schedule.noLocation') }] : []),
  ];
  const nowY = ((now.getTime() - from) / 60_000) * PX_PER_MIN;

  return (
    <div
      className="timeline-scroll card"
      role="region"
      aria-label={t('schedule.viewTimeline')}
      tabIndex={0}
    >
      <div
        className="timeline"
        style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(180px, 1fr))` }}
      >
        <div />
        {columns.map((c) => (
          <div key={c.id ?? 'none'} className="timeline-head">
            {c.name}
          </div>
        ))}

        <div className="timeline-axis" style={{ height }}>
          {hours.map((h) => (
            <span key={h} className="time" style={{ top: ((h - from) / 60_000) * PX_PER_MIN }}>
              {formatTime(new Date(h), locale)}
            </span>
          ))}
        </div>
        {columns.map((c) => (
          <div key={c.id ?? 'none'} className="timeline-col" style={{ height }}>
            {hours.map((h) => (
              <span
                key={h}
                className="timeline-line"
                style={{ top: ((h - from) / 60_000) * PX_PER_MIN }}
              />
            ))}
            {nowY >= 0 && nowY <= height && <span className="timeline-now" style={{ top: nowY }} />}
            {sortByStart(props.items.filter((i) => i.location_id === c.id)).map((i) => {
              const top = ((Date.parse(i.starts_at) - from) / 60_000) * PX_PER_MIN;
              const h = Math.max(
                28,
                ((Date.parse(i.ends_at) - Date.parse(i.starts_at)) / 60_000) * PX_PER_MIN,
              );
              const Icon = KIND_ICON[i.kind];
              const content = (
                <>
                  <span className="timeline-block-time time">
                    <Icon aria-hidden size={13} /> {formatTime(i.starts_at, locale)}
                  </span>
                  <span className="timeline-block-title">{i.title}</span>
                </>
              );
              return props.onOpen ? (
                <button
                  key={i.id}
                  type="button"
                  className={`timeline-block${i.status === 'live' ? ' is-live' : ''}${i.status === 'done' ? ' is-done' : ''}`}
                  data-color={KIND_COLOR[i.kind]}
                  style={{ top, height: h }}
                  onClick={() => props.onOpen?.(i)}
                >
                  {content}
                </button>
              ) : (
                <div
                  key={i.id}
                  className={`timeline-block${i.status === 'live' ? ' is-live' : ''}${i.status === 'done' ? ' is-done' : ''}`}
                  data-color={KIND_COLOR[i.kind]}
                  style={{ top, height: h }}
                >
                  {content}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
