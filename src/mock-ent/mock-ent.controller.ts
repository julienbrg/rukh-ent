import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Public } from '../ent/public.decorator';
import { MOCK_PROFILES } from './mock-ent.profiles';

const CODE_TTL_MS = 60 * 1000;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Stand-in for the Edifice OAuth 2.0 endpoints, for development without an
 * ENT. Point `ENT_BASE_URL` at `<origin>/mock-ent`. Codes and tokens are
 * single-use and kept in memory.
 */
@Public()
@ApiExcludeController()
@Controller('mock-ent/auth/oauth2')
export class MockEntController {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly codes = new Map<
    string,
    { login: string; expires: number }
  >();
  private readonly tokens = new Map<string, string>();

  constructor(config: ConfigService) {
    this.clientId = config.get<string>('ENT_CLIENT_ID');
    this.clientSecret = config.get<string>('ENT_CLIENT_SECRET');
    this.redirectUri = config.get<string>('ENT_REDIRECT_URI');
  }

  @Get('auth')
  @Header('Content-Type', 'text/html; charset=utf-8')
  authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state = '',
  ): string {
    this.checkClient(clientId, redirectUri);
    const links = Object.entries(MOCK_PROFILES)
      .map(([login, { label }]) => {
        const href = `approve?${new URLSearchParams({ login, client_id: clientId, redirect_uri: redirectUri, state })}`;
        return `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`;
      })
      .join('');
    return `<!doctype html><title>Mock ENT</title><style>body{background:#000;color:#fff;font-family:system-ui}a{color:#45a2f8}</style><h1>Mock ENT</h1><p>Sign in as:</p><ul>${links}</ul>`;
  }

  @Get('approve')
  approve(
    @Query('login') login: string,
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    this.checkClient(clientId, redirectUri);
    if (!MOCK_PROFILES[login]) throw new BadRequestException('Unknown login');
    const code = randomBytes(16).toString('hex');
    this.codes.set(code, { login, expires: Date.now() + CODE_TTL_MS });
    res.redirect(`${redirectUri}?${new URLSearchParams({ code, state })}`);
  }

  @Post('token')
  token(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, string>,
  ) {
    const expected = `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`;
    if (authorization !== expected) {
      throw new UnauthorizedException('invalid_client');
    }
    const grant = this.codes.get(body.code);
    this.codes.delete(body.code);
    if (
      body.grant_type !== 'authorization_code' ||
      body.redirect_uri !== this.redirectUri ||
      !grant ||
      grant.expires < Date.now()
    ) {
      throw new BadRequestException('invalid_grant');
    }
    const accessToken = randomBytes(16).toString('hex');
    this.tokens.set(accessToken, grant.login);
    return { access_token: accessToken, token_type: 'Bearer', expires_in: 60 };
  }

  @Get('userinfo')
  userinfo(
    @Headers('authorization') authorization = '',
    @Query('version') version: string,
  ) {
    if (version !== '2.0') throw new BadRequestException('Unsupported version');
    const accessToken = authorization.replace(/^Bearer /, '');
    const login = this.tokens.get(accessToken);
    this.tokens.delete(accessToken);
    if (!login) throw new UnauthorizedException('invalid_token');
    return MOCK_PROFILES[login].userinfo;
  }

  private checkClient(clientId: string, redirectUri: string) {
    if (clientId !== this.clientId || redirectUri !== this.redirectUri) {
      throw new BadRequestException('Unknown client or redirect_uri');
    }
  }
}
