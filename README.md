# Courtly

A small fullstack app for booking sports courts (padel, tennis and more) at one facility.
Users browse courts, see free time slots and book one or two hours.
Admins manage courts and see all bookings of a day with the expected revenue.

Stack: TypeScript, NestJS, PostgreSQL + Prisma, Next.js, Docker Compose.

## Run it

You need Docker. From the repo root:

```bash
docker compose up --build
```

This starts PostgreSQL, applies the migrations, adds demo data and starts the API.
Then open Swagger at http://localhost:4000/api/docs.

Demo accounts, all with the password `courtly-demo`:

- `admin@courtly.dev` (admin)
- `anna@courtly.dev` and `ben@courtly.dev` (users)

The demo bookings are placed around the day you first start it. To start again with fresh data, run
`docker compose down -v` and then `docker compose up` again.

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

The web app passes every `/api/*` request on to the API. So the browser talks to one site only,
and the login cookie works without CORS.

The API types in the web app are generated. The API contract is exported to `apps/api/openapi.json`, which is
committed, and Orval builds the typed client from it. The client itself is not in git, so the web app doesn't
build or start without it. A fresh `pnpm install` already builds it, but `pnpm install` skips that step when the
dependencies didn't change, so run `pnpm --filter @courtly/web api:generate` again after pulling API changes.
After changing a request or a response in the API yourself, run `pnpm api:generate` and commit the new
`openapi.json`. CI fails if it is out of date.
