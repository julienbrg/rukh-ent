import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer } from '@nestjs/core';
import request from 'supertest';
import { IS_PUBLIC } from '../src/ent/public.decorator';
import { bootApp, E2eApp } from './setup';

interface Route {
  method: string;
  path: string;
  isPublic: boolean;
}

function join(...parts: string[]): string {
  return `/${parts.join('/')}`.replace(/\/+/g, '/').replace(/(.)\/$/, '$1');
}

/** Every route of every controller in the app, read from Nest's metadata. */
function routes(e2e: E2eApp): Route[] {
  const found: Route[] = [];
  for (const module of e2e.app.get(ModulesContainer).values()) {
    for (const { metatype } of module.controllers.values()) {
      const prefixes = [Reflect.getMetadata(PATH_METADATA, metatype)].flat();
      const classPublic = Reflect.getMetadata(IS_PUBLIC, metatype) === true;
      const proto = metatype.prototype;
      for (const name of Object.getOwnPropertyNames(proto)) {
        const handler = proto[name];
        const paths = Reflect.getMetadata(PATH_METADATA, handler);
        if (name === 'constructor' || paths === undefined) continue;
        const method = Reflect.getMetadata(METHOD_METADATA, handler);
        const isPublic =
          classPublic || Reflect.getMetadata(IS_PUBLIC, handler) === true;
        for (const prefix of prefixes) {
          for (const path of [paths].flat()) {
            found.push({
              method: RequestMethod[method],
              path: join(prefix, path),
              isPublic,
            });
          }
        }
      }
    }
  }
  return found.sort((a, b) =>
    `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`),
  );
}

describe('Registered routes', () => {
  let e2e: E2eApp;

  beforeAll(async () => {
    e2e = await bootApp();
  });

  afterAll(() => e2e.app.close());

  it('lists exactly these public routes', () => {
    expect(
      routes(e2e)
        .filter((r) => r.isPublic)
        .map((r) => `${r.method} ${r.path}`),
    ).toEqual([
      'GET /auth/callback',
      'GET /auth/login',
      'POST /auth/logout',
      'GET /mock-ent/auth/oauth2/approve',
      'GET /mock-ent/auth/oauth2/auth',
      'POST /mock-ent/auth/oauth2/token',
      'GET /mock-ent/auth/oauth2/userinfo',
    ]);
  });

  it('returns 401 without a session on every other route', async () => {
    const guarded = routes(e2e).filter((r) => !r.isPublic);
    expect(guarded.map((r) => r.path)).toEqual(
      expect.arrayContaining(['/me', '/mcp']),
    );

    const statuses = await Promise.all(
      guarded.map(async ({ method, path }) => {
        const verb = method === 'ALL' ? 'get' : method.toLowerCase();
        const res = await request(e2e.server)
          [verb](path.replace(/:\w+/g, 'x'))
          .set('Origin', e2e.origin);
        return `${method} ${path} ${res.status}`;
      }),
    );
    expect(statuses).toEqual(
      guarded.map(({ method, path }) => `${method} ${path} 401`),
    );
  });
});
