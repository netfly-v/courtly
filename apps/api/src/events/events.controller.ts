import { Controller, type MessageEvent, Sse } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { interval, map, merge, type Observable } from 'rxjs';
import { EventsBus } from './events.bus.js';

// The Next.js proxy closes a stream after 30 s without a byte.
const HEARTBEAT_MS = 15_000;

@Controller('events')
export class EventsController {
  constructor(private readonly bus: EventsBus) {}

  // Not in openapi.json: Orval would make a query hook that waits for an endless body to end.
  @Sse()
  @ApiExcludeEndpoint()
  streamEvents(): Observable<MessageEvent> {
    return merge(
      this.bus.availabilityChanges.pipe(map(data => ({ type: 'availability.changed', data }))),
      interval(HEARTBEAT_MS).pipe(map(() => ({ comment: 'ping' })))
    );
  }
}
