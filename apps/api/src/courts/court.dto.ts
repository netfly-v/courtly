import { ApiProperty } from '@nestjs/swagger';
import { type Court, Sport } from '../generated/prisma/client.js';

export class CourtDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Padel 1' })
  name: string;

  @ApiProperty({ enum: Sport, enumName: 'Sport' })
  sport: Sport;

  @ApiProperty({ type: 'integer', example: 2400, description: 'Price per hour in cents' })
  hourlyPriceCents: number;

  @ApiProperty({
    type: 'integer',
    example: 8,
    description: 'Opening hour in the facility time zone',
  })
  openHour: number;

  @ApiProperty({
    type: 'integer',
    example: 23,
    description: 'Closing hour in the facility time zone, 24 is midnight',
  })
  closeHour: number;

  @ApiProperty({ description: 'Users see only active courts' })
  isActive: boolean;
}

export const toCourtDto = (court: Court): CourtDto => ({
  id: court.id,
  name: court.name,
  sport: court.sport,
  hourlyPriceCents: court.hourlyPriceCents,
  openHour: court.openHour,
  closeHour: court.closeHour,
  isActive: court.isActive,
});
