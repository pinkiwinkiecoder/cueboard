import { Pin } from 'lucide-react';
import type { Announcement } from '@/lib/announcements';

/** Vastgepinde berichten (bv. portofoonkanalen) als rustige kaarten. */
export function PinnedList({
  items,
  compact = false,
}: {
  items: Announcement[];
  compact?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className={compact ? 'pinned-row' : 'cards'}>
      {items.map((a) => (
        <article key={a.id} className="card pinned-card" data-color={a.color}>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span className="bubble" aria-hidden>
              <Pin size={18} />
            </span>
            <div className="grow">
              <h3 style={{ margin: '6px 0 4px' }}>{a.title}</h3>
              {a.body && <p className="pre pinned-body">{a.body}</p>}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
