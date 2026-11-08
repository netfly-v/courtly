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

export interface BookingView {
  id: string;
  court: string;
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
  <Card size="sm">
    <CardHeader>
      <CardTitle>
        <h3>{booking.court}</h3>
      </CardTitle>
      <CardDescription>{booking.details}</CardDescription>
      {booking.badge && (
        <CardAction>
          <Badge variant="secondary">{booking.badge}</Badge>
        </CardAction>
      )}
    </CardHeader>
    <CardContent className="flex flex-wrap items-center justify-between gap-3">
      <span className="font-medium">{booking.price}</span>
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
  </Card>
);
