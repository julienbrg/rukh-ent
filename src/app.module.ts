import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { EntModule } from './ent/ent.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate }), EntModule],
})
export class AppModule {}
