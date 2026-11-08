import { describe, expect, it } from 'vitest';
import { facilityDate, facilityDay, openingSlots } from './facility-time.js';

const lisbon = 'Europe/Lisbon';

describe('openingSlots', () => {
  it.each([
    ['in summer (UTC+1)', '2030-06-03', '2030-06-03T07:00:00.000Z'],
    ['in winter (UTC+0)', '2030-01-07', '2030-01-07T08:00:00.000Z'],
  ])('starts the 08:00 slot at local 08:00 %s', (_season, date, expectedStart) => {
    const [first, second] = openingSlots(date, lisbon, 8, 10);

    expect(first?.startsAt.toISOString()).toBe(expectedStart);
    expect(second?.startsAt.getTime()).toBe(new Date(expectedStart).getTime() + 3_600_000);
  });

  it.each([
    ['Europe/Lisbon', 'spring', '2030-03-31', 23],
    ['Europe/Lisbon', 'autumn', '2030-10-27', 24],
    ['America/New_York', 'spring', '2030-03-10', 23],
  ])('keeps slots one hour long in %s on the %s DST day', (zone, _season, date, count) => {
    const slots = openingSlots(date, zone, 0, 24);

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
    const day = facilityDay('2030-06-03', lisbon);

    expect(day.start.toISOString()).toBe('2030-06-02T23:00:00.000Z');
    expect(day.end.toISOString()).toBe('2030-06-03T23:00:00.000Z');
  });

  it('ends at the DST jump when the next midnight does not exist', () => {
    const day = facilityDay('2027-03-27', 'Atlantic/Azores');
    const [lastSlot] = openingSlots('2027-03-27', 'Atlantic/Azores', 23, 24);

    expect(day.end.toISOString()).toBe('2027-03-28T01:00:00.000Z');
    expect(lastSlot?.endsAt.getTime()).toBe(day.end.getTime());
  });
});

describe('facilityDate', () => {
  it('gives the facility calendar day, which can differ from the UTC one', () => {
    expect(facilityDate(new Date('2030-06-03T23:30:00Z'), lisbon)).toBe('2030-06-04');
  });
});
