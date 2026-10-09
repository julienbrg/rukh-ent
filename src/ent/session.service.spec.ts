import { ConfigService } from '@nestjs/config';
import { EntUser, SessionService } from './session.service';

const user: EntUser = {
  userId: 'u-1',
  profile: 'Student',
  role: 'user',
  uai: ['0750001A'],
  classes: ['3A'],
};

function service(secret = 'x'.repeat(32)) {
  const values = {
    SESSION_SECRET: secret,
    SESSION_IDLE_SECONDS: 1800,
    SESSION_MAX_SECONDS: 28800,
  };
  return new SessionService({
    get: (key: string) => values[key],
  } as ConfigService);
}

describe('SessionService', () => {
  afterEach(() => vi.useRealTimers());

  it('round-trips a user', () => {
    const sessions = service();
    expect(sessions.verify(sessions.issue(user))?.user).toEqual(user);
  });

  it('rejects a token signed with another secret', () => {
    const token = service('y'.repeat(32)).issue(user);
    expect(service().verify(token)).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const sessions = service();
    const [h, , s] = sessions.issue(user).split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'u-1', role: 'teacher', exp: 9e9, auth: 0 }),
    ).toString('base64url');
    expect(sessions.verify(`${h}.${forged}.${s}`)).toBeNull();
  });

  it('rejects a session without a profile', () => {
    const sessions = service();
    const token = sessions.issue({ ...user, profile: undefined });
    expect(sessions.verify(token)).toBeNull();
  });

  it('expires after the idle timeout', () => {
    vi.useFakeTimers({ now: 0 });
    const sessions = service();
    const token = sessions.issue(user);
    vi.setSystemTime(1801 * 1000);
    expect(sessions.verify(token)).toBeNull();
  });

  it('slides the idle timeout but stops at the maximum age', () => {
    vi.useFakeTimers({ now: 0 });
    const sessions = service();
    let token = sessions.issue(user);
    for (let t = 1500; t < 28800; t += 1500) {
      vi.setSystemTime(t * 1000);
      token = sessions.verify(token)?.token;
      expect(token).toBeDefined();
    }
    vi.setSystemTime(28800 * 1000);
    expect(sessions.verify(token)).toBeNull();
  });
});
