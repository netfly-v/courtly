# Courtly — rules for AI assistants

Courtly is a court booking app: a NestJS API (`apps/api`) with PostgreSQL + Prisma,
and a Next.js web app (`apps/web`). TypeScript strict everywhere. pnpm workspaces.

## Commands

- `pnpm install` — install all workspaces
- `pnpm lint` — ESLint for the whole repo
- `pnpm format` / `pnpm format:check` — Prettier
- `pnpm typecheck` — `tsc` in every workspace
- `pnpm test` — tests in every workspace (API tests need Docker: they start PostgreSQL with Testcontainers)
- `docker compose up --build` — the whole stack: PostgreSQL, migrations + seed, API on port 4000
  (stop the local API dev server first, it uses the same port); `docker compose down -v` deletes the data,
  including the local development database (same volume)
- `docker compose up -d --wait db` — only PostgreSQL on port 5434, for local development
  (`--wait` returns once it is healthy)
- `pnpm --filter @courtly/api dev` — API in watch mode (copy `apps/api/.env.example` to `apps/api/.env` first)
- `pnpm --filter @courtly/api db:migrate --create-only --name <name>` — create a migration, review the SQL,
  then run `pnpm --filter @courtly/api db:migrate` to apply it
- `pnpm --filter @courtly/api db:generate` — regenerate the Prisma client after a schema change
  (Prisma 7 `migrate dev` no longer does it)
- `pnpm --filter @courtly/api db:seed` — add demo data (safe to run again; password `courtly-demo`)
- `pnpm --filter @courtly/web dev` — web app on port 3000; it proxies `/api/*` to the API dev server on port 4000
- `pnpm api:generate` — after an API contract change: writes `apps/api/openapi.json` (commit it; CI fails if it is
  out of date) and regenerates the Orval client in `apps/web/src/shared/api/generated` (gitignored)
- `pnpm --filter @courtly/web api:generate` — rebuild only the Orval client from the committed `openapi.json`
  (after a pull; `pnpm install` runs it only on the first install or when dependencies change)
