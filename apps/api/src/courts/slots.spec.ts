import { describe, expect, it } from 'vitest';
import { buildSlots, facilityDay, type SlotBooking } from './slots.js';

const ME = 'me';
const timeZone = 'Europe/Lisbon';
const longAgo = new Date('2000-01-01T00:00:00Z');

const slotsFor = (
  date: string,
  openHour: number,
  closeHour: number,
  options: { bookings?: SlotBooking[]; now?: Date; timeZone?: string } = {}
) =>
  buildSlots({
    date,
    timeZone: options.timeZone ?? timeZone,
    openHour,
    closeHour,
    bookings: options.bookings ?? [],
    now: options.now ?? longAgo,
    userId: ME,
  });

const booking = (startsAt: string, endsAt: string, userId: string): SlotBooking => ({
  startsAt: new Date(startsAt),
  endsAt: new Date(endsAt),
  userId,
});

describe('buildSlots', () => {
  it.each([
    ['in summer (UTC+1)', '2030-06-03', '2030-06-03T07:00:00.000Z'],
    ['in winter (UTC+0)', '2030-01-07', '2030-01-07T08:00:00.000Z'],
  ])('starts the 08:00 slot at local 08:00 %s', (_season, date, expectedStart) => {
    const [first, second] = slotsFor(date, 8, 10);

    expect(first?.startsAt.toISOString()).toBe(expectedStart);
    expect(second?.startsAt.getTime()).toBe(new Date(expectedStart).getTime() + 3_600_000);
  });

  it('marks a slot that has started as past', () => {
    const slots = slotsFor('2030-06-03', 8, 12, { now: new Date('2030-06-03T09:15:00Z') });

    expect(slots.map(slot => slot.status)).toEqual(['PAST', 'PAST', 'PAST', 'AVAILABLE']);
  });

  it('marks booked slots and the ones that are mine', () => {
    const bookings = [
      booking('2030-06-03T08:00:00Z', '2030-06-03T10:00:00Z', ME),
      booking('2030-06-03T11:00:00Z', '2030-06-03T12:00:00Z', 'someone-else'),
    ];

    const slots = slotsFor('2030-06-03', 8, 13, { bookings });

    expect(slots.map(({ status, bookedByMe }) => [status, bookedByMe])).toEqual([
      ['AVAILABLE', false],
      ['BOOKED', true],
      ['BOOKED', true],
      ['AVAILABLE', false],
      ['BOOKED', false],
    ]);
  });

  it.each([
    ['Europe/Lisbon', 'spring', '2030-03-31', 23],
    ['Europe/Lisbon', 'autumn', '2030-10-27', 24],
    ['America/New_York', 'spring', '2030-03-10', 23],
  ])('keeps slots one hour long in %s on the %s DST day', (zone, _season, date, count) => {
    const slots = slotsFor(date, 0, 24, { timeZone: zone });

    expect(slots).toHaveLength(count);
    for (const [index, slot] of slots.entries()) {
      expect(slot.endsAt.getTime() - slot.startsAt.getTime()).toBe(3_600_000);
      expect(slot.startsAt.getTime()).toBeGreaterThanOrEqual(
        slots[index - 1]?.endsAt.getTime() ?? 0
      );
    }
  });
});

describe('facilityDay', () => {
  it('uses the facility time zone, not UTC', () => {
    const day = facilityDay('2030-06-03', timeZone);

    expect(day.start.toISOString()).toBe('2030-06-02T23:00:00.000Z');
    expect(day.end.toISOString()).toBe('2030-06-03T23:00:00.000Z');
  });

  it('ends at the DST jump when the next midnight does not exist', () => {
    const day = facilityDay('2027-03-27', 'Atlantic/Azores');
    const [lastSlot] = slotsFor('2027-03-27', 23, 24, { timeZone: 'Atlantic/Azores' });

    expect(day.end.toISOString()).toBe('2027-03-28T01:00:00.000Z');
    expect(lastSlot?.endsAt.getTime()).toBe(day.end.getTime());
  });
});
