'use client';

import { Suspense } from 'react';
import { useGetFacility } from '@/shared/api/generated';
import { AdminDaySkeleton } from '../ui/AdminDaySkeleton';
import { AdminDay } from './AdminDay';

export const AdminDayPage = () => {
  const facility = useGetFacility({ query: { staleTime: Infinity } });

  if (facility.data) {
    return (
      // useSearchParams on a static route needs a Suspense boundary, or next build fails.
      <Suspense fallback={<AdminDaySkeleton />}>
        <AdminDay facility={facility.data} />
      </Suspense>
    );
  }
  if (facility.isError) {
    return (
      <p role="alert" className="text-destructive">
        Could not load the facility. Please try again.
      </p>
    );
  }
  return <AdminDaySkeleton />;
};
