import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SESSION_COOKIE } from './auth/session.js';

const config = new DocumentBuilder()
  .setTitle('Courtly API')
  .setVersion('1.0')
  .addCookieAuth(SESSION_COOKIE)
  .build();

// Method names become operationIds, so Orval names the hooks useListCourts and so on.
export const createOpenApiDocument = (app: INestApplication) =>
  SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  });
