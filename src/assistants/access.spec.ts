import type { EntUser } from '../ent/session.service';
import { Assistant, canEdit, canSee } from './access';

const owner: EntUser = {
  userId: 't1',
  profile: 'Teacher',
  role: 'teacher',
  uai: ['0000001A'],
  classes: ['3A', '4B'],
};

function user(overrides: Partial<EntUser> = {}): EntUser {
  return {
    userId: 's1',
    profile: 'Student',
    role: 'user',
    uai: ['0000001A'],
    classes: ['3A'],
    ...overrides,
  };
}

function assistant(overrides: Partial<Assistant> = {}): Assistant {
  return {
    name: 'a',
    ownerId: 't1',
    uai: '0000001A',
    classes: [],
    published: true,
    model: 'mistral',
    description: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('canSee', () => {
  it('lets the owner see a draft', () => {
    expect(canSee(owner, assistant({ published: false }))).toBe(true);
  });

  it('hides a draft from everyone else', () => {
    expect(canSee(user(), assistant({ published: false }))).toBe(false);
  });

  it('shows a published school-wide assistant to the same school', () => {
    expect(canSee(user({ classes: [] }), assistant())).toBe(true);
  });

  it('hides it from another school', () => {
    expect(canSee(user({ uai: ['0000002B'] }), assistant())).toBe(false);
  });

  it('shows it to a matching class', () => {
    expect(canSee(user(), assistant({ classes: ['3A'] }))).toBe(true);
  });

  it('hides it from another class', () => {
    expect(canSee(user(), assistant({ classes: ['4B'] }))).toBe(false);
  });

  it('hides a class assistant from users without a class', () => {
    expect(canSee(user({ classes: [] }), assistant({ classes: ['3A'] }))).toBe(
      false,
    );
  });

  it('hides a matching class in another school', () => {
    expect(
      canSee(user({ uai: ['0000002B'] }), assistant({ classes: ['3A'] })),
    ).toBe(false);
  });
});

describe('canEdit', () => {
  it('lets the owning teacher edit', () => {
    expect(canEdit(owner, assistant())).toBe(true);
  });

  it('refuses another teacher', () => {
    expect(canEdit({ ...owner, userId: 't2' }, assistant())).toBe(false);
  });

  it('refuses a non-teacher, even with the owner id', () => {
    expect(canEdit({ ...user(), userId: 't1' }, assistant())).toBe(false);
  });
});
