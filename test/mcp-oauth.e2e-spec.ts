import { ConfigService } from '@nestjs/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  auth,
  OAuthClientProvider,
} from '@modelcontextprotocol/sdk/client/auth.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { createHash, randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import type { EntUser } from '../src/ent/session.service';
import { McpTokenService } from '../src/mcp/oauth/mcp-token.service';
import { approve, bootApp, CookieJar, E2eApp, login } from './setup';

const REDIRECT_URI = 'http://127.0.0.1:9/callback';

/** In-memory MCP client state; the browser part is driven by `signIn`. */
class MemoryProvider implements OAuthClientProvider {
  client?: OAuthClientInformationMixed;
  saved?: OAuthTokens;
  verifier = '';
  authorizationUrl?: URL;

  get redirectUrl() {
    return REDIRECT_URI;
  }
  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: 'E2E client',
      redirect_uris: [REDIRECT_URI],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    };
  }
  clientInformation() {
    return this.client;
  }
  saveClientInformation(client: OAuthClientInformationMixed) {
    this.client = client;
  }
  tokens() {
    return this.saved;
  }
  saveTokens(tokens: OAuthTokens) {
    this.saved = tokens;
  }
  redirectToAuthorization(url: URL) {
    this.authorizationUrl = url;
  }
  saveCodeVerifier(verifier: string) {
    this.verifier = verifier;
  }
  codeVerifier() {
    return this.verifier;
  }
}

/**
 * Plays the browser: `/authorize`, the ENT login as `profile`, then the
 * consent screen. Returns where the server sends the browser back to.
 */
async function signIn(
  server: Server,
  origin: string,
  authorizationUrl: URL,
  profile: string,
  decision = 'approve',
): Promise<URL> {
  const jar = new CookieJar();
  const authorize = await request(server)
    .get(`${authorizationUrl.pathname}${authorizationUrl.search}`)
    .expect(302);
  jar.update(authorize);
  expect(authorize.headers.location).toBe(
    '/auth/login?next=%2Foauth%2Fconsent',
  );

  const login = await request(server)
    .get(authorize.headers.location)
    .set('Cookie', jar.header())
    .expect(302);
  jar.update(login);
  const callback = await approve(
    server,
    new URL(login.headers.location),
    profile,
  );
  const landed = await request(server)
    .get(`${callback.pathname}${callback.search}`)
    .set('Cookie', jar.header())
    .expect(302);
  jar.update(landed);
  expect(landed.headers.location).toBe('/oauth/consent');

  const consent = await request(server)
    .get('/oauth/consent')
    .set('Cookie', jar.header());
  if (consent.status === 303) return new URL(consent.headers.location);
  expect(consent.status).toBe(200);
  expect(consent.text).toContain('E2E client');

  const decided = await request(server)
    .post('/oauth/consent')
    .set('Cookie', jar.header())
    .set('Origin', origin)
    .type('form')
    .send({ decision })
    .expect(303);
  return new URL(decided.headers.location);
}

/** Registers a client and returns a fresh code, with its PKCE verifier. */
async function rawCode(server: Server, origin: string, profile = 'teacher') {
  const client = (
    await request(server)
      .post('/register')
      .send({
        client_name: 'E2E client',
        redirect_uris: [REDIRECT_URI],
        token_endpoint_auth_method: 'none',
      })
      .expect(201)
  ).body;
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const authorize = new URL('/authorize', origin);
  authorize.search = new URLSearchParams({
    response_type: 'code',
    client_id: client.client_id,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 's1',
    resource: `${origin}/mcp`,
  }).toString();
  const back = await signIn(server, origin, authorize, profile);
  return {
    clientId: client.client_id as string,
    verifier,
    code: back.searchParams.get('code'),
  };
}

function token(server: Server, form: Record<string, string>) {
  return request(server)
    .post('/token')
    .type('form')
    .send({ grant_type: 'authorization_code', ...form });
}

function tokens(origin: string, overrides: Record<string, unknown> = {}) {
  const values = {
    PUBLIC_ORIGIN: origin,
    SESSION_SECRET: process.env.SESSION_SECRET,
    MCP_TOKEN_SECONDS: 3600,
    ...overrides,
  };
  return new McpTokenService({
    get: (key: string) => values[key],
  } as unknown as ConfigService);
}

const teacher: EntUser = {
  userId: 'mock-teacher-0001',
  profile: 'Teacher',
  role: 'teacher',
  uai: ['0000001A'],
  classes: ['3A', '4B'],
};

const initialize = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'e2e', version: '1' },
  },
};

function callMcp(server: Server, bearer?: string) {
  const req = request(server)
    .post('/mcp')
    .set('Accept', 'application/json, text/event-stream')
    .send(initialize);
  return bearer ? req.set('Authorization', `Bearer ${bearer}`) : req;
}

