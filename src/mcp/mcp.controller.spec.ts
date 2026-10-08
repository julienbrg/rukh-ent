import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { EntUser } from '../ent/session.service';
import { McpController } from './mcp.controller';

const values = {
  MCP_ROLES: 'teacher',
  PUBLIC_ORIGIN: 'https://rukh.example.fr',
};
const controller = new McpController({
  get: (key: string) => values[key],
} as unknown as ConfigService);

const teacher: EntUser = {
  userId: 'u',
  profile: 'Teacher',
  role: 'teacher',
  uai: [],
  classes: [],
};
const request = (origin?: string) => ({ headers: { origin } }) as Request;

describe('McpController', () => {
  it('refuses roles outside MCP_ROLES', async () => {
    await expect(
      controller.handle(
        { ...teacher, profile: 'Student', role: 'user' },
        request(),
        {} as Response,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses a foreign Origin', async () => {
    await expect(
      controller.handle(
        teacher,
        request('https://evil.example'),
        {} as Response,
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
