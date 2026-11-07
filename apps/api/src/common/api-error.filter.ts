import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorDto } from './api-error.dto.js';
import { ApiError } from './api-error.js';

const toErrorBody = (exception: unknown): ApiErrorDto => {
  if (exception instanceof ApiError) {
    return exception.body;
  }
  if (exception instanceof HttpException) {
    // Plain HttpExceptions (unknown route, broken JSON, health 503) take the code from the status name.
    const statusCode = exception.getStatus();
    return { statusCode, code: HttpStatus[statusCode] ?? 'HTTP_ERROR', message: exception.message };
  }
  return { statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' };
};

// Every error leaves the API in one shape: { statusCode, code, message, details? }.
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const body = toErrorBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(exception);
    }
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}
