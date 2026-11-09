import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityChangedEventDto {
  @ApiProperty({ format: 'uuid' })
  courtId: string;

  @ApiProperty({ example: '2026-11-10', description: 'Facility day of the booking' })
  date: string;
}
