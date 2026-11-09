import { cn } from 'cn';
import type { LucideIcon } from 'lucide-react';

interface DayTotal {
  label: string;
  value: string;
  icon: LucideIcon;
}

interface DayTotalsProps {
  totals: DayTotal[];
  hint: string;
  loading: boolean;
}

export const DayTotals = ({ totals, hint, loading }: DayTotalsProps) => (
  <div aria-busy={loading} className={cn('flex flex-col gap-2', { 'opacity-50': loading })}>
    <dl className="grid grid-cols-3 gap-2 sm:gap-3">
      {totals.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex flex-col gap-1 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:gap-2 sm:p-4"
        >
          <dt className="flex items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
            {label}
            <span
              aria-hidden
              className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex"
            >
              <Icon className="size-4" />
            </span>
          </dt>
          <dd className="text-xl font-semibold tracking-tight sm:text-3xl">{value}</dd>
        </div>
      ))}
    </dl>
    <p className="text-sm text-muted-foreground">{hint}</p>
  </div>
);
