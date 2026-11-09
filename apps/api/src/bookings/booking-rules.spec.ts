import { describe, expect, it } from 'vitest';
import { checkNewBooking, fitsOpeningHours } from './booking-rules.js';

const lisbon = 'Europe/Lisbon';
const HOUR = 3_600_000;

const range = (startsAt: string, hours: number) => ({
  startsAt: new Date(startsAt),
  endsAt: new Date(new Date(startsAt).getTime() + hours * HOUR),
});

describe('fitsOpeningHours', () => {
  it.each([
    ['a slot inside the hours', '2030-06-03T09:00:00Z', 1, 8, 22, true],
    ['a slot before opening', '2030-06-03T06:00:00Z', 1, 8, 22, false],
    ['2 hours that start an hour before opening', '2030-06-03T06:00:00Z', 2, 8, 22, false],
    ['2 hours that end after closing', '2030-06-03T20:00:00Z', 2, 8, 22, false],
    ['the last 2 hours before a midnight close', '2030-06-03T21:00:00Z', 2, 8, 24, true],
    ['2 hours over midnight', '2030-06-03T22:00:00Z', 2, 8, 24, false],
    ['2 hours over the missing spring hour', '2030-03-31T00:00:00Z', 2, 0, 4, true],
    ['2 hours over the repeated autumn hour', '2030-10-26T23:00:00Z', 2, 0, 4, false],
    ['the 00:00 slot, still the day before in UTC', '2030-06-03T23:00:00Z', 1, 0, 24, true],
  ])('checks %s', (_case, startsAt, hours, openHour, closeHour, expected) => {
    expect(fitsOpeningHours(range(startsAt, hours), openHour, closeHour, lisbon)).toBe(expected);
  });
});

describe('checkNewBooking', () => {
  // 10:15 on 3 June in Lisbon.
  const now = new Date('2030-06-03T09:15:00Z');
  const activeCourt = { openHour: 8, closeHour: 22, isActive: true };

  const check = (
    startsAt: string,
    options: { hours?: number; isActive?: boolean; now?: Date } = {}
  ) =>
    checkNewBooking({
      ...range(startsAt, options.hours ?? 1),
      court: { ...activeCourt, isActive: options.isActive ?? true },
      now: options.now ?? now,
      timeZone: lisbon,
    });

  it('accepts a future slot inside the hours', () => {
    expect(check('2030-06-03T10:00:00Z')).toBeNull();
  });

  it.each([
    ['an inactive court', '2030-06-03T10:00:00Z', { isActive: false }, 'COURT_INACTIVE'],
    ['a start that is not on the hour', '2030-06-03T10:30:00Z', {}, 'SLOT_NOT_ALIGNED'],
    ['the slot that started at 10:00', '2030-06-03T09:00:00Z', {}, 'BOOKING_IN_PAST'],
    ['a slot outside the hours', '2030-06-03T21:00:00Z', { hours: 2 }, 'OUTSIDE_OPENING_HOURS'],
  ])('rejects %s', (_case, startsAt, options, code) => {
    expect(check(startsAt, options)?.code).toBe(code);
  });

  it('reports an inactive court first, since no other slot would help', () => {
    expect(check('2030-06-03T09:00:00Z', { isActive: false })?.code).toBe('COURT_INACTIVE');
  });

  it('counts the 30 days in facility calendar days', () => {
    expect(check('2030-07-03T20:00:00Z')).toBeNull();
    // 00:30 on 4 June in Lisbon, still 3 June in UTC.
    expect(check('2030-07-04T09:00:00Z', { now: new Date('2030-06-03T23:30:00Z') })).toBeNull();
    expect(check('2030-07-03T23:00:00Z')).toEqual({
      code: 'BOOKING_TOO_FAR_AHEAD',
      message: 'Bookings open 30 days ahead',
      details: { lastBookableDate: '2030-07-03' },
    });
  });
});
