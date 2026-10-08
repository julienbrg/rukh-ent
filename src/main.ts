import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT');
  await app.listen(port, '127.0.0.1');
  logger.log(`Rukh ENT listening on 127.0.0.1:${port}`);
}
bootstrap().catch((error) => {
  new Logger('Bootstrap').error('Failed to start the application:', error);
  process.exit(1);
});
