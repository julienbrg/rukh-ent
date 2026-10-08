import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { EntUser } from '../ent/session.service';
import { McpController } from './mcp.controller';

const values = {
  MCP_ROLES: 'staff',
  PUBLIC_ORIGIN: 'https://rukh.example.fr',
};
const controller = new McpController({
  get: (key: string) => values[key],
} as unknown as ConfigService);

const staff: EntUser = { userId: 'u', role: 'staff', uai: [], classes: [] };
const request = (origin?: string) => ({ headers: { origin } }) as Request;

describe('McpController', () => {
  it('refuses roles outside MCP_ROLES', async () => {
    await expect(
      controller.handle(
        { ...staff, role: 'student' },
        request(),
        {} as Response,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses a foreign Origin', async () => {
    await expect(
      controller.handle(staff, request('https://evil.example'), {} as Response),
    ).rejects.toThrow(ForbiddenException);
  });
});
