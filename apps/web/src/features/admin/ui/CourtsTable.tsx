import { cn } from 'cn';
import { PencilIcon, PowerIcon } from 'lucide-react';
import { CourtDrawing } from '@/entities/court/ui/CourtDrawing';
import { SportBadge } from '@/entities/court/ui/SportBadge';
import type { Sport } from '@/shared/api/generated/model';
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
  sport: Sport;
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
  <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
    <Table className="[&_td]:px-4 [&_th]:px-4">
      <TableCaption className="sr-only">Courts</TableCaption>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Sport</TableHead>
          <TableHead className="whitespace-normal">Opening hours</TableHead>
          <TableHead>Price</TableHead>
          <TableHead className="whitespace-normal">Upcoming bookings</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="sticky right-0 bg-muted">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courts.map(court => (
          <TableRow key={court.id} className="hover:bg-transparent">
            <TableCell className="font-medium whitespace-normal">
              <span className="flex items-center gap-3">
                <CourtDrawing
                  sport={court.sport}
                  className={cn('h-7 w-12 shrink-0 rounded-md', {
                    'opacity-50 grayscale': !court.active,
                  })}
                />
                {court.name}
              </span>
            </TableCell>
            <TableCell>
              <SportBadge sport={court.sport} />
            </TableCell>
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
            <TableCell className="sticky right-0 bg-card">
              <span className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={event => onEdit(court.id, event.currentTarget)}
                >
                  <PencilIcon aria-hidden />
                  Edit <span className="sr-only">{court.name}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={event => onToggle(court.id, event.currentTarget)}
                >
                  <PowerIcon aria-hidden />
                  {court.toggleLabel} <span className="sr-only">{court.name}</span>
                </Button>
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
