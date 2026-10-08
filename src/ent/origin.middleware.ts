import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence on top of SameSite=Lax: state-changing requests must come
 * from `PUBLIC_ORIGIN`. A missing Origin header is refused too.
 */
@Injectable()
export class OriginMiddleware implements NestMiddleware {
  private readonly origin: string;

  constructor(config: ConfigService) {
    this.origin = new URL(config.get<string>('PUBLIC_ORIGIN')).origin;
  }

  use(req: Request, _res: Response, next: NextFunction) {
    if (!SAFE_METHODS.has(req.method) && req.headers.origin !== this.origin) {
      throw new ForbiddenException('Cross-origin request refused');
    }
    next();
  }
}
