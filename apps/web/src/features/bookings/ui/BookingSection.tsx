import { type ReactNode, useId } from 'react';
import { BookingRow, type BookingView } from './BookingRow';

interface BookingSectionProps {
  title: string;
  bookings: BookingView[];
  empty: ReactNode;
  onCancel: (id: string, button: HTMLButtonElement) => void;
}

export const BookingSection = ({ title, bookings, empty, onCancel }: BookingSectionProps) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {bookings.length === 0 && empty}
      {bookings.length > 0 && (
        <ul className="flex flex-col gap-3">
          {bookings.map(booking => (
            <li key={booking.id}>
              <BookingRow booking={booking} onCancel={onCancel} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
