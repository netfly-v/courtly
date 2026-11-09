import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ApiErrorDto } from '../src/common/api-error.dto.js';
import type { CourtDto } from '../src/courts/court.dto.js';
import { BookingStatus, Role } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './test-app.js';
import { createUser, loginAs } from './test-users.js';

type Agent = Awaited<ReturnType<typeof loginAs>>;

// 10:15 on 3 June 2030 in Lisbon (UTC+1).
const now = new Date('2030-06-03T09:15:00Z');

const newCourt = {
  name: 'Test Padel',
  sport: 'PADEL',
  hourlyPriceCents: 2400,
  openHour: 8,
  closeHour: 22,
};

const courtNotFound = { statusCode: 404, code: 'COURT_NOT_FOUND', message: 'Court not found' };

const invalidFields = (body: unknown) => {
  const { code, details } = body as ApiErrorDto;
  return { code, fields: Object.keys(details ?? {}).sort() };
};

describe('courts', () => {
  let app: NestExpressApplication;
  let admin: Agent;
  let user: Agent;
  const createdUserIds: string[] = [];
  let plainUserId = '';
  const createdCourtIds: string[] = [];

  const createCourt = async () => {
    const response = await admin.post('/api/courts').send(newCourt).expect(201);
    const court = response.body as CourtDto;
    createdCourtIds.push(court.id);
    return court;
  };

  const listCourtIds = async (agent: Agent) => {
    const response = await agent.get('/api/courts').expect(200);
    return (response.body as CourtDto[]).map(court => court.id);
  };

  beforeAll(async () => {
    app = await createTestApp({ now: () => now });
    const adminUser = await createUser(app, 'courts-admin@test.dev', Role.ADMIN);
    const plainUser = await createUser(app, 'courts-user@test.dev');
    createdUserIds.push(adminUser.id, plainUser.id);
    plainUserId = plainUser.id;
    admin = await loginAs(app, adminUser.email);
    user = await loginAs(app, plainUser.email);
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.booking.deleteMany({ where: { courtId: { in: createdCourtIds } } });
    await prisma.court.deleteMany({ where: { id: { in: createdCourtIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await app.close();
  });

  it('lets only an admin create and change a court', async () => {
    await request(app.getHttpServer()).post('/api/courts').send(newCourt).expect(401, {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Please log in',
    });
    await user.post('/api/courts').send(newCourt).expect(403, {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'You are not allowed to do this',
    });

    const court = await createCourt();
    expect(court).toEqual({ id: court.id, ...newCourt, isActive: true });

    await user.patch(`/api/courts/${court.id}`).send({ hourlyPriceCents: 3000 }).expect(403);
    const changed = await admin
      .patch(`/api/courts/${court.id}`)
      .send({ hourlyPriceCents: 3000 })
      .expect(200);
    expect(changed.body).toEqual({ ...court, hourlyPriceCents: 3000 });
  });

  it('hides an inactive court from users but not from admins', async () => {
    const active = await createCourt();
    const inactive = await createCourt();
    await admin.patch(`/api/courts/${inactive.id}`).send({ isActive: false }).expect(200);

    const seenByUser = await listCourtIds(user);
    expect(seenByUser).toContain(active.id);
    expect(seenByUser).not.toContain(inactive.id);
    expect(await listCourtIds(admin)).toContain(inactive.id);

    await user.get(`/api/courts/${active.id}`).expect(200, active);
    await user.get(`/api/courts/${inactive.id}`).expect(404, courtNotFound);
    await admin.get(`/api/courts/${inactive.id}`).expect(200);
  });

  it('rejects closing hours that are not after the opening hours', async () => {
    const error = {
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Some fields are not valid',
      details: { closeHour: ['closeHour must be later than openHour'] },
    };
    await admin
      .post('/api/courts')
      .send({ ...newCourt, openHour: 10, closeHour: 10 })
      .expect(400, error);

    const court = await createCourt();
    await admin.patch(`/api/courts/${court.id}`).send({ closeHour: 8 }).expect(400, error);
  });

  it('trims the court name and rejects a name of only spaces', async () => {
    const response = await admin
      .post('/api/courts')
      .send({ ...newCourt, name: '  Padel 9  ' })
      .expect(201);
    const court = response.body as CourtDto;
    createdCourtIds.push(court.id);
    expect(court.name).toBe('Padel 9');

    const created = await admin
      .post('/api/courts')
      .send({ ...newCourt, name: '   ' })
      .expect(400);
    const changed = await admin.patch(`/api/courts/${court.id}`).send({ name: '\t\n' }).expect(400);
    for (const { body } of [created, changed]) {
      expect(invalidFields(body)).toEqual({ code: 'VALIDATION_FAILED', fields: ['name'] });
    }
  });

  it('rejects null instead of a value', async () => {
    const court = await createCourt();

    const response = await admin
      .patch(`/api/courts/${court.id}`)
      .send({ name: null, isActive: null })
      .expect(400);
    expect(invalidFields(response.body)).toEqual({
      code: 'VALIDATION_FAILED',
      fields: ['isActive', 'name'],
    });
  });

  it('answers 404 for an unknown court and 400 for a bad id', async () => {
    await admin
      .patch(`/api/courts/${randomUUID()}`)
      .send({ name: 'Ghost' })
      .expect(404, courtNotFound);

    const response = await user.get('/api/courts/not-a-uuid').expect(400);
    expect(invalidFields(response.body)).toEqual({ code: 'VALIDATION_FAILED', fields: ['id'] });
  });

  it('refuses new opening hours that would leave an upcoming booking outside them', async () => {
    const court = await createCourt();
    const insert = (from: string, to: string, status: BookingStatus = BookingStatus.ACTIVE) =>
      app.get(PrismaService).booking.create({
        data: {
          userId: plainUserId,
          courtId: court.id,
          startsAt: new Date(from),
          endsAt: new Date(to),
          totalPriceCents: 2400,
          status,
        },
      });
    await insert('2030-06-02T07:00:00Z', '2030-06-02T08:00:00Z');
    await insert('2030-06-04T08:00:00Z', '2030-06-04T09:00:00Z', BookingStatus.CANCELLED);
    await insert('2030-06-04T11:00:00Z', '2030-06-04T12:00:00Z');
    await insert('2030-06-05T10:00:00Z', '2030-06-05T11:00:00Z');
    await insert('2030-06-03T09:00:00Z', '2030-06-03T10:00:00Z');

    await admin.patch(`/api/courts/${court.id}`).send({ openHour: 10 }).expect(200);
    await admin
      .patch(`/api/courts/${court.id}`)
      .send({ openHour: 13 })
      .expect(409, {
        statusCode: 409,
        code: 'COURT_HAS_BOOKINGS_OUTSIDE_HOURS',
        message: 'Some upcoming bookings fall outside the new opening hours',
        details: { count: 3, lastEndsAt: '2030-06-05T11:00:00.000Z' },
      });
    const current = await admin.get(`/api/courts/${court.id}`).expect(200);
    expect(current.body).toMatchObject({ openHour: 10 });
  });
});
