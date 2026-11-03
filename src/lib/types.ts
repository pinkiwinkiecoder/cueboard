import type { Permission, PaletteColor } from './permissions';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  role_id: string;
  active: boolean;
}

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  color: PaletteColor;
  is_admin: boolean;
  is_default: boolean;
  permissions: Permission[];
  sort_order: number;
}

/** Wat de ingelogde persoon mag (uit public.my_access()). */
export interface Access {
  role_id: string;
  role_name: string;
  is_admin: boolean;
  permissions: Permission[];
}
