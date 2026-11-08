import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [PrismaModule, ClockModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
