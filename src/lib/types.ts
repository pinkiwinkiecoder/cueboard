export type Role = 'beheerder' | 'afdelingshoofd' | 'crew' | 'gast';

export const ROLE_LABELS: Record<Role, string> = {
  beheerder: 'Beheerder',
  afdelingshoofd: 'Afdelingshoofd',
  crew: 'Crew',
  gast: 'Gast',
};

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  role: Role;
  active: boolean;
}
