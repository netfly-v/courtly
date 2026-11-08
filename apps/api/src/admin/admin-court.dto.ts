import { ApiProperty } from '@nestjs/swagger';
import { CourtDto } from '../courts/court.dto.js';

export class AdminCourtDto extends CourtDto {
  @ApiProperty({
    type: 'integer',
    example: 3,
    description:
      'Active bookings that have not ended yet, in progress too. Turning the court off keeps them.',
  })
  upcomingBookingsCount: number;
}
