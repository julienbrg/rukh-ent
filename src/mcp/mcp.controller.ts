import {
  All,
  Controller,
  ForbiddenException,
  HttpCode,
  MethodNotAllowedException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiOperation } from '@nestjs/swagger';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { CurrentUser } from '../ent/current-user.decorator';
import { EntUser } from '../ent/session.service';
import { createMcpServer } from './mcp.server';

/**
 * Stateless Streamable HTTP endpoint. Auth is the ENT session for now;
 * the OAuth authorization server for MCP clients comes in phase 7.
 */
@Controller('mcp')
export class McpController {
  private readonly roles: Set<string>;
  private readonly origin: string;

  constructor(config: ConfigService) {
    this.roles = new Set(
      config
        .get<string>('MCP_ROLES')
        .split(',')
        .map((r) => r.trim()),
    );
    this.origin = new URL(config.get<string>('PUBLIC_ORIGIN')).origin;
  }

  @Post()
  @ApiOperation({
    summary: 'MCP Streamable HTTP endpoint',
    description: 'Requires a role listed in `MCP_ROLES`.',
  })
  async handle(
    @CurrentUser() user: EntUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // MCP clients send no Origin; a browser that does must be ours (DNS rebinding).
    const origin = req.headers.origin;
    if (origin && origin !== this.origin) {
      throw new ForbiddenException('Cross-origin request refused');
    }
    if (!this.roles.has(user.role)) {
      throw new ForbiddenException('MCP is not enabled for this role');
    }

    const server = createMcpServer(user);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  /** No server-initiated stream or session to delete in stateless mode. */
  @All()
  @ApiExcludeEndpoint()
  @HttpCode(405)
  other() {
    throw new MethodNotAllowedException();
  }
}
