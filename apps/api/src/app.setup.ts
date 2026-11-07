import { type NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { ApiErrorFilter } from './common/api-error.filter.js';
import { validationError } from './common/api-error.js';

// No default body parsers: configureApp adds JSON only,
// so an HTML form on another site can't post to the API (login CSRF).
export const APP_OPTIONS: NestApplicationOptions = { bodyParser: false };

// Both are shared by main.ts and the e2e tests, so tests run the app with the production setup.
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
