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
    <h2 aria-live="polite" className="text-lg font-semibold">
      {label}
    </h2>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={onPrevious}>
        Previous day
      </Button>
      <Button variant="outline" size="sm" onClick={onToday}>
        Today
      </Button>
      <Button variant="outline" size="sm" onClick={onNext}>
        Next day
      </Button>
      <PickDayButton day={day} today={today} onPick={onPick} />
    </div>
  </div>
);
