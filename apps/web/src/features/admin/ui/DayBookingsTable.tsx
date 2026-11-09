import { cn } from 'cn';
import { SPORT_BACKGROUND } from '@/entities/court/ui/sport-tone';
import type { Sport } from '@/shared/api/generated/model';
import { Badge } from '@/shared/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

export interface DayBookingView {
  id: string;
  time: string;
  court: string;
  sport: Sport;
  courtBadge?: string;
  player: string;
  email: string;
  price: string;
  status: string;
  cancelled: boolean;
}

interface DayBookingsTableProps {
  caption: string;
  bookings: DayBookingView[];
  loading: boolean;
}

export const DayBookingsTable = ({ caption, bookings, loading }: DayBookingsTableProps) => (
  <div
    aria-busy={loading}
    className={cn('overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10', {
      'opacity-50': loading,
    })}
  >
    <Table className="[&_td]:px-4 [&_th]:px-4">
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Court</TableHead>
          <TableHead>Player</TableHead>
          <TableHead>Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map(booking => (
          <TableRow key={booking.id} className={cn({ 'text-muted-foreground': booking.cancelled })}>
            <TableCell className="font-medium">{booking.time}</TableCell>
            <TableCell>
              <Badge
                variant="secondary"
                className={cn({ 'bg-primary/10 text-primary': !booking.cancelled })}
              >
                {booking.status}
              </Badge>
            </TableCell>
            <TableCell className="min-w-24 whitespace-normal">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      'size-2.5 shrink-0 rounded-full',
                      SPORT_BACKGROUND[booking.sport],
                      {
                        'opacity-40': booking.cancelled,
                      }
                    )}
                  />
                  {booking.court}
                </span>
                {booking.courtBadge && <Badge variant="secondary">{booking.courtBadge}</Badge>}
              </span>
            </TableCell>
            <TableCell className="whitespace-normal">
              <span className="flex flex-col">
                <span>{booking.player}</span>
                <span className="text-xs text-muted-foreground">{booking.email}</span>
              </span>
            </TableCell>
            <TableCell>{booking.price}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
