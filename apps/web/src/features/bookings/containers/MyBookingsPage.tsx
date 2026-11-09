'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { formatPrice, formatSport } from '@/entities/court/format';
import { formatDayOf, formatTime, formatTimeRange } from '@/entities/facility/time';
import {
  getListMyBookingsQueryKey,
  useCancelBooking,
  useGetFacility,
  useListMyBookings,
} from '@/shared/api/generated';
import { type BookingDto, BookingScope, BookingStatus } from '@/shared/api/generated/model';
import { toErrorMessage } from '../error-message';
import type { BookingView } from '../ui/BookingRow';
import { BookingSection } from '../ui/BookingSection';
import { CancelDialog } from '../ui/CancelDialog';

const when = (booking: BookingDto, timeZone: string) =>
  `${formatDayOf(booking.startsAt, timeZone)}, ${formatTimeRange(booking.startsAt, booking.endsAt, timeZone)}`;

const toView = (booking: BookingDto, timeZone: string, now: number): BookingView => {
  const startsAt = Date.parse(booking.startsAt);
  const active = booking.status === BookingStatus.ACTIVE;
  const view: BookingView = {
    id: booking.id,
    court: booking.court.name,
    details: `${formatSport(booking.court.sport)} · ${when(booking, timeZone)}`,
    price: formatPrice(booking.totalPriceCents),
  };
  if (!active) {
    return { ...view, badge: 'Cancelled' };
  }
  if (startsAt <= now) {
    return now < Date.parse(booking.endsAt) ? { ...view, badge: 'In progress' } : view;
  }
  const until = booking.cancellableUntil;
  // "Up to and including" the deadline, the same as the API.
  const allowed = now <= Date.parse(until);
  return {
    ...view,
    cancel: {
      allowed,
      note: allowed
        ? `You can cancel until ${formatDayOf(until, timeZone)}, ${formatTime(until, timeZone)}`
        : 'Too late to cancel: bookings can be cancelled up to 2 hours before the start',
    },
  };
};

export const MyBookingsPage = () => {
  const [cancelId, setCancelId] = useState<string>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelled, setCancelled] = useState<BookingDto>();
  const pickedButton = useRef<HTMLButtonElement>(null);
  const cancelledNotice = useRef<HTMLParagraphElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const queryClient = useQueryClient();
  const facility = useGetFacility({ query: { staleTime: Infinity } });
  const upcoming = useListMyBookings({ scope: BookingScope.upcoming });
  const past = useListMyBookings({ scope: BookingScope.past });
  const cancelBooking = useCancelBooking({
    mutation: {
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
      },
    },
  });

  const openCancel = (id: string, button: HTMLButtonElement) => {
    pickedButton.current = button;
    cancelBooking.reset();
    setCancelled(undefined);
    setCancelId(id);
    setDialogOpen(true);
  };

  const confirmCancel = () => {
    if (!cancelId) {
      return;
    }
    // Not in useCancelBooking: reset() drops these, so an old request can't close the next dialog.
    cancelBooking.mutate(
      { id: cancelId },
      {
        onSuccess: booking => {
          setCancelled(booking);
          setDialogOpen(false);
        },
      }
    );
  };

  // The dialog has no trigger button, and after a cancel the row's button is gone.
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    const target = cancelled ? cancelledNotice.current : pickedButton.current;
    (target?.isConnected && !target.matches(':disabled') ? target : heading.current)?.focus();
  };

  if (upcoming.error?.status === 403 || past.error?.status === 403) {
    return <p>Bookings are for players. Log in with a user account to book a court.</p>;
  }
  const loaded = facility.data && upcoming.data && past.data;
  if (!loaded && (facility.isError || upcoming.isError || past.isError)) {
    return (
      <p role="alert" className="text-destructive">
        Could not load your bookings. Please try again.
      </p>
    );
  }
  if (!facility.data || !upcoming.data || !past.data) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  const { timezone } = facility.data;
  // The time of the last answer, so it moves on with every refetch.
  const now = upcoming.dataUpdatedAt;
  const picked = upcoming.data.find(booking => booking.id === cancelId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
          My bookings
        </h1>
        <p className="text-sm text-muted-foreground">All times are in {timezone} time.</p>
      </div>
      {cancelled && (
        <p
          ref={cancelledNotice}
          role="status"
          tabIndex={-1}
          className="rounded-lg border p-3 text-sm outline-none"
        >
          Cancelled: {cancelled.court.name}, {when(cancelled, timezone)}.
        </p>
      )}
      <BookingSection
        title="Upcoming"
        bookings={upcoming.data.map(booking => toView(booking, timezone, now))}
        empty={
          <p className="text-muted-foreground">
            No upcoming bookings.{' '}
            <Link href="/" className="text-primary underline underline-offset-4">
              Find a court
            </Link>
          </p>
        }
        onCancel={openCancel}
      />
      <BookingSection
        title="Past"
        bookings={past.data.map(booking => toView(booking, timezone, now))}
        empty={<p className="text-muted-foreground">No past bookings yet.</p>}
        onCancel={openCancel}
      />
      <CancelDialog
        open={dialogOpen}
        summary={picked ? `${picked.court.name}, ${when(picked, timezone)}` : ''}
        error={toErrorMessage(cancelBooking.error)}
        pending={cancelBooking.isPending}
        // Stays open while cancelling: a refusal shows its reason here.
        onOpenChange={open => !cancelBooking.isPending && setDialogOpen(open)}
        onConfirm={confirmCancel}
        onCloseAutoFocus={restoreFocus}
      />
    </div>
  );
};
