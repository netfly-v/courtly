import { ApiProperty } from '@nestjs/swagger';

export class FacilityDto {
  @ApiProperty({
    example: 'Europe/Lisbon',
    description: 'IANA time zone of the facility; show every time in it',
  })
  timezone: string;

  @ApiProperty({ type: 'integer', example: 30, description: 'Last bookable day is today + this' })
  bookingDaysAhead: number;
}
