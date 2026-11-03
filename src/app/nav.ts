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

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Zichtbaar in de tabbalk onderaan (telefoon/staand). De rest zit onder "Meer". */
  inTabbar?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Vandaag', icon: Sun, inTabbar: true },
  { to: '/planning', label: 'Planning', icon: CalendarClock, inTabbar: true },
  { to: '/taken', label: 'Taken', icon: ListChecks, inTabbar: true },
  { to: '/artiesten', label: 'Artiesten', icon: Mic2 },
  { to: '/documenten', label: 'Documenten', icon: FileText },
  { to: '/mensen', label: 'Mensen', icon: Users },
  { to: '/meldingen', label: 'Meldingen', icon: Siren, inTabbar: true },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
  { to: '/instellingen', label: 'Instellingen', icon: Settings, adminOnly: true },
];

export function navFor(isAdmin: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);
}
