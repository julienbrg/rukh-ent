import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { EntRequest } from '../../ent/current-user.decorator';
import type { EntUser } from '../../ent/session.service';
import { ConsentController } from './consent.controller';
import { OAuthProvider, PENDING_COOKIE } from './oauth.provider';

const teacher: EntUser = {
  userId: 'u1',
  profile: 'Teacher',
  role: 'teacher',
  uai: [],
  classes: [],
};
const student: EntUser = { ...teacher, profile: 'Student', role: 'user' };
const pending = {
  clientId: 'c1',
  redirectUri: 'https://client.example/cb',
  codeChallenge: 'x',
  exp: 0,
};

function setup(valid = true) {
  const provider = {
    pending: vi.fn().mockReturnValue(valid ? pending : null),
    approve: vi.fn().mockReturnValue('https://client.example/cb?code=c'),
    deny: vi.fn().mockReturnValue('https://client.example/cb?error=e'),
    clientsStore: {
      getClient: () => ({ client_id: 'c1', client_name: '<Claude>' }),
    },
  };
  const config = { get: () => 'teacher' } as unknown as ConfigService;
  const res = {
    type: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    send: vi.fn(),
    redirect: vi.fn(),
  };
  return {
    controller: new ConsentController(
      provider as unknown as OAuthProvider,
      config,
    ),
    provider,
    res,
  };
}

const request = (user?: EntUser) =>
  ({ user, cookies: { [PENDING_COOKIE]: 'sealed' } }) as unknown as EntRequest;

describe('ConsentController', () => {
  it('sends a visitor without a session to the ENT login', async () => {
    const { controller, res } = setup();
    await controller.show(request(), res as unknown as Response);
    expect(res.redirect).toHaveBeenCalledWith(
      '/auth/login?next=%2Foauth%2Fconsent',
    );
  });

  it('names the client, escaped, and allows posting to its origin', async () => {
    const { controller, res } = setup();
    await controller.show(request(teacher), res as unknown as Response);
    const html: string = res.send.mock.calls[0][0];
    expect(html).toContain('&#60;Claude&#62;');
    expect(html).toContain('client.example');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      expect.stringContaining("form-action 'self' https://client.example;"),
    );
  });

  it('denies a role outside MCP_ROLES without asking', async () => {
    const { controller, provider, res } = setup();
    await controller.show(request(student), res as unknown as Response);
    expect(provider.deny).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      303,
      'https://client.example/cb?error=e',
    );
  });

  it('shows an error for a missing or expired request', async () => {
    const { controller, res } = setup(false);
    await controller.show(request(teacher), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('approves for the session user', () => {
    const { controller, provider, res } = setup();
    controller.decide('approve', request(teacher), res as unknown as Response);
    expect(provider.approve).toHaveBeenCalledWith(pending, teacher);
    expect(res.clearCookie).toHaveBeenCalledWith(
      PENDING_COOKIE,
      expect.anything(),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      303,
      'https://client.example/cb?code=c',
    );
  });

  it('denies on deny', () => {
    const { controller, provider } = setup();
    controller.decide('deny', request(teacher), {
      clearCookie: vi.fn().mockReturnThis(),
      redirect: vi.fn(),
    } as unknown as Response);
    expect(provider.approve).not.toHaveBeenCalled();
    expect(provider.deny).toHaveBeenCalled();
  });

  it('refuses a post without a session', () => {
    const { controller, provider, res } = setup();
    controller.decide('approve', request(), res as unknown as Response);
    expect(provider.approve).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
