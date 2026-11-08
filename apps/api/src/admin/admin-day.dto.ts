import { ApiProperty, PickType } from '@nestjs/swagger';
import { BookingDto, toBookingCourtDto } from '../bookings/booking.dto.js';
import type { Prisma } from '../generated/prisma/client.js';

export class BookingUserDto {
  @ApiProperty({ example: 'Anna Silva' })
  name: string;

  @ApiProperty({ example: 'anna@courtly.dev' })
  email: string;
}

export class AdminBookingDto extends PickType(BookingDto, [
  'id',
  'court',
  'startsAt',
  'endsAt',
  'totalPriceCents',
  'status',
  'cancelledAt',
] as const) {
  @ApiProperty({ type: BookingUserDto })
  user: BookingUserDto;
}

export class DayTotalsDto {
  @ApiProperty({ type: 'integer', example: 4 })
  activeCount: number;

  @ApiProperty({ type: 'integer', example: 1 })
  cancelledCount: number;

  @ApiProperty({
    type: 'integer',
    example: 9600,
    description: 'Active bookings that start this day, past hours included, at their stored price',
  })
  revenueCents: number;
}

export class AdminDayDto {
  @ApiProperty({ example: '2026-11-09', description: 'A day in the facility time zone' })
  date: string;

  @ApiProperty({ type: [AdminBookingDto] })
  bookings: AdminBookingDto[];

  @ApiProperty({ type: DayTotalsDto })
  totals: DayTotalsDto;
}

type DayBooking = Prisma.BookingGetPayload<{
  include: { court: true; user: { select: { name: true; email: true } } };
}>;

export const toAdminBookingDto = (booking: DayBooking): AdminBookingDto => ({
  id: booking.id,
  court: toBookingCourtDto(booking.court),
  user: { name: booking.user.name, email: booking.user.email },
  startsAt: booking.startsAt.toISOString(),
  endsAt: booking.endsAt.toISOString(),
  totalPriceCents: booking.totalPriceCents,
  status: booking.status,
  cancelledAt: booking.cancelledAt?.toISOString() ?? null,
});
