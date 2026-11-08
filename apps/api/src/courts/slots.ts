import { openingSlots } from '../facility/facility-time.js';

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
  return openingSlots(date, timeZone, openHour, closeHour).map(({ startsAt, endsAt }) => {
    const booking = bookings.find(b => b.startsAt < endsAt && b.endsAt > startsAt);
    return {
      startsAt,
      endsAt,
      status: statusOf(startsAt, booking, now),
      bookedByMe: booking?.userId === userId,
    };
  });
};
