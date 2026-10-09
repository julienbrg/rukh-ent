import {
  All,
  Controller,
  ForbiddenException,
  HttpCode,
  MethodNotAllowedException,
  Post,
  Req,
  Res,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { IS_PUBLIC } from '../ent/public.decorator';
import { EntUser } from '../ent/session.service';
import { mcpRoles } from './mcp-roles';
import { createMcpServer } from './mcp.server';

export type McpRequest = Request & { auth?: AuthInfo };

/**
 * Stateless Streamable HTTP endpoint. The session cookie does not work
 * here: `McpModule` requires a Bearer token from the OAuth flow, and the
 * caller is the ENT user the token carries.
 */
// Out of the session guard, without `@Public()`'s anonymous OpenAPI entry
@SetMetadata(IS_PUBLIC, true)
@Controller('mcp')
export class McpController {
  private readonly roles: Set<string>;
  private readonly origin: string;

  constructor(config: ConfigService) {
    this.roles = mcpRoles(config);
    this.origin = new URL(config.get<string>('PUBLIC_ORIGIN')).origin;
  }

  @Post()
  @ApiSecurity('mcp')
  @ApiOperation({
    summary: 'MCP Streamable HTTP endpoint',
    description:
      'Requires a Bearer token from the OAuth flow, for a role listed in `MCP_ROLES`.',
  })
  async handle(@Req() req: McpRequest, @Res() res: Response) {
    const user = req.auth?.extra?.user as EntUser | undefined;
    // MCP clients send no Origin; a browser that does must be ours (DNS rebinding).
    const origin = req.headers.origin;
    if (origin && origin !== this.origin) {
      throw new ForbiddenException('Cross-origin request refused');
    }
    if (!user || !this.roles.has(user.role)) {
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
