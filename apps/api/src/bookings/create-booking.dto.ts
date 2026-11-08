import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsUUID, Matches } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  courtId: string;

  @ApiProperty({
    example: '2026-11-10T10:00:00.000Z',
    description: 'startsAt of a slot from the availability endpoint',
  })
  // A time without a zone would be read in the server's own time zone.
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/, {
    message: 'startsAt must be a date and time with a zone, like 2026-11-10T10:00:00Z',
  })
  @IsISO8601({ strict: true }, { message: 'startsAt must be a real date and time' })
  startsAt: string;

  @ApiProperty({ type: 'integer', enum: [1, 2] })
  @IsIn([1, 2], { message: 'durationHours must be 1 or 2' })
  durationHours: 1 | 2;
}
