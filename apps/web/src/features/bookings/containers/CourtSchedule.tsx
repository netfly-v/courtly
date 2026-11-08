'use client';

import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { addHours, parseISO } from 'date-fns';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  formatHour,
  formatHourlyPrice,
  formatOpeningHours,
  formatPrice,
  formatSport,
} from '@/entities/court/format';
import {
  bookableDays,
  facilityDate,
  formatDay,
  formatDayOf,
  formatTime,
  formatTimeRange,
} from '@/entities/facility/time';
import {
  getGetCourtAvailabilityQueryKey,
  useCreateBooking,
  useGetCourtAvailability,
} from '@/shared/api/generated';
import {
  type BookingDto,
  type CourtDto,
  CreateBookingDtoDurationHours,
  type FacilityDto,
  type SlotDto,
  SlotStatus,
} from '@/shared/api/generated/model';
import { toErrorMessage } from '../error-message';
import { BookingDialog } from '../ui/BookingDialog';
import { DayStrip } from '../ui/DayStrip';
import { SlotGrid, type SlotKind } from '../ui/SlotGrid';

interface CourtScheduleProps {
  courtId: string;
  facility: FacilityDto;
}

const slotKind = (slot: SlotDto): SlotKind => {
  if (slot.bookedByMe) {
    return 'mine';
  }
  if (slot.status === SlotStatus.BOOKED) {
    return 'booked';
  }
  if (slot.status === SlotStatus.PAST) {
    return 'past';
  }
  return 'free';
};

const SLOT_LABELS: Record<SlotKind, string> = {
  free: 'Free',
  mine: 'Your booking',
  booked: 'Booked',
  past: 'Past',
};

// The repeated hour on the autumn DST night is not a slot: the API rejects 2 hours over it.
const twoHourBlocker = (slots: SlotDto[], index: number, court: CourtDto, timeZone: string) => {
  const slot = slots[index];
  const next = slots[index + 1];
  if (!next) {
    return `The court closes at ${formatHour(court.closeHour)}`;
  }
  if (next.startsAt !== slot?.endsAt) {
    return 'Only 1 hour is possible at this time';
  }
  if (next.status !== SlotStatus.AVAILABLE) {
    return `${formatTime(next.startsAt, timeZone)} is not free`;
  }
  return undefined;
};

const durationOptions = (slots: SlotDto[], index: number, court: CourtDto, timeZone: string) => {
  const slot = slots[index];
  if (!slot) {
    return [];
  }
  const taken = slot.status !== SlotStatus.AVAILABLE;
  const blocker = twoHourBlocker(slots, index, court, timeZone);
  const twoHoursEnd = addHours(parseISO(slot.startsAt), 2).toISOString();
  return [
    {
      hours: CreateBookingDtoDurationHours.NUMBER_1,
      label: `Book ${formatTimeRange(slot.startsAt, slot.endsAt, timeZone)} · ${formatPrice(court.hourlyPriceCents)}`,
      disabled: taken,
    },
    {
      hours: CreateBookingDtoDurationHours.NUMBER_2,
      label: `Book ${formatTimeRange(slot.startsAt, twoHoursEnd, timeZone)} · ${formatPrice(2 * court.hourlyPriceCents)}`,
      disabled: taken || Boolean(blocker),
      reason: blocker,
    },
  ];
};

const bookedMessage = (booking: BookingDto, timeZone: string) =>
  `Booked: ${formatDayOf(booking.startsAt, timeZone)}, ${formatTimeRange(booking.startsAt, booking.endsAt, timeZone)} · ${formatPrice(booking.totalPriceCents)}`;

