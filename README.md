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
