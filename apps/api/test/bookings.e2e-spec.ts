import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import type { BookingDto } from '../src/bookings/booking.dto.js';
import { BookingStatus, Role, Sport } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './test-app.js';
import { createUser, loginAs } from './test-users.js';

type Agent = Awaited<ReturnType<typeof loginAs>>;

// 10:15 on 3 June 2030 in Lisbon (UTC+1).
const NOW = new Date('2030-06-03T09:15:00Z');
const clock = { current: NOW, now: () => clock.current };

describe('bookings', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let me: Agent;
  let other: Agent;
  let admin: Agent;
  const userIds = { me: '', other: '', lister: '', admin: '' };
  const courtIds: string[] = [];

  const createCourt = async (name: string) => {
    const court = await prisma.court.create({
      data: { name, sport: Sport.PADEL, hourlyPriceCents: 2000, openHour: 8, closeHour: 22 },
    });
    courtIds.push(court.id);
    return court;
  };

  const book = async (agent: Agent, courtId: string, startsAt: string, durationHours = 1) => {
    const response = await agent
      .post('/api/bookings')
      .send({ courtId, startsAt, durationHours })
      .expect(201);
    return response.body as BookingDto;
  };

  beforeAll(async () => {
    app = await createTestApp(clock);
    // A listening server: ten parallel supertest calls would each start one otherwise.
    await app.listen(0);
    prisma = app.get(PrismaService);
    for (const name of ['me', 'other', 'lister'] as const) {
      userIds[name] = (await createUser(app, `bookings-${name}@test.dev`)).id;
    }
    userIds.admin = (await createUser(app, 'bookings-admin@test.dev', Role.ADMIN)).id;
    me = await loginAs(app, 'bookings-me@test.dev');
    other = await loginAs(app, 'bookings-other@test.dev');
    admin = await loginAs(app, 'bookings-admin@test.dev');
  });

  beforeEach(() => {
    clock.current = NOW;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { courtId: { in: courtIds } } });
    await prisma.court.deleteMany({ where: { id: { in: courtIds } } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(userIds) } } });
    await app.close();
  });

  it('lets only one of ten parallel requests book the same slot', async () => {
    const court = await createCourt('Race Court');
    const body = { courtId: court.id, startsAt: '2030-06-04T09:00:00.000Z', durationHours: 1 };

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => me.post('/api/bookings').send(body))
    );

    expect(responses.map(response => response.status).sort((a, b) => a - b)).toEqual([
      201,
      ...Array<number>(9).fill(409),
    ]);
    for (const response of responses.filter(({ status }) => status === 409)) {
      expect(response.body).toMatchObject({ code: 'SLOT_TAKEN' });
    }
    const created = responses.find(({ status }) => status === 201)?.body as BookingDto;
    const rows = await prisma.booking.findMany({ where: { courtId: court.id } });
    expect(rows.map(row => row.id)).toEqual([created.id]);
  });

  it('books a free slot for two hours', async () => {
    const court = await createCourt('Booking Court');

    const booking = await book(me, court.id, '2030-06-04T09:00:00.000Z', 2);

    expect(booking).toEqual({
      id: booking.id,
      court: { id: court.id, name: 'Booking Court', sport: 'PADEL', isActive: true },
      startsAt: '2030-06-04T09:00:00.000Z',
      endsAt: '2030-06-04T11:00:00.000Z',
      totalPriceCents: 4000,
      status: 'ACTIVE',
      cancelledAt: null,
      cancellableUntil: '2030-06-04T07:00:00.000Z',
    });
  });

  it('does not let an admin book', async () => {
    await admin
      .post('/api/bookings')
      .send({ courtId: randomUUID(), startsAt: '2030-06-04T09:00:00.000Z', durationHours: 1 })
      .expect(403, {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'You are not allowed to do this',
      });
  });

  it('rejects an unknown court, a time without a zone and three hours', async () => {
    const court = await createCourt('Rules Court');
    const post = (courtId: string, startsAt: string, durationHours = 1) =>
      me.post('/api/bookings').send({ courtId, startsAt, durationHours });

    await post(randomUUID(), '2030-06-04T09:00:00.000Z').expect(404, {
      statusCode: 404,
      code: 'COURT_NOT_FOUND',
      message: 'Court not found',
    });
    await post(court.id, '2030-06-04T10:00:00').expect(400, {
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Some fields are not valid',
      details: {
        startsAt: ['startsAt must be a date and time with a zone, like 2026-11-10T10:00:00Z'],
      },
    });
    await post(court.id, '2030-06-04T09:00:00.000Z', 3).expect(400, {
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Some fields are not valid',
      details: { durationHours: ['durationHours must be 1 or 2'] },
    });
  });

  it('keeps the bookings of a deactivated court but takes no new ones', async () => {
    const court = await createCourt('Closing Court');
    const booking = await book(me, court.id, '2030-06-05T09:00:00.000Z');

    await prisma.court.update({ where: { id: court.id }, data: { isActive: false } });

    await me
      .post('/api/bookings')
      .send({ courtId: court.id, startsAt: '2030-06-05T10:00:00.000Z', durationHours: 1 })
      .expect(422, {
        statusCode: 422,
        code: 'COURT_INACTIVE',
        message: 'This court is not taking new bookings',
      });
    const mine = await me.get('/api/bookings/me').expect(200);
    const listed = (mine.body as BookingDto[]).find(({ id }) => id === booking.id);
    expect(listed?.court.isActive).toBe(false);
    await me.post(`/api/bookings/${booking.id}/cancel`).expect(200);
  });

  it('cancels up to and including two hours before the start', async () => {
    const court = await createCourt('Cancel Court');
    const onTime = await book(me, court.id, '2030-06-05T09:00:00.000Z');
    const late = await book(me, court.id, '2030-06-05T10:00:00.000Z');

    clock.current = new Date(onTime.cancellableUntil);
    const cancelled = await me.post(`/api/bookings/${onTime.id}/cancel`).expect(200);
    expect(cancelled.body).toEqual({
      ...onTime,
      status: 'CANCELLED',
      cancelledAt: onTime.cancellableUntil,
    });

    clock.current = new Date(new Date(late.cancellableUntil).getTime() + 1);
    await me.post(`/api/bookings/${late.id}/cancel`).expect(422, {
      statusCode: 422,
      code: 'CANCELLATION_WINDOW_CLOSED',
      message: 'Bookings can be cancelled up to 2 hours before the start',
      details: { cancellableUntil: late.cancellableUntil },
    });
  });

  it('answers 409 for a second cancel and 404 for a booking of another user', async () => {
    const court = await createCourt('Twice Court');
    const mine = await book(me, court.id, '2030-06-05T09:00:00.000Z');
    const theirs = await book(other, court.id, '2030-06-05T10:00:00.000Z');

    await me.post(`/api/bookings/${mine.id}/cancel`).expect(200);
    await me.post(`/api/bookings/${mine.id}/cancel`).expect(409, {
      statusCode: 409,
      code: 'BOOKING_ALREADY_CANCELLED',
      message: 'Already cancelled',
    });
    await me.post(`/api/bookings/${theirs.id}/cancel`).expect(404, {
      statusCode: 404,
      code: 'BOOKING_NOT_FOUND',
      message: 'Booking not found',
    });
    expect(await prisma.booking.findUnique({ where: { id: theirs.id } })).toMatchObject({
      status: 'ACTIVE',
      cancelledAt: null,
    });
  });

  it('lists my upcoming and past bookings, never other people', async () => {
    // 10:00 in Lisbon, so a booking can end exactly now.
    clock.current = new Date('2030-06-03T09:00:00Z');
    const court = await createCourt('List Court');
    const insert = (
      userId: string,
      from: string,
      to: string,
      status: BookingStatus = BookingStatus.ACTIVE
    ) =>
      prisma.booking.create({
        data: {
          userId,
          courtId: court.id,
          startsAt: new Date(from),
          endsAt: new Date(to),
          // Not hourly price x hours: the list must show the stored price.
          totalPriceCents: 1500,
          status,
        },
      });
    const earlier = await insert(userIds.lister, '2030-06-02T09:00:00Z', '2030-06-02T10:00:00Z');
    const endedNow = await insert(userIds.lister, '2030-06-03T08:00:00Z', '2030-06-03T09:00:00Z');
    const inProgress = await insert(userIds.lister, '2030-06-03T09:00:00Z', '2030-06-03T10:00:00Z');
    const tomorrow = await insert(userIds.lister, '2030-06-04T09:00:00Z', '2030-06-04T11:00:00Z');
    const cancelled = await insert(
      userIds.lister,
      '2030-06-05T09:00:00Z',
      '2030-06-05T10:00:00Z',
      BookingStatus.CANCELLED
    );
    await insert(userIds.other, '2030-06-02T11:00:00Z', '2030-06-02T12:00:00Z');
    await insert(userIds.other, '2030-06-04T12:00:00Z', '2030-06-04T13:00:00Z');
    const listerAgent = await loginAs(app, 'bookings-lister@test.dev');

    const upcoming = await listerAgent.get('/api/bookings/me').expect(200);
    const past = await listerAgent.get('/api/bookings/me').query({ scope: 'past' }).expect(200);

    const ids = (body: unknown) => (body as BookingDto[]).map(({ id }) => id);
    expect(ids(upcoming.body)).toEqual([inProgress.id, tomorrow.id, cancelled.id]);
    expect(ids(past.body)).toEqual([endedNow.id, earlier.id]);
    expect((past.body as BookingDto[])[0]?.totalPriceCents).toBe(1500);
  });

  describe('while another transaction holds the court row', () => {
    let db: pg.Client;
    let pid: number;

    // Polled through the app's connection: in db's open transaction pg_stat_activity is a snapshot.
    const requestsBlockedByDb = async () => {
      const [row] = await prisma.$queryRaw<{ count: number }[]>`
        SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE ${pid}::int = ANY(pg_blocking_pids(pid))`;
      return row?.count;
    };

    beforeEach(async () => {
      db = new pg.Client({ connectionString: inject('databaseUrl') });
      await db.connect();
      const { rows } = await db.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
      pid = rows[0]?.pid ?? 0;
      await db.query('BEGIN');
    });

    afterEach(async () => {
      await db.query('ROLLBACK');
      await db.end();
    });

    it('makes a new booking wait for a change of opening hours', async () => {
      const court = await createCourt('Lock Court');
      await db.query('UPDATE courts SET close_hour = 20 WHERE id = $1', [court.id]);

      // 20:00 in Lisbon: allowed with the old closing hour, not with the new one.
      const pending = me
        .post('/api/bookings')
        .send({ courtId: court.id, startsAt: '2030-06-04T19:00:00.000Z', durationHours: 1 })
        .then(response => response);
      await expect.poll(requestsBlockedByDb, { timeout: 2000 }).toBe(1);
      await db.query('COMMIT');

      const response = await pending;
      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({ code: 'OUTSIDE_OPENING_HOURS' });
    });

    it('makes a change of opening hours wait for a new booking', async () => {
      const court = await createCourt('Hours Court');
      await db.query('SELECT 1 FROM courts WHERE id = $1 FOR NO KEY UPDATE', [court.id]);
      await db.query(
        `INSERT INTO bookings (user_id, court_id, starts_at, ends_at, total_price_cents)
         VALUES ($1, $2, '2030-06-04T19:00:00Z', '2030-06-04T20:00:00Z', 2000)`,
        [userIds.me, court.id]
      );

      const pending = admin
        .patch(`/api/courts/${court.id}`)
        .send({ closeHour: 20 })
        .then(response => response);
      await expect.poll(requestsBlockedByDb, { timeout: 2000 }).toBe(1);
      await db.query('COMMIT');

      const response = await pending;
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'COURT_HAS_BOOKINGS_OUTSIDE_HOURS' });
    });
  });
});
