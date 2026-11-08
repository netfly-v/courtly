import { type NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { ApiErrorFilter } from './common/api-error.filter.js';
import { validationError } from './common/api-error.js';

// No form parser (configureApp adds JSON only), so other sites can't post HTML forms (login CSRF).
export const APP_OPTIONS: NestApplicationOptions = { bodyParser: false };

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
