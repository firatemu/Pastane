# Quality Checklist

Before completing a phase, confirm:
- [ ] Scope stayed within the active phase.
- [ ] Relevant docs and rules were updated if architecture changed.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] Transaction-sensitive behavior has tests when applicable.
- [ ] Security-sensitive flows have negative-path tests when applicable.
- [ ] No unresolved errors or skipped verifications remain.

Critical future test priorities include payment callbacks, stock reservation/finalization, authorization, loyalty, and order lifecycle transitions.
