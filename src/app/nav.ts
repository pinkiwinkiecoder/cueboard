import {
  CalendarClock,
  FileText,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  Mic2,
  Settings,
  Siren,
  Sun,
  Users,
} from 'lucide-react';
import type { MsgKey } from '@/i18n';

export interface NavItem {
  to: string;
  label: MsgKey;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Zichtbaar in de tabbalk onderaan (telefoon/staand). De rest zit onder "Meer". */
  inTabbar?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'nav.today', icon: Sun, inTabbar: true },
  { to: '/planning', label: 'nav.schedule', icon: CalendarClock, inTabbar: true },
  { to: '/taken', label: 'nav.tasks', icon: ListChecks, inTabbar: true },
  { to: '/artiesten', label: 'nav.artists', icon: Mic2 },
  { to: '/documenten', label: 'nav.documents', icon: FileText },
  { to: '/mensen', label: 'nav.people', icon: Users },
  { to: '/meldingen', label: 'nav.issues', icon: Siren, inTabbar: true },
  { to: '/dashboard', label: 'nav.dashboard', icon: LayoutDashboard, adminOnly: true },
  { to: '/instellingen', label: 'nav.settings', icon: Settings, adminOnly: true },
];

export function navFor(isAdmin: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);
}
