import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon aria-hidden size={32} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
