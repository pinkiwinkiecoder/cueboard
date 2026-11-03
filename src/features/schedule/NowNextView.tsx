import { MapPin } from 'lucide-react';
import { useT } from '@/lib/usePrefs';
import { useNow } from '@/lib/useNow';
import { formatTime } from '@/lib/time';
import { nowAndNext, type ScheduleItem } from '@/lib/schedule';
import type { Location } from '@/lib/refdata';
import { KindBadge, KindBubble, useDuration } from './parts';

/** Per locatie: wat loopt er nu en wat komt hierna, met aftelling. */
export function NowNextView(props: { items: ScheduleItem[]; locations: Location[] }) {
  const { t, locale } = useT();
  const now = useNow(10_000);
  const dur = useDuration();
  const rows = nowAndNext(props.items, now);
  const nameOf = (id: string | null) =>
    props.locations.find((l) => l.id === id)?.name ?? t('schedule.noLocation');

  return (
    <div className="cards">
      {rows.map(({ locationId, current, next }) => {
        const curEnd = current ? Date.parse(current.ends_at) : 0;
        const curStart = current ? Date.parse(current.starts_at) : 0;
        const pct = current
          ? Math.min(
              100,
              Math.max(0, ((now.getTime() - curStart) / (curEnd - curStart || 1)) * 100),
            )
          : 0;
        const left = (curEnd - now.getTime()) / 60_000;
        return (
          <article key={locationId ?? 'none'} className="card stack-sm">
            <h3 className="row" style={{ margin: 0 }}>
              <MapPin aria-hidden size={18} /> {nameOf(locationId)}
            </h3>
            <div className="nn-block" data-color="mint">
              <span className="nn-label">{t('schedule.now')}</span>
              {current ? (
                <>
                  <div className="row">
                    <KindBubble kind={current.kind} />
                    <strong className="grow nn-title">{current.title}</strong>
                  </div>
                  <span className="sub">
                    {formatTime(current.starts_at, locale)}–{formatTime(current.ends_at, locale)} ·{' '}
                    {left >= 0
                      ? t('schedule.endsIn', { time: dur(left) })
                      : t('schedule.overtime', { time: dur(-left) })}
                  </span>
                  <div className="progress" aria-hidden>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </>
              ) : (
                <span className="muted">{t('schedule.nothingNow')}</span>
              )}
            </div>
            <div className="nn-block" data-color="sky">
              <span className="nn-label">{t('schedule.next')}</span>
              {next ? (
                <>
                  <div className="row">
                    <KindBubble kind={next.kind} />
                    <strong className="grow">{next.title}</strong>
                    <KindBadge kind={next.kind} />
                  </div>
                  <span className="sub">
                    {formatTime(next.starts_at, locale)} ·{' '}
                    {t('schedule.startsIn', {
                      time: dur((Date.parse(next.starts_at) - now.getTime()) / 60_000),
                    })}
                  </span>
                </>
              ) : (
                <span className="muted">{t('schedule.nothingNext')}</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
