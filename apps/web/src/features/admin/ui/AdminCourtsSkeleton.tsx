import { Skeleton } from '@/shared/ui/skeleton';

const ROWS = 5;

export const AdminCourtsSkeleton = () => (
  <div aria-busy className="flex flex-col gap-6">
    <span className="sr-only">Loading courts…</span>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-semibold tracking-tight">Courts</h1>
      <Skeleton className="h-8 w-28" />
    </div>
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="h-10 bg-muted" />
      {Array.from({ length: ROWS }, (_, index) => (
        <div key={index} className="flex items-center gap-6 border-t px-4 py-3">
          <Skeleton className="h-7 w-12 shrink-0 rounded-md" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="hidden h-5 w-24 sm:block" />
          <Skeleton className="ml-auto h-7 w-36" />
        </div>
      ))}
    </div>
  </div>
);
