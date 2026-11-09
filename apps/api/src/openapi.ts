import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SESSION_COOKIE } from './auth/session.js';
import { AvailabilityChangedEventDto } from './events/availability-changed-event.dto.js';

const config = new DocumentBuilder()
  .setTitle('Courtly API')
  .setDescription(
    'Log in first with POST /api/auth/login (Try it out). It sets an httpOnly session cookie ' +
      "that the other calls send. The Authorize button can't set a cookie from the browser. " +
      'Live updates: GET /api/events is a Server-Sent Events stream (not listed below). ' +
      'Each availability.changed event carries an AvailabilityChangedEventDto.'
  )
  .setVersion('1.0')
  .addCookieAuth(SESSION_COOKIE)
  .build();

// Method names become operationIds, so Orval names the hooks useListCourts and so on.
export const createOpenApiDocument = (app: INestApplication) =>
  SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
    // No path uses it (the event stream is left out), but the web reads the event with this type.
    extraModels: [AvailabilityChangedEventDto],
  });
