# AI Agent Rules

AI agents must preserve architecture, phase boundaries, and verification discipline.

## Before coding
- Read [`docs/README.md`](./README.md) and [`AI_HANDOFF_CONTEXT.md`](./AI_HANDOFF_CONTEXT.md).
- Confirm the current phase.
- State intended file changes.
- Explain the plan.

## During coding
- Stay within current scope.
- Reuse shared standards.
- Avoid architectural drift and duplicated logic.

## Before stopping
- Run checks.
- Resolve all errors.
- Report what changed, why it matters, and what remains.

The authoritative machine-readable rules live in `.cursor/rules/`.