export const CourtSchedule = ({ courtId, facility }: CourtScheduleProps) => {
  const searchParams = useSearchParams();
  const [now] = useState(() => new Date());
  const [pickedDate, setPickedDate] = useState(() => searchParams.get('date'));
  const [selectedStartsAt, setSelectedStartsAt] = useState<string>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [booked, setBooked] = useState<BookingDto>();
  const pickedSlot = useRef<HTMLButtonElement>(null);
  const bookedNotice = useRef<HTMLParagraphElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const queryClient = useQueryClient();
  const { timezone } = facility;
  const today = facilityDate(now, timezone);
  const days = bookableDays(facility, now);
  const date = pickedDate && days.includes(pickedDate) ? pickedDate : today;
  const availability = useGetCourtAvailability(
    courtId,
    { date },
    { query: { placeholderData: keepPreviousData } }
  );
  const createBooking = useCreateBooking({
    mutation: {
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: getGetCourtAvailabilityQueryKey(courtId) });
      },
    },
  });

  const pickDay = (day: string) => {
    setPickedDate(day);
    setBooked(undefined);
    // Not router.replace: that would render the page on the server again.
    window.history.replaceState(null, '', `?date=${day}`);
  };

  const openSlot = (startsAt: string, button: HTMLButtonElement) => {
    pickedSlot.current = button;
    createBooking.reset();
    setBooked(undefined);
    setSelectedStartsAt(startsAt);
    setDialogOpen(true);
  };

  const book = (hours: CreateBookingDtoDurationHours) => {
    if (!selectedStartsAt) {
      return;
    }
    // Not in useCreateBooking: reset() drops these, so an old request can't close the next dialog.
    createBooking.mutate(
      { data: { courtId, startsAt: selectedStartsAt, durationHours: hours } },
      {
        onSuccess: booking => {
          setBooked(booking);
          setDialogOpen(false);
        },
      }
    );
  };

  // The dialog has no trigger button, so Radix doesn't know where focus should go back to.
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    const target = booked ? bookedNotice.current : pickedSlot.current;
    (target?.isConnected ? target : heading.current)?.focus();
  };

  const error = availability.error;
  if (error?.status === 404 || error?.status === 400) {
    return (
      <section className="flex flex-col gap-4">
        <p className="text-lg">This court is not available.</p>
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          See all courts
        </Link>
      </section>
    );
  }
  if (!availability.data && error) {
    return (
      <p role="alert" className="text-destructive">
        Could not load the free times. Please try again.
      </p>
    );
  }
  if (!availability.data) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  const { court, slots } = availability.data;
  const selectedIndex = slots.findIndex(slot => slot.startsAt === selectedStartsAt);
  const selectedSlot = slots[selectedIndex];
  const hasFreeSlot = slots.some(slot => slot.status === SlotStatus.AVAILABLE);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← All courts
        </Link>
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
          {court.name}
        </h1>
        <p className="text-muted-foreground">
          {formatSport(court.sport)} · {formatOpeningHours(court.openHour, court.closeHour)} ·{' '}
          {formatHourlyPrice(court.hourlyPriceCents)}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <DayStrip
          days={days.map(day => ({ value: day, label: day === today ? 'Today' : formatDay(day) }))}
          value={date}
          onChange={pickDay}
        />
        <p className="text-sm text-muted-foreground">All times are in {timezone} time.</p>
      </div>
      {booked && (
        <p
          ref={bookedNotice}
          role="status"
          tabIndex={-1}
          className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm outline-none"
        >
          {bookedMessage(booked, timezone)}.{' '}
          <Link href="/bookings" className="font-medium text-primary underline underline-offset-4">
            See my bookings
          </Link>
        </p>
      )}
      {!hasFreeSlot && !availability.isPlaceholderData && (
        <p className="text-muted-foreground">
          No free times on {formatDay(date)}. Pick another day.
        </p>
      )}
      <SlotGrid
        slots={slots.map(slot => {
          const kind = slotKind(slot);
          return {
            startsAt: slot.startsAt,
            time: formatTime(slot.startsAt, timezone),
            label: SLOT_LABELS[kind],
            kind,
          };
        })}
        loading={availability.isPlaceholderData}
        onPick={openSlot}
      />
      <BookingDialog
        open={dialogOpen}
        title={`Book ${court.name}`}
        description={
          selectedSlot
            ? `${formatDay(date)}, from ${formatTime(selectedSlot.startsAt, timezone)}`
            : ''
        }
        options={durationOptions(slots, selectedIndex, court, timezone)}
        error={toErrorMessage(createBooking.error)}
        pending={createBooking.isPending}
        onOpenChange={setDialogOpen}
        onBook={book}
        onCloseAutoFocus={restoreFocus}
      />
    </section>
  );
};
