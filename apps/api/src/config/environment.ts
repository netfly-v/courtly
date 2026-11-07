// Stores the property types that enableImplicitConversion reads. Nest loads it too, but not before this file in tests.
import 'reflect-metadata';
import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsInt, Matches, Max, Min, MinLength, validateSync } from 'class-validator';

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

  // Implicit conversion runs before @Transform and Boolean('false') is true, so read the raw env text.
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.COOKIE_SECURE === 'true')
  @IsBoolean()
  COOKIE_SECURE: boolean = false;
}

// Fails at startup with a clear message instead of crashing later on the first query.
export const validateEnvironment = (config: Record<string, unknown>): Environment => {
  const environment = plainToInstance(Environment, config, { enableImplicitConversion: true });
  const errors = validateSync(environment);
  if (errors.length > 0) {
    const messages = errors.flatMap(error => Object.values(error.constraints ?? {}));
    throw new Error(`Invalid environment: ${messages.join('; ')}`);
  }
  return environment;
};
