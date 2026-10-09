import { ConfigService } from '@nestjs/config';

/** Roles allowed to use MCP, from the comma-separated `MCP_ROLES`. */
export function mcpRoles(config: ConfigService): Set<string> {
  return new Set(
    config
      .get<string>('MCP_ROLES')
      .split(',')
      .map((r) => r.trim()),
  );
}
