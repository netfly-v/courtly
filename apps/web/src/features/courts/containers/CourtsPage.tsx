'use client';

import { formatHourlyPrice, formatOpeningHours, formatSport } from '@/entities/court/format';
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
              sport={formatSport(court.sport)}
              openingHours={formatOpeningHours(court.openHour, court.closeHour)}
              price={formatHourlyPrice(court.hourlyPriceCents)}
              badge={court.isActive ? undefined : 'Turned off'}
              href={canBook ? `/courts/${court.id}` : undefined}
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
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Courts</h1>
      {renderCourts(courts, isError, canBook)}
    </section>
  );
};
