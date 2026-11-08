import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AdminDayDto } from '../src/admin/admin-day.dto.js';
import type { ApiErrorDto } from '../src/common/api-error.dto.js';
import { BookingStatus, Role, Sport } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './test-app.js';
import { createUser, loginAs } from './test-users.js';

type Agent = Awaited<ReturnType<typeof loginAs>>;

// 12:15 in Lisbon on 27 Oct 2030, after the clocks went back (UTC+0).
const NOW = new Date('2030-10-27T12:15:00Z');

describe('admin', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let admin: Agent;
  let user: Agent;
  const userIds: string[] = [];
  let bookerId: string;
  const courtIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp({ now: () => NOW });
    prisma = app.get(PrismaService);
    userIds.push((await createUser(app, 'admin-day-admin@test.dev', Role.ADMIN)).id);
    bookerId = (await createUser(app, 'admin-day-user@test.dev')).id;
    userIds.push(bookerId);
    await prisma.user.update({ where: { id: bookerId }, data: { name: 'Day Booker' } });
    admin = await loginAs(app, 'admin-day-admin@test.dev');
    user = await loginAs(app, 'admin-day-user@test.dev');
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { courtId: { in: courtIds } } });
    await prisma.court.deleteMany({ where: { id: { in: courtIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it('lists the bookings that start on the facility day and sums only active ones', async () => {
    const createCourt = async (name: string, isActive: boolean) => {
      const court = await prisma.court.create({
        data: {
          name,
          sport: Sport.PADEL,
          hourlyPriceCents: 2000,
          openHour: 0,
          closeHour: 24,
          isActive,
        },
      });
      courtIds.push(court.id);
      return court;
    };
    const courtA = await createCourt('Day A', true);
    const courtB = await createCourt('Day B', false);
    const insert = (
      courtId: string,
      from: string,
      to: string,
      totalPriceCents = 2000,
      cancelledAt?: string
    ) =>
      prisma.booking.create({
        data: {
          userId: bookerId,
          courtId,
          startsAt: new Date(from),
          endsAt: new Date(to),
          totalPriceCents,
          ...(cancelledAt && {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(cancelledAt),
          }),
        },
      });
    // Keep this day free in other test files: the view lists every booking in the shared database.
    // Lisbon leaves summer time: the day runs from 23:00 UTC on the 26th to 00:00 UTC on the 28th.
    const late = await insert(courtB.id, '2030-10-27T23:00:00Z', '2030-10-28T00:00:00Z');
    await insert(courtA.id, '2030-10-28T00:00:00Z', '2030-10-28T01:00:00Z');
    const cancelled = await insert(
      courtB.id,
      '2030-10-27T10:00:00Z',
      '2030-10-27T11:00:00Z',
      2000,
      '2030-10-26T09:00:00Z'
    );
    // Not hourly price x hours: revenue must use the stored price.
    const twoHours = await insert(courtA.id, '2030-10-27T18:00:00Z', '2030-10-27T20:00:00Z', 3000);
    const midnightB = await insert(courtB.id, '2030-10-26T23:00:00Z', '2030-10-27T00:00:00Z');
    const midnightA = await insert(courtA.id, '2030-10-26T23:00:00Z', '2030-10-27T00:00:00Z');

    const response = await admin
      .get('/api/admin/bookings')
      .query({ date: '2030-10-27' })
      .expect(200);

    const day = response.body as AdminDayDto;
    expect(day.date).toBe('2030-10-27');
    expect(day.bookings.map(({ id }) => id)).toEqual([
      midnightA.id,
      midnightB.id,
      cancelled.id,
      twoHours.id,
      late.id,
    ]);
    expect(day.totals).toEqual({ activeCount: 4, cancelledCount: 1, revenueCents: 9000 });
    expect(day.bookings[2]).toEqual({
      id: cancelled.id,
      court: { id: courtB.id, name: 'Day B', sport: 'PADEL', isActive: false },
      user: { name: 'Day Booker', email: 'admin-day-user@test.dev' },
      startsAt: '2030-10-27T10:00:00.000Z',
      endsAt: '2030-10-27T11:00:00.000Z',
      totalPriceCents: 2000,
      status: 'CANCELLED',
      cancelledAt: '2030-10-26T09:00:00.000Z',
    });
  });

  it('needs a date', async () => {
    const response = await admin.get('/api/admin/bookings').expect(400);

    const { code, details } = response.body as ApiErrorDto;
    expect({ code, fields: Object.keys(details ?? {}) }).toEqual({
      code: 'VALIDATION_FAILED',
      fields: ['date'],
    });
  });

  it('is for admins only', async () => {
    await user.get('/api/admin/bookings').query({ date: '2030-10-27' }).expect(403, {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'You are not allowed to do this',
    });
  });
});
