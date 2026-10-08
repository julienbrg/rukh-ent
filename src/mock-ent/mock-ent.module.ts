import { Module } from '@nestjs/common';
import { MockEntController } from './mock-ent.controller';

@Module({ controllers: [MockEntController] })
export class MockEntModule {}
