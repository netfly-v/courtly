import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashPassword } from '../src/auth/password.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './test-app.js';

describe('auth', () => {
  const email = 'auth-test@test.dev';
  const password = 'right-password';
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let userId: string;

  const login = (body: object) => request(app.getHttpServer()).post('/api/auth/login').send(body);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const user = await prisma.user.create({
      data: { email, name: 'Auth Test', passwordHash: await hashPassword(password) },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('logs in and sets an httpOnly session cookie', async () => {
    const response = await login({ email, password }).expect(200);

    expect(response.body).toEqual({ id: userId, email, name: 'Auth Test', role: 'USER' });
    const cookie = response.get('Set-Cookie')?.[0];
    expect(cookie).toMatch(/^courtly_session=[^;]+;/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toMatch(/;\s*Secure/i);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const wrongPassword = await login({ email, password: 'wrong-password' }).expect(401);
    const unknownEmail = await login({ email: 'nobody@test.dev', password }).expect(401);

    expect(wrongPassword.body).toEqual({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Wrong email or password',
    });
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('accepts the email in any letter case', async () => {
    await login({ email: 'Auth-Test@Test.dev', password }).expect(200);
  });

  it('lists every invalid field', async () => {
    const response = await login({ email: 'not-an-email', role: 'ADMIN' }).expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Some fields are not valid',
      details: {
        email: ['email must be a valid email address'],
        password: ['password should not be empty', 'password must be a string'],
        role: ['property role should not exist'],
      },
    });
  });

  it('ignores HTML form posts, so another site cannot log someone in', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .type('form')
      .send({ email, password })
      .expect(400);

    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(response.get('Set-Cookie')).toBeUndefined();
  });

  it('returns the current user while the session cookie is set', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email, password }).expect(200);

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body).toEqual({ id: userId, email, name: 'Auth Test', role: 'USER' });

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('rejects a missing or forged session cookie', async () => {
    const noCookie = await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    expect(noCookie.body).toEqual({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Please log in',
    });

    const forgedToken = new JwtService({ secret: 'another-secret-at-least-32-characters' });
    const forged = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', `courtly_session=${forgedToken.sign({ sub: userId })}`)
      .expect(401);
    expect(forged.body).toEqual(noCookie.body);
  });

  it.each([
    ['a user that no longer exists', { sub: randomUUID() }],
    ['a user id that is not a UUID', { sub: 'not-a-uuid' }],
  ])('rejects a signed session token with %s', async (_name, payload) => {
    const token = app.get(JwtService).sign(payload);

    await request(app.getHttpServer())
      .post('/api/bookings')
      .set('Cookie', `courtly_session=${token}`)
      .expect(401, { statusCode: 401, code: 'UNAUTHENTICATED', message: 'Please log in' });
  });

  it('takes the role from the database, not from the token', async () => {
    const token = app.get(JwtService).sign({ sub: userId, role: 'ADMIN' });

    await request(app.getHttpServer())
      .get('/api/admin/courts')
      .set('Cookie', `courtly_session=${token}`)
      .expect(403, {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'You are not allowed to do this',
      });
  });
});
