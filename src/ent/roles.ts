export type Role = 'staff' | 'student';

const ROLE_BY_PROFILE: Record<string, Role> = {
  Teacher: 'staff',
  Personnel: 'staff',
  Student: 'student',
};

/**
 * Maps an Edifice profile type to a Rukh role. Parents, guests, unknown
 * profiles and super-admins get `null` and are refused at login.
 */
export function roleFromProfile(
  type: string | string[] | undefined,
  functions: Record<string, unknown> = {},
): Role | null {
  if ('SUPER_ADMIN' in functions) return null;
  const types = Array.isArray(type) ? type : type ? [type] : [];
  const roles = types.map((t) => ROLE_BY_PROFILE[t]).filter(Boolean);
  if (roles.includes('staff')) return 'staff';
  if (roles.includes('student')) return 'student';
  return null;
}
