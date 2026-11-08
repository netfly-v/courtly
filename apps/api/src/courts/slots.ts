import { tzOffset } from '@date-fns/tz';

const HOUR_MS = 60 * 60 * 1000;

export const SlotStatus = { AVAILABLE: 'AVAILABLE', BOOKED: 'BOOKED', PAST: 'PAST' } as const;
export type SlotStatus = (typeof SlotStatus)[keyof typeof SlotStatus];

export interface SlotBooking {
  startsAt: Date;
  endsAt: Date;
  userId: string;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  status: SlotStatus;
  bookedByMe: boolean;
}

interface SlotInput {
  date: string;
  timeZone: string;
  openHour: number;
  closeHour: number;
  bookings: SlotBooking[];
  now: Date;
  userId: string;
}

// Only Intl offsets, never the machine time zone: TZDate's constructor depends on it around DST.
const offsetMs = (timeZone: string, instant: number) =>
  tzOffset(timeZone, new Date(instant)) * 60_000;

// The offset is read twice: the first guess can land on the other side of a DST change.
// A wall time in a DST gap becomes the moment of the jump: a day never ends before its last hour.
const zonedInstant = (date: string, hour: number, timeZone: string) => {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1;
  const day = Number(date.slice(8, 10));
  const asUtc = Date.UTC(year, month, day, hour);
  const guess = asUtc - offsetMs(timeZone, asUtc);
  const instant = asUtc - offsetMs(timeZone, guess);
  return Math.max(instant, asUtc - offsetMs(timeZone, instant));
};

const localHour = (instant: number, timeZone: string) =>
  new Date(instant + offsetMs(timeZone, instant)).getUTCHours();

export const facilityDay = (date: string, timeZone: string) => ({
  start: new Date(zonedInstant(date, 0, timeZone)),
  end: new Date(zonedInstant(date, 24, timeZone)),
});

const statusOf = (startsAt: Date, booking: SlotBooking | undefined, now: Date): SlotStatus => {
  if (startsAt <= now) {
    return SlotStatus.PAST;
  }
  if (booking) {
    return SlotStatus.BOOKED;
  }
  return SlotStatus.AVAILABLE;
};

export const buildSlots = (input: SlotInput): Slot[] => {
  const { date, timeZone, openHour, closeHour, bookings, now, userId } = input;
  const hours = Array.from({ length: closeHour - openHour }, (_, index) => openHour + index);
  return hours.flatMap(hour => {
    const start = zonedInstant(date, hour, timeZone);
    // On the spring DST day one hour doesn't exist (Lisbon jumps from 01:00 to 02:00).
    if (localHour(start, timeZone) !== hour) {
      return [];
    }
    const startsAt = new Date(start);
    const endsAt = new Date(start + HOUR_MS);
    const booking = bookings.find(b => b.startsAt < endsAt && b.endsAt > startsAt);
    return [
      {
        startsAt,
        endsAt,
        status: statusOf(startsAt, booking, now),
        bookedByMe: booking?.userId === userId,
      },
    ];
  });
};
