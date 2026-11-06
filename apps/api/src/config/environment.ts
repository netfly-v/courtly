import { plainToInstance } from 'class-transformer';
import { IsInt, Matches, Max, Min, validateSync } from 'class-validator';

export class Environment {
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a postgres:// connection string',
  })
  DATABASE_URL: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 4000;
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
