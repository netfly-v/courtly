// Type metadata for enableImplicitConversion; unit tests load this file before Nest does.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, Matches, Max, Min, MinLength, validateSync } from 'class-validator';

export class Environment {
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a postgres:// connection string',
  })
  DATABASE_URL: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 4000;

  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters long' })
  JWT_SECRET: string;

  // Text, not boolean: a typo like `TRUE` must stop the app instead of quietly turning Secure off.
  @IsIn(['true', 'false'], { message: "COOKIE_SECURE must be 'true' or 'false'" })
  COOKIE_SECURE: 'true' | 'false' = 'false';
}

export const validateEnvironment = (config: Record<string, unknown>): Environment => {
  const environment = plainToInstance(Environment, config, { enableImplicitConversion: true });
  const errors = validateSync(environment);
  if (errors.length > 0) {
    const messages = errors.flatMap(error => Object.values(error.constraints ?? {}));
    throw new Error(`Invalid environment: ${messages.join('; ')}`);
  }
  return environment;
};
