import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../ent/current-user.decorator';
import type { EntUser } from '../ent/session.service';
import { CreateAssistantDto, UpdateAssistantDto } from './assistants.dto';
import { AssistantsService } from './assistants.service';

@ApiTags('assistants')
@Controller('context')
export class AssistantsController {
  constructor(private readonly assistants: AssistantsService) {}

  @Get()
  list(@CurrentUser() user: EntUser) {
    return this.assistants.list(user);
  }

  @Post()
  create(@CurrentUser() user: EntUser, @Body() dto: CreateAssistantDto) {
    return this.assistants.create(user, dto);
  }

  @Get(':name')
  get(@CurrentUser() user: EntUser, @Param('name') name: string) {
    return this.assistants.get(user, name);
  }

  @Patch(':name')
  update(
    @CurrentUser() user: EntUser,
    @Param('name') name: string,
    @Body() dto: UpdateAssistantDto,
  ) {
    return this.assistants.update(user, name, dto);
  }

  @Delete(':name')
  @HttpCode(204)
  remove(@CurrentUser() user: EntUser, @Param('name') name: string) {
    this.assistants.remove(user, name);
  }
}
