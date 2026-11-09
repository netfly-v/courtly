import {
  addDays,
  facilityDate,
  HOUR_MS,
  openingSlots,
  type TimeRange,
} from '../facility/facility-time.js';

export const BOOKING_DAYS_AHEAD = 30;
export const CANCELLATION_NOTICE_MS = 2 * HOUR_MS;

export interface RuleViolation {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface NewBooking extends TimeRange {
  court: { openHour: number; closeHour: number; isActive: boolean };
  now: Date;
  timeZone: string;
}

export const cancellableUntil = (startsAt: Date) =>
  new Date(startsAt.getTime() - CANCELLATION_NOTICE_MS);

export const checkBookingHorizon = (
  date: string,
  now: Date,
  timeZone: string
): RuleViolation | null => {
  const lastBookableDate = addDays(facilityDate(now, timeZone), BOOKING_DAYS_AHEAD);
  if (date <= lastBookableDate) {
    return null;
  }
  return {
    code: 'BOOKING_TOO_FAR_AHEAD',
    message: `Bookings open ${BOOKING_DAYS_AHEAD} days ahead`,
    details: { lastBookableDate },
  };
};

// Uses the same slots as the availability endpoint, so the UI never offers a booking that fails.
export const fitsOpeningHours = (
  booking: TimeRange,
  openHour: number,
  closeHour: number,
  timeZone: string
) => {
  const slots = openingSlots(
    facilityDate(booking.startsAt, timeZone),
    timeZone,
    openHour,
    closeHour
  );
  return (
    slots.some(slot => slot.startsAt.getTime() === booking.startsAt.getTime()) &&
    slots.some(slot => slot.endsAt.getTime() === booking.endsAt.getTime())
  );
};

export const checkNewBooking = (booking: NewBooking): RuleViolation | null => {
  const { startsAt, endsAt, court, now, timeZone } = booking;
  if (!court.isActive) {
    return { code: 'COURT_INACTIVE', message: 'This court is not taking new bookings' };
  }
  // A whole UTC hour is a whole local hour: FACILITY_TIMEZONE must have a whole-hour offset.
  if (startsAt.getTime() % HOUR_MS !== 0) {
    return { code: 'SLOT_NOT_ALIGNED', message: 'Bookings start on the hour' };
  }
  if (startsAt <= now) {
    return { code: 'BOOKING_IN_PAST', message: 'This time has already started' };
  }
  const tooFarAhead = checkBookingHorizon(facilityDate(startsAt, timeZone), now, timeZone);
  if (tooFarAhead) {
    return tooFarAhead;
  }
  if (!fitsOpeningHours({ startsAt, endsAt }, court.openHour, court.closeHour, timeZone)) {
    return { code: 'OUTSIDE_OPENING_HOURS', message: 'The court is closed at this time' };
  }
  return null;
};
