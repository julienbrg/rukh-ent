import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntAuthGuard } from './ent-auth.guard';
import { EntUser, SESSION_COOKIE, SessionService } from './session.service';

const user: EntUser = {
  userId: 'u-1',
  role: 'staff',
  uai: ['0750001A'],
  classes: [],
};

function setup(isPublic: boolean, verified: boolean) {
  const reflector = {
    getAllAndOverride: () => isPublic,
  } as unknown as Reflector;
  const sessions = {
    verify: () => (verified ? { user, token: 'new' } : null),
    cookieOptions: () => ({}),
  } as unknown as SessionService;
  const req: Record<string, unknown> = { cookies: { [SESSION_COOKIE]: 'old' } };
  const res = { cookie: jest.fn() };
  const context = {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
  return { guard: new EntAuthGuard(reflector, sessions), context, req, res };
}

describe('EntAuthGuard', () => {
  it('denies by default', () => {
    const { guard, context } = setup(false, false);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('lets public routes through without a session', () => {
    const { guard, context, req } = setup(true, false);
    expect(guard.canActivate(context)).toBe(true);
    expect(req.user).toBeUndefined();
  });

  it('attaches the user and re-issues the cookie', () => {
    const { guard, context, req, res } = setup(false, true);
    expect(guard.canActivate(context)).toBe(true);
    expect(req.user).toEqual(user);
    expect(res.cookie).toHaveBeenCalledWith(SESSION_COOKIE, 'new', {});
  });
});
