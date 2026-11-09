import { Module } from '@nestjs/common';
import { EventsBus } from './events.bus.js';
import { EventsController } from './events.controller.js';

@Module({
  controllers: [EventsController],
  providers: [EventsBus],
  exports: [EventsBus],
})
export class EventsModule {}
