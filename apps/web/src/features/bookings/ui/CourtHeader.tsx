import { BanknoteIcon, ClockIcon } from 'lucide-react';
import type { Ref } from 'react';
import { CourtDrawing } from '@/entities/court/ui/CourtDrawing';
import { SportBadge } from '@/entities/court/ui/SportBadge';
import type { Sport } from '@/shared/api/generated/model';

interface CourtHeaderProps {
  name: string;
  sport: Sport;
  openingHours: string;
  price: string;
  headingRef: Ref<HTMLHeadingElement>;
}

export const CourtHeader = ({ name, sport, openingHours, price, headingRef }: CourtHeaderProps) => (
  <div className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 sm:flex-row">
    <CourtDrawing
      sport={sport}
      className="aspect-[2/1] w-full sm:aspect-auto sm:h-auto sm:w-60 sm:shrink-0 sm:self-stretch"
    />
    <div className="flex flex-col items-start justify-center gap-2 p-5">
      <SportBadge sport={sport} />
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-3xl font-semibold tracking-tight outline-none"
      >
        {name}
      </h1>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ClockIcon aria-hidden className="size-4" />
          {openingHours}
        </span>
        <span className="flex items-center gap-1.5">
          <BanknoteIcon aria-hidden className="size-4" />
          {price}
        </span>
      </p>
    </div>
  </div>
);
