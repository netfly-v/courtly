import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

const CARDS = 6;

export const CourtsSkeleton = ({ withLink }: { withLink: boolean }) => (
  <div aria-busy className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <span className="sr-only">Loading courts…</span>
    {Array.from({ length: CARDS }, (_, index) => (
      <Card key={index} className="gap-0 py-0">
        <Skeleton className="aspect-[2/1] w-full rounded-none" />
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-20" />
          </div>
          {withLink && (
            <div className="border-t pt-3">
              <Skeleton className="h-6 w-28" />
            </div>
          )}
        </div>
      </Card>
    ))}
  </div>
);
