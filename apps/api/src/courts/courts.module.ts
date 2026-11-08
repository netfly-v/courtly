import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CourtsController } from './courts.controller.js';
import { CourtsService } from './courts.service.js';

@Module({
  imports: [PrismaModule, ClockModule],
  controllers: [CourtsController],
  providers: [CourtsService],
})
export class CourtsModule {}
