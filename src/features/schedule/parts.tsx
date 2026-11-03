import {
  AudioLines,
  CircleDot,
  ClipboardList,
  MessagesSquare,
  Music,
  Repeat,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { useT } from '@/lib/usePrefs';
import { KIND_COLOR, KIND_LABEL, type ScheduleKind } from '@/lib/schedule';

export const KIND_ICON: Record<ScheduleKind, LucideIcon> = {
  arrival: Truck,
  soundcheck: AudioLines,
  interview: MessagesSquare,
  performance: Music,
  changeover: Repeat,
  briefing: ClipboardList,
  other: CircleDot,
};

/** Soort met icoon én label: kleur is nooit de enige betekenis. */
export function KindBadge({ kind }: { kind: ScheduleKind }) {
  const { t } = useT();
  const Icon = KIND_ICON[kind];
  return (
    <span className="badge" data-color={KIND_COLOR[kind]}>
      <Icon aria-hidden size={13} />
      {t(KIND_LABEL[kind])}
    </span>
  );
}

export function KindBubble({ kind, size = 20 }: { kind: ScheduleKind; size?: number }) {
  const Icon = KIND_ICON[kind];
  return (
    <span className="bubble" data-color={KIND_COLOR[kind]} aria-hidden>
      <Icon size={size} />
    </span>
  );
}

/** "12 min" of "1 u 30 min". */
export function useDuration() {
  const { t } = useT();
  return (minutes: number) => {
    const m = Math.max(0, Math.round(Math.abs(minutes)));
    if (m < 60) return t('schedule.minutesShort', { n: m });
    return t('schedule.hoursShort', { h: Math.floor(m / 60), m: m % 60 });
  };
}
