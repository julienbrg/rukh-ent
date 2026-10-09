# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- NestJS backend with environment validation for the ENT module variables
- Edifice OAuth 2.0 login: `/auth/login`, `/auth/callback` with a `state` cookie, `/auth/logout`
- Signed session cookie `__Host-rukh` with a 30-minute sliding idle timeout and an 8-hour maximum age
- Edifice profile to role mapping: Teacher to `teacher` (can edit); Personnel, Student, Parent and Super-admin to `user` (can only use); others refused
- Global deny-by-default session guard with `@Public()` opt-out, and an Origin check on non-GET requests
- `GET /me` returning role, schools, classes and allowed models
- Optional MCP Streamable HTTP endpoint on `/mcp` with a `whoami` tool, behind `MCP_ENABLED` and `MCP_ROLES`
- Mock ENT OAuth provider on `/mock-ent` for development, behind `ENT_MOCK`; `.env.example` runs against it out of the box
- Vite, React, React Router and Chakra UI app in `web/`, served by Nest in production, with Helmet CSP
- "Welcome, <profile>!" landing page; the assistants page moves to `/assistants`
- `docs/RESOURCES.md`: legal constraints for a classroom AI assistant in French schools, how Rukh meets each one, and resources
- Black background, white text and `#45a2f8` links across the app and the mock ENT page
- Log out button on the Welcome page; buttons use a `#8c1c84` background
- `profile` (Teacher, Personnel, Student, Parent or Super-admin) in the session, `/me` and the MCP `whoami` tool
- Technical specification in `.claude/spec.md`, referenced from `.claude/CLAUDE.md`
- `publish` workflow that syncs `.claude/spec.md` to julienberanger.com/ent-module-spec on push to `main`, with a dry-run diff on pull requests
