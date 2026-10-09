# Rukh ENT

Rukh course assistants inside the [Edifice](https://edifice.io) ENT. Teachers create and publish assistants; everyone else uses them. Identity comes only from the ENT. See the [ENT module spec](https://julienberanger.com/ent-module-spec).

- `src/` — NestJS backend: Edifice OAuth 2.0 login, session cookie, roles, SQLite storage, optional MCP endpoint
- `web/` — Vite + React + Chakra UI app, served by Nest from `/` in production
- `docs/RESOURCES.md` — legal constraints (cadre d'usage, GDPR, CNIL, AI Act), how Rukh meets them, and resources
- `docs/TEMPLATING.md` — existing Edifice starters, the generic parts of an ENT connector, and the shape of a reusable template

## Install

```sh
pnpm i
cp .env.example .env
```

`pnpm i` builds the better-sqlite3 native module. The database, `data/rukh-ent.db` by default (`DB_PATH`), is created and migrated on first start.

The example config runs locally against the mock ENT, which stands in for Edifice's OAuth endpoints and lets you sign in as a teacher, staff member, student, parent or super-admin.

## Test

```sh
pnpm check                         # Prettier and ESLint
pnpm test                          # unit tests
pnpm test:e2e                      # end-to-end tests against the mock ENT
pnpm --filter rukh-ent-web test    # web app tests
```

## Run

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
| `GET /context` | session | Assistants visible to the caller, their own first |
| `POST /context` | teacher | Creates a draft assistant; the name is generated, owner and school come from the session |
| `GET /context/:name` | session | One assistant; `404` if hidden from the caller |
| `PATCH /context/:name` | owner | Updates `description`, `model`, `classes`, `published` |
| `DELETE /context/:name` | owner | Deletes the assistant and its conversations |
| `POST /mcp` | `MCP_ROLES` | MCP Streamable HTTP, when `MCP_ENABLED=true` |
| `GET /api`, `GET /api-json` | public | Swagger UI and the OpenAPI document, when `SWAGGER_ENABLED=true` |

Every route needs a session unless marked `@Public()`. Swagger is mounted outside the guard chain, so `SWAGGER_ENABLED` is its only protection; leave it `false` in production. Requests other than `GET`/`HEAD`/`OPTIONS` must come from `PUBLIC_ORIGIN`.

Teachers get the `teacher` role and can edit; personnel, students, parents and super-admins get `user` and can only use. Guests and unknown profiles are refused. An assistant is visible to its owner, or once published to users of its school whose classes match its `classes`, or to the whole school when `classes` is empty. `model` must be one of `ENT_ALLOWED_MODELS`. The session is a signed cookie, `__Host-rukh`, with a 30-minute sliding idle timeout and an 8-hour maximum age.

## MCP

With `MCP_ENABLED=true`, `/mcp` serves a `whoami` tool. It currently authenticates with the ENT session cookie; the OAuth authorization server for MCP clients is planned.

## Scripts

| Script | |
| --- | --- |
| `pnpm build` | Builds `web/` then the API |
| `pnpm start:prod` | Runs the built API and app on `127.0.0.1:$PORT` |
| `pnpm check` | Prettier and ESLint |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | End-to-end tests: boots the app against the mock ENT and runs the login flow and assistant routes over HTTP |
| `pnpm --filter rukh-ent-web test` | Web app tests (Vitest, jsdom): loading, login errors, Welcome, logout and the assistants list |

## Contributing

Contributions are welcome. Open or pick an issue first; [`good first issue`](https://github.com/julienbrg/rukh-ent/labels/good%20first%20issue) is a good place to start. Before you open a pull request, run `pnpm check` and the tests. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions and the review flow.

## Contact

**Julien Béranger** ([GitHub](https://github.com/julienbrg))

- Element: [@julienbrg:matrix.org](https://matrix.to/#/@julienbrg:matrix.org)
- Farcaster: [julien-](https://warpcast.com/julien-)
- Telegram: [@julienbrg](https://t.me/julienbrg)

## License

[AGPL-3.0-or-later](LICENSE).
