import { profileFromUserinfo, roleFromProfile } from './roles';

describe('profileFromUserinfo', () => {
  it.each([
    ['Teacher', 'Teacher'],
    ['Personnel', 'Personnel'],
    ['Student', 'Student'],
    ['Relative', 'Parent'],
    ['Guest', null],
    [undefined, null],
  ])('maps %s to %s', (type, profile) => {
    expect(profileFromUserinfo(type)).toBe(profile);
  });

  it('prefers Teacher when several profiles are present', () => {
    expect(profileFromUserinfo(['Student', 'Teacher'])).toBe('Teacher');
  });

  it('maps super-admins whatever their type', () => {
    expect(profileFromUserinfo('Teacher', { SUPER_ADMIN: {} })).toBe(
      'Super-admin',
    );
  });
});

describe('roleFromProfile', () => {
  it.each([
    ['Teacher', 'teacher'],
    ['Personnel', 'user'],
    ['Student', 'user'],
    ['Parent', 'user'],
    ['Super-admin', 'user'],
  ] as const)('maps %s to %s', (profile, role) => {
    expect(roleFromProfile(profile)).toBe(role);
  });
});
