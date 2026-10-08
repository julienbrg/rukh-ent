import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MinLength,
  validateSync,
} from 'class-validator';

const BOOLEAN = ['true', 'false'];

/**
 * Environment schema, checked once by `ConfigModule.forRoot` before any
 * provider is built. See `.env.example`.
 */
export class EnvironmentVariables {
  @IsUrl({ require_tld: false })
  ENT_BASE_URL: string;

  @IsString()
  @IsNotEmpty()
  ENT_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  ENT_CLIENT_SECRET: string;

  @IsUrl({ require_tld: false })
  ENT_REDIRECT_URI: string;

  @IsString()
  ENT_USERINFO_VERSION: string = '2.0';

  @IsString()
  ENT_ALLOWED_MODELS: string = '';

  @IsIn(BOOLEAN)
  ENT_LOG_QUERIES: string = 'false';

  @IsUrl({ require_tld: false })
  PUBLIC_ORIGIN: string;

  @IsString()
  @MinLength(32)
  SESSION_SECRET: string;

  @IsInt()
  @IsPositive()
  SESSION_IDLE_SECONDS: number = 1800;

  @IsInt()
  @IsPositive()
  SESSION_MAX_SECONDS: number = 28800;

  @IsInt()
  @IsPositive()
  THROTTLE_ASK_LIMIT: number = 60;

  @IsInt()
  @IsPositive()
  IMPORT_MAX_BYTES: number = 20971520;

  @IsOptional()
  @IsString()
  MISTRAL_API_KEY?: string;

  @IsOptional()
  @IsString()
  ANTHROPIC_API_KEY?: string;

  @IsInt()
  @IsPositive()
  PORT: number = 3000;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsIn(BOOLEAN)
  SWAGGER_ENABLED: string = 'false';

  @IsIn(BOOLEAN)
  MCP_ENABLED: string = 'false';

  @IsString()
  MCP_ROLES: string = 'staff';
}

/**
 * `ConfigModule` validator. Empty values count as unset, so the schema
 * defaults apply. Throws one error listing every problem.
 */
export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const present = Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== ''),
  );
  const env = plainToInstance(EnvironmentVariables, present, {
    enableImplicitConversion: true,
  });

  const problems = validateSync(env).map(
    (error) =>
      `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
  );
  if (env.SESSION_IDLE_SECONDS > env.SESSION_MAX_SECONDS) {
    problems.push('SESSION_IDLE_SECONDS: must not exceed SESSION_MAX_SECONDS');
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid environment configuration (see .env.example):\n${problems
        .map((problem) => `  - ${problem}`)
        .join('\n')}`,
    );
  }
  return env;
}
