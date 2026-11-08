import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus, type Court, type Prisma, Sport } from '../generated/prisma/client.js';
import { cancellableUntil } from './booking-rules.js';

export class BookingCourtDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Padel 1' })
  name: string;

  @ApiProperty({ enum: Sport, enumName: 'Sport' })
  sport: Sport;

  @ApiProperty({ description: 'An inactive court keeps its bookings but takes no new ones' })
  isActive: boolean;
}

export class BookingDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: BookingCourtDto })
  court: BookingCourtDto;

  @ApiProperty({ format: 'date-time', example: '2026-11-10T10:00:00.000Z' })
  startsAt: string;

  @ApiProperty({ format: 'date-time', example: '2026-11-10T12:00:00.000Z' })
  endsAt: string;

  @ApiProperty({ type: 'integer', example: 4800, description: 'Price at the time of booking' })
  totalPriceCents: number;

  @ApiProperty({ enum: BookingStatus, enumName: 'BookingStatus' })
  status: BookingStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  cancelledAt: string | null;

  @ApiProperty({
    format: 'date-time',
    description: 'An active booking can be cancelled up to and including this time',
  })
  cancellableUntil: string;
}

export const toBookingCourtDto = (court: Court): BookingCourtDto => ({
  id: court.id,
  name: court.name,
  sport: court.sport,
  isActive: court.isActive,
});

type BookingWithCourt = Prisma.BookingGetPayload<{ include: { court: true } }>;

export const toBookingDto = (booking: BookingWithCourt): BookingDto => ({
  id: booking.id,
  court: toBookingCourtDto(booking.court),
  startsAt: booking.startsAt.toISOString(),
  endsAt: booking.endsAt.toISOString(),
  totalPriceCents: booking.totalPriceCents,
  status: booking.status,
  cancelledAt: booking.cancelledAt?.toISOString() ?? null,
  cancellableUntil: cancellableUntil(booking.startsAt).toISOString(),
});
