# Courtly

A small fullstack app for booking sports courts (padel, tennis and more) at one facility.
Users browse courts, see free time slots and book one or two hours.
Admins manage courts and see all bookings of a day with the expected revenue.

Stack: TypeScript, NestJS, PostgreSQL + Prisma, Next.js, Docker Compose.

## Run it

You need Docker.

```bash
git clone https://github.com/netfly-v/courtly.git
cd courtly
docker compose up --build
```

This starts PostgreSQL, applies the migrations, adds demo data and starts the API and the web app.
Then open the app at http://localhost:3000 and log in with one of the demo accounts below.
The API docs (Swagger) are at http://localhost:4000/api/docs.

Ports 3000, 4000 and 5434 must be free, so stop the local dev servers first.

Demo accounts, all with the password `courtly-demo`:

- `admin@courtly.dev` (admin)
- `anna@courtly.dev` and `ben@courtly.dev` (users)

The demo bookings are placed around the day you first start it. To start again with fresh data, run
`docker compose down -v` and then `docker compose up` again.

To see live updates, log in as Anna in one window and as Ben in a private window, open the same court and day,
and book a slot in one of them.

## Stack and why

**NestJS, not Express.** Every endpoint needs the same things: the session, the role, input validation and one error
format. Nest has a place for each of them (guards, pipes, a filter), its DI lets tests freeze time with a fake clock,
and it generates the OpenAPI spec. Express would be less code here, but I'd build the same pieces by hand.

**Next.js, not a plain React SPA.** Besides routing and layouts, Next proxies `/api/*` to the API, so the browser
sees one origin: the httpOnly login cookie is first-party and there's no CORS. Every page is per user and updates
live, so pages load their data in the browser with React Query (Orval generates the hooks from the API's
`openapi.json`). The cost is an extra Node server that renders almost nothing. A Vite SPA would be lighter, but it
would need its own proxy or CORS.

**PostgreSQL with Prisma.** The main rule, "two active bookings of one court never overlap", can be a constraint
inside PostgreSQL. MySQL and MongoDB have no constraint for overlapping time ranges, so there I'd need one row per
booked hour with a unique key, or a lock in code. Prisma gives typed queries and migrations, but it can't describe
that constraint, so it's raw SQL in the migration.

## Data model

Three tables: `users`, `courts` and `bookings` (`apps/api/prisma/schema.prisma`). A booking keeps its time as
`timestamptz` in UTC, its status (`ACTIVE` or `CANCELLED`) and its total price in cents, copied from the court when
it is created. So a cancel or a new price never rewrites history, and courts are never deleted, only turned off.
CHECK constraints in the migration back up the rules: opening hours within one day, 1 or 2 hours, start on the hour,
prices above zero.

## Login and roles

Login checks the password (scrypt from `node:crypto`) and sets an httpOnly cookie with a JWT for 8 hours. One global
guard (`apps/api/src/auth/auth.guard.ts`) checks the cookie on every route and loads the user from the database, so a
new endpoint is closed until I mark it `@Public()`. Only login, logout and health are public. `@Roles(Role.ADMIN)` or
`@Roles(Role.USER)` on a controller or a route gives the other role a 403. The web app only hides what a role can't
use. The API decides. The cookie is `SameSite=Lax` and the API reads only JSON bodies, so a form on another site
can't log in or book for the user.

## How I prevent double bookings

The guarantee lives in the database, in `apps/api/prisma/migrations/20261106111757_init/migration.sql`:

```sql
ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "court_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  ) WHERE ("status" = 'ACTIVE');
```

Two active bookings of one court can't have overlapping time ranges. PostgreSQL checks this on every insert, so two
requests at the same instant can't both get through. `'[)'` lets 10-11 and 11-12 both exist, and cancelled bookings
don't block. The service doesn't check before the insert. It inserts and turns the constraint error
into `409 SLOT_TAKEN` (Prisma 7 wraps PostgreSQL's `23P01` as `P2039`, so `apps/api/src/prisma/prisma-errors.ts`
looks for the constraint name).

The transaction that creates a booking also locks the court row first (`FOR NO KEY UPDATE` in
`apps/api/src/bookings/bookings.service.ts`). Without it, parallel conflicting inserts can deadlock, and one user
gets a 500 instead of a 409. The lock also makes a change of opening hours wait for a booking in progress. But the
lock is not the guarantee: code without it can deadlock, but it can never double book.

