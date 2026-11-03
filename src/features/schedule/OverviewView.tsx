import { useT } from '@/lib/usePrefs';
import { formatDayLong, formatTime } from '@/lib/time';
import { KIND_COLOR, sortByStart, type ScheduleItem } from '@/lib/schedule';
import type { EventDay, Location } from '@/lib/refdata';
import { KIND_ICON } from './parts';

/** Festivaloverzicht: alle dagen onder elkaar, per dag een kolom per locatie. */
export function OverviewView(props: {
  items: ScheduleItem[];
  days: EventDay[];
  locations: Location[];
  onOpen?: (item: ScheduleItem) => void;
}) {
  const { t, locale } = useT();
  return (
    <div className="stack">
      {props.days.map((day) => {
        const dayItems = sortByStart(props.items.filter((i) => i.day_id === day.id));
        const used = new Set(dayItems.map((i) => i.location_id));
        const cols = [
          ...props.locations.filter((l) => used.has(l.id)),
          ...(used.has(null)
            ? [{ id: null, name: t('schedule.noLocation'), color: 'lime' as const }]
            : []),
        ];
        return (
          <section key={day.id} className="card stack-sm" aria-labelledby={`ov-${day.id}`}>
            <div className="row">
              <h2 id={`ov-${day.id}`} className="grow" style={{ margin: 0 }}>
                {day.label}{' '}
                <span className="sub" style={{ fontWeight: 500 }}>
                  {formatDayLong(`${day.date}T12:00:00Z`, locale)}
                </span>
              </h2>
              <span className="badge">{t('schedule.itemsCount', { n: dayItems.length })}</span>
            </div>
            {dayItems.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                {t('schedule.overviewEmpty')}
              </p>
            ) : (
              <div className="overview-cols">
                {cols.map((loc) => (
                  <div key={loc.id ?? 'none'} className="overview-col" data-color={loc.color}>
                    <div className="overview-head">
                      <span className="dot" aria-hidden /> {loc.name}
                    </div>
                    <ul>
                      {dayItems
                        .filter((i) => i.location_id === loc.id)
                        .map((i) => {
                          const Icon = KIND_ICON[i.kind];
                          const content = (
                            <>
                              <span className="time">{formatTime(i.starts_at, locale)}</span>
                              <Icon aria-hidden size={14} style={{ color: 'var(--c)' }} />
                              <span className="grow">{i.title}</span>
                            </>
                          );
                          return (
                            <li
                              key={i.id}
                              data-color={KIND_COLOR[i.kind]}
                              className={i.status === 'done' ? 'is-done' : ''}
                            >
                              {props.onOpen ? (
                                <button type="button" onClick={() => props.onOpen?.(i)}>
                                  {content}
                                </button>
                              ) : (
                                <span>{content}</span>
                              )}
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
