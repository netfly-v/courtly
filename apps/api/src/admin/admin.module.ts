import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [PrismaModule, ClockModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
