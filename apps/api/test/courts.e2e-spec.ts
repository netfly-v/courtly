import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ApiErrorDto } from '../src/common/api-error.dto.js';
import type { CourtDto } from '../src/courts/court.dto.js';
import { Role } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './test-app.js';
import { createUser, loginAs } from './test-users.js';

type Agent = Awaited<ReturnType<typeof loginAs>>;

const newCourt = {
  name: 'Test Padel',
  sport: 'PADEL',
  hourlyPriceCents: 2400,
  openHour: 8,
  closeHour: 22,
};

const courtNotFound = { statusCode: 404, code: 'COURT_NOT_FOUND', message: 'Court not found' };

// Field messages come from class-validator, so only the code and the field names are pinned.
const invalidFields = (body: unknown) => {
  const { code, details } = body as ApiErrorDto;
  return { code, fields: Object.keys(details ?? {}).sort() };
};

describe('courts', () => {
  let app: NestExpressApplication;
  let admin: Agent;
  let user: Agent;
  const createdUserIds: string[] = [];
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
    app = await createTestApp();
    const adminUser = await createUser(app, 'courts-admin@test.dev', Role.ADMIN);
    const plainUser = await createUser(app, 'courts-user@test.dev');
    createdUserIds.push(adminUser.id, plainUser.id);
    admin = await loginAs(app, adminUser.email);
    user = await loginAs(app, plainUser.email);
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
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
});
