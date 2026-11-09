import { useEffect, useRef } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group';

interface DayOption {
  value: string;
  label: string;
}

interface DayStripProps {
  days: DayOption[];
  value: string;
  onChange: (day: string) => void;
}

export const DayStrip = ({ days, value, onChange }: DayStripProps) => {
  const selected = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selected.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [value]);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <ToggleGroup
        type="single"
        variant="outline"
        aria-label="Day"
        value={value}
        // A single toggle group lets the user unselect the day; keep one picked.
        onValueChange={day => day && onChange(day)}
      >
        {days.map(day => (
          <ToggleGroupItem
            key={day.value}
            value={day.value}
            className="rounded-full bg-card px-4 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            ref={day.value === value ? selected : undefined}
          >
            {day.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};
