# Project Setup

## Tooling baseline
- Node.js 22 LTS
- pnpm
- Turborepo
- TypeScript strict mode
- ESLint flat config
- Prettier
- Docker Compose

## Local setup
1. Install Node.js 22 LTS and pnpm.
2. Copy `.env.example` to `.env`.
3. Run `pnpm install` from the repository root.
4. Start the development stack with `pnpm docker:dev:up` once Docker is running.
5. Use `pnpm repo:status` to inspect the workspace.

## Repository layout
- `apps/` executable applications
- `packages/` shared packages
- `docker/` infrastructure definitions
- `docs/` developer documentation
- `.cursor/rules/` AI coding rules

## Development topology
- `apps/web`, `apps/admin`, and `apps/courier` are separate Next.js applications.
- `apps/api` is the NestJS backend.
- `apps/mobile` reserves the React Native + Expo application location from Phase 0 onward.

## Deployment preparation
Production targets Ubuntu 24.04 LTS, Nginx fronting all public traffic, and internal-only PostgreSQL/Redis/MinIO access.
