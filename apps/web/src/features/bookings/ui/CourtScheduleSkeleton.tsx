import { Skeleton } from '@/shared/ui/skeleton';

const DAYS = 10;
const SLOTS = 12;

export const CourtScheduleSkeleton = () => (
  <div aria-busy className="flex flex-col gap-6">
    <span className="sr-only">Loading free times…</span>
    <div className="flex flex-col gap-3">
      <Skeleton className="h-5 w-20" />
      <div className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 sm:flex-row">
        <Skeleton className="aspect-[2/1] w-full rounded-none sm:aspect-auto sm:w-60 sm:shrink-0" />
        <div className="flex flex-col items-start gap-2 p-5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-6 w-56" />
        </div>
      </div>
    </div>
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 overflow-hidden py-1">
        {Array.from({ length: DAYS }, (_, index) => (
          <Skeleton key={index} className="h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-5 w-52" />
    </div>
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: SLOTS }, (_, index) => (
        <Skeleton key={index} className="h-16 rounded-xl" />
      ))}
    </div>
  </div>
);
