import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches } from 'class-validator';
import { errorResponse } from './api-error.dto.js';

export class DayQueryDto {
  @ApiProperty({ example: '2026-11-09', description: 'A day in the facility time zone' })
  @Matches(/^20\d{2}-\d{2}-\d{2}$/, { message: 'date must be a day like 2026-11-09' })
  @IsISO8601({ strict: true }, { message: 'date must be a real calendar day' })
  date: string;
}

export const invalidDayResponse = errorResponse(
  400,
  'VALIDATION_FAILED',
  'Some fields are not valid',
  {
    date: ['date must be a real calendar day'],
  }
);
