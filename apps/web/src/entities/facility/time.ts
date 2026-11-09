import { TZDate } from '@date-fns/tz';
import { addDays, format, isValid, parseISO } from 'date-fns';
import type { FacilityDto } from '@/shared/api/generated/model';

const inZone = (instant: Date | string, timeZone: string) =>
  new TZDate(new Date(instant), timeZone);

export const facilityDate = (instant: Date | string, timeZone: string) =>
  format(inZone(instant, timeZone), 'yyyy-MM-dd');

export const bookableDays = ({ timezone, bookingDaysAhead }: FacilityDto, now: Date) => {
  const today = inZone(now, timezone);
  return Array.from({ length: bookingDaysAhead + 1 }, (_, index) =>
    format(addDays(today, index), 'yyyy-MM-dd')
  );
};

// A yyyy-MM-dd day, not an instant: new Date() or inZone would show the day before west of UTC.
export const formatDay = (date: string) => format(parseISO(date), 'EEE d MMM');

export const formatTime = (instant: string, timeZone: string) =>
  format(inZone(instant, timeZone), 'HH:mm');

export const formatTimeRange = (startsAt: string, endsAt: string, timeZone: string) =>
  `${formatTime(startsAt, timeZone)}–${formatTime(endsAt, timeZone)}`;

export const formatDayOf = (instant: string, timeZone: string) =>
  format(inZone(instant, timeZone), 'EEE d MMM');

// The API takes only a real 20xx calendar day.
export const isDay = (value: string | null): value is string =>
  value !== null && /^20\d{2}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));

export const shiftDay = (date: string, days: number) =>
  format(addDays(parseISO(date), days), 'yyyy-MM-dd');

export const formatDayWithYear = (date: string) => format(parseISO(date), 'EEE d MMM yyyy');
