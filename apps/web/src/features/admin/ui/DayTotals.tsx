import { cn } from 'cn';

interface DayTotal {
  label: string;
  value: string;
}

interface DayTotalsProps {
  totals: DayTotal[];
  hint: string;
  loading: boolean;
}

export const DayTotals = ({ totals, hint, loading }: DayTotalsProps) => (
  <div aria-busy={loading} className={cn('flex flex-col gap-2', { 'opacity-50': loading })}>
    <dl className="grid gap-3 sm:grid-cols-3">
      {totals.map(total => (
        <div key={total.label} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <dt className="text-sm text-muted-foreground">{total.label}</dt>
          <dd className="text-2xl font-semibold">{total.value}</dd>
        </div>
      ))}
    </dl>
    <p className="text-sm text-muted-foreground">{hint}</p>
  </div>
);
