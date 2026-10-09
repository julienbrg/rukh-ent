import request from 'supertest';
import { SESSION_COOKIE } from '../src/ent/session.service';
import { bootApp, E2eApp, login } from './setup';

describe('Login against the mock ENT', () => {
  let e2e: E2eApp;

  beforeAll(async () => {
    e2e = await bootApp();
  });

  afterAll(() => e2e.app.close());

  it.each([
    ['teacher', 'mock-teacher-0001', 'Teacher', 'teacher', ['3A', '4B']],
    ['personnel', 'mock-personnel-0001', 'Personnel', 'user', []],
    ['student', 'mock-student-0001', 'Student', 'user', ['3A']],
    ['parent', 'mock-relative-0001', 'Parent', 'user', []],
    ['admin', 'mock-admin-0001', 'Super-admin', 'user', []],
  ])(
    'logs %s in and /me returns their profile',
    async (profileLogin, userId, profile, role, classes) => {
      const { jar, res } = await login(e2e.server, profileLogin);
      expect(res.headers.location).toBe('/');
      expect(jar.get(SESSION_COOKIE)).toBeDefined();

      const me = await request(e2e.server)
        .get('/me')
        .set('Cookie', jar.header())
        .expect(200);
      expect(me.body).toEqual({
        userId,
        profile,
        role,
        schools: ['0000001A'],
        classes,
        allowedModels: ['model-a', 'model-b'],
      });
    },
  );

  it('refuses an unknown profile without a session', async () => {
    const { jar, res } = await login(e2e.server, 'guest');
    expect(res.headers.location).toBe('/?error=refused');
    expect(jar.get(SESSION_COOKIE)).toBeUndefined();
  });
});
