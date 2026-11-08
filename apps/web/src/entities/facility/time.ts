import { TZDate } from '@date-fns/tz';
import { addDays, format, parseISO } from 'date-fns';
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
