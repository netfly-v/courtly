import { cn } from 'cn';
import { SPORT_BACKGROUND } from '@/entities/court/ui/sport-tone';
import type { Sport } from '@/shared/api/generated/model';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

interface CancelView {
  allowed: boolean;
  note: string;
}

interface DateView {
  weekday: string;
  day: string;
  month: string;
}

export interface BookingView {
  id: string;
  court: string;
  sport: Sport;
  date: DateView;
  dimmed: boolean;
  details: string;
  price: string;
  badge?: string;
  cancel?: CancelView;
}

interface BookingRowProps {
  booking: BookingView;
  onCancel: (id: string, button: HTMLButtonElement) => void;
}

export const BookingRow = ({ booking, onCancel }: BookingRowProps) => (
  <Card size="sm" className="flex-row gap-0 py-0">
    {/* Hidden from screen readers: the details line already says the date. */}
    <div
      aria-hidden
      className={cn(
        'flex w-18 shrink-0 flex-col items-center justify-center py-3 text-white',
        SPORT_BACKGROUND[booking.sport],
        { 'bg-muted text-muted-foreground': booking.dimmed }
      )}
    >
      <span className="text-xs font-medium uppercase">{booking.date.weekday}</span>
      <span className="text-2xl leading-tight font-semibold">{booking.date.day}</span>
      <span className="text-xs uppercase">{booking.date.month}</span>
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-3 py-3">
      <CardHeader>
        <CardTitle>
          <h3 className="text-base font-semibold">{booking.court}</h3>
        </CardTitle>
        <CardDescription>{booking.details}</CardDescription>
        {booking.badge && (
          <CardAction>
            <Badge variant="secondary">{booking.badge}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-semibold">{booking.price}</span>
        {booking.cancel && (
          <div className="flex flex-wrap items-center gap-3">
            <span id={`cancel-note-${booking.id}`} className="text-muted-foreground">
              {booking.cancel.note}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!booking.cancel.allowed}
              aria-describedby={`cancel-note-${booking.id}`}
              onClick={event => onCancel(booking.id, event.currentTarget)}
            >
              Cancel booking
            </Button>
          </div>
        )}
      </CardContent>
    </div>
  </Card>
);
