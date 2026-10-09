import request from 'supertest';
import { SESSION_COOKIE } from '../src/ent/session.service';
import {
  approve,
  bootApp,
  CookieJar,
  E2eApp,
  login,
  startLogin,
} from './setup';

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

  describe('state', () => {
    it.each([
      ['forged', (state: string) => `${state}x`],
      ['missing', () => null],
    ])('redirects a %s state to /?error=state', async (_, tamper) => {
      const { jar, authorize } = await startLogin(e2e.server);
      const callback = await approve(e2e.server, authorize, 'teacher');
      const state = tamper(callback.searchParams.get('state'));
      if (state === null) callback.searchParams.delete('state');
      else callback.searchParams.set('state', state);

      const res = await request(e2e.server)
        .get(`${callback.pathname}${callback.search}`)
        .set('Cookie', jar.header())
        .expect(302);
      expect(res.headers.location).toBe('/?error=state');
      expect(jar.update(res).get(SESSION_COOKIE)).toBeUndefined();
    });

    it('redirects to /?error=state without the state cookie', async () => {
      const { authorize } = await startLogin(e2e.server);
      const callback = await approve(e2e.server, authorize, 'teacher');

      const res = await request(e2e.server)
        .get(`${callback.pathname}${callback.search}`)
        .expect(302);
      expect(res.headers.location).toBe('/?error=state');
      expect(new CookieJar().update(res).get(SESSION_COOKIE)).toBeUndefined();
    });
  });

  describe('Origin', () => {
    it.each([
      ['a foreign', 'https://evil.example'],
      ['a missing', undefined],
    ])('refuses a POST with %s Origin', async (_, origin) => {
      const { jar } = await login(e2e.server, 'teacher');
      const req = request(e2e.server)
        .post('/auth/logout')
        .set('Cookie', jar.header());
      if (origin) req.set('Origin', origin);
      await req.expect(403);
    });
  });

  it('logs out, and /me then returns 401', async () => {
    const { jar } = await login(e2e.server, 'teacher');
    const res = await request(e2e.server)
      .post('/auth/logout')
      .set('Origin', e2e.origin)
      .set('Cookie', jar.header())
      .expect(204);
    expect(jar.update(res).get(SESSION_COOKIE)).toBeUndefined();

    await request(e2e.server)
      .get('/me')
      .set('Cookie', jar.header())
      .expect(401);
  });
});
