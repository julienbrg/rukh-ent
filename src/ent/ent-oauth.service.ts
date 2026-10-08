import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Profile, profileFromUserinfo, Role, roleFromProfile } from './roles';
import { EntUser } from './session.service';

interface UserInfo {
  userId: string;
  type?: string | string[];
  functions?: Record<string, unknown>;
  classNames?: string[];
  uai?: string | string[];
}

/**
 * Edifice OAuth 2.0 client (authorization code grant, no OpenID Connect).
 * The access token is used once to read `userinfo`, then discarded.
 */
@Injectable()
export class EntOAuthService {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly userinfoVersion: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('ENT_BASE_URL').replace(/\/+$/, '');
    this.clientId = config.get<string>('ENT_CLIENT_ID');
    this.clientSecret = config.get<string>('ENT_CLIENT_SECRET');
    this.redirectUri = config.get<string>('ENT_REDIRECT_URI');
    this.userinfoVersion = config.get<string>('ENT_USERINFO_VERSION');
  }

  authorizeUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'userinfo',
      state,
    });
    return `${this.baseUrl}/auth/oauth2/auth?${params}`;
  }

  /** Exchanges the code and reads the profile. `profile` and `role` are null if refused. */
  async userFromCode(code: string): Promise<
    Omit<EntUser, 'profile' | 'role'> & {
      profile: Profile | null;
      role: Role | null;
    }
  > {
    const accessToken = await this.exchange(code);
    const info = await this.userinfo(accessToken);
    const profile = profileFromUserinfo(info.type, info.functions);
    return {
      userId: info.userId,
      profile,
      role: profile ? roleFromProfile(profile) : null,
      uai: [info.uai ?? []].flat(),
      classes: info.classNames ?? [],
    };
  }

  private async exchange(code: string): Promise<string> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      'base64',
    );
    const res = await fetch(`${this.baseUrl}/auth/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
    });
    const body = res.ok ? await res.json() : null;
    if (!body?.access_token) {
      throw new UnauthorizedException('ENT token exchange failed');
    }
    return body.access_token;
  }

  private async userinfo(accessToken: string): Promise<UserInfo> {
    const res = await fetch(
      `${this.baseUrl}/auth/oauth2/userinfo?version=${encodeURIComponent(this.userinfoVersion)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );
    const body = res.ok ? await res.json() : null;
    if (!body?.userId) {
      throw new UnauthorizedException('ENT userinfo failed');
    }
    return body;
  }
}
