# Final Project Standards

- Package manager: pnpm
- Monorepo manager: Turborepo
- Frontend topology: separate apps for `web`, `admin`, and `courier`
- Runtime baseline: Node.js 22 LTS, NestJS 11, Next.js 15, PostgreSQL 16, Redis 7, React Native + Expo
- Root installation acceptance criterion: `pnpm install` works from the repository root
- Campaigns remain architecturally reserved until Phase 8
- Prisma schema is consolidated into one final schema in Phase 1
- Iyzico callback idempotency, duplicate callback handling, and callback security are implemented in Phase 3
- Soft-delete rules are standardized in Phase 1
