import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { EntModule } from './ent/ent.module';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    EntModule,
    ConditionalModule.registerWhen(
      McpModule,
      (env) => env.MCP_ENABLED === 'true',
    ),
  ],
})
export class AppModule {}