describe('MCP OAuth', () => {
  let e2e: E2eApp;

  beforeAll(async () => {
    e2e = await bootApp();
  });

  afterAll(() => e2e.app.close());

  it('publishes discovery metadata', async () => {
    const resource = await request(e2e.server)
      .get('/.well-known/oauth-protected-resource/mcp')
      .expect(200);
    expect(resource.body).toMatchObject({
      resource: `${e2e.origin}/mcp`,
      authorization_servers: [`${e2e.origin}/`],
    });
    const server = await request(e2e.server)
      .get('/.well-known/oauth-authorization-server')
      .expect(200);
    expect(server.body).toMatchObject({
      issuer: `${e2e.origin}/`,
      authorization_endpoint: `${e2e.origin}/authorize`,
      token_endpoint: `${e2e.origin}/token`,
      registration_endpoint: `${e2e.origin}/register`,
      code_challenge_methods_supported: ['S256'],
    });
  });

  it('connects the SDK client end to end and whoami returns the token user', async () => {
    const provider = new MemoryProvider();
    const serverUrl = `${e2e.origin}/mcp`;
    expect(await auth(provider, { serverUrl })).toBe('REDIRECT');
    expect(provider.authorizationUrl.searchParams.get('resource')).toBe(
      serverUrl,
    );

    const back = await signIn(
      e2e.server,
      e2e.origin,
      provider.authorizationUrl,
      'teacher',
    );
    expect(`${back.origin}${back.pathname}`).toBe(REDIRECT_URI);
    expect(
      await auth(provider, {
        serverUrl,
        authorizationCode: back.searchParams.get('code'),
      }),
    ).toBe('AUTHORIZED');
    expect(provider.saved).toMatchObject({ token_type: 'Bearer' });
    expect(provider.saved.refresh_token).toBeUndefined();

    const client = new Client({ name: 'e2e', version: '1' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(serverUrl), {
        authProvider: provider,
      }),
    );
    const result = await client.callTool({ name: 'whoami' });
    await client.close();
    expect(JSON.parse(result.content[0].text)).toEqual({
      profile: 'Teacher',
      role: 'teacher',
      schools: ['0000001A'],
      classes: ['3A', '4B'],
    });
  });

  describe('token endpoint', () => {
    it('refuses a wrong PKCE verifier', async () => {
      const { clientId, code } = await rawCode(e2e.server, e2e.origin);
      const res = await token(e2e.server, {
        client_id: clientId,
        code,
        code_verifier: randomBytes(32).toString('base64url'),
        redirect_uri: REDIRECT_URI,
      }).expect(400);
      expect(res.body.error).toBe('invalid_grant');
    });

    it('refuses a missing PKCE verifier', async () => {
      const { clientId, code } = await rawCode(e2e.server, e2e.origin);
      await token(e2e.server, {
        client_id: clientId,
        code,
        redirect_uri: REDIRECT_URI,
      }).expect(400);
    });

    it('refuses a reused code', async () => {
      const { clientId, code, verifier } = await rawCode(
        e2e.server,
        e2e.origin,
      );
      const form = {
        client_id: clientId,
        code,
        code_verifier: verifier,
        redirect_uri: REDIRECT_URI,
      };
      await token(e2e.server, form).expect(200);
      const res = await token(e2e.server, form).expect(400);
      expect(res.body.error).toBe('invalid_grant');
    });
  });

  it('refuses an unregistered redirect URI before any redirect', async () => {
    const client = (
      await request(e2e.server)
        .post('/register')
        .send({
          redirect_uris: [REDIRECT_URI],
          token_endpoint_auth_method: 'none',
        })
        .expect(201)
    ).body;
    const res = await request(e2e.server)
      .get('/authorize')
      .query({
        response_type: 'code',
        client_id: client.client_id,
        redirect_uri: 'https://evil.example/cb',
        code_challenge: 'x'.repeat(43),
        code_challenge_method: 'S256',
      })
      .expect(400);
    expect(res.headers.location).toBeUndefined();
  });

  it('denies a role outside MCP_ROLES at consent', async () => {
    const { code } = await rawCode(e2e.server, e2e.origin, 'student');
    expect(code).toBeNull();
  });

  describe('/mcp', () => {
    it('returns 401 with WWW-Authenticate without a token', async () => {
      const res = await callMcp(e2e.server).expect(401);
      expect(res.headers['www-authenticate']).toContain(
        `resource_metadata="${e2e.origin}/.well-known/oauth-protected-resource/mcp"`,
      );
    });

    it('refuses the ENT session cookie', async () => {
      const { jar } = await login(e2e.server, 'teacher');
      await callMcp(e2e.server).set('Cookie', jar.header()).expect(401);
    });

    it('refuses a token issued for another resource', async () => {
      const other = tokens('https://other.example').issue(teacher, 'c');
      await callMcp(e2e.server, other).expect(401);
    });

    it('refuses an expired token', async () => {
      const expired = tokens(e2e.origin, { MCP_TOKEN_SECONDS: -1 }).issue(
        teacher,
        'c',
      );
      await callMcp(e2e.server, expired).expect(401);
    });

    it('enforces MCP_ROLES on the token role', async () => {
      const student = tokens(e2e.origin).issue(
        { ...teacher, profile: 'Student', role: 'user' },
        'c',
      );
      await callMcp(e2e.server, student).expect(403);
    });

    it('accepts a valid token', async () => {
      await callMcp(e2e.server, tokens(e2e.origin).issue(teacher, 'c')).expect(
        200,
      );
    });
  });
});
