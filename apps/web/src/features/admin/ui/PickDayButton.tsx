import { CalendarDaysIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

interface PickDayButtonProps {
  day: Date;
  today: Date;
  onPick: (day: Date) => void;
}

export const PickDayButton = ({ day, today, onPick }: PickDayButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarDaysIcon aria-hidden="true" />
          Pick a day
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Pick a day"
        align="end"
        collisionPadding={16}
        className="w-auto p-0"
      >
        <Calendar
          mode="single"
          required
          selected={day}
          defaultMonth={day}
          today={today}
          weekStartsOn={1}
          autoFocus
          onSelect={picked => {
            setOpen(false);
            onPick(picked);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
