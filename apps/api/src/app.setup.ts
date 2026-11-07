import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { ApiErrorFilter } from './common/api-error.filter.js';
import { validationError } from './common/api-error.js';

// Shared by main.ts and the e2e tests, so tests run the app with the same setup as production.
export const configureApp = (app: NestExpressApplication) => {
  app.setGlobalPrefix('api');
  // JSON only, so an HTML form on another site can't post to the API (login CSRF).
  // Needs `bodyParser: false` when the app is created, or Nest also adds the form parser.
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
