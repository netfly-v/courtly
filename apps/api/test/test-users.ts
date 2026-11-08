import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { hashPassword } from '../src/auth/password.js';
import { Role } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PASSWORD = 'test-password';

export const createUser = async (
  app: NestExpressApplication,
  email: string,
  role: Role = Role.USER
) =>
  app.get(PrismaService).user.create({
    data: { email, name: email, role, passwordHash: await hashPassword(PASSWORD) },
  });

export const loginAs = async (app: NestExpressApplication, email: string) => {
  const agent = request.agent(app.getHttpServer());
  await agent.post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
  return agent;
};
