import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { PickDayButton } from './PickDayButton';

interface DayNavProps {
  label: string;
  day: Date;
  today: Date;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
  onPick: (day: Date) => void;
}

export const DayNav = ({ label, day, today, onPrevious, onToday, onNext, onPick }: DayNavProps) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 aria-live="polite" className="text-xl font-semibold tracking-tight">
      {label}
    </h2>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="bg-card" onClick={onPrevious}>
        <ChevronLeftIcon aria-hidden />
        Previous day
      </Button>
      <Button variant="outline" size="sm" className="bg-card" onClick={onToday}>
        Today
      </Button>
      <Button variant="outline" size="sm" className="bg-card" onClick={onNext}>
        Next day
        <ChevronRightIcon aria-hidden />
      </Button>
      <PickDayButton day={day} today={today} onPick={onPick} />
    </div>
  </div>
);
