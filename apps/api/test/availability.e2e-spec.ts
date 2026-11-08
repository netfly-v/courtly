import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BookingStatus, type Court, Sport } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './test-app.js';
import { createUser, loginAs } from './test-users.js';

type Agent = Awaited<ReturnType<typeof loginAs>>;

// 10:15 in Lisbon (UTC+1 in June).
const now = new Date('2030-06-03T09:15:00Z');

describe('court availability', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let me: Agent;
  let court: Court;
  const userIds: string[] = [];
  const courtIds: string[] = [];

  const createCourt = async (name: string) => {
    const created = await prisma.court.create({
      data: { name, sport: Sport.PADEL, hourlyPriceCents: 2000, openHour: 8, closeHour: 14 },
    });
    courtIds.push(created.id);
    return created;
  };

  const book = (
    courtId: string,
    userId: string,
    from: string,
    to: string,
    status: BookingStatus = BookingStatus.ACTIVE
  ) =>
    prisma.booking.create({
      data: {
        courtId,
        userId,
        startsAt: new Date(`2030-06-03T${from}:00Z`),
        endsAt: new Date(`2030-06-03T${to}:00Z`),
        totalPriceCents: 2000,
        status,
      },
    });

  beforeAll(async () => {
    app = await createTestApp({ now: () => now });
    prisma = app.get(PrismaService);
    const myUser = await createUser(app, 'availability-me@test.dev');
    const otherUser = await createUser(app, 'availability-other@test.dev');
    userIds.push(myUser.id, otherUser.id);
    me = await loginAs(app, myUser.email);

    court = await createCourt('Availability Court');
    const otherCourt = await createCourt('Other Court');
    await book(court.id, myUser.id, '10:00', '11:00');
    await book(court.id, otherUser.id, '11:00', '12:00');
    await book(court.id, otherUser.id, '12:00', '13:00', BookingStatus.CANCELLED);
    await book(otherCourt.id, otherUser.id, '12:00', '13:00');
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { courtId: { in: courtIds } } });
    await prisma.court.deleteMany({ where: { id: { in: courtIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it('shows the day in the facility time zone with past, booked and free slots', async () => {
    const response = await me
      .get(`/api/courts/${court.id}/availability`)
      .query({ date: '2030-06-03' })
      .expect(200);

    const slot = (hour: number, status: string, bookedByMe = false) => ({
      startsAt: `2030-06-03T${String(hour).padStart(2, '0')}:00:00.000Z`,
      endsAt: `2030-06-03T${String(hour + 1).padStart(2, '0')}:00:00.000Z`,
      status,
      bookedByMe,
    });
    expect(response.body).toEqual({
      court: {
        id: court.id,
        name: 'Availability Court',
        sport: 'PADEL',
        hourlyPriceCents: 2000,
        openHour: 8,
        closeHour: 14,
        isActive: true,
      },
      date: '2030-06-03',
      slots: [
        slot(7, 'PAST'),
        slot(8, 'PAST'),
        slot(9, 'PAST'),
        slot(10, 'BOOKED', true),
        slot(11, 'BOOKED'),
        slot(12, 'AVAILABLE'),
      ],
    });
  });

  it('rejects a day that does not exist', async () => {
    await me
      .get(`/api/courts/${court.id}/availability`)
      .query({ date: '2030-02-30' })
      .expect(400, {
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: 'Some fields are not valid',
        details: { date: ['date must be a real calendar day'] },
      });
  });

  it('hides the slots of an inactive court from users', async () => {
    const inactive = await createCourt('Inactive Court');
    await prisma.court.update({ where: { id: inactive.id }, data: { isActive: false } });

    await me
      .get(`/api/courts/${inactive.id}/availability`)
      .query({ date: '2030-06-03' })
      .expect(404, { statusCode: 404, code: 'COURT_NOT_FOUND', message: 'Court not found' });
  });
});
