import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { EntUser } from './session.service';

export type EntRequest = Request & { user?: EntUser };

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): EntUser | undefined =>
    ctx.switchToHttp().getRequest<EntRequest>().user,
);
