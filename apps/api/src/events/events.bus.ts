import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import type { AvailabilityChangedEventDto } from './availability-changed-event.dto.js';

@Injectable()
export class EventsBus {
  private readonly availability = new Subject<AvailabilityChangedEventDto>();
  readonly availabilityChanges = this.availability.asObservable();

  availabilityChanged(courtId: string, date: string) {
    this.availability.next({ courtId, date });
  }
}
