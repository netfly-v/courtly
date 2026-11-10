import type { QueryClient } from '@tanstack/react-query';
import { facilityDate } from '@/entities/facility/time';
import { getGetCourtAvailabilityQueryKey, getListMyBookingsQueryKey } from '@/shared/api/generated';
import {
  type AvailabilityDto,
  type BookingDto,
  BookingScope,
  BookingStatus,
  SlotStatus,
} from '@/shared/api/generated/model';

const covers = (booking: BookingDto, slotStartsAt: string) => {
  const time = Date.parse(slotStartsAt);
  return Date.parse(booking.startsAt) <= time && time < Date.parse(booking.endsAt);
};

const withBooking = (bookings: BookingDto[], booking: BookingDto) => {
  if (bookings.some(item => item.id === booking.id)) {
    return bookings.map(item => (item.id === booking.id ? booking : item));
  }
  // The API's order: by start, then by creation, so a new booking goes after equal starts.
  return [...bookings, booking].sort(
    (first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt)
  );
};

// Invalidating alone isn't enough: a cached page shows the old state until its refetch answers.
export const putBookingInCache = (
  queryClient: QueryClient,
  booking: BookingDto,
  timeZone: string
) => {
  const mine = booking.status === BookingStatus.ACTIVE;
  const status = mine ? SlotStatus.BOOKED : SlotStatus.AVAILABLE;
  queryClient.setQueryData<AvailabilityDto>(
    getGetCourtAvailabilityQueryKey(booking.court.id, {
      date: facilityDate(booking.startsAt, timeZone),
    }),
    availability =>
      availability && {
        ...availability,
        slots: availability.slots.map(slot =>
          covers(booking, slot.startsAt) ? { ...slot, status, bookedByMe: mine } : slot
        ),
      }
  );
  queryClient.setQueryData<BookingDto[]>(
    getListMyBookingsQueryKey({ scope: BookingScope.upcoming }),
    bookings => bookings && withBooking(bookings, booking)
  );
};
