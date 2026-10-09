# Rukh ENT

Rukh course assistants inside the [Edifice](https://edifice.io) ENT. Teachers create and publish assistants; everyone else uses them. Identity comes only from the ENT. See the [ENT module spec](https://julienberanger.com/ent-module-spec).

- `src/` — NestJS backend: Edifice OAuth 2.0 login, session cookie, roles, optional MCP endpoint
- `web/` — Vite + React + Chakra UI app, served by Nest from `/` in production
- `docs/RESOURCES.md` — legal constraints (cadre d'usage, GDPR, CNIL, AI Act), how Rukh meets them, and resources

## Install

```sh
pnpm install
cp .env.example .env
```

The example config runs locally against the mock ENT, which stands in for Edifice's OAuth endpoints and lets you sign in as a teacher, staff member, student, parent or super-admin.

## Develop

In two terminals:

```sh
pnpm start:dev   # API on :3000
pnpm web:dev     # app on :5173, proxies the API
```

Open http://localhost:5173 and log in; you land on "Welcome, <profile>!".

## Production

Set `NODE_ENV=production`, `ENT_MOCK=false`, the ENT's `ENT_BASE_URL`, client id and secret, the public `ENT_REDIRECT_URI` and `PUBLIC_ORIGIN`, and a fresh `SESSION_SECRET` (`openssl rand -base64 48`). The app refuses to start with the mock or the development secret in production.

## Routes

| Route | Access | |
| --- | --- | --- |
| `GET /auth/login` | public | Starts the OAuth flow |
| `GET /auth/callback` | public | Checks `state`, opens the session |
| `POST /auth/logout` | public | Clears the session |
| `GET /me` | session | Profile, role, schools, classes, allowed models |
| `POST /mcp` | `MCP_ROLES` | MCP Streamable HTTP, when `MCP_ENABLED=true` |

Every route needs a session unless marked `@Public()`. Requests other than `GET`/`HEAD`/`OPTIONS` must come from `PUBLIC_ORIGIN`.

Teachers get the `teacher` role and can edit; personnel, students, parents and super-admins get `user` and can only use. Guests and unknown profiles are refused. The session is a signed cookie, `__Host-rukh`, with a 30-minute sliding idle timeout and an 8-hour maximum age.

## MCP

With `MCP_ENABLED=true`, `/mcp` serves a `whoami` tool. It currently authenticates with the ENT session cookie; the OAuth authorization server for MCP clients is planned.

## Scripts

| Script | |
| --- | --- |
| `pnpm build` | Builds `web/` then the API |
| `pnpm start:prod` | Runs the built API and app on `127.0.0.1:$PORT` |
| `pnpm check` | Prettier and ESLint |
| `pnpm test` | Unit tests |

## License

LGPL-3.0-or-later
