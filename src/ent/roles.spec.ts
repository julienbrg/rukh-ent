import { roleFromProfile } from './roles';

describe('roleFromProfile', () => {
  it.each([
    ['Teacher', 'staff'],
    ['Personnel', 'staff'],
    ['Student', 'student'],
    ['Relative', null],
    ['Guest', null],
    [undefined, null],
  ])('maps %s to %s', (type, role) => {
    expect(roleFromProfile(type)).toBe(role);
  });

  it('prefers staff when several profiles are present', () => {
    expect(roleFromProfile(['Student', 'Teacher'])).toBe('staff');
  });

  it('refuses super-admins', () => {
    expect(roleFromProfile('Personnel', { SUPER_ADMIN: {} })).toBeNull();
  });
});
