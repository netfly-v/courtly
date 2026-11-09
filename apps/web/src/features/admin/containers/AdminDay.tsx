'use client';

import { keepPreviousData } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { CalendarCheckIcon, CalendarXIcon, EuroIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { formatPrice } from '@/entities/court/format';
import {
  facilityDate,
  formatDayWithYear,
  formatTimeRange,
  isDay,
  shiftDay,
} from '@/entities/facility/time';
import { useListDayBookings } from '@/shared/api/generated';
import {
  type AdminBookingDto,
  type AdminDayDto,
  BookingStatus,
  type FacilityDto,
} from '@/shared/api/generated/model';
import { DayBookingsTable, type DayBookingView } from '../ui/DayBookingsTable';
import { DayNav } from '../ui/DayNav';
import { DayTotals } from '../ui/DayTotals';

const toView = (booking: AdminBookingDto, timeZone: string): DayBookingView => {
  const cancelled = booking.status === BookingStatus.CANCELLED;
  return {
    id: booking.id,
    time: formatTimeRange(booking.startsAt, booking.endsAt, timeZone),
    court: booking.court.name,
    sport: booking.court.sport,
    courtBadge: booking.court.isActive ? undefined : 'Turned off',
    player: booking.user.name,
    email: booking.user.email,
    price: formatPrice(booking.totalPriceCents),
    status: cancelled ? 'Cancelled' : 'Active',
    cancelled,
  };
};

// The day navigation stays on screen when a day fails, so the admin can move to another one.
const renderDay = (
  data: AdminDayDto | undefined,
  failed: boolean,
  loading: boolean,
  label: string,
  timeZone: string
) => {
  if (!data && failed) {
    return (
      <p role="alert" className="text-destructive">
        Could not load the bookings. Please try again.
      </p>
    );
  }
  if (!data) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  const { bookings, totals } = data;
  return (
    <>
      <DayTotals
        totals={[
          { label: 'Active bookings', value: String(totals.activeCount), icon: CalendarCheckIcon },
          { label: 'Cancelled', value: String(totals.cancelledCount), icon: CalendarXIcon },
          {
            label: 'Expected revenue',
            value: formatPrice(totals.revenueCents),
            icon: EuroIcon,
          },
        ]}
        hint="Revenue counts active bookings only. Cancelled ones are listed but not counted."
        loading={loading}
      />
      {!loading && bookings.length === 0 && (
        <p className="text-muted-foreground">No bookings on {label}.</p>
      )}
      {bookings.length > 0 && (
        <DayBookingsTable
          caption={`Bookings on ${label}`}
          bookings={bookings.map(booking => toView(booking, timeZone))}
          loading={loading}
        />
      )}
    </>
  );
};

export const AdminDay = ({ facility }: { facility: FacilityDto }) => {
  const searchParams = useSearchParams();
  const urlDate = searchParams.get('date');
  const [now] = useState(() => new Date());
  const [pickedDate, setPickedDate] = useState(urlDate);
  const [seenUrlDate, setSeenUrlDate] = useState(urlDate);
  // The header link to this page changes the URL without a remount, so follow the URL.
  if (urlDate !== seenUrlDate) {
    setSeenUrlDate(urlDate);
    setPickedDate(urlDate);
  }
  const { timezone } = facility;
  const today = facilityDate(now, timezone);
  const date = isDay(pickedDate) ? pickedDate : today;
  const day = useListDayBookings({ date }, { query: { placeholderData: keepPreviousData } });

  const pickDay = (next: string) => {
    setPickedDate(next);
    window.history.replaceState(null, '', `?date=${next}`);
  };

  if (day.error?.status === 403) {
    return <p>This page is for admins. Log in with an admin account to see it.</p>;
  }

  const label = formatDayWithYear(date);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Bookings</h1>
        <p className="text-muted-foreground">All times are in {timezone} time.</p>
      </div>
      <DayNav
        label={date === today ? `Today, ${label}` : label}
        day={parseISO(date)}
        today={parseISO(today)}
        onPrevious={() => pickDay(shiftDay(date, -1))}
        onToday={() => pickDay(today)}
        onNext={() => pickDay(shiftDay(date, 1))}
        onPick={picked => pickDay(format(picked, 'yyyy-MM-dd'))}
      />
      {renderDay(day.data, day.isError, day.isPlaceholderData, label, timezone)}
    </section>
  );
};
