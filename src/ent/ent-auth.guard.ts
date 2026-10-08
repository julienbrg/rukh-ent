import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { EntRequest } from './current-user.decorator';
import { IS_PUBLIC } from './public.decorator';
import { SESSION_COOKIE, SessionService } from './session.service';

/**
 * Global guard: every route needs a valid session unless marked
 * `@Public()`. A valid session is re-issued so the idle timeout slides.
 */
@Injectable()
export class EntAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const http = context.switchToHttp();
    const req = http.getRequest<EntRequest>();
    const session = this.sessions.verify(req.cookies?.[SESSION_COOKIE]);

    if (session) {
      req.user = session.user;
      http
        .getResponse<Response>()
        .cookie(SESSION_COOKIE, session.token, this.sessions.cookieOptions());
      return true;
    }
    if (isPublic) return true;
    throw new UnauthorizedException();
  }
}
