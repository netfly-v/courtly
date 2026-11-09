import { describe, expect, it } from 'vitest';
import { dayParts } from './time';

describe('dayParts', () => {
  it('names the day in the facility time zone, not the browser one', () => {
    // 00:00 on 15 July in Lisbon, still 14 July in New York and in UTC.
    expect(dayParts('2026-07-14T23:00:00.000Z', 'Europe/Lisbon')).toEqual({
      weekday: 'Wed',
      day: '15',
      month: 'Jul',
    });
  });
});
