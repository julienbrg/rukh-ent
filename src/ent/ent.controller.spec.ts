import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { EntOAuthService } from './ent-oauth.service';
import { EntController, STATE_COOKIE } from './ent.controller';
import { SESSION_COOKIE, SessionService } from './session.service';

function setup(role: 'staff' | null = 'staff') {
  const oauth = {
    authorizeUrl: (state: string) => `https://ent/authorize?state=${state}`,
    userFromCode: jest.fn().mockResolvedValue({
      userId: 'u-1',
      role,
      uai: [],
      classes: [],
    }),
  } as unknown as EntOAuthService;
  const sessions = {
    issue: () => 'jwt',
    cookieOptions: () => ({}),
  } as unknown as SessionService;
  const config = { get: () => 'a, b' } as unknown as ConfigService;
  const res = {
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn(),
  };
  return {
    controller: new EntController(oauth, sessions, config),
    oauth,
    res,
  };
}

const withState = (state?: string) =>
  ({ cookies: { [STATE_COOKIE]: state } }) as unknown as Request;

describe('EntController', () => {
  it('sets a state cookie matching the redirect', () => {
    const { controller, res } = setup();
    controller.login(res as unknown as Response);
    const state = res.cookie.mock.calls[0][1];
    expect(res.cookie.mock.calls[0][0]).toBe(STATE_COOKIE);
    expect(res.redirect).toHaveBeenCalledWith(
      `https://ent/authorize?state=${state}`,
    );
  });

  it('rejects a callback whose state does not match', async () => {
    const { controller, oauth, res } = setup();
    await controller.callback(
      'code',
      'forged',
      withState('real'),
      res as unknown as Response,
    );
    expect(oauth.userFromCode).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/?error=state');
  });

  it('opens a session on a valid callback', async () => {
    const { controller, res } = setup();
    await controller.callback(
      'code',
      's1',
      withState('s1'),
      res as unknown as Response,
    );
    expect(res.cookie).toHaveBeenCalledWith(SESSION_COOKIE, 'jwt', {});
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('refuses profiles without a role', async () => {
    const { controller, res } = setup(null);
    await controller.callback(
      'code',
      's1',
      withState('s1'),
      res as unknown as Response,
    );
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/?error=refused');
  });

  it('returns /me with the allowed models', () => {
    const { controller } = setup();
    expect(
      controller.me({ userId: 'u', role: 'staff', uai: ['X'], classes: [] }),
    ).toEqual({
      userId: 'u',
      role: 'staff',
      schools: ['X'],
      classes: [],
      allowedModels: ['a', 'b'],
    });
  });
});
