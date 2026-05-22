# MCP Tooling

This repository is prepared for AI development tools that need structured access to project context and local services.

## Recommended integrations
- filesystem access scoped to the repository root
- git operations for branch, diff, and history inspection
- terminal execution for build/test/lint commands
- Docker commands for infrastructure lifecycle
- PostgreSQL inspection against the local development database
- Playwright/browser automation for later frontend verification
- **Google Stitch** (`stitch`) — `scripts/mcp/stitch.sh` bridges to `https://stitch.googleapis.com/mcp` via `mcp-remote`; API key in `.env` as `STITCH_GOOG_API_KEY`
- context-aware coding tools that can read `.cursor/rules/` and `docs/`

## Setup approach
- Use `.cursor/mcp.example.json` as a template rather than committing machine-specific credentials.
- Keep secrets in environment variables, never inside MCP config files.
- Prefer read-only database inspection unless a task explicitly requires mutation.
- Reuse the helper scripts in `scripts/` for common status and verification tasks.

## MCP launcher scripts (`scripts/mcp/`)
Cursor stdio servers that need `.env` or a working `npx` PATH use bash wrappers:

| Server | Script | Notes |
|--------|--------|--------|
| `git` | `git.sh` | Replaces `uvx mcp-server-git` (uv not required). Uses `@cyanheads/git-mcp-server`, scopes to repo via `GIT_BASE_DIR`. |
| `postgres` | `postgres.sh` | Loads `DATABASE_URL` from `.env` and rewrites `@postgres:` → `@127.0.0.1:` on the host (same as Prisma seed). Requires dev Postgres on port 5432. |
| `stitch` | `stitch.sh` | Loads `STITCH_GOOG_API_KEY` from `.env`; remote URL config alone does not read project `.env`. |
| `shadcn` | `shadcn.sh` | Overrides the Cursor shadcn plugin’s bare `npx` (fixes ENOENT under Cursor’s bundled Node). Runs `npx -y shadcn@latest mcp`. |

After changing `.cursor/mcp.json` or `.env`, **restart Cursor** so MCP servers reload.

### Filesystem MCP (`filesystem`)
- Cursor treats the path `.` as illegal in some setups. This repo uses **`${workspaceFolder}`** in `mcp.json` so the server is rooted at the opened workspace.

### Troubleshooting
- **git / postgres / stitch red:** Run `bash scripts/mcp/<name>.sh` from the repo root; fix the printed error (missing `.env` key, Postgres down, invalid API key).
- **postgres connection refused:** `pnpm docker:dev:up` and confirm `nc -zv 127.0.0.1 5432`.
- **npx ENOENT under Cursor:** Wrappers prepend your latest nvm Node to `PATH`; install Node 20+ via nvm if needed.

## Current helper scripts
- `scripts/repo-status.sh` — workspace inventory
- `scripts/verify-structure.sh` — confirms the foundation stays implementation-free
- `scripts/docker-health.sh` — quick Compose status check
