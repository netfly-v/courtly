import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const BookingScope = { UPCOMING: 'upcoming', PAST: 'past' } as const;
export type BookingScope = (typeof BookingScope)[keyof typeof BookingScope];

export class MyBookingsQueryDto {
  @ApiPropertyOptional({
    enum: BookingScope,
    enumName: 'BookingScope',
    default: BookingScope.UPCOMING,
    description: 'upcoming: not ended yet, past: ended. Both include cancelled bookings.',
  })
  @IsOptional()
  @IsIn(Object.values(BookingScope))
  scope: BookingScope = BookingScope.UPCOMING;
}
