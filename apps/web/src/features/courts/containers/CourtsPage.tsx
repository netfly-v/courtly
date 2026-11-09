'use client';

import { formatHourlyPrice, formatOpeningHours } from '@/entities/court/format';
import { useGetMe, useListCourts } from '@/shared/api/generated';
import { type CourtDto, Role } from '@/shared/api/generated/model';
import { CourtCard } from '../ui/CourtCard';

const renderCourts = (courts: CourtDto[] | undefined, failed: boolean, canBook: boolean) => {
  if (courts?.length === 0) {
    return <p className="text-muted-foreground">There are no courts yet.</p>;
  }
  if (courts) {
    return (
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courts.map(court => (
          <li key={court.id}>
            <CourtCard
              name={court.name}
              sport={court.sport}
              openingHours={formatOpeningHours(court.openHour, court.closeHour)}
              price={formatHourlyPrice(court.hourlyPriceCents)}
              badge={court.isActive ? undefined : 'Turned off'}
              dimmed={!court.isActive}
              link={canBook ? { href: `/courts/${court.id}`, label: 'See free times' } : undefined}
            />
          </li>
        ))}
      </ul>
    );
  }
  if (failed) {
    return (
      <p role="alert" className="text-destructive">
        Could not load the courts. Please try again.
      </p>
    );
  }
  return <p className="text-muted-foreground">Loading courts…</p>;
};

export const CourtsPage = () => {
  const { data: courts, isError } = useListCourts();
  const me = useGetMe();
  const canBook = me.data?.role === Role.USER;

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Courts</h1>
        {canBook && (
          <p className="text-muted-foreground">Pick a court to see its free times and book.</p>
        )}
      </div>
      {renderCourts(courts, isError, canBook)}
    </section>
  );
};
