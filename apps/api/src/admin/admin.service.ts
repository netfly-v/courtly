import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment.js';
import { facilityDay } from '../facility/facility-time.js';
import { BookingStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type AdminDayDto, toAdminBookingDto } from './admin-day.dto.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Environment, true>
  ) {}

  async listDayBookings(date: string): Promise<AdminDayDto> {
    const day = facilityDay(date, this.config.get('FACILITY_TIMEZONE', { infer: true }));
    const bookings = await this.prisma.booking.findMany({
      where: { startsAt: { gte: day.start, lt: day.end } },
      include: { court: true, user: { select: { name: true, email: true } } },
      orderBy: [
        { startsAt: 'asc' },
        { court: { name: 'asc' } },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });
    // Totals come from the same rows, so they always match the list.
    const active = bookings.filter(booking => booking.status === BookingStatus.ACTIVE);
    return {
      date,
      bookings: bookings.map(toAdminBookingDto),
      totals: {
        activeCount: active.length,
        cancelledCount: bookings.length - active.length,
        revenueCents: active.reduce((sum, booking) => sum + booking.totalPriceCents, 0),
      },
    };
  }
}
