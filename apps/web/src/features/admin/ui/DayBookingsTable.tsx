import { cn } from 'cn';
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
  <div aria-busy={loading} className={cn({ 'opacity-50': loading })}>
    <Table>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Court</TableHead>
          <TableHead>Player</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map(booking => (
          <TableRow key={booking.id} className={cn({ 'text-muted-foreground': booking.cancelled })}>
            <TableCell>{booking.time}</TableCell>
            <TableCell>
              <span className="flex items-center gap-2">
                {booking.court}
                {booking.courtBadge && <Badge variant="secondary">{booking.courtBadge}</Badge>}
              </span>
            </TableCell>
            <TableCell>
              <span className="flex flex-col">
                <span>{booking.player}</span>
                <span className="text-xs text-muted-foreground">{booking.email}</span>
              </span>
            </TableCell>
            <TableCell>{booking.price}</TableCell>
            <TableCell>{booking.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
