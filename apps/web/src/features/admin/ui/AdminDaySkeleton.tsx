import { Skeleton } from '@/shared/ui/skeleton';

const TOTALS = 3;
const ROWS = 4;

export const DayDetailsSkeleton = () => (
  <div aria-busy className="flex flex-col gap-6">
    <span className="sr-only">Loading bookings…</span>
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: TOTALS }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:gap-3 sm:p-4"
          >
            <Skeleton className="h-4 w-20 sm:h-5" />
            <Skeleton className="h-7 w-12 sm:h-9 sm:w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-5 w-full max-w-md" />
    </div>
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="h-10 bg-muted" />
      {Array.from({ length: ROWS }, (_, index) => (
        <div key={index} className="flex items-center gap-6 border-t px-4 py-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="hidden h-9 w-40 sm:block" />
        </div>
      ))}
    </div>
  </div>
);

export const AdminDaySkeleton = () => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl font-semibold tracking-tight">Bookings</h1>
      <Skeleton className="h-6 w-64" />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-7 w-80 max-w-full" />
    </div>
    <DayDetailsSkeleton />
  </div>
);
