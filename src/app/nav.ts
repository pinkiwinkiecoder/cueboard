import {
  CalendarClock,
  FileText,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  Megaphone,
  Mic2,
  Settings,
  Siren,
  Sun,
  Users,
} from 'lucide-react';
import type { MsgKey } from '@/i18n';
import type { ModuleKey, PaletteColor, Permission } from '@/lib/permissions';

export interface NavItem {
  to: string;
  label: MsgKey;
  icon: LucideIcon;
  /** Kleur van het icoonbolletje. */
  color: PaletteColor;
  /** Module die in het evenement aan moet staan (leeg = altijd). */
  module?: ModuleKey;
  /** Recht om het onderdeel te zien (leeg = iedereen). */
  perm?: Permission;
  /** Zichtbaar in de tabbalk onderaan (telefoon/staand). De rest zit onder "Meer". */
  inTabbar?: boolean;
  /** Nog niet gebouwd: verborgen in het menu, "binnenkort" in Instellingen. */
  soon?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'nav.today', icon: Sun, color: 'gold', inTabbar: true },
  {
    to: '/schedule',
    label: 'nav.schedule',
    icon: CalendarClock,
    color: 'violet',
    module: 'schedule',
    perm: 'view.schedule',
    inTabbar: true,
  },
  {
    to: '/tasks',
    label: 'nav.tasks',
    icon: ListChecks,
    color: 'mint',
    module: 'tasks',
    perm: 'view.tasks',
    inTabbar: true,
  },
  {
    to: '/news',
    label: 'nav.announcements',
    icon: Megaphone,
    color: 'peach',
    module: 'announcements',
    inTabbar: true,
  },
  {
    to: '/artists',
    label: 'nav.artists',
    icon: Mic2,
    color: 'pink',
    module: 'artists',
    perm: 'view.artists',
  },
  {
    to: '/documents',
    label: 'nav.documents',
    icon: FileText,
    color: 'sky',
    module: 'documents',
    perm: 'view.documents',
  },
  {
    to: '/people',
    label: 'nav.people',
    icon: Users,
    color: 'teal',
    module: 'people',
    perm: 'view.people',
  },
  {
    to: '/issues',
    label: 'nav.issues',
    icon: Siren,
    color: 'rose',
    module: 'issues',
    perm: 'view.issues',
  },
  {
    to: '/dashboard',
    label: 'nav.dashboard',
    icon: LayoutDashboard,
    color: 'lime',
    module: 'dashboard',
    perm: 'view.dashboard',
  },
  {
    to: '/settings',
    label: 'nav.settings',
    icon: Settings,
    color: 'violet',
    perm: 'settings.manage',
  },
];

/** Welke onderdelen ziet deze persoon? Module moet aanstaan én de rol moet het recht hebben. */
export function visibleNav(
  can: (p: Permission) => boolean,
  modules: readonly ModuleKey[] | undefined,
  isAdmin: boolean,
): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    // Instellingen: ook voor de beheerder (rollen beheren), zelfs zonder settings.manage.
    if (item.to === '/settings') return isAdmin || can('settings.manage');
    if (item.soon) return false;
    if (item.module && modules && !modules.includes(item.module)) return false;
    return !item.perm || can(item.perm);
  });
}
