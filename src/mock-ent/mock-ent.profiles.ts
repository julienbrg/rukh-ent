/** Fake Edifice `userinfo?version=2.0` payloads, keyed by login. */
export const MOCK_PROFILES: Record<
  string,
  { label: string; userinfo: Record<string, unknown> }
> = {
  teacher: {
    label: 'Teacher',
    userinfo: {
      userId: 'mock-teacher-0001',
      type: 'Teacher',
      classNames: ['3A', '4B'],
      uai: ['0000001A'],
      functions: {},
    },
  },
  personnel: {
    label: 'Personnel',
    userinfo: {
      userId: 'mock-personnel-0001',
      type: 'Personnel',
      classNames: [],
      uai: ['0000001A'],
      functions: {},
    },
  },
  student: {
    label: 'Student (3A)',
    userinfo: {
      userId: 'mock-student-0001',
      type: 'Student',
      classNames: ['3A'],
      uai: ['0000001A'],
      functions: {},
    },
  },
  parent: {
    label: 'Parent (refused)',
    userinfo: {
      userId: 'mock-relative-0001',
      type: 'Relative',
      classNames: [],
      uai: ['0000001A'],
      functions: {},
    },
  },
  admin: {
    label: 'Super-admin (refused)',
    userinfo: {
      userId: 'mock-admin-0001',
      type: 'Personnel',
      classNames: [],
      uai: ['0000001A'],
      functions: { SUPER_ADMIN: { code: 'SUPER_ADMIN' } },
    },
  },
};