- `pnpm --filter @courtly/web exec shadcn add <name>` — add a shadcn/ui component to `src/shared/ui`, then
  `pnpm format`; if it imports `lucide-react`, add that package too (the CLI doesn't)

Keep this list in sync when you add a script.

## How we work

- Small steps. The maintainer reviews every change and makes all commits.
  Never run `git commit` or `git push`.
- Follow the patterns already in the codebase. Find the closest example and mirror it.
- Before handing a step over, run the `comment-reviewer` and `test-reviewer` agents from `.claude/agents/`
  as the last step, on the finished diff. If the code changes after that, run them again on the changed files.
- Nothing "for the future": no empty folders or files, no stubs, no types or config without a real consumer.
- Pin versions on purpose. Prisma stays on 7.x (npm `latest` is a Prisma 8 release candidate).
  TypeScript stays on 6.x.

## General code rules

- Modern syntax: arrow functions, ESNext features. Meaningful names.
- `const` by default. Do not declare a `let` and reassign it in an if / else chain to pick a value.
  Use a helper with early `return` or `switch` and assign once. A `let` inside a loop is fine.
- No nested ternaries. One simple ternary for a small value is fine.

## Comments

- Comments are the exception. Add one only for something non-obvious:
  a reason behind a decision, a workaround, or a trap the next reader would fall into.
- Explain WHY, never WHAT. Do not restate the code or narrate test steps.
- English, one short line where possible. Prefer better names over a comment.

## Backend (`apps/api`)

- Controllers are thin: validate input with a DTO, call a service, return the result.
- Business rules live in services and in pure functions (slots, booking rules)
  that can be unit-tested without a database.
- Never call `new Date()` in business code. Inject the `Clock` so tests can freeze time.
- Rules that must hold under concurrency live in the database (constraints).
  Do not add a "check, then insert" guard in code as protection; insert and handle the constraint error.
- Code that creates a booking first locks the court row (`FOR NO KEY UPDATE`): without it parallel inserts
  can deadlock on the EXCLUDE constraint, and a change of opening hours could slip past the check.
- Migrations: `prisma migrate dev --create-only`, then read the SQL before applying.
  Raw SQL constraints (EXCLUDE, CHECK) live in migrations; never drop them by accident.
  Tests and Docker use `prisma migrate deploy`, never `db push`.
- Errors use one envelope: `{ statusCode, code, message, details? }` with stable UPPER_SNAKE codes.
  400 bad input, 401 not logged in, 403 wrong role, 404 not found (also for other users' data),
  409 conflict with the current state, 422 a business rule says no.
- DTOs use class-validator and explicit `@ApiProperty` decorators (no Swagger CLI plugin).
- Do not use `import type` for classes that Nest injects. DI needs the runtime class.
- Money is integer cents. Times are `timestamptz` in UTC; day and slot math uses the facility time zone.

## Frontend (`apps/web`)

### Structure (light Feature-Sliced Design)

- Layers: `app` → `features` → `entities` → `shared`. Import downward only.
  - `src/app` — thin route files (`page.tsx`, `layout.tsx`) that delegate to a feature container.
  - `features/<name>` — business functionality with interactive UI: containers, hooks, UI.
  - `entities/<name>` — domain helpers (formatters, mapping); no UI.
  - `shared` — API layer (Orval output + fetcher), base UI primitives, utilities; no business logic.
  - `shared/ui` is shadcn/ui code added with the CLI (`components.json` points it there). It keeps shadcn's style
    (function declarations, `import * as React`) so later `shadcn add` updates apply cleanly; the rest of the code
    follows the rules below. Change the look through theme tokens in `globals.css`.
- Features never import each other. Feature-specific loading, error and empty states live in the feature.
- A new page is `src/app/<route>/page.tsx` + `features/<feature>/containers/<Name>Page.tsx`.
  No placeholder UI, fake data or mocks before the API contract exists.

### API types (Orval)

- Generated Orval hooks and schemas are the source of truth for request and response shapes.
- Do not hand-write parallel DTOs that rename the same fields. Import the generated types.
- A view model is fine only when the UI needs a different shape. Map at the boundary.
- Never edit generated files. Regenerate them with `pnpm api:generate`.

### Components and hooks

- Functional components and hooks only. Import hooks directly: `import { useState } from 'react'`.
- All `useState` calls at the top of the component; all `useEffect` calls right before `return`.
- No `useMemo` / `useCallback` by default. Use them only for a genuinely expensive computation,
  a stable reference required by hook dependencies, or a prop for a `React.memo` child.
- Business logic (permissions, data shaping, product copy) lives in containers and hooks.
  Presentational components are prop-driven and render what they receive.
- When copy depends on business state, compute the final string in the container and pass it as a prop.
- To choose between different pieces of UI, use a helper with early `return` / `switch`,
  or a small presentational component that takes the decision as a prop.

### Forms

- react-hook-form with a yup schema that lives in the feature and mirrors the API DTO rules
  (`ObjectSchema<GeneratedDto>`). `noValidate` on the form, so the browser shows no popups of its own.
- Each field shows its error in red right under it, in a line that is always rendered (`min-h-5`), so the layout
  doesn't jump. Link it with `aria-describedby` and set `aria-invalid` on the input.

### Styling

- Tailwind CSS 4 with theme tokens. No hard-coded hex or rgba when a token exists.
  A new token goes into the theme, not into inline styles.
- Conditional class names with `cn` (from the `cn` package, as in the shadcn components) only.
  No ternaries inside className strings.
- Show times in the facility time zone (from the API), never the browser's.

## Tests

- Test business rules and API behaviour, not implementation details.
- Anything that depends on a database constraint runs against a real PostgreSQL (Testcontainers).
- Freeze time through the `Clock`, never with real waits.
- UI tests use React Testing Library queries by role and text, with MSW for API responses.
