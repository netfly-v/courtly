import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

const ROWS = 3;

export const MyBookingsSkeleton = () => (
  <div aria-busy className="flex flex-col gap-8">
    <span className="sr-only">Loading your bookings…</span>
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl font-semibold tracking-tight">My bookings</h1>
      <Skeleton className="h-6 w-64" />
    </div>
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-tight">Upcoming</h2>
      {Array.from({ length: ROWS }, (_, index) => (
        <Card key={index} size="sm" className="flex-row gap-0 py-0">
          <Skeleton className="w-18 shrink-0 rounded-none" />
          <div className="flex flex-1 flex-col gap-3 p-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-5 w-16" />
          </div>
        </Card>
      ))}
    </div>
  </div>
);
