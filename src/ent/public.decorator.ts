import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

export const IS_PUBLIC = 'isPublic';

/**
 * Opts a route or controller out of the global session guard, and out of
 * the session security requirement in the OpenAPI document.
 */
export const Public = () =>
  applyDecorators(SetMetadata(IS_PUBLIC, true), ApiSecurity({}));
