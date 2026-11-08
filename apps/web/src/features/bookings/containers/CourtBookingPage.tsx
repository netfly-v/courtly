'use client';

import { useGetFacility } from '@/shared/api/generated';
import { CourtSchedule } from './CourtSchedule';

export const CourtBookingPage = ({ courtId }: { courtId: string }) => {
  const facility = useGetFacility({ query: { staleTime: Infinity } });

  if (facility.data) {
    return <CourtSchedule courtId={courtId} facility={facility.data} />;
  }
  if (facility.isError) {
    return (
      <p role="alert" className="text-destructive">
        Could not load the facility. Please try again.
      </p>
    );
  }
  return <p className="text-muted-foreground">Loading…</p>;
};
