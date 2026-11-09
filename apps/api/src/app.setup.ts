import { type NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { ApiErrorFilter } from './common/api-error.filter.js';
import { validationError } from './common/api-error.js';

export const APP_OPTIONS: NestApplicationOptions = {
  // No form parser (configureApp adds JSON only): other sites can't post HTML forms (login CSRF).
  bodyParser: false,
  // Event streams never end: app.close() (docker compose stop, tests) would wait for them.
  forceCloseConnections: true,
};

export const configureApp = (app: NestExpressApplication) => {
  app.setGlobalPrefix('api');
  app.useBodyParser('json');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationError,
    })
  );
  app.useGlobalFilters(new ApiErrorFilter());
};
