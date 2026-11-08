import { describe, expect, it } from 'vitest';
import { buildSlots, type SlotBooking } from './slots.js';

const ME = 'me';

const slotsFor = (
  openHour: number,
  closeHour: number,
  options: { bookings?: SlotBooking[]; now?: Date } = {}
) =>
  buildSlots({
    date: '2030-06-03',
    timeZone: 'Europe/Lisbon',
    openHour,
    closeHour,
    bookings: options.bookings ?? [],
    now: options.now ?? new Date('2000-01-01T00:00:00Z'),
    userId: ME,
  });

const booking = (startsAt: string, endsAt: string, userId: string): SlotBooking => ({
  startsAt: new Date(startsAt),
  endsAt: new Date(endsAt),
  userId,
});

describe('buildSlots', () => {
  it('marks a slot that has started as past', () => {
    const slots = slotsFor(8, 12, { now: new Date('2030-06-03T09:15:00Z') });

    expect(slots.map(slot => slot.status)).toEqual(['PAST', 'PAST', 'PAST', 'AVAILABLE']);
  });

  it('marks booked slots and the ones that are mine', () => {
    const bookings = [
      booking('2030-06-03T08:00:00Z', '2030-06-03T10:00:00Z', ME),
      booking('2030-06-03T11:00:00Z', '2030-06-03T12:00:00Z', 'someone-else'),
    ];

    const slots = slotsFor(8, 13, { bookings });

    expect(slots.map(({ status, bookedByMe }) => [status, bookedByMe])).toEqual([
      ['AVAILABLE', false],
      ['BOOKED', true],
      ['BOOKED', true],
      ['AVAILABLE', false],
      ['BOOKED', false],
    ]);
  });
});
