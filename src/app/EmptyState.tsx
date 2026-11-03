import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PaletteColor } from '@/lib/permissions';

export function EmptyState({
  icon: Icon,
  title,
  color = 'violet',
  children,
}: {
  icon: LucideIcon;
  title: string;
  color?: PaletteColor;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="bubble bubble-lg" data-color={color} aria-hidden>
        <Icon size={26} />
      </span>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
