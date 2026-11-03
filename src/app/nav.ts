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
    to: '/planning',
    label: 'nav.schedule',
    icon: CalendarClock,
    color: 'violet',
    module: 'schedule',
    perm: 'view.schedule',
    inTabbar: true,
  },
  {
    to: '/taken',
    label: 'nav.tasks',
    icon: ListChecks,
    color: 'mint',
    module: 'tasks',
    perm: 'view.tasks',
    inTabbar: true,
  },
  {
    to: '/mededelingen',
    label: 'nav.announcements',
    icon: Megaphone,
    color: 'peach',
    module: 'announcements',
    inTabbar: true,
  },
  {
    to: '/artiesten',
    label: 'nav.artists',
    icon: Mic2,
    color: 'pink',
    module: 'artists',
    soon: true,
    perm: 'view.artists',
  },
  {
    to: '/documenten',
    label: 'nav.documents',
    icon: FileText,
    color: 'sky',
    module: 'documents',
    soon: true,
    perm: 'view.documents',
  },
  {
    to: '/mensen',
    label: 'nav.people',
    icon: Users,
    color: 'teal',
    module: 'people',
    perm: 'view.people',
  },
  {
    to: '/meldingen',
    label: 'nav.issues',
    icon: Siren,
    color: 'rose',
    module: 'issues',
    soon: true,
    perm: 'view.issues',
  },
  {
    to: '/dashboard',
    label: 'nav.dashboard',
    icon: LayoutDashboard,
    color: 'lime',
    module: 'dashboard',
    soon: true,
    perm: 'view.dashboard',
  },
  {
    to: '/instellingen',
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
    if (item.to === '/instellingen') return isAdmin || can('settings.manage');
    if (item.soon) return false;
    if (item.module && modules && !modules.includes(item.module)) return false;
    return !item.perm || can(item.perm);
  });
}
