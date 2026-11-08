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

const cellClass = 'flex h-14 w-full flex-col items-center justify-center rounded-lg border text-sm';

interface SlotCellProps {
  slot: SlotView;
  loading: boolean;
  onPick: SlotGridProps['onPick'];
}

const SlotCell = ({ slot, loading, onPick }: SlotCellProps) => {
  const content = (
    <>
      <span className="font-medium">{slot.time}</span> <span className="text-xs">{slot.label}</span>
    </>
  );

  if (slot.kind !== 'free') {
    return (
      <div
        className={cn(cellClass, {
          'border-primary/40 bg-primary/10 text-primary': slot.kind === 'mine',
          'bg-muted text-foreground/75': slot.kind === 'booked',
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
        'border-primary/30 bg-card transition-colors hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
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
