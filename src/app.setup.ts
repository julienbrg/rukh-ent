import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { SESSION_COOKIE } from './ent/session.service';
import { APP_VERSION } from './version';

/** Swagger UI on `/api`, the OpenAPI document on `/api-json`. */
function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Rukh ENT')
    .setVersion(APP_VERSION)
    .addCookieAuth(SESSION_COOKIE, undefined, 'session')
    .addSecurityRequirements('session')
    .build();
  SwaggerModule.setup('api', app, () =>
    SwaggerModule.createDocument(app, config),
  );
}

/** HTTP pipeline shared by `main.ts` and the e2e tests. */
export function configureApp(app: INestApplication): INestApplication {
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Mounted outside the guard chain: the setting is the only protection
  if (app.get(ConfigService).get<string>('SWAGGER_ENABLED') === 'true') {
    setupSwagger(app);
  }
  return app;
}
