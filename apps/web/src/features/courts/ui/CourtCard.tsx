import { cn } from 'cn';
import { ArrowRightIcon, ClockIcon } from 'lucide-react';
import Link from 'next/link';
import { CourtDrawing } from '@/entities/court/ui/CourtDrawing';
import { SportBadge } from '@/entities/court/ui/SportBadge';
import type { Sport } from '@/shared/api/generated/model';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';

interface CourtLink {
  href: string;
  label: string;
}

interface CourtCardProps {
  name: string;
  sport: Sport;
  openingHours: string;
  price: string;
  badge?: string;
  dimmed: boolean;
  link?: CourtLink;
}

const CourtCardBody = ({
  name,
  sport,
  openingHours,
  price,
  badge,
  dimmed,
  link,
}: CourtCardProps) => (
  <Card className="h-full gap-0 py-0 transition-[box-shadow,translate] group-hover/court:-translate-y-0.5 group-hover/court:shadow-md">
    <CourtDrawing
      sport={sport}
      className={cn('aspect-[2/1] w-full', { 'opacity-50 grayscale': dimmed })}
    />
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col items-start gap-1.5">
          <h2 className="text-base font-semibold">{name}</h2>
          <SportBadge sport={sport} />
        </div>
        {badge && <Badge variant="outline">{badge}</Badge>}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <ClockIcon aria-hidden className="size-4" />
          {openingHours}
        </span>
        <span className="font-semibold">{price}</span>
      </div>
      {link && (
        <span className="flex items-center gap-1 border-t pt-3 font-medium text-primary">
          {link.label}
          <ArrowRightIcon
            aria-hidden
            className="size-4 transition-transform group-hover/court:translate-x-0.5"
          />
        </span>
      )}
    </div>
  </Card>
);

export const CourtCard = (court: CourtCardProps) => {
  if (!court.link) {
    return <CourtCardBody {...court} />;
  }
  return (
    <Link
      href={court.link.href}
      className="group/court block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <CourtCardBody {...court} />
    </Link>
  );
};
