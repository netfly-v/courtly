// Type metadata for enableImplicitConversion; unit tests load this file before Nest does.
import 'reflect-metadata';
import { tzOffset } from '@date-fns/tz';
import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsTimeZone,
  Matches,
  Max,
  Min,
  MinLength,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  validateSync,
} from 'class-validator';

// Bookings must start on a whole UTC hour (a DB CHECK), so a +05:30 zone could never book.
@ValidatorConstraint({ name: 'wholeHourOffset' })
class WholeHourOffset implements ValidatorConstraintInterface {
  validate(timeZone: unknown) {
    const year = new Date().getUTCFullYear();
    return [0, 6].every(month => {
      const offset = tzOffset(String(timeZone), new Date(Date.UTC(year, month, 1)));
      // An unknown zone gives NaN; @IsTimeZone reports that one.
      return Number.isNaN(offset) || offset % 60 === 0;
    });
  }

  defaultMessage() {
    return 'FACILITY_TIMEZONE must have a whole-hour UTC offset';
  }
}

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

  @IsTimeZone({ message: 'FACILITY_TIMEZONE must be an IANA time zone like Europe/Lisbon' })
  @Validate(WholeHourOffset)
  FACILITY_TIMEZONE: string = 'Europe/Lisbon';
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
