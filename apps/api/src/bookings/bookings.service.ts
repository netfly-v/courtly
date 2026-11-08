import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SessionUser } from '../auth/session.js';
import { Clock } from '../clock/clock.js';
import { ApiError } from '../common/api-error.js';
import type { Environment } from '../config/environment.js';
import { HOUR_MS } from '../facility/facility-time.js';
import { BookingStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { violatesConstraint } from '../prisma/prisma-errors.js';
import { CANCELLATION_NOTICE_MS, cancellableUntil, checkNewBooking } from './booking-rules.js';
import { type BookingDto, toBookingDto } from './booking.dto.js';
import type { CreateBookingDto } from './create-booking.dto.js';
import { BookingScope } from './my-bookings-query.dto.js';

const bookingNotFound = () =>
  new ApiError(HttpStatus.NOT_FOUND, 'BOOKING_NOT_FOUND', 'Booking not found');

const scopeQuery = (scope: BookingScope, now: Date) => {
  if (scope === BookingScope.PAST) {
    return { endsAt: { lte: now }, order: 'desc' as const };
  }
  return { endsAt: { gt: now }, order: 'asc' as const };
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Environment, true>,
    private readonly clock: Clock
  ) {}

  async createBooking(user: SessionUser, body: CreateBookingDto): Promise<BookingDto> {
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(startsAt.getTime() + body.durationHours * HOUR_MS);
    try {
      return await this.prisma.$transaction(async tx => {
        // One booking per court at a time: parallel inserts into the EXCLUDE index can deadlock,
        // and a change of opening hours (an UPDATE of this row) has to wait for this check.
        await tx.$executeRaw`
          SELECT 1 FROM courts WHERE id = ${body.courtId}::uuid FOR NO KEY UPDATE
        `;
        const court = await tx.court.findUnique({ where: { id: body.courtId } });
        if (!court) {
          throw new ApiError(HttpStatus.NOT_FOUND, 'COURT_NOT_FOUND', 'Court not found');
        }
        const violation = checkNewBooking({
          startsAt,
          endsAt,
          court,
          now: this.clock.now(),
          timeZone: this.config.get('FACILITY_TIMEZONE', { infer: true }),
        });
        if (violation) {
          const { code, message, details } = violation;
          throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, code, message, details);
        }
        const booking = await tx.booking.create({
          data: {
            userId: user.id,
            courtId: court.id,
            startsAt,
            endsAt,
            totalPriceCents: court.hourlyPriceCents * body.durationHours,
          },
          include: { court: true },
        });
        return toBookingDto(booking);
      });
    } catch (error) {
      if (violatesConstraint(error, 'booking_no_overlap')) {
        throw new ApiError(HttpStatus.CONFLICT, 'SLOT_TAKEN', 'This time has just been booked');
      }
      throw error;
    }
  }

  async listMyBookings(user: SessionUser, scope: BookingScope): Promise<BookingDto[]> {
    const { endsAt, order } = scopeQuery(scope, this.clock.now());
    const bookings = await this.prisma.booking.findMany({
      where: { userId: user.id, endsAt },
      orderBy: [{ startsAt: order }, { createdAt: order }],
      include: { court: true },
    });
    return bookings.map(toBookingDto);
  }

  async cancelBooking(user: SessionUser, id: string): Promise<BookingDto> {
    const now = this.clock.now();
    const { count } = await this.prisma.booking.updateMany({
      where: {
        id,
        userId: user.id,
        status: BookingStatus.ACTIVE,
        startsAt: { gte: new Date(now.getTime() + CANCELLATION_NOTICE_MS) },
      },
      data: { status: BookingStatus.CANCELLED, cancelledAt: now },
    });
    const booking = await this.prisma.booking.findFirst({
      where: { id, userId: user.id },
      include: { court: true },
    });
    if (!booking) {
      throw bookingNotFound();
    }
    if (count === 0 && booking.status === BookingStatus.CANCELLED) {
      throw new ApiError(HttpStatus.CONFLICT, 'BOOKING_ALREADY_CANCELLED', 'Already cancelled');
    }
    if (count === 0) {
      const deadline = cancellableUntil(booking.startsAt).toISOString();
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'CANCELLATION_WINDOW_CLOSED',
        'Bookings can be cancelled up to 2 hours before the start',
        { cancellableUntil: deadline }
      );
    }
    return toBookingDto(booking);
  }
}
