import { HttpException, HttpStatus, type ValidationError } from '@nestjs/common';
import type { ApiErrorDto } from './api-error.dto.js';

export class ApiError extends HttpException {
  readonly body: ApiErrorDto;

  constructor(
    statusCode: HttpStatus,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, statusCode);
    this.body = { statusCode, code, message, details };
  }
}

export const validationError = (errors: ValidationError[]) =>
  new ApiError(
    HttpStatus.BAD_REQUEST,
    'VALIDATION_FAILED',
    'Some fields are not valid',
    Object.fromEntries(
      errors.map(({ property, constraints }) => [property, Object.values(constraints ?? {})])
    )
  );
