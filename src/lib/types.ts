export type Role = 'beheerder' | 'afdelingshoofd' | 'crew' | 'gast';

/** In volgorde van meeste naar minste rechten. Labels: t(`roles.${role}`). */
export const ROLES: readonly Role[] = ['beheerder', 'afdelingshoofd', 'crew', 'gast'];

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  role: Role;
  active: boolean;
}
