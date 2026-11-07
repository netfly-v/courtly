import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './test-app.js';

// The message comes from Nest, so only the shape and the code are ours to pin.
const envelope = (statusCode: number, code: string) => ({
  statusCode,
  code,
  message: expect.any(String) as string,
});

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
    expect(unknownRoute.body).toEqual(envelope(404, 'NOT_FOUND'));

    const brokenJson = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(brokenJson.body).toEqual(envelope(400, 'BAD_REQUEST'));
  });
});
