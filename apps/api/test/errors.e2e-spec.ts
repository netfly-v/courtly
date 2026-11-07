import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './test-app.js';

describe('error format', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('uses the same shape for errors thrown by Nest itself', async () => {
    const unknownRoute = await request(app.getHttpServer()).get('/api/nope').expect(404);
    expect(unknownRoute.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /api/nope',
    });

    const brokenJson = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(brokenJson.body).toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
  });
});
