import { Button } from '@/shared/ui/button';

interface DayNavProps {
  label: string;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
}

export const DayNav = ({ label, onPrevious, onToday, onNext }: DayNavProps) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 aria-live="polite" className="text-lg font-semibold">
      {label}
    </h2>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onPrevious}>
        Previous day
      </Button>
      <Button variant="outline" size="sm" onClick={onToday}>
        Today
      </Button>
      <Button variant="outline" size="sm" onClick={onNext}>
        Next day
      </Button>
    </div>
  </div>
);
