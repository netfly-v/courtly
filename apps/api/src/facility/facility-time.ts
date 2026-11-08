import { tzOffset } from '@date-fns/tz';

export const HOUR_MS = 60 * 60 * 1000;

export interface TimeRange {
  startsAt: Date;
  endsAt: Date;
}

const parseDate = (date: string) => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)) - 1,
  day: Number(date.slice(8, 10)),
});

// Only Intl offsets, never the machine time zone: TZDate's constructor depends on it around DST.
const offsetMs = (timeZone: string, instant: number) =>
  tzOffset(timeZone, new Date(instant)) * 60_000;

// The offset is read twice: the first guess can land on the other side of a DST change.
// A wall time in a DST gap becomes the moment of the jump: a day never ends before its last hour.
export const zonedInstant = (date: string, hour: number, timeZone: string) => {
  const { year, month, day } = parseDate(date);
  const asUtc = Date.UTC(year, month, day, hour);
  const guess = asUtc - offsetMs(timeZone, asUtc);
  const instant = asUtc - offsetMs(timeZone, guess);
  return Math.max(instant, asUtc - offsetMs(timeZone, instant));
};

const localHour = (instant: number, timeZone: string) =>
  new Date(instant + offsetMs(timeZone, instant)).getUTCHours();

export const facilityDate = (instant: Date, timeZone: string) =>
  new Date(instant.getTime() + offsetMs(timeZone, instant.getTime())).toISOString().slice(0, 10);

export const addDays = (date: string, days: number) => {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month, day + days)).toISOString().slice(0, 10);
};

export const facilityDay = (date: string, timeZone: string) => ({
  start: new Date(zonedInstant(date, 0, timeZone)),
  end: new Date(zonedInstant(date, 24, timeZone)),
});

export const openingSlots = (
  date: string,
  timeZone: string,
  openHour: number,
  closeHour: number
): TimeRange[] => {
  const hours = Array.from({ length: closeHour - openHour }, (_, index) => openHour + index);
  return hours.flatMap(hour => {
    const start = zonedInstant(date, hour, timeZone);
    // On the spring DST day one hour doesn't exist (Lisbon jumps from 01:00 to 02:00).
    if (localHour(start, timeZone) !== hour) {
      return [];
    }
    return [{ startsAt: new Date(start), endsAt: new Date(start + HOUR_MS) }];
  });
};
