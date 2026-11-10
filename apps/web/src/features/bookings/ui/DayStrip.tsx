import { cn } from 'cn';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/button';
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

const fadeClass = 'pointer-events-none absolute inset-y-0 w-12 opacity-0 transition-opacity';
const arrowClass = 'absolute inset-y-0 my-auto hidden rounded-full bg-card shadow-sm hover:bg-card';

export const DayStrip = ({ days, value, onChange }: DayStripProps) => {
  const [moreBefore, setMoreBefore] = useState(false);
  const [moreAfter, setMoreAfter] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const selected = useRef<HTMLButtonElement>(null);

  const scrollPage = (direction: 1 | -1) => {
    const element = strip.current;
    element?.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: 'smooth' });
  };

  useEffect(() => {
    const element = strip.current;
    if (!element) {
      return;
    }
    const measure = () => {
      setMoreBefore(element.scrollLeft > 0);
      setMoreAfter(Math.ceil(element.scrollLeft + element.clientWidth) < element.scrollWidth);
    };
    const resizes = new ResizeObserver(measure);
    resizes.observe(element);
    element.addEventListener('scroll', measure, { passive: true });
    return () => {
      resizes.disconnect();
      element.removeEventListener('scroll', measure);
    };
  }, []);

  useEffect(() => {
    selected.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [value]);

  return (
    <div className="relative -mx-4 sm:-mx-1">
      <div
        ref={strip}
        className="no-scrollbar isolate scroll-px-12 overflow-x-auto px-4 py-1 sm:px-1"
      >
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
              // The browser scrolls a focused day only to the edge, under the fade and the arrow.
              onFocus={event =>
                event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })
              }
            >
              {day.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div
        aria-hidden
        className={cn(fadeClass, 'left-0 bg-linear-to-r from-background', {
          'opacity-100': moreBefore,
        })}
      />
      <div
        aria-hidden
        className={cn(fadeClass, 'right-0 bg-linear-to-l from-background', {
          'opacity-100': moreAfter,
        })}
      />
      {/* For the mouse only: the keyboard moves between days with the arrow keys. */}
      <Button
        variant="outline"
        size="icon-sm"
        tabIndex={-1}
        aria-hidden
        className={cn(arrowClass, 'left-0', { 'pointer-fine:inline-flex': moreBefore })}
        onClick={() => scrollPage(-1)}
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        tabIndex={-1}
        aria-hidden
        className={cn(arrowClass, 'right-0', { 'pointer-fine:inline-flex': moreAfter })}
        onClick={() => scrollPage(1)}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
};
