import request from 'supertest';
import { bootApp, CookieJar, E2eApp, login } from './setup';

const PROFILES = ['teacher', 'personnel', 'student', 'parent', 'admin'];

describe('Assistants', () => {
  let e2e: E2eApp;
  const jars: Record<string, CookieJar> = {};
  const names: Record<'school' | 'class3A' | 'class4B' | 'draft', string> = {
    school: '',
    class3A: '',
    class4B: '',
    draft: '',
  };

  const as = (profile: string) => ({
    get: (path: string) =>
      request(e2e.server).get(path).set('Cookie', jars[profile].header()),
    post: (path: string) =>
      request(e2e.server)
        .post(path)
        .set('Cookie', jars[profile].header())
        .set('Origin', e2e.origin),
    patch: (path: string) =>
      request(e2e.server)
        .patch(path)
        .set('Cookie', jars[profile].header())
        .set('Origin', e2e.origin),
    delete: (path: string) =>
      request(e2e.server)
        .delete(path)
        .set('Cookie', jars[profile].header())
        .set('Origin', e2e.origin),
  });

  async function create(classes: string[], published: boolean) {
    const res = await as('teacher')
      .post('/context')
      .send({ title: 'Cours', model: 'model-a', classes })
      .expect(201);
    if (published) {
      await as('teacher')
        .patch(`/context/${res.body.name}`)
        .send({ published: true })
        .expect(200);
    }
    return res.body.name as string;
  }

  beforeAll(async () => {
    e2e = await bootApp();
    for (const profile of PROFILES) {
      jars[profile] = (await login(e2e.server, profile)).jar;
    }
    names.school = await create([], true);
    names.class3A = await create(['3A'], true);
    names.class4B = await create(['4B'], true);
    names.draft = await create(['3A'], false);
  });

  afterAll(() => e2e.app.close());

  describe('visibility', () => {
    it.each([
      ['teacher', ['school', 'class3A', 'class4B', 'draft']],
      ['student', ['school', 'class3A']],
      ['personnel', ['school']],
      ['parent', ['school']],
      ['admin', ['school']],
    ] as const)('lists for %s', async (profile, visible) => {
      const res = await as(profile).get('/context').expect(200);
      expect(res.body.map((a: { name: string }) => a.name).sort()).toEqual(
        visible.map((key) => names[key]).sort(),
      );
    });

    it.each([
      ['student', 'class4B'],
      ['student', 'draft'],
      ['personnel', 'class3A'],
      ['parent', 'draft'],
      ['admin', 'class4B'],
    ] as const)('returns 404 to %s on %s', async (profile, key) => {
      await as(profile).get(`/context/${names[key]}`).expect(404);
    });

    it('returns a visible assistant', async () => {
      const res = await as('student')
        .get(`/context/${names.class3A}`)
        .expect(200);
      expect(res.body).toMatchObject({
        name: names.class3A,
        ownerId: 'mock-teacher-0001',
        uai: '0000001A',
        classes: ['3A'],
        published: true,
        model: 'model-a',
      });
    });
  });

  describe('create', () => {
    it('generates the name and takes owner and school from the session', async () => {
      const res = await as('teacher')
        .post('/context')
        .send({
          title: 'Histoire-Géo 3A',
          model: 'model-b',
          description: 'd',
          classes: ['3A'],
        })
        .expect(201);
      expect(res.body.name).toMatch(
        /^hdf-0000001a-histoire-geo-3a-[a-z0-9]{6}$/,
      );
      expect(res.body).toMatchObject({
        ownerId: 'mock-teacher-0001',
        uai: '0000001A',
        published: false,
        description: 'd',
      });
    });

    it.each(['personnel', 'student', 'parent', 'admin'])(
      'returns 403 to %s',
      async (profile) => {
        await as(profile)
          .post('/context')
          .send({ title: 'x', model: 'model-a' })
          .expect(403);
      },
    );

    it.each([
      ['a model outside ENT_ALLOWED_MODELS', { model: 'openai' }],
      ['a class the teacher does not have', { classes: ['5C'] }],
      ['another school', { uai: '0000002B' }],
      ['a missing title', { title: undefined }],
    ])('returns 400 for %s', async (_, override) => {
      await as('teacher')
        .post('/context')
        .send({ title: 'x', model: 'model-a', ...override })
        .expect(400);
    });
  });

  describe('edit', () => {
    it('lets the owner update and unpublish', async () => {
      const name = await create([], true);
      const res = await as('teacher')
        .patch(`/context/${name}`)
        .send({ model: 'model-b', description: 'new', published: false })
        .expect(200);
      expect(res.body).toMatchObject({
        model: 'model-b',
        description: 'new',
        published: false,
      });
      await as('student').get(`/context/${name}`).expect(404);
    });

    it('returns 400 for a model outside ENT_ALLOWED_MODELS', async () => {
      await as('teacher')
        .patch(`/context/${names.school}`)
        .send({ model: 'openai' })
        .expect(400);
    });

    it.each(['personnel', 'student', 'parent', 'admin'])(
      'returns 403 to %s on a visible assistant',
      async (profile) => {
        await as(profile)
          .patch(`/context/${names.school}`)
          .send({ published: false })
          .expect(403);
        await as(profile).delete(`/context/${names.school}`).expect(403);
      },
    );

    it('returns 404 on a hidden assistant', async () => {
      await as('student')
        .patch(`/context/${names.draft}`)
        .send({ published: true })
        .expect(404);
      await as('student').delete(`/context/${names.draft}`).expect(404);
    });

    it('lets the owner delete', async () => {
      const name = await create([], true);
      await as('teacher').delete(`/context/${name}`).expect(204);
      await as('teacher').get(`/context/${name}`).expect(404);
    });
  });
});
