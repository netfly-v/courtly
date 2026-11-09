import { cn } from 'cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

export interface CourtRowView {
  id: string;
  name: string;
  sport: string;
  openingHours: string;
  price: string;
  upcomingBookings: number;
  status: string;
  active: boolean;
  toggleLabel: string;
}

interface CourtsTableProps {
  courts: CourtRowView[];
  onEdit: (id: string, button: HTMLButtonElement) => void;
  onToggle: (id: string, button: HTMLButtonElement) => void;
}

export const CourtsTable = ({ courts, onEdit, onToggle }: CourtsTableProps) => (
  <Table>
    <TableCaption className="sr-only">Courts</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Sport</TableHead>
        <TableHead className="whitespace-normal">Opening hours</TableHead>
        <TableHead>Price</TableHead>
        <TableHead className="whitespace-normal">Upcoming bookings</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="sticky right-0 bg-background">
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {courts.map(court => (
        <TableRow key={court.id}>
          <TableCell className="font-medium whitespace-normal">{court.name}</TableCell>
          <TableCell>{court.sport}</TableCell>
          <TableCell>{court.openingHours}</TableCell>
          <TableCell>{court.price}</TableCell>
          <TableCell>{court.upcomingBookings}</TableCell>
          <TableCell>
            <Badge
              variant="secondary"
              className={cn({ 'bg-primary/10 text-primary': court.active })}
            >
              {court.status}
            </Badge>
          </TableCell>
          <TableCell className="sticky right-0 bg-background">
            <span className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={event => onEdit(court.id, event.currentTarget)}
              >
                Edit <span className="sr-only">{court.name}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={event => onToggle(court.id, event.currentTarget)}
              >
                {court.toggleLabel} <span className="sr-only">{court.name}</span>
              </Button>
            </span>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
