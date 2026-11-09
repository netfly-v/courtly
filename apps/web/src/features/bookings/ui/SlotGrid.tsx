import { cn } from 'cn';

export type SlotKind = 'free' | 'mine' | 'booked' | 'past';

interface SlotView {
  startsAt: string;
  time: string;
  label: string;
  kind: SlotKind;
}

interface SlotGridProps {
  slots: SlotView[];
  loading: boolean;
  onPick: (startsAt: string, button: HTMLButtonElement) => void;
}

const cellClass =
  'flex h-16 w-full flex-col items-center justify-center gap-0.5 rounded-xl border text-sm';

interface SlotCellProps {
  slot: SlotView;
  loading: boolean;
  onPick: SlotGridProps['onPick'];
}

const SlotCell = ({ slot, loading, onPick }: SlotCellProps) => {
  const content = (
    <>
      <span className="font-semibold">{slot.time}</span>{' '}
      <span className={cn('text-xs', { 'font-medium text-primary': slot.kind === 'free' })}>
        {slot.label}
      </span>
    </>
  );

  if (slot.kind !== 'free') {
    return (
      <div
        className={cn(cellClass, {
          'border-primary bg-primary text-primary-foreground': slot.kind === 'mine',
          'bg-hatched text-foreground/70': slot.kind === 'booked',
          'border-dashed text-muted-foreground': slot.kind === 'past',
        })}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      className={cn(
        cellClass,
        'border-primary/30 bg-card shadow-xs transition-[background-color,border-color,box-shadow,translate] hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:translate-y-0'
      )}
      onClick={event => onPick(slot.startsAt, event.currentTarget)}
    >
      {content}
    </button>
  );
};

export const SlotGrid = ({ slots, loading, onPick }: SlotGridProps) => (
  <ul
    aria-busy={loading}
    className={cn('grid grid-cols-3 gap-2 transition-opacity sm:grid-cols-4 lg:grid-cols-6', {
      'opacity-50': loading,
    })}
  >
    {slots.map(slot => (
      <li key={slot.startsAt}>
        <SlotCell slot={slot} loading={loading} onPick={onPick} />
      </li>
    ))}
  </ul>
);
