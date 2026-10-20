# LocusPoint

A web app for film location scouts. The code lives in `location-scouting-web-application/`.
Read `README.md` and `docs/decisions/` before changing anything structural.

## How the code is organized
- `src/app`, `src/components`, `src/hooks`: UI. Calls server actions only, never services or the database.
- `src/actions`: Server actions. Gets the user with `requireUser()`, then calls services.
- `src/services`: Business logic. All database access happens here. Takes `userId` as a parameter.
  Returns `Result<T>`. No Next.js imports.
- `src/infrastructure`: Storage adapters. Only services use it.

## Rules
- Stay inside the ticket's scope. Note anything else under "Noticed but not fixed" in the PR.
- Don't write service-layer logic unless the ticket says to. Write the function signature and failing tests instead.
- Don't change `prisma/schema.prisma` or migrations unless the ticket says to.
- Never run the dev server to check your work. Verify with tests: Vitest for logic, Playwright for UI behaviour.
- Integration tests use a real database, not mocks. Keep test setup explicit in each test.

## Git
- One branch per ticket, off `main`, named like `LS-123-short-description`.
- Never push to `main`.
- When done, open a PR and fill in the PR template.