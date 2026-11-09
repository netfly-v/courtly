import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  NotContains,
} from 'class-validator';
import { Sport } from '../generated/prisma/client.js';

export class CreateCourtDto {
  @ApiProperty({ example: 'Padel 3', maxLength: 60 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  // Postgres text can't store a NUL character; without this check it fails with a 500.
  @NotContains('\u0000', { message: 'name must not contain a NUL character' })
  name: string;

  @ApiProperty({ enum: Sport, enumName: 'Sport' })
  @IsEnum(Sport)
  sport: Sport;

  @ApiProperty({
    type: 'integer',
    example: 2400,
    minimum: 1,
    maximum: 100_000,
    description: 'Price per hour in cents',
  })
  @IsInt()
  @Min(1)
  @Max(100_000)
  hourlyPriceCents: number;

  @ApiProperty({ type: 'integer', example: 8, minimum: 0, maximum: 23 })
  @IsInt()
  @Min(0)
  @Max(23)
  openHour: number;

  @ApiProperty({
    type: 'integer',
    example: 23,
    minimum: 1,
    maximum: 24,
    description: 'Must be later than openHour, 24 is midnight',
  })
  @IsInt()
  @Min(1)
  @Max(24)
  closeHour: number;
}