I rejected "check, then insert" (two requests can both see the slot as free), a slots table with a unique key
(duplicate data, tied to the 1-hour grid) and SERIALIZABLE (every booking needs a retry loop). The proof is in two
tests: `apps/api/test/booking-constraints.db-spec.ts` runs two raw transactions against PostgreSQL, and
`apps/api/test/bookings.e2e-spec.ts` sends 10 parallel requests for one slot and gets one 201 and nine 409.

## Business rules and assumptions

- One facility in `Europe/Lisbon`. The database stores UTC. Slots, days and the times on screen use the facility
  time zone, not the browser's.
- Opening hours are whole hours, the same every day, within one day. A booking is 1 or 2 hours, starts on the hour
  and ends by closing time. A slot that has started is past.
- Booking up to 30 days ahead. Cancelling is allowed until exactly 2 hours before the start. After that the API
  answers 422 `CANCELLATION_WINDOW_CLOSED`.
- One user can book two different courts at the same hour. There is no limit per user.
- Turning a court off keeps its future bookings and only blocks new ones. A booking is a promise, and the app can't
  tell people it was cancelled. The admin sees how many upcoming bookings the court has first.
- Shortening the opening hours is refused (409) while a booking would fall outside them.
- The admin manages courts and sees all bookings, but doesn't book or cancel.
- Day revenue sums the active bookings that start that day, at the price stored on each booking. Money is integer
  cents.
- Known gap: on the night the clocks go back, the first of the two 01:00 hours never becomes a slot. A court that is
  open at that time loses that hour.

API errors always look like `{ statusCode, code, message, details? }` with a stable `code`: 400 bad input, 401 not
logged in, 403 wrong role, 404 not found (also for other users' bookings), 409 conflict with existing data, 422 a
booking rule says no.

## Live updates (bonus)

Free slots and the admin's day update without a refresh, over Server-Sent Events (SSE). After a booking or a cancel
commits, the API sends `{ courtId, date }` to every open `GET /api/events` stream, and the web app reloads that day.
SSE, not WebSockets: updates only go one way, and SSE is plain HTTP that passes the Next proxy and uses the same
cookie. The API sends a ping every 15 seconds, because the Next proxy cuts a silent stream after 30 seconds. Hidden tabs
close their stream (a browser keeps at most 6 connections to one site). The events live in one API process, so
several instances would need PostgreSQL `LISTEN/NOTIFY`.

## Tests

`pnpm test` runs everything (the API tests need Docker). The API has 85 tests: unit tests for the booking rules,
slots and facility time, and tests against a real PostgreSQL in Testcontainers for double booking, the cancel
window, opening hours, roles and the admin day. The API tests freeze "now" through an injected `Clock`. The web app
has 79 tests, almost all with React Testing Library and MSW. They run in New York time with Lisbon data, so a time
shown in the wrong zone fails. CI runs lint, typecheck, the tests and `docker compose up`.

## Develop locally

You need Node 24, pnpm and Docker.

```bash
pnpm install
pnpm --filter @courtly/web api:generate
docker compose up -d --wait db
cp apps/api/.env.example apps/api/.env
pnpm --filter @courtly/api db:migrate
pnpm --filter @courtly/api db:seed
```

Then start the API and the web app, each in its own terminal:

```bash
pnpm --filter @courtly/api dev   # API on http://localhost:4000
pnpm --filter @courtly/web dev   # web app on http://localhost:3000
```

The Orval client is generated and not in git. After pulling API changes, run
`pnpm --filter @courtly/web api:generate`. After changing the API yourself, run `pnpm api:generate` and commit the
new `apps/api/openapi.json` (CI fails if it is out of date).

## What I'd do next

- Email notifications. Then auto-cancel with a message when a court is turned off, and a waitlist that offers a freed
  slot to the next person.
- Seed 10k+ bookings and add `EXPLAIN ANALYZE` numbers for availability and the admin day here.
- Store sessions in the database, so logout ends a session right away. Now the JWT stays valid until it expires
  (8 hours).
- Limit login attempts.
- Opening hours per weekday and holidays.
- Playwright tests for the main flows, and smaller Docker images.

## How I used AI

I used Claude Code for most of the typing. I made the decisions: for each step it wrote a short design with options,
and I chose one or asked for changes. I read every change and made all commits myself. My rules for it are in
`CLAUDE.md`, and two review agents in `.claude/agents/` check comments and tests.
