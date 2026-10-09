import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

/** HTTP pipeline shared by `main.ts` and the e2e tests. */
export function configureApp(app: INestApplication): INestApplication {
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  return app;
}
