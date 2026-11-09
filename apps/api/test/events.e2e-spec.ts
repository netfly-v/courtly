import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BookingDto } from '../src/bookings/booking.dto.js';
import type { AvailabilityChangedEventDto } from '../src/events/availability-changed-event.dto.js';
import { Role, Sport } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './test-app.js';
import { createUser, loginAs, sessionCookie } from './test-users.js';

// 10:15 on 3 June 2030 in Lisbon (UTC+1).
const clock = { now: () => new Date('2030-06-03T09:15:00Z') };

interface StreamEvent {
  event: string;
  data: AvailabilityChangedEventDto;
}

// Skips messages without data: those are the heartbeat comments.
const openEventStream = async (url: string, cookie: string) => {
  const abort = new AbortController();
  const response = await fetch(url, { headers: { cookie }, signal: abort.signal });
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  const next = async (): Promise<StreamEvent> => {
    for (;;) {
      const end = buffer.indexOf('\n\n');
      if (end === -1) {
        const { value, done } = await reader.read();
        if (done) {
          throw new Error('The event stream ended');
        }
        buffer += value;
        continue;
      }
      const lines = buffer.slice(0, end).split('\n');
      buffer = buffer.slice(end + 2);
      const field = (name: string) =>
        lines.filter(line => line.startsWith(`${name}: `)).map(line => line.slice(name.length + 2));
      const [data] = field('data');
      if (data !== undefined) {
        return {
          event: field('event')[0] ?? 'message',
          data: JSON.parse(data) as AvailabilityChangedEventDto,
        };
      }
    }
  };
  return { response, next, close: () => abort.abort() };
};

describe('GET /api/events', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let url: string;
  const userIds: string[] = [];
  const courtIds: string[] = [];

  const createCourt = async (name: string) => {
    const court = await prisma.court.create({
      data: { name, sport: Sport.PADEL, hourlyPriceCents: 2000, openHour: 0, closeHour: 24 },
    });
    courtIds.push(court.id);
    return court;
  };

  beforeAll(async () => {
    app = await createTestApp(clock);
    await app.listen(0);
    url = `${await app.getUrl()}/api/events`;
    prisma = app.get(PrismaService);
    userIds.push((await createUser(app, 'events-user@test.dev')).id);
    userIds.push((await createUser(app, 'events-admin@test.dev', Role.ADMIN)).id);
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { courtId: { in: courtIds } } });
    await prisma.court.deleteMany({ where: { id: { in: courtIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it('answers 401 with the error envelope without a session', async () => {
    await request(app.getHttpServer()).get('/api/events').expect(401, {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Please log in',
    });
  });

  it('tells every client the facility day of a booking made or cancelled, and nothing on a failure', async () => {
    const court = await createCourt('Live Court');
    const other = await createCourt('Other Court');
    const player = await loginAs(app, 'events-user@test.dev');
    const admin = await openEventStream(url, await sessionCookie(app, 'events-admin@test.dev'));
    const user = await openEventStream(url, await sessionCookie(app, 'events-user@test.dev'));
    try {
      // 00:00 on 5 June in Lisbon is still 4 June in UTC.
      const slot = { courtId: court.id, startsAt: '2030-06-04T23:00:00.000Z', durationHours: 1 };
      const booking = (await player.post('/api/bookings').send(slot).expect(201))
        .body as BookingDto;
      const changed = {
        event: 'availability.changed',
        data: { courtId: court.id, date: '2030-06-05' },
      };
      expect(await admin.next()).toEqual(changed);
      expect(await user.next()).toEqual(changed);

      await player.post('/api/bookings').send(slot).expect(409);
      await player.post(`/api/bookings/${booking.id}/cancel`).expect(200);
      await player.post(`/api/bookings/${booking.id}/cancel`).expect(409);
      await player
        .post('/api/bookings')
        .send({ courtId: other.id, startsAt: '2030-06-04T09:00:00.000Z', durationHours: 1 })
        .expect(201);

      // Events come in order, so the failed calls sent nothing in between.
      expect(await user.next()).toEqual(changed);
      expect(await user.next()).toEqual({
        event: 'availability.changed',
        data: { courtId: other.id, date: '2030-06-04' },
      });
    } finally {
      admin.close();
      user.close();
    }
  });

  it('shuts down while a client is still connected and ends its stream', async () => {
    const other = await createTestApp(clock);
    await other.listen(0);
    const cookie = await sessionCookie(other, 'events-user@test.dev');
    const stream = await openEventStream(`${await other.getUrl()}/api/events`, cookie);
    expect(stream.response.headers.get('content-type')).toBe('text/event-stream');

    await other.close();

    await expect(stream.next()).rejects.toThrow();
  });
});
