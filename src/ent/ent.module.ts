import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EntAuthGuard } from './ent-auth.guard';
import { EntOAuthService } from './ent-oauth.service';
import { EntController } from './ent.controller';
import { OriginMiddleware } from './origin.middleware';
import { SessionService } from './session.service';

@Module({
  controllers: [EntController],
  providers: [
    EntOAuthService,
    SessionService,
    { provide: APP_GUARD, useClass: EntAuthGuard },
  ],
  exports: [SessionService],
})
export class EntModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(OriginMiddleware).exclude('mcp').forRoutes('*path');
  }
}
